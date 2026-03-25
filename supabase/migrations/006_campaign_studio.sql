-- ============================================
-- Migration 006: Campaign Studio
-- pgvector + Knowledge Base + Campaigns
-- ============================================

-- 1. Habilitar pgvector
CREATE EXTENSION IF NOT EXISTS vector;

-- 2. Documentos indexados na Knowledge Base
CREATE TABLE knowledge_documents (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title        TEXT NOT NULL,
  source_type  TEXT NOT NULL,          -- PDF | WEBSITE | MANUAL
  source_url   TEXT,
  file_name    TEXT,
  description  TEXT,
  is_active    BOOLEAN DEFAULT TRUE,
  indexed_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Chunks de texto com embeddings vetoriais
CREATE TABLE document_chunks (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id   UUID REFERENCES knowledge_documents(id) ON DELETE CASCADE,
  chunk_index   INTEGER NOT NULL,
  content       TEXT NOT NULL,
  token_count   INTEGER,
  embedding     vector(1536),          -- OpenAI text-embedding-3-small
  metadata      JSONB,                 -- { "page": 3, "section": "Tom de Voz" }
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Indice vetorial (IVFFlat para busca por similaridade)
CREATE INDEX idx_document_chunks_embedding
  ON document_chunks
  USING ivfflat (embedding vector_cosine_ops)
  WITH (lists = 100);

CREATE INDEX idx_document_chunks_document
  ON document_chunks (document_id);

-- 5. Funcao de busca vetorial (cosine similarity)
CREATE OR REPLACE FUNCTION search_knowledge(
  query_embedding vector(1536),
  match_threshold FLOAT DEFAULT 0.70,
  match_count     INT DEFAULT 8
)
RETURNS TABLE (
  id UUID, content TEXT, metadata JSONB, document_id UUID, similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT dc.id, dc.content, dc.metadata, dc.document_id,
         1 - (dc.embedding <=> query_embedding) AS similarity
  FROM document_chunks dc
  JOIN knowledge_documents kd ON kd.id = dc.document_id
  WHERE kd.is_active = TRUE
    AND 1 - (dc.embedding <=> query_embedding) > match_threshold
  ORDER BY dc.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- 6. Campanhas geradas pelo Campaign Studio
CREATE TABLE instagram_campaigns (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title            TEXT NOT NULL,
  status           TEXT DEFAULT 'DRAFT',
  -- DRAFT | GENERATING | REVIEW | APPROVED | SCHEDULED | ARCHIVED

  -- Briefing do usuario
  objective        TEXT,
  target_audience  TEXT,
  theme            TEXT,
  tone_notes       TEXT,
  duration_days    INTEGER,
  start_date       DATE,
  preferred_formats TEXT[],

  -- Metadados de geracao
  context_chunks_used INTEGER,
  model_used          TEXT,
  generation_time_ms  INTEGER,
  generated_at        TIMESTAMP WITH TIME ZONE,

  -- Output da IA
  campaign_summary    TEXT,
  strategic_rationale TEXT,

  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaigns_status ON instagram_campaigns(status);

-- 7. Posts individuais de cada campanha
CREATE TABLE campaign_posts (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      UUID REFERENCES instagram_campaigns(id) ON DELETE CASCADE,
  post_order       INTEGER NOT NULL,

  -- Conteudo gerado pela IA
  format           TEXT NOT NULL,      -- REEL | CAROUSEL | IMAGE | STORY
  scheduled_for    TIMESTAMP WITH TIME ZONE,
  caption          TEXT,
  hashtags         TEXT[],
  cta              TEXT,
  visual_brief     TEXT,
  reel_concept     TEXT,
  reel_duration    TEXT,
  audio_suggestion TEXT,
  slides           JSONB,
  strategic_note   TEXT,

  -- Edicoes do analista (preserva original)
  caption_edited   TEXT,
  hashtags_edited  TEXT[],
  visual_notes     TEXT,

  -- Status de revisao
  status           TEXT DEFAULT 'PENDING',
  -- PENDING | APPROVED | REVISION_REQUESTED
  analyst_notes    TEXT,

  -- Vinculo com o calendario editorial apos agendamento
  calendar_entry_id UUID REFERENCES instagram_editorial_calendar(id),

  created_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_campaign_posts_campaign ON campaign_posts(campaign_id);
