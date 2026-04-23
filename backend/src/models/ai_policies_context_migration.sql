-- ============================================================================
-- IMPETUS — Context-Aware Policy Engine (módulo, cargo, operação — opcionais)
-- NULL em qualquer coluna = wildcard na resolução (comportamento legado preservado).
-- ============================================================================

ALTER TABLE ai_policies
  ADD COLUMN IF NOT EXISTS module_name VARCHAR(96),
  ADD COLUMN IF NOT EXISTS user_role VARCHAR(96),
  ADD COLUMN IF NOT EXISTS operation_type VARCHAR(96);

COMMENT ON COLUMN ai_policies.module_name IS
  'Se preenchido, política aplica-se apenas quando o contexto do pedido coincide (ex.: manutencao_ia).';
COMMENT ON COLUMN ai_policies.user_role IS
  'Se preenchido, política aplica-se apenas quando o perfil do utilizador (servidor) coincide.';
COMMENT ON COLUMN ai_policies.operation_type IS
  'Se preenchido, política aplica-se apenas quando a operação declarada no pedido coincide.';

CREATE INDEX IF NOT EXISTS idx_ai_policies_context_company
  ON ai_policies (company_id, module_name, user_role, operation_type, is_active)
  WHERE is_active = true AND company_id IS NOT NULL;
