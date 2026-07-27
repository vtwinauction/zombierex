
-- Trigram search indexes for faster ILIKE-based search on posts and listings.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS idx_posts_caption_trgm
  ON public.posts USING gin (caption gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listings_title_trgm
  ON public.listings USING gin (title gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_listings_description_trgm
  ON public.listings USING gin (description gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_handle_trgm
  ON public.profiles USING gin (handle gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_profiles_display_name_trgm
  ON public.profiles USING gin (display_name gin_trgm_ops);

-- Analytics aggregation helper: 30-day rollup for owner dashboard.
CREATE INDEX IF NOT EXISTS idx_analytics_events_created_at
  ON public.analytics_events (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_analytics_events_event_created
  ON public.analytics_events (event, created_at DESC);
