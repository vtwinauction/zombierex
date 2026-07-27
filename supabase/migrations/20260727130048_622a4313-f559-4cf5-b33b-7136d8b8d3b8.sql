
-- Challenges
CREATE TABLE public.drag_challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenger_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  opponent_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strip_mode TEXT NOT NULL DEFAULT 'quarter' CHECK (strip_mode IN ('eighth','quarter')),
  tree_mode TEXT NOT NULL DEFAULT 'sportsman' CHECK (tree_mode IN ('pro','sportsman')),
  stake_xp INT NOT NULL DEFAULT 0 CHECK (stake_xp >= 0 AND stake_xp <= 5000),
  message TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','accepted','declined','expired','cancelled')),
  match_id UUID,
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '15 minutes'),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (challenger_id <> opponent_id)
);
CREATE INDEX ON public.drag_challenges(opponent_id, status, created_at DESC);
CREATE INDEX ON public.drag_challenges(challenger_id, status, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drag_challenges TO authenticated;
GRANT ALL ON public.drag_challenges TO service_role;
ALTER TABLE public.drag_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read own challenges" ON public.drag_challenges FOR SELECT TO authenticated
  USING (auth.uid() IN (challenger_id, opponent_id));
CREATE POLICY "insert own challenge" ON public.drag_challenges FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = challenger_id);
CREATE POLICY "respond to challenge" ON public.drag_challenges FOR UPDATE TO authenticated
  USING (auth.uid() IN (challenger_id, opponent_id))
  WITH CHECK (auth.uid() IN (challenger_id, opponent_id));

-- Matches
CREATE TABLE public.drag_matches (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  challenge_id UUID REFERENCES public.drag_challenges(id) ON DELETE SET NULL,
  rider_a UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rider_b UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  strip_mode TEXT NOT NULL DEFAULT 'quarter' CHECK (strip_mode IN ('eighth','quarter')),
  tree_mode TEXT NOT NULL DEFAULT 'sportsman' CHECK (tree_mode IN ('pro','sportsman')),
  stake_xp INT NOT NULL DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'lobby' CHECK (status IN ('lobby','armed','countdown','live','finished','void')),
  ready_a BOOLEAN NOT NULL DEFAULT false,
  ready_b BOOLEAN NOT NULL DEFAULT false,
  green_at TIMESTAMPTZ,
  winner_id UUID REFERENCES auth.users(id),
  margin_s NUMERIC(6,3),
  result_a JSONB,
  result_b JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  CHECK (rider_a <> rider_b)
);
CREATE INDEX ON public.drag_matches(rider_a, created_at DESC);
CREATE INDEX ON public.drag_matches(rider_b, created_at DESC);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.drag_matches TO authenticated;
GRANT ALL ON public.drag_matches TO service_role;
ALTER TABLE public.drag_matches ENABLE ROW LEVEL SECURITY;

-- Security-definer helper avoids recursion when telemetry policy references matches
CREATE OR REPLACE FUNCTION public.is_drag_match_participant(_match UUID, _user UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.drag_matches m
    WHERE m.id = _match AND _user IN (m.rider_a, m.rider_b)
  );
$$;
REVOKE EXECUTE ON FUNCTION public.is_drag_match_participant(UUID, UUID) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_drag_match_participant(UUID, UUID) TO authenticated;

CREATE POLICY "read own matches" ON public.drag_matches FOR SELECT TO authenticated
  USING (auth.uid() IN (rider_a, rider_b));
CREATE POLICY "update own matches" ON public.drag_matches FOR UPDATE TO authenticated
  USING (auth.uid() IN (rider_a, rider_b))
  WITH CHECK (auth.uid() IN (rider_a, rider_b));

-- Telemetry (per-rider GPS stream during a match)
CREATE TABLE public.drag_match_telemetry (
  id BIGSERIAL PRIMARY KEY,
  match_id UUID NOT NULL REFERENCES public.drag_matches(id) ON DELETE CASCADE,
  rider_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  t_ms INT NOT NULL,
  distance_m NUMERIC(8,2) NOT NULL DEFAULT 0,
  speed_kmh NUMERIC(6,2) NOT NULL DEFAULT 0,
  accuracy_m NUMERIC(6,2),
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX ON public.drag_match_telemetry(match_id, t_ms);
CREATE INDEX ON public.drag_match_telemetry(match_id, rider_id, t_ms);

GRANT SELECT, INSERT ON public.drag_match_telemetry TO authenticated;
GRANT USAGE ON SEQUENCE public.drag_match_telemetry_id_seq TO authenticated;
GRANT ALL ON public.drag_match_telemetry TO service_role;
GRANT ALL ON SEQUENCE public.drag_match_telemetry_id_seq TO service_role;
ALTER TABLE public.drag_match_telemetry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "read match telemetry" ON public.drag_match_telemetry FOR SELECT TO authenticated
  USING (public.is_drag_match_participant(match_id, auth.uid()));
CREATE POLICY "write own telemetry" ON public.drag_match_telemetry FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = rider_id AND public.is_drag_match_participant(match_id, auth.uid()));

-- updated_at trigger for matches + challenges
CREATE TRIGGER trg_drag_challenges_touch BEFORE UPDATE ON public.drag_challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER trg_drag_matches_touch BEFORE UPDATE ON public.drag_matches
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.drag_challenges;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drag_matches;
ALTER PUBLICATION supabase_realtime ADD TABLE public.drag_match_telemetry;
