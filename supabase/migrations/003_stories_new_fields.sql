-- ==========================================
-- DashIG — Novos campos de Stories
-- Executar no SQL Editor do Supabase
-- ==========================================

ALTER TABLE instagram_stories
  ADD COLUMN IF NOT EXISTS media_type TEXT,
  ADD COLUMN IF NOT EXISTS media_url TEXT,
  ADD COLUMN IF NOT EXISTS permalink TEXT,
  ADD COLUMN IF NOT EXISTS follows INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS profile_visits INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS shares INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS total_interactions INTEGER DEFAULT 0;

-- Renomear taps_forward para navigation (semantica atualizada)
-- Manter coluna antiga para compatibilidade, adicionar nova
ALTER TABLE instagram_stories
  ADD COLUMN IF NOT EXISTS navigation INTEGER DEFAULT 0;
