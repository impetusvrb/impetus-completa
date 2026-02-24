-- ============================================================================
-- ESTRUTURA ORGANIZACIONAL INTELIGENTE
-- Área, Cargo, Setor/Departamento para personalização de dashboard e IA
-- Mapeamento: Direção=1, Gerência=2, Coordenação=3, Supervisão=4, Colaborador=5
-- ============================================================================

ALTER TABLE users ADD COLUMN IF NOT EXISTS area TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS job_title TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS department TEXT;

COMMENT ON COLUMN users.area IS 'Área organizacional fixa: Direção, Gerência, Coordenação, Supervisão, Colaborador';
COMMENT ON COLUMN users.job_title IS 'Cargo (livre): ex. Diretor Financeiro, Gerente Industrial';
COMMENT ON COLUMN users.department IS 'Setor/Departamento (livre, normalizado): ex. Financeiro, Produção';

-- Preencher area a partir de role/hierarchy_level existentes (migração inicial)
UPDATE users SET area = CASE
  WHEN role = 'ceo' OR hierarchy_level = 0 THEN 'Direção'
  WHEN role = 'diretor' OR hierarchy_level = 1 THEN 'Direção'
  WHEN role = 'gerente' OR hierarchy_level = 2 THEN 'Gerência'
  WHEN role = 'coordenador' OR hierarchy_level = 3 THEN 'Coordenação'
  WHEN role = 'supervisor' OR hierarchy_level = 4 THEN 'Supervisão'
  ELSE 'Colaborador'
END WHERE area IS NULL;
