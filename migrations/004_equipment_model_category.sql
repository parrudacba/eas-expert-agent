-- ============================================================
-- Migration 004: Categoria para modelos de equipamento
-- Execute no Supabase SQL Editor
-- ============================================================

ALTER TABLE equipment_models
  ADD COLUMN IF NOT EXISTS category TEXT;

-- Índice para filtragem por categoria
CREATE INDEX IF NOT EXISTS idx_equipment_models_category ON equipment_models(category);
