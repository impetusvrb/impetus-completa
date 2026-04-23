-- ============================================================================
-- IMPETUS — AI Policy Engine (regras dinâmicas por tenant / setor / país)
-- Executar no PostgreSQL após revisão.
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_policies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  sector VARCHAR(64),
  country_code CHAR(2),
  policy_type VARCHAR(32) NOT NULL
    CHECK (policy_type IN ('DATA_ACCESS', 'ANONYMIZATION', 'RESPONSE_LIMIT', 'COMPLIANCE')),
  rules JSONB NOT NULL DEFAULT '{}'::jsonb,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMENT ON TABLE ai_policies IS
  'Políticas de IA: company_id NULL = global; sector/country NULL = wildcard. Resolução: global → país → setor → empresa.';

CREATE INDEX IF NOT EXISTS idx_ai_policies_company_type
  ON ai_policies (company_id, policy_type, is_active) WHERE is_active = true;
CREATE INDEX IF NOT EXISTS idx_ai_policies_country
  ON ai_policies (country_code, policy_type, is_active) WHERE is_active = true AND company_id IS NULL;
CREATE INDEX IF NOT EXISTS idx_ai_policies_sector
  ON ai_policies (sector, policy_type, is_active) WHERE is_active = true AND company_id IS NULL;

-- Contexto opcional para resolução hierárquica (preencher via admin ou API empresas).
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_policy_sector VARCHAR(64);
ALTER TABLE companies ADD COLUMN IF NOT EXISTS ai_policy_country CHAR(2);

COMMENT ON COLUMN companies.ai_policy_sector IS 'Setor para policy engine (ex.: industrial, energia).';
COMMENT ON COLUMN companies.ai_policy_country IS 'ISO-3166-1 alpha-2 para policy engine (ex.: BR, DE).';

ALTER TABLE ai_incidents DROP CONSTRAINT IF EXISTS ai_incidents_incident_type_check;
ALTER TABLE ai_incidents ADD CONSTRAINT ai_incidents_incident_type_check CHECK (
  incident_type IN (
    'ALUCINACAO',
    'DADO_INCORRETO',
    'VIES',
    'COMPORTAMENTO_INADEQUADO',
    'UNKNOWN',
    'TENTATIVA_DE_INVASAO',
    'COMPLIANCE_RISK',
    'POLICY_VIOLATION'
  )
);

-- Exemplos (opcional, após revisão):
-- Política global: resposta média, sem lista de módulos (todos permitidos).
-- INSERT INTO ai_policies (company_id, sector, country_code, policy_type, rules, is_active)
-- VALUES (NULL, NULL, NULL, 'COMPLIANCE', '{"max_response_detail":"medium","require_human_validation":false}'::jsonb, true);
-- Brasil: forçar anonimização de sensível na saída.
-- INSERT INTO ai_policies (company_id, sector, country_code, policy_type, rules, is_active)
-- VALUES (NULL, NULL, 'BR', 'ANONYMIZATION', '{"block_sensitive_data":true,"sensitive_data_action":"anonymize"}'::jsonb, true);
-- Apenas manutenção e qualidade:
-- INSERT INTO ai_policies (company_id, sector, country_code, policy_type, rules, is_active)
-- VALUES (NULL, NULL, NULL, 'DATA_ACCESS', '{"allowed_modules":["manutencao","qualidade","cognitive"]}'::jsonb, true);
