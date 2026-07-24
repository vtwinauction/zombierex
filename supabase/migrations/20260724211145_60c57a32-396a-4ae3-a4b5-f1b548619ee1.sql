
CREATE OR REPLACE FUNCTION public.user_has_event_rsvp(_event_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_rsvps WHERE event_id = _event_id AND user_id = _user)
$$;

CREATE OR REPLACE FUNCTION public.user_has_event_invite(_event_id uuid, _user uuid)
RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (SELECT 1 FROM public.event_invites WHERE event_id = _event_id AND invitee_id = _user)
$$;

DROP POLICY IF EXISTS "events visibility scoped select" ON public.events;
CREATE POLICY "events visibility scoped select" ON public.events
FOR SELECT USING (
  visibility = ANY (ARRAY['public','unlisted'])
  OR auth.uid() = host_id
  OR public.user_has_event_rsvp(id, auth.uid())
  OR public.user_has_event_invite(id, auth.uid())
);
