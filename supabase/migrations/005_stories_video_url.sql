-- Campo para URL persistente do video
ALTER TABLE instagram_stories
  ADD COLUMN IF NOT EXISTS stored_video_url TEXT;
