-- Reactions: replace unconditional read with post-visibility scoped read
DROP POLICY IF EXISTS reactions_read_all ON public.reactions;
CREATE POLICY reactions_read_visible ON public.reactions
  FOR SELECT
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.posts p WHERE p.id = reactions.post_id)
  );

-- User achievements: restrict reads to the owner
DROP POLICY IF EXISTS ua_read_authenticated ON public.user_achievements;
CREATE POLICY ua_read_own ON public.user_achievements
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);