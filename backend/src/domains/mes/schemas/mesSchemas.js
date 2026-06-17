'use strict';

/**
 * M1.1 — MES Schemas (validação de payload)
 * Bounded context: industrial_mes
 */

const PRODUCTION_ORDER_SCHEMA = {
  required: ['company_id', 'order_number', 'product_id', 'quantity_planned'],
  properties: {
    company_id: { type: 'uuid' },
    order_number: { type: 'string', minLength: 1, maxLength: 64 },
    product_id: { type: 'uuid' },
    quantity_planned: { type: 'number', minimum: 0 },
    unit: { type: 'string', maxLength: 10 },
    line_id: { type: 'uuid' },
    scheduled_start: { type: 'datetime' },
    scheduled_end: { type: 'datetime' },
    priority: { type: 'string', enum: ['low', 'normal', 'high', 'critical'] }
  }
};

const PRODUCTION_EXECUTION_SCHEMA = {
  required: ['company_id', 'order_id', 'status'],
  properties: {
    company_id: { type: 'uuid' },
    order_id: { type: 'uuid' },
    status: { type: 'string', enum: ['started', 'paused', 'completed', 'aborted'] },
    quantity_produced: { type: 'number', minimum: 0 },
    operator_id: { type: 'uuid' },
    line_id: { type: 'uuid' },
    started_at: { type: 'datetime' },
    completed_at: { type: 'datetime' }
  }
};

const DOWNTIME_EVENT_SCHEMA = {
  required: ['company_id', 'line_id', 'reason_code', 'started_at'],
  properties: {
    company_id: { type: 'uuid' },
    line_id: { type: 'uuid' },
    equipment_id: { type: 'uuid' },
    reason_code: { type: 'string', minLength: 1, maxLength: 32 },
    reason_description: { type: 'string', maxLength: 500 },
    category: { type: 'string', enum: ['planned', 'unplanned', 'changeover', 'maintenance', 'quality'] },
    started_at: { type: 'datetime' },
    ended_at: { type: 'datetime' },
    duration_minutes: { type: 'number', minimum: 0 }
  }
};

const SCRAP_EVENT_SCHEMA = {
  required: ['company_id', 'order_id', 'quantity', 'reason_code'],
  properties: {
    company_id: { type: 'uuid' },
    order_id: { type: 'uuid' },
    product_id: { type: 'uuid' },
    quantity: { type: 'number', minimum: 0 },
    unit: { type: 'string', maxLength: 10 },
    reason_code: { type: 'string', minLength: 1, maxLength: 32 },
    reason_description: { type: 'string', maxLength: 500 },
    line_id: { type: 'uuid' },
    detected_at: { type: 'datetime' }
  }
};

const OEE_INPUT_SCHEMA = {
  required: ['company_id', 'line_id', 'period_start', 'period_end'],
  properties: {
    company_id: { type: 'uuid' },
    line_id: { type: 'uuid' },
    period_start: { type: 'datetime' },
    period_end: { type: 'datetime' },
    availability_pct: { type: 'number', minimum: 0, maximum: 100 },
    performance_pct: { type: 'number', minimum: 0, maximum: 100 },
    quality_pct: { type: 'number', minimum: 0, maximum: 100 },
    oee_pct: { type: 'number', minimum: 0, maximum: 100 }
  }
};

const TRACEABILITY_SCHEMA = {
  required: ['company_id', 'lot_number', 'product_id'],
  properties: {
    company_id: { type: 'uuid' },
    lot_number: { type: 'string', minLength: 1, maxLength: 64 },
    product_id: { type: 'uuid' },
    order_id: { type: 'uuid' },
    raw_materials: { type: 'array' },
    process_params: { type: 'object' },
    registered_at: { type: 'datetime' }
  }
};

module.exports = {
  PRODUCTION_ORDER_SCHEMA,
  PRODUCTION_EXECUTION_SCHEMA,
  DOWNTIME_EVENT_SCHEMA,
  SCRAP_EVENT_SCHEMA,
  OEE_INPUT_SCHEMA,
  TRACEABILITY_SCHEMA
};
