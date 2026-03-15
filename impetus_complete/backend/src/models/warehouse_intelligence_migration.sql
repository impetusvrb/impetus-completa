-- ============================================================================
-- IMPETUS - Estrutura Administrativa do Módulo de Almoxarifado Inteligente
-- Cadastros: categorias, materiais, fornecedores, localizações, parâmetros,
--            movimentações, vínculos com processos (produção, manutenção, OS)
-- ============================================================================

-- 1) CATEGORIAS DE MATERIAIS (matéria-prima, peças, ferramentas, insumos, etc.)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_material_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  code TEXT,
  description TEXT,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_categories_company ON warehouse_material_categories(company_id);

-- 2) FORNECEDORES
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_suppliers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  cnpj TEXT,
  material_types_supplied TEXT[] DEFAULT '{}',
  commercial_contact TEXT,
  contact_email TEXT,
  contact_phone TEXT,
  avg_delivery_days INTEGER,
  notes TEXT,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_suppliers_company ON warehouse_suppliers(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_suppliers_cnpj ON warehouse_suppliers(company_id, cnpj) WHERE cnpj IS NOT NULL;

-- 3) LOCALIZAÇÕES DE ESTOQUE (galpão, corredor, prateleira)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  warehouse_sector TEXT NOT NULL,
  aisle_area TEXT,
  shelf_position TEXT,
  description TEXT,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_locations_company ON warehouse_locations(company_id);

-- 4) CADASTRO DE MATERIAIS
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  code TEXT NOT NULL,
  category_id UUID REFERENCES warehouse_material_categories(id) ON DELETE SET NULL,
  default_supplier_id UUID REFERENCES warehouse_suppliers(id) ON DELETE SET NULL,

  unit TEXT NOT NULL DEFAULT 'UN',
  technical_description TEXT,
  min_stock NUMERIC(14,4) DEFAULT 0,
  ideal_stock NUMERIC(14,4) DEFAULT 0,
  usage_type TEXT CHECK (usage_type IN ('production', 'maintenance', 'general')),

  default_location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_materials_company ON warehouse_materials(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_materials_category ON warehouse_materials(category_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_materials_supplier ON warehouse_materials(default_supplier_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_materials_code ON warehouse_materials(company_id, code);
CREATE INDEX IF NOT EXISTS idx_warehouse_materials_usage ON warehouse_materials(company_id, usage_type);

-- 5) PARÂMETROS DE ESTOQUE (por empresa - base para IA)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_params (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL UNIQUE REFERENCES companies(id) ON DELETE CASCADE,

  min_safety_stock_pct NUMERIC(5,2) DEFAULT 20,
  critical_level_pct NUMERIC(5,2) DEFAULT 10,
  replenishment_alert_days INTEGER DEFAULT 7,
  consumption_analysis_frequency TEXT DEFAULT 'daily' CHECK (consumption_analysis_frequency IN ('hourly', 'daily', 'weekly', 'monthly')),

  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_params_company ON warehouse_params(company_id);

-- 6) SALDO ATUAL (cache para consultas rápidas - atualizado pelas movimentações)
-- Simplificado: um saldo por (company_id, material_id) - localização opcional para futuro
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES warehouse_materials(id) ON DELETE CASCADE,
  location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,

  quantity NUMERIC(14,4) NOT NULL DEFAULT 0,

  last_movement_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, material_id)
);

CREATE INDEX IF NOT EXISTS idx_warehouse_balances_company ON warehouse_balances(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_balances_material ON warehouse_balances(material_id);

-- 7) MOVIMENTAÇÕES DE ESTOQUE (entrada, saída, consumo, ajuste)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES warehouse_materials(id) ON DELETE CASCADE,

  movement_type TEXT NOT NULL CHECK (movement_type IN ('entrada', 'saida', 'consumo_producao', 'consumo_manutencao', 'ajuste')),
  quantity NUMERIC(14,4) NOT NULL,

  location_id UUID REFERENCES warehouse_locations(id) ON DELETE SET NULL,

  reference_type TEXT,
  reference_id TEXT,
  work_order_id UUID,
  process_id UUID REFERENCES company_processes(id) ON DELETE SET NULL,
  production_line_id UUID REFERENCES production_lines(id) ON DELETE SET NULL,
  asset_id UUID REFERENCES assets(id) ON DELETE SET NULL,

  user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  notes TEXT,
  document_ref TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_movements_company ON warehouse_movements(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_material ON warehouse_movements(material_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_type ON warehouse_movements(company_id, movement_type);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_date ON warehouse_movements(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_warehouse_movements_work_order ON warehouse_movements(work_order_id) WHERE work_order_id IS NOT NULL;

-- FK work_orders (criada em maintenance_operational)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'work_orders') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fk_warehouse_movements_wo') THEN
      ALTER TABLE warehouse_movements ADD CONSTRAINT fk_warehouse_movements_wo
        FOREIGN KEY (work_order_id) REFERENCES work_orders(id) ON DELETE SET NULL;
    END IF;
  END IF;
EXCEPTION WHEN OTHERS THEN NULL;
END $$;

-- 8) VÍNCULO MATERIAIS x PROCESSOS (produção, manutenção, OS, operacional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS warehouse_material_process_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  material_id UUID NOT NULL REFERENCES warehouse_materials(id) ON DELETE CASCADE,

  link_type TEXT NOT NULL CHECK (link_type IN ('production', 'maintenance', 'service_order', 'operational')),

  process_id UUID REFERENCES company_processes(id) ON DELETE CASCADE,
  production_line_id UUID REFERENCES production_lines(id) ON DELETE CASCADE,
  asset_id UUID REFERENCES assets(id) ON DELETE CASCADE,
  department_id UUID REFERENCES departments(id) ON DELETE CASCADE,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_warehouse_links_company ON warehouse_material_process_links(company_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_links_material ON warehouse_material_process_links(material_id);
CREATE INDEX IF NOT EXISTS idx_warehouse_links_type ON warehouse_material_process_links(company_id, link_type);
