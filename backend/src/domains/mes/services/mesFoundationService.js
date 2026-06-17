'use strict';

/**
 * M1.1 — MES Foundation Service
 * Bounded context: industrial_mes
 * READ ONLY / NO AUTO ACTION — Foundation layer only.
 *
 * Responsabilidades:
 * - Registar production orders, executions, downtime, scrap, OEE, traceability
 * - Emitir eventos para backbone
 * - Validar payloads
 * - Multi-tenant isolation (company_id scoped)
 */

const { v4: uuidv4 } = require('uuid');
const { validatePayload } = require('../validators/mesValidator');
const schemas = require('../schemas/mesSchemas');
const { MES_EVENTS } = require('../events/mesCatalog');

const LAYER = 'MES_FOUNDATION';

function _buildCorrelationId() {
  return `mes-${Date.now()}-${uuidv4().slice(0, 8)}`;
}

function _emitEvent(eventBus, type, payload, companyId) {
  if (!eventBus) return;
  const entry = MES_EVENTS.find((e) => e.type === type);
  eventBus.emit('industrial.event', {
    type,
    domain: 'mes',
    company_id: companyId,
    critical: entry?.critical ?? false,
    payload,
    correlation_id: payload.correlation_id || _buildCorrelationId(),
    emitted_at: new Date().toISOString()
  });
}

async function createProductionOrder(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.PRODUCTION_ORDER_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();
  const record = { id, ...data, status: 'planned', created_at: now, updated_at: now };

  await db.query(`
    INSERT INTO mes_production_orders (id, company_id, order_number, product_id, quantity_planned, unit, line_id, scheduled_start, scheduled_end, priority, status, created_at, updated_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  `, [id, data.company_id, data.order_number, data.product_id, data.quantity_planned, data.unit || 'un', data.line_id || null, data.scheduled_start || null, data.scheduled_end || null, data.priority || 'normal', 'planned', now, now]);

  _emitEvent(eventBus, 'mes.production_order.created', record, data.company_id);
  return { ok: true, id, record };
}

async function recordProductionExecution(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.PRODUCTION_EXECUTION_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO mes_production_executions (id, company_id, order_id, status, quantity_produced, operator_id, line_id, started_at, completed_at, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [id, data.company_id, data.order_id, data.status, data.quantity_produced || 0, data.operator_id || null, data.line_id || null, data.started_at || now, data.completed_at || null, now]);

  const eventType = data.status === 'started' ? 'mes.production.started' : data.status === 'completed' ? 'mes.production.completed' : null;
  if (eventType) _emitEvent(eventBus, eventType, { id, ...data }, data.company_id);

  return { ok: true, id };
}

async function recordDowntime(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.DOWNTIME_EVENT_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO mes_downtime_events (id, company_id, line_id, equipment_id, reason_code, reason_description, category, started_at, ended_at, duration_minutes, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [id, data.company_id, data.line_id, data.equipment_id || null, data.reason_code, data.reason_description || '', data.category || 'unplanned', data.started_at, data.ended_at || null, data.duration_minutes || null, now]);

  _emitEvent(eventBus, 'mes.downtime.recorded', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function recordScrap(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.SCRAP_EVENT_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO mes_scrap_events (id, company_id, order_id, product_id, quantity, unit, reason_code, reason_description, line_id, detected_at, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [id, data.company_id, data.order_id, data.product_id || null, data.quantity, data.unit || 'un', data.reason_code, data.reason_description || '', data.line_id || null, data.detected_at || now, now]);

  _emitEvent(eventBus, 'mes.scrap.recorded', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function recordOeeSnapshot(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.OEE_INPUT_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const oee = (data.availability_pct || 0) * (data.performance_pct || 0) * (data.quality_pct || 0) / 10000;
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO mes_oee_inputs (id, company_id, line_id, period_start, period_end, availability_pct, performance_pct, quality_pct, oee_pct, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
  `, [id, data.company_id, data.line_id, data.period_start, data.period_end, data.availability_pct || null, data.performance_pct || null, data.quality_pct || null, data.oee_pct ?? Math.round(oee * 10) / 10, now]);

  _emitEvent(eventBus, 'mes.oee.snapshot', { id, ...data, oee_pct: data.oee_pct ?? oee }, data.company_id);
  return { ok: true, id, oee_pct: data.oee_pct ?? oee };
}

async function registerTraceability(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.TRACEABILITY_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO mes_traceability_registry (id, company_id, lot_number, product_id, order_id, raw_materials, process_params, registered_at, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)
  `, [id, data.company_id, data.lot_number, data.product_id, data.order_id || null, JSON.stringify(data.raw_materials || []), JSON.stringify(data.process_params || {}), data.registered_at || now, now]);

  _emitEvent(eventBus, 'mes.traceability.registered', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function getHealth(db, companyId) {
  try {
    const [orders, executions, downtime] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS cnt FROM mes_production_orders WHERE company_id = $1`, [companyId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM mes_production_executions WHERE company_id = $1`, [companyId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM mes_downtime_events WHERE company_id = $1`, [companyId])
    ]);
    return {
      ok: true,
      layer: LAYER,
      domain: 'mes',
      company_id: companyId,
      counts: {
        production_orders: orders.rows[0]?.cnt ?? 0,
        executions: executions.rows[0]?.cnt ?? 0,
        downtime_events: downtime.rows[0]?.cnt ?? 0
      }
    };
  } catch (err) {
    return { ok: false, layer: LAYER, error: err.message };
  }
}

module.exports = {
  LAYER,
  createProductionOrder,
  recordProductionExecution,
  recordDowntime,
  recordScrap,
  recordOeeSnapshot,
  registerTraceability,
  getHealth
};
