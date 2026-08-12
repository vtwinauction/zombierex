
-- 1. creator_profiles: block self-approval
CREATE OR REPLACE FUNCTION public.tg_guard_creator_profile_privileged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_any_role((select auth.uid()), ARRAY['admin','super_admin','moderator','owner']::app_role[]) THEN
    RETURN NEW;
  END IF;
  NEW.status            := OLD.status;
  NEW.is_verified       := OLD.is_verified;
  NEW.is_featured       := OLD.is_featured;
  NEW.approved_at       := OLD.approved_at;
  NEW.subscribers_count := OLD.subscribers_count;
  NEW.tips_total_cents  := OLD.tips_total_cents;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS cp_guard_privileged ON public.creator_profiles;
CREATE TRIGGER cp_guard_privileged BEFORE UPDATE ON public.creator_profiles
FOR EACH ROW EXECUTE FUNCTION public.tg_guard_creator_profile_privileged();

-- 2. drag_runs: block self-verification
CREATE OR REPLACE FUNCTION public.tg_guard_drag_run_privileged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_any_role((select auth.uid()), ARRAY['admin','super_admin','moderator','owner']::app_role[]) THEN
    RETURN NEW;
  END IF;
  NEW.status             := OLD.status;
  NEW.verification_score := OLD.verification_score;
  NEW.anti_cheat_notes   := OLD.anti_cheat_notes;
  NEW.verified_at        := OLD.verified_at;
  NEW.verified_by        := OLD.verified_by;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS drag_runs_guard_privileged ON public.drag_runs;
CREATE TRIGGER drag_runs_guard_privileged BEFORE UPDATE ON public.drag_runs
FOR EACH ROW EXECUTE FUNCTION public.tg_guard_drag_run_privileged();

-- 3. judge_entries: block self-scoring
CREATE OR REPLACE FUNCTION public.tg_guard_judge_entry_privileged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_any_role((select auth.uid()), ARRAY['admin','super_admin','moderator','owner']::app_role[]) THEN
    RETURN NEW;
  END IF;
  NEW.overall_score    := OLD.overall_score;
  NEW.category_scores  := OLD.category_scores;
  NEW.engine_score     := OLD.engine_score;
  NEW.exhaust_score    := OLD.exhaust_score;
  NEW.awards           := OLD.awards;
  NEW.fraud_score      := OLD.fraud_score;
  NEW.scored_at        := OLD.scored_at;
  NEW.ai_comments      := OLD.ai_comments;
  NEW.defects          := OLD.defects;
  NEW.highlights       := OLD.highlights;
  NEW.suggestions      := OLD.suggestions;
  NEW.processing_error := OLD.processing_error;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS judge_entries_guard_privileged ON public.judge_entries;
CREATE TRIGGER judge_entries_guard_privileged BEFORE UPDATE ON public.judge_entries
FOR EACH ROW EXECUTE FUNCTION public.tg_guard_judge_entry_privileged();

-- 4. vendors: block self-verification / self-premium
CREATE OR REPLACE FUNCTION public.tg_guard_vendor_privileged()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF public.has_any_role((select auth.uid()), ARRAY['admin','super_admin','moderator','owner']::app_role[]) THEN
    RETURN NEW;
  END IF;
  NEW.is_verified         := OLD.is_verified;
  NEW.verification_status := OLD.verification_status;
  NEW.verification_notes  := OLD.verification_notes;
  NEW.reviewed_at         := OLD.reviewed_at;
  NEW.reviewed_by         := OLD.reviewed_by;
  NEW.is_premium          := OLD.is_premium;
  NEW.premium_until       := OLD.premium_until;
  NEW.followers_count     := OLD.followers_count;
  NEW.profile_views_count := OLD.profile_views_count;
  RETURN NEW;
END $$;
DROP TRIGGER IF EXISTS vendors_guard_privileged ON public.vendors;
CREATE TRIGGER vendors_guard_privileged BEFORE UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.tg_guard_vendor_privileged();

-- 5. reactions: honour post visibility
DROP POLICY IF EXISTS reactions_read_visible ON public.reactions;
CREATE POLICY reactions_read_visible ON public.reactions
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.posts p
    WHERE p.id = reactions.post_id
      AND p.deleted_at IS NULL
      AND COALESCE(p.is_hidden, false) = false
  )
);

-- 6. advertisements: hide budget from public reads
REVOKE SELECT ON public.advertisements FROM anon, authenticated;
GRANT SELECT (id, vendor_id, title, media_url, target_url, starts_at, ends_at, is_active, created_at)
  ON public.advertisements TO anon, authenticated;

-- 7. xp_events / user_challenges: server-side writes only
REVOKE INSERT, UPDATE, DELETE ON public.xp_events FROM anon, authenticated;
REVOKE INSERT, UPDATE, DELETE ON public.user_challenges FROM anon, authenticated;
GRANT ALL ON public.xp_events TO service_role;
GRANT ALL ON public.user_challenges TO service_role;

DROP POLICY IF EXISTS "xp_events insert own" ON public.xp_events;
DROP POLICY IF EXISTS xp_events_own_insert ON public.xp_events;
DROP POLICY IF EXISTS "user_challenges upsert own" ON public.user_challenges;
DROP POLICY IF EXISTS user_challenges_own_write ON public.user_challenges;
