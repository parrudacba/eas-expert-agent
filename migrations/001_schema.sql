-- ============================================================
-- EAS EXPERT AGENT - Schema Principal
-- ============================================================

-- Extensão para embeddings vetoriais (RAG)
CREATE EXTENSION IF NOT EXISTS vector;

-- ============================================================
-- TABELA: specialties (Especialidades)
-- EAS | CFTV | Controle de Acesso
-- ============================================================
CREATE TABLE specialties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  slug TEXT NOT NULL UNIQUE,
  description TEXT,
  icon TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: technologies (Tecnologias dentro de cada especialidade)
-- EAS: RF 8.2 MHz | AM 58 kHz
-- CFTV: Analógico | IP
-- ============================================================
CREATE TABLE technologies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  specialty_id UUID NOT NULL REFERENCES specialties(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  frequency TEXT, -- ex: "8.2 MHz", "58 kHz"
  description TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(specialty_id, slug)
);

-- ============================================================
-- TABELA: manufacturers (Fabricantes por tecnologia)
-- ============================================================
CREATE TABLE manufacturers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  technology_id UUID NOT NULL REFERENCES technologies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  logo_url TEXT,
  website TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(technology_id, slug)
);

-- ============================================================
-- TABELA: equipment_models (Modelos de equipamento)
-- ============================================================
CREATE TABLE equipment_models (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  manufacturer_id UUID NOT NULL REFERENCES manufacturers(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  model_code TEXT,
  description TEXT,
  specifications JSONB DEFAULT '{}',
  image_url TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(manufacturer_id, model_code)
);

-- ============================================================
-- TABELA: documents (Base de conhecimento - Manuais e Docs)
-- ============================================================
CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('manual', 'technical_doc', 'procedure', 'bulletin', 'other')),
  content TEXT,
  file_url TEXT,
  -- Segmentação na árvore (pode ser vinculado em qualquer nível)
  specialty_id UUID REFERENCES specialties(id),
  technology_id UUID REFERENCES technologies(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  equipment_model_id UUID REFERENCES equipment_models(id),
  -- Embedding para RAG
  embedding VECTOR(1536),
  metadata JSONB DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: field_issues (Problemas encontrados em campo)
-- ============================================================
CREATE TABLE field_issues (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  equipment_model_id UUID REFERENCES equipment_models(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  technology_id UUID REFERENCES technologies(id),
  specialty_id UUID REFERENCES specialties(id),
  title TEXT NOT NULL,
  description TEXT NOT NULL,
  symptoms TEXT[],
  environment_context TEXT, -- contexto do local/instalação
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'validated')),
  reported_by UUID REFERENCES auth.users(id),
  resolved_by UUID REFERENCES auth.users(id),
  embedding VECTOR(1536),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: issue_solutions (Soluções para problemas de campo)
-- ============================================================
CREATE TABLE issue_solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  field_issue_id UUID NOT NULL REFERENCES field_issues(id) ON DELETE CASCADE,
  solution TEXT NOT NULL,
  steps TEXT[], -- passos da solução
  tools_needed TEXT[], -- ferramentas necessárias
  is_approved BOOLEAN DEFAULT FALSE,
  approved_by UUID REFERENCES auth.users(id),
  approved_at TIMESTAMPTZ,
  created_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: profiles (Perfis de usuário - estende auth.users)
-- ============================================================
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT,
  role TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('admin', 'manager', 'technician', 'trainee')),
  phone TEXT,
  whatsapp_number TEXT,
  whatsapp_authorized BOOLEAN DEFAULT FALSE,
  region TEXT,
  avatar_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: chat_sessions (Sessões de conversa)
-- ============================================================
CREATE TABLE chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  mode TEXT NOT NULL DEFAULT 'support' CHECK (mode IN ('support', 'training')),
  channel TEXT NOT NULL DEFAULT 'web' CHECK (channel IN ('web', 'whatsapp')),
  -- Contexto da árvore selecionado pelo usuário
  specialty_id UUID REFERENCES specialties(id),
  technology_id UUID REFERENCES technologies(id),
  manufacturer_id UUID REFERENCES manufacturers(id),
  equipment_model_id UUID REFERENCES equipment_models(id),
  -- Metadados
  summary TEXT, -- resumo gerado pela IA ao final
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: chat_messages (Mensagens das sessões)
-- ============================================================
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  tokens_used INTEGER,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- TABELA: authorized_whatsapp_users (WhatsApp com acesso restrito)
-- ============================================================
CREATE TABLE authorized_whatsapp_users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  phone_number TEXT NOT NULL UNIQUE,
  name TEXT NOT NULL,
  user_id UUID REFERENCES auth.users(id),
  is_active BOOLEAN DEFAULT TRUE,
  authorized_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================
-- ÍNDICES para performance
-- ============================================================
CREATE INDEX idx_technologies_specialty ON technologies(specialty_id);
CREATE INDEX idx_manufacturers_technology ON manufacturers(technology_id);
CREATE INDEX idx_equipment_models_manufacturer ON equipment_models(manufacturer_id);
CREATE INDEX idx_documents_specialty ON documents(specialty_id);
CREATE INDEX idx_documents_technology ON documents(technology_id);
CREATE INDEX idx_documents_manufacturer ON documents(manufacturer_id);
CREATE INDEX idx_documents_model ON documents(equipment_model_id);
CREATE INDEX idx_field_issues_model ON field_issues(equipment_model_id);
CREATE INDEX idx_field_issues_status ON field_issues(status);
CREATE INDEX idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX idx_chat_messages_session ON chat_messages(session_id);

-- Índices vetoriais para RAG
CREATE INDEX idx_documents_embedding ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
CREATE INDEX idx_field_issues_embedding ON field_issues USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE specialties ENABLE ROW LEVEL SECURITY;
ALTER TABLE technologies ENABLE ROW LEVEL SECURITY;
ALTER TABLE manufacturers ENABLE ROW LEVEL SECURITY;
ALTER TABLE equipment_models ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE field_issues ENABLE ROW LEVEL SECURITY;
ALTER TABLE issue_solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE authorized_whatsapp_users ENABLE ROW LEVEL SECURITY;

-- Políticas públicas de leitura para estrutura base
CREATE POLICY "Especialidades visíveis para autenticados" ON specialties FOR SELECT TO authenticated USING (true);
CREATE POLICY "Tecnologias visíveis para autenticados" ON technologies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Fabricantes visíveis para autenticados" ON manufacturers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Modelos visíveis para autenticados" ON equipment_models FOR SELECT TO authenticated USING (true);
CREATE POLICY "Documentos visíveis para autenticados" ON documents FOR SELECT TO authenticated USING (true);

-- Políticas de perfil
CREATE POLICY "Usuário vê próprio perfil" ON profiles FOR SELECT TO authenticated USING (auth.uid() = id);
CREATE POLICY "Usuário edita próprio perfil" ON profiles FOR UPDATE TO authenticated USING (auth.uid() = id);

-- Políticas de chat
CREATE POLICY "Usuário vê próprias sessões" ON chat_sessions FOR ALL TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Usuário vê mensagens de suas sessões" ON chat_messages FOR ALL TO authenticated
  USING (session_id IN (SELECT id FROM chat_sessions WHERE user_id = auth.uid()));

-- Políticas de field_issues
CREATE POLICY "Autenticados veem issues" ON field_issues FOR SELECT TO authenticated USING (true);
CREATE POLICY "Autenticados criam issues" ON field_issues FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Autenticados veem soluções" ON issue_solutions FOR SELECT TO authenticated USING (true);

-- Políticas de admin (service_role bypassa RLS automaticamente)
CREATE POLICY "Admin gerencia documentos" ON documents FOR ALL TO authenticated
  USING (EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role IN ('admin', 'manager')));

-- ============================================================
-- TRIGGER: Criar perfil ao registrar usuário
-- ============================================================
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO profiles (id, full_name, role)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name', 'technician');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- TRIGGER: updated_at automático
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_documents_updated_at BEFORE UPDATE ON documents FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_field_issues_updated_at BEFORE UPDATE ON field_issues FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_chat_sessions_updated_at BEFORE UPDATE ON chat_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_profiles_updated_at BEFORE UPDATE ON profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- ============================================================
-- FUNÇÃO: Busca semântica por similaridade (RAG)
-- ============================================================
CREATE OR REPLACE FUNCTION search_documents(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_specialty_id UUID DEFAULT NULL,
  filter_technology_id UUID DEFAULT NULL,
  filter_manufacturer_id UUID DEFAULT NULL,
  filter_model_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  content TEXT,
  type TEXT,
  similarity FLOAT,
  specialty_id UUID,
  technology_id UUID,
  manufacturer_id UUID,
  equipment_model_id UUID
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    d.id, d.title, d.content, d.type,
    1 - (d.embedding <=> query_embedding) AS similarity,
    d.specialty_id, d.technology_id, d.manufacturer_id, d.equipment_model_id
  FROM documents d
  WHERE
    d.is_active = TRUE
    AND d.embedding IS NOT NULL
    AND 1 - (d.embedding <=> query_embedding) > match_threshold
    AND (filter_specialty_id IS NULL OR d.specialty_id = filter_specialty_id)
    AND (filter_technology_id IS NULL OR d.technology_id = filter_technology_id)
    AND (filter_manufacturer_id IS NULL OR d.manufacturer_id = filter_manufacturer_id)
    AND (filter_model_id IS NULL OR d.equipment_model_id = filter_model_id)
  ORDER BY d.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;

-- Função similar para field_issues
CREATE OR REPLACE FUNCTION search_field_issues(
  query_embedding VECTOR(1536),
  match_threshold FLOAT DEFAULT 0.7,
  match_count INT DEFAULT 5,
  filter_technology_id UUID DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  title TEXT,
  description TEXT,
  symptoms TEXT[],
  status TEXT,
  similarity FLOAT
)
LANGUAGE plpgsql AS $$
BEGIN
  RETURN QUERY
  SELECT
    fi.id, fi.title, fi.description, fi.symptoms, fi.status,
    1 - (fi.embedding <=> query_embedding) AS similarity
  FROM field_issues fi
  WHERE
    fi.embedding IS NOT NULL
    AND 1 - (fi.embedding <=> query_embedding) > match_threshold
    AND (filter_technology_id IS NULL OR fi.technology_id = filter_technology_id)
  ORDER BY fi.embedding <=> query_embedding
  LIMIT match_count;
END;
$$;