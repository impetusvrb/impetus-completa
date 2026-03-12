-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;
-- CREATE EXTENSION IF NOT EXISTS vector; -- REMOVIDO (pgvector não instalado no Windows)

CREATE TABLE IF NOT EXISTS users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  email text UNIQUE,
  role text NOT NULL,
  password text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source text,
  sender text,
  text text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS manuals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  title text,
  filename text,
  content_text text,
  created_at timestamptz DEFAULT now()
);

-- ALTERADO: embedding agora é TEXT (antes era vector(1536))
CREATE TABLE IF NOT EXISTS manual_chunks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  manual_id uuid REFERENCES manuals(id) ON DELETE CASCADE,
  chunk_text text,
  embedding text
);

CREATE TABLE IF NOT EXISTS tasks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text,
  description text,
  assignee text,
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

-- Proposals and proacao tables
CREATE TABLE IF NOT EXISTS proposals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  reporter_id uuid,
  reporter_name text,
  location text,
  equipment_id text,
  problem_category text,
  process_type text,
  frequency text,
  probable_causes text,
  consequences text,
  proposed_solution text,
  expected_benefits text,
  urgency integer,
  attachments jsonb,
  notes text,
  status text DEFAULT 'submitted',
  ai_score jsonb,
  assigned_project_id uuid,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS proposal_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  proposal_id uuid REFERENCES proposals(id) ON DELETE CASCADE,
  user_id uuid,
  action text,
  comment text,
  metadata jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  type text,
  severity text,
  title text,
  description text,
  related_proposal uuid REFERENCES proposals(id),
  metadata jsonb,
  created_at timestamptz DEFAULT now(),
  resolved boolean DEFAULT false,
  resolved_at timestamptz
);

CREATE TABLE IF NOT EXISTS proacao_rules (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid,
  name text,
  enabled boolean DEFAULT true,
  definition jsonb,
  created_at timestamptz DEFAULT now()
);

-- TABELA COMPANIES (garantir que exista)
CREATE TABLE IF NOT EXISTS companies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  active boolean DEFAULT true,
  plan_type text DEFAULT 'basic',
  created_at timestamptz DEFAULT now()
);