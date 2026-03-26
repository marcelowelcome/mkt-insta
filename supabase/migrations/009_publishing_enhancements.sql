-- ============================================
-- Migration 009: Publishing Enhancements
-- Location, user tags, alt text, collaborators, cover, auto-publish
-- ============================================

ALTER TABLE instagram_editorial_calendar
  ADD COLUMN IF NOT EXISTS location_id TEXT,           -- Meta location page ID
  ADD COLUMN IF NOT EXISTS user_tags JSONB,            -- [{username, x, y}] for photo tags
  ADD COLUMN IF NOT EXISTS alt_text TEXT,              -- accessibility alt text
  ADD COLUMN IF NOT EXISTS collaborators TEXT[],       -- array of usernames for collab posts
  ADD COLUMN IF NOT EXISTS cover_url TEXT,             -- cover image URL for Reels
  ADD COLUMN IF NOT EXISTS auto_publish BOOLEAN DEFAULT FALSE;  -- if true, cron publishes at scheduled_for
