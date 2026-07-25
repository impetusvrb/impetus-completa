-- =============================================================================
-- WMS-001 — Logistics Operational Foundation (SSOT)
-- Aditivo, idempotente. Não altera runtime cognitivo logistics_native homologado.
-- Prefixo canónico: wms_* (bounded context logistics-operational)
-- =============================================================================

-- Warehouse (aggregate root — armazém físico / lógico)
CREATE TABLE IF NOT EXISTS wms_warehouses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  code TEXT NOT NULL,
  name TEXT NOT NULL,
  warehouse_type TEXT NOT NULL DEFAULT 'standard' CHECK (warehouse_type IN ('standard', 'cold', 'hazmat', 'quarantine', 'virtual')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'maintenance')),
  timezone TEXT NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS idx_wms_warehouses_company ON wms_warehouses(company_id);
CREATE INDEX IF NOT EXISTS idx_wms_warehouses_status ON wms_warehouses(company_id, status);

-- WarehouseLocation (zona / corredor / nível dentro do armazém)
CREATE TABLE IF NOT EXISTS wms_warehouse_locations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  location_code TEXT NOT NULL,
  location_type TEXT NOT NULL DEFAULT 'zone' CHECK (location_type IN ('zone', 'aisle', 'bay', 'level', 'dock', 'staging')),
  name TEXT NULL,
  capacity_units NUMERIC(14,4) NULL,
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'blocked', 'maintenance')),
  metadata JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, warehouse_id, location_code)
);

CREATE INDEX IF NOT EXISTS idx_wms_warehouse_locations_wh ON wms_warehouse_locations(company_id, warehouse_id);

-- StorageAddress (endereço físico LPN / posição)
CREATE TABLE IF NOT EXISTS wms_storage_addresses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  location_id UUID NULL REFERENCES wms_warehouse_locations(id) ON DELETE SET NULL,
  address_code TEXT NOT NULL,
  address_type TEXT NOT NULL DEFAULT 'bin' CHECK (address_type IN ('bin', 'pallet', 'floor', 'rack', 'flow')),
  pick_sequence INTEGER NULL,
  max_weight_kg NUMERIC(14,4) NULL,
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'occupied', 'reserved', 'blocked')),
  metadata JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, warehouse_id, address_code)
);

CREATE INDEX IF NOT EXISTS idx_wms_storage_addresses_wh ON wms_storage_addresses(company_id, warehouse_id);

-- InventoryItem (SKU / material master WMS)
CREATE TABLE IF NOT EXISTS wms_inventory_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  item_code TEXT NOT NULL,
  item_name TEXT NOT NULL,
  uom TEXT NOT NULL DEFAULT 'un',
  item_class TEXT NULL,
  lot_controlled BOOLEAN NOT NULL DEFAULT false,
  serial_controlled BOOLEAN NOT NULL DEFAULT false,
  metadata JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, item_code)
);

CREATE INDEX IF NOT EXISTS idx_wms_inventory_items_company ON wms_inventory_items(company_id);

-- InventoryBalance (saldo por endereço / lote)
CREATE TABLE IF NOT EXISTS wms_inventory_balances (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  address_id UUID NULL REFERENCES wms_storage_addresses(id) ON DELETE SET NULL,
  item_id UUID NOT NULL REFERENCES wms_inventory_items(id) ON DELETE CASCADE,
  lot_number TEXT NULL DEFAULT '',
  quantity NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  reserved_quantity NUMERIC(18,6) NOT NULL DEFAULT 0 CHECK (reserved_quantity >= 0),
  uom TEXT NOT NULL DEFAULT 'un',
  status TEXT NOT NULL DEFAULT 'available' CHECK (status IN ('available', 'hold', 'quarantine')),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, warehouse_id, item_id, address_id, lot_number)
);

CREATE INDEX IF NOT EXISTS idx_wms_inventory_balances_item ON wms_inventory_balances(company_id, item_id);

-- InventoryMovement (movimentação — sem regras de negócio nesta fase)
CREATE TABLE IF NOT EXISTS wms_inventory_movements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  item_id UUID NOT NULL REFERENCES wms_inventory_items(id) ON DELETE CASCADE,
  movement_type TEXT NOT NULL CHECK (movement_type IN ('receipt', 'issue', 'transfer', 'adjustment', 'pick', 'putaway')),
  quantity NUMERIC(18,6) NOT NULL,
  uom TEXT NOT NULL DEFAULT 'un',
  from_address_id UUID NULL REFERENCES wms_storage_addresses(id) ON DELETE SET NULL,
  to_address_id UUID NULL REFERENCES wms_storage_addresses(id) ON DELETE SET NULL,
  lot_number TEXT NULL,
  reference_type TEXT NULL,
  reference_id UUID NULL,
  status TEXT NOT NULL DEFAULT 'posted' CHECK (status IN ('draft', 'posted', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_wms_inventory_movements_wh ON wms_inventory_movements(company_id, warehouse_id, created_at DESC);

-- Container (contentor / pallet master)
CREATE TABLE IF NOT EXISTS wms_containers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NULL REFERENCES wms_warehouses(id) ON DELETE SET NULL,
  container_code TEXT NOT NULL,
  container_type TEXT NOT NULL DEFAULT 'pallet' CHECK (container_type IN ('pallet', 'tote', 'carton', 'roll_cage')),
  status TEXT NOT NULL DEFAULT 'empty' CHECK (status IN ('empty', 'in_use', 'sealed', 'shipped')),
  metadata JSONB NOT NULL DEFAULT '{}',
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, container_code)
);

CREATE INDEX IF NOT EXISTS idx_wms_containers_company ON wms_containers(company_id);

-- HandlingUnit (unidade manipulável — LPN operacional)
CREATE TABLE IF NOT EXISTS wms_handling_units (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  hu_code TEXT NOT NULL,
  container_id UUID NULL REFERENCES wms_containers(id) ON DELETE SET NULL,
  address_id UUID NULL REFERENCES wms_storage_addresses(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'closed', 'in_transit', 'shipped')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, hu_code)
);

CREATE INDEX IF NOT EXISTS idx_wms_handling_units_wh ON wms_handling_units(company_id, warehouse_id);

-- ReceivingOrder
CREATE TABLE IF NOT EXISTS wms_receiving_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  supplier_ref TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'completed', 'cancelled')),
  expected_at TIMESTAMPTZ NULL,
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_wms_receiving_orders_wh ON wms_receiving_orders(company_id, warehouse_id);

-- PickingOrder
CREATE TABLE IF NOT EXISTS wms_picking_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  priority INTEGER NOT NULL DEFAULT 5,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'assigned', 'picking', 'completed', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_wms_picking_orders_wh ON wms_picking_orders(company_id, warehouse_id, status);

-- ShippingOrder
CREATE TABLE IF NOT EXISTS wms_shipping_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  carrier_ref TEXT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'staged', 'shipped', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_wms_shipping_orders_wh ON wms_shipping_orders(company_id, warehouse_id);

-- TransferOrder
CREATE TABLE IF NOT EXISTS wms_transfer_orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  from_warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  to_warehouse_id UUID NOT NULL REFERENCES wms_warehouses(id) ON DELETE CASCADE,
  order_number TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_transit', 'received', 'cancelled')),
  metadata JSONB NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (company_id, order_number)
);

CREATE INDEX IF NOT EXISTS idx_wms_transfer_orders_company ON wms_transfer_orders(company_id);
