-- ============================================================
-- Migration 003: Nome customizado para sessões de chat
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE chat_sessions
  ADD COLUMN IF NOT EXISTS name TEXT;

-- Índice para buscas por nome (opcional, mas útil)
CREATE INDEX IF NOT EXISTS idx_chat_sessions_name ON chat_sessions(name);
