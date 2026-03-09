-- ============================================================================
-- CORREÇÕES DE SCHEMA - Pendências para excelência
-- monitored_points.active, proposals.title, institutional_policies
-- ============================================================================

-- monitored_points: coluna active (view v_dashboard_summary usa)
ALTER TABLE monitored_points ADD COLUMN IF NOT EXISTS active BOOLEAN DEFAULT true;
UPDATE monitored_points SET active = true WHERE active IS NULL;

-- proposals: coluna title (smartSummary e listagens usam)
ALTER TABLE proposals ADD COLUMN IF NOT EXISTS title TEXT;
UPDATE proposals SET title = COALESCE(LEFT(proposed_solution, 200), problem_category, 'Proposta') WHERE title IS NULL AND (proposed_solution IS NOT NULL OR problem_category IS NOT NULL);
UPDATE proposals SET title = 'Proposta' WHERE title IS NULL;

-- (UNIQUE em institutional_policies já criado em complete_schema)
