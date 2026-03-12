-- ============================================================================
-- IMPETUS - Módulo de Logística Inteligente + Expedição Monitorada
-- Veículos, Rotas, Pontos, Motoristas, Expedições, Alertas, Telemetria
-- ============================================================================

-- 1) VEÍCULOS E FROTA
-- tipos: caminhao, van, empilhadeira, drone_logistico, carreta, utilitario
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_vehicles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  vehicle_type TEXT NOT NULL CHECK (vehicle_type IN ('caminhao', 'van', 'empilhadeira', 'drone_logistico', 'carreta', 'utilitario')),
  plate_or_id TEXT NOT NULL,
  capacity_kg NUMERIC(14,2),
  capacity_m3 NUMERIC(14,2),
  allowed_cargo_types TEXT[] DEFAULT '{}',
  avg_consumption NUMERIC(10,2),
  consumption_unit TEXT DEFAULT 'km/l',

  status TEXT DEFAULT 'available' CHECK (status IN ('available', 'in_use', 'maintenance', 'inactive')),
  scheduled_maintenance DATE,
  odometer_km NUMERIC(12,2) DEFAULT 0,
  assigned_driver_id UUID,
  driver_name TEXT,
  has_telemetry BOOLEAN DEFAULT false,
  telemetry_device_id TEXT,

  notes TEXT,
  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),

  UNIQUE(company_id, plate_or_id)
);

CREATE INDEX IF NOT EXISTS idx_logistics_vehicles_company ON logistics_vehicles(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_vehicles_status ON logistics_vehicles(company_id, status);
CREATE INDEX IF NOT EXISTS idx_logistics_vehicles_type ON logistics_vehicles(company_id, vehicle_type);

-- 2) PONTOS LOGÍSTICOS (docas, armazéns, CD, clientes)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_points (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  point_type TEXT NOT NULL CHECK (point_type IN ('doca', 'armazem', 'centro_distribuicao', 'estoque_intermediario', 'cliente', 'outro')),
  name TEXT NOT NULL,
  code TEXT,
  address TEXT,
  capacity_kg NUMERIC(14,2),
  capacity_m3 NUMERIC(14,2),
  avg_operation_time_minutes INTEGER,
  responsible_ids UUID[] DEFAULT '{}',
  operating_hours TEXT,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_points_company ON logistics_points(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_points_type ON logistics_points(company_id, point_type);

-- 3) ROTAS LOGÍSTICAS
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_routes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  origin_point_id UUID REFERENCES logistics_points(id) ON DELETE SET NULL,
  destination_point_id UUID REFERENCES logistics_points(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  origin_description TEXT,
  destination_description TEXT,
  distance_km NUMERIC(10,2),
  avg_duration_minutes INTEGER,
  logistic_risk_level TEXT CHECK (logistic_risk_level IN ('low', 'medium', 'high', 'critical')),
  stop_points JSONB DEFAULT '[]',
  critical_points JSONB DEFAULT '[]',
  alternative_routes JSONB DEFAULT '[]',

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_routes_company ON logistics_routes(company_id);

-- 4) MOTORISTAS E OPERADORES LOGÍSTICOS
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_drivers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE SET NULL,

  name TEXT NOT NULL,
  role_type TEXT NOT NULL CHECK (role_type IN ('motorista', 'operador_empilhadeira', 'operador_carga', 'supervisor_logistica', 'outro')),
  license_number TEXT,
  license_category TEXT,
  trainings TEXT[] DEFAULT '{}',
  performance_score NUMERIC(5,2),
  occurrence_count INTEGER DEFAULT 0,
  notes TEXT,

  active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_drivers_company ON logistics_drivers(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_drivers_user ON logistics_drivers(user_id);

-- 5) EXPEDIÇÕES
-- status: aguardando_expedicao, em_carregamento, em_transito, entregue, atraso_detectado, problema_logistico
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_expeditions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  order_ref TEXT,
  product_ref TEXT,
  quantity NUMERIC(14,4),
  weight_kg NUMERIC(14,2),
  vehicle_id UUID REFERENCES logistics_vehicles(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES logistics_drivers(id) ON DELETE SET NULL,
  route_id UUID REFERENCES logistics_routes(id) ON DELETE SET NULL,

  origin_point_id UUID REFERENCES logistics_points(id) ON DELETE SET NULL,
  destination_point_id UUID REFERENCES logistics_points(id) ON DELETE SET NULL,

  status TEXT NOT NULL DEFAULT 'aguardando_expedicao' CHECK (status IN (
    'aguardando_expedicao', 'em_carregamento', 'em_transito', 'entregue',
    'atraso_detectado', 'problema_logistico'
  )),
  departure_at TIMESTAMPTZ,
  estimated_arrival_at TIMESTAMPTZ,
  actual_arrival_at TIMESTAMPTZ,
  delay_minutes INTEGER,

  notes TEXT,
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  created_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_logistics_expeditions_company ON logistics_expeditions(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_expeditions_status ON logistics_expeditions(company_id, status);
CREATE INDEX IF NOT EXISTS idx_logistics_expeditions_departure ON logistics_expeditions(company_id, departure_at DESC);
CREATE INDEX IF NOT EXISTS idx_logistics_expeditions_driver ON logistics_expeditions(driver_id);
CREATE INDEX IF NOT EXISTS idx_logistics_expeditions_vehicle ON logistics_expeditions(vehicle_id);

-- 6) ALERTAS LOGÍSTICOS (distribuição por cargo)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

  alert_type TEXT NOT NULL,
  severity TEXT DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  title TEXT NOT NULL,
  description TEXT,
  ai_analysis TEXT,
  ai_recommendations JSONB DEFAULT '[]',

  entity_type TEXT,
  entity_id TEXT,
  expedition_id UUID REFERENCES logistics_expeditions(id) ON DELETE SET NULL,
  vehicle_id UUID REFERENCES logistics_vehicles(id) ON DELETE SET NULL,
  route_id UUID REFERENCES logistics_routes(id) ON DELETE SET NULL,
  driver_id UUID REFERENCES logistics_drivers(id) ON DELETE SET NULL,
  metrics JSONB DEFAULT '{}',

  target_role_level INTEGER,
  target_functional_area TEXT[],

  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id) ON DELETE SET NULL,
  acknowledged_at TIMESTAMPTZ,

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_alerts_company ON logistics_alerts(company_id);
CREATE INDEX IF NOT EXISTS idx_logistics_alerts_created ON logistics_alerts(company_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_logistics_alerts_target ON logistics_alerts(company_id, target_role_level);

-- 7) TELEMETRIA / IoT (opcional)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_telemetry (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  vehicle_id UUID REFERENCES logistics_vehicles(id) ON DELETE CASCADE,

  recorded_at TIMESTAMPTZ NOT NULL,
  latitude NUMERIC(10,6),
  longitude NUMERIC(10,6),
  speed_kmh NUMERIC(8,2),
  odometer_km NUMERIC(12,2),
  fuel_level NUMERIC(5,2),
  load_weight_kg NUMERIC(14,2),
  temperature_c NUMERIC(5,2),
  engine_status TEXT,
  raw_data JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_logistics_telemetry_vehicle ON logistics_telemetry(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_logistics_telemetry_time ON logistics_telemetry(company_id, recorded_at DESC);

-- 8) SNAPSHOT DE INDICADORES (memória logística)
-- ============================================================================
CREATE TABLE IF NOT EXISTS logistics_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  snapshot_date DATE NOT NULL,

  deliveries_total INTEGER DEFAULT 0,
  deliveries_on_time INTEGER DEFAULT 0,
  deliveries_delayed INTEGER DEFAULT 0,
  avg_route_time_minutes NUMERIC(10,2),
  fleet_utilization_pct NUMERIC(5,2),
  total_distance_km NUMERIC(14,2),
  total_weight_kg NUMERIC(14,2),
  bottleneck_count INTEGER DEFAULT 0,
  by_route JSONB DEFAULT '{}',
  by_driver JSONB DEFAULT '{}',
  by_vehicle JSONB DEFAULT '{}',

  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(company_id, snapshot_date)
);

CREATE INDEX IF NOT EXISTS idx_logistics_snapshots_date ON logistics_snapshots(company_id, snapshot_date DESC);
