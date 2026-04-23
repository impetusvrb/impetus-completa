-- Permite incidentes de segurança (Red Team / prompt injection) no admin-portal.
-- Execute após ai_incidents_migration.sql

ALTER TABLE ai_incidents DROP CONSTRAINT IF EXISTS ai_incidents_incident_type_check;

ALTER TABLE ai_incidents
  ADD CONSTRAINT ai_incidents_incident_type_check
  CHECK (
    incident_type IN (
      'ALUCINACAO',
      'DADO_INCORRETO',
      'VIES',
      'COMPORTAMENTO_INADEQUADO',
      'UNKNOWN',
      'TENTATIVA_DE_INVASAO'
    )
  );

COMMENT ON COLUMN ai_incidents.incident_type IS
  'Inclui TENTATIVA_DE_INVASAO para tentativas de prompt injection / exfiltração (Red Team).';
