'use strict';

/**
 * M1.3 — Analytics Foundation Service
 * Bounded context: industrial_analytics
 * READ ONLY / NO AUTO ACTION — Foundation layer only.
 */

const { v4: uuidv4 } = require('uuid');
const { validatePayload } = require('../validators/analyticsValidator');
const schemas = require('../schemas/analyticsSchemas');
const { ANALYTICS_EVENTS } = require('../events/analyticsCatalog');

const LAYER = 'ANALYTICS_FOUNDATION';

function _buildCorrelationId() {
  return `analytics-${Date.now()}-${uuidv4().slice(0, 8)}`;
}

function _emitEvent(eventBus, type, payload, companyId) {
  if (!eventBus) return;
  const entry = ANALYTICS_EVENTS.find((e) => e.type === type);
  eventBus.emit('industrial.event', {
    type,
    domain: 'analytics',
    company_id: companyId,
    critical: entry?.critical ?? false,
    payload,
    correlation_id: payload.correlation_id || _buildCorrelationId(),
    emitted_at: new Date().toISOString()
  });
}

async function recordKpi(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.KPI_RECORD_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO analytics_kpi_registry (id, company_id, kpi_code, domain, value, unit, period_start, period_end, dimension, dimension_id, target_value, threshold_min, threshold_max, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14)
  `, [id, data.company_id, data.kpi_code, data.domain || 'general', data.value, data.unit || null, data.period_start, data.period_end, data.dimension || null, data.dimension_id || null, data.target_value || null, data.threshold_min || null, data.threshold_max || null, now]);

  _emitEvent(eventBus, 'analytics.kpi.generated', { id, ...data }, data.company_id);

  if (data.threshold_max != null && data.value > data.threshold_max) {
    _emitEvent(eventBus, 'analytics.threshold.breached', { id, ...data, breach: 'above_max' }, data.company_id);
  }
  if (data.threshold_min != null && data.value < data.threshold_min) {
    _emitEvent(eventBus, 'analytics.threshold.breached', { id, ...data, breach: 'below_min' }, data.company_id);
  }

  return { ok: true, id };
}

async function recordAggregation(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.AGGREGATION_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO analytics_aggregations (id, company_id, metric_code, granularity, period_start, period_end, value, count, min_value, max_value, avg_value, domain, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13)
  `, [id, data.company_id, data.metric_code, data.granularity, data.period_start, data.period_end, data.value, data.count || null, data.min_value || null, data.max_value || null, data.avg_value || null, data.domain || 'general', now]);

  _emitEvent(eventBus, 'analytics.aggregation.completed', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function recordTrend(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.TREND_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO analytics_trends (id, company_id, metric_code, direction, confidence, slope, window_hours, data_points, domain, detected_at, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [id, data.company_id, data.metric_code, data.direction, data.confidence, data.slope || null, data.window_hours || null, data.data_points || null, data.domain || 'general', now, now]);

  _emitEvent(eventBus, 'analytics.trend.detected', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function recordForecast(db, data, { eventBus } = {}) {
  const validation = validatePayload(schemas.FORECAST_SCHEMA, data);
  if (!validation.valid) return { ok: false, errors: validation.errors };

  const id = uuidv4();
  const now = new Date().toISOString();

  await db.query(`
    INSERT INTO analytics_forecasts (id, company_id, metric_code, horizon_hours, predicted_value, confidence_lower, confidence_upper, model, domain, generated_at, created_at)
    VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)
  `, [id, data.company_id, data.metric_code, data.horizon_hours, data.predicted_value, data.confidence_lower || null, data.confidence_upper || null, data.model || 'linear', data.domain || 'general', now, now]);

  _emitEvent(eventBus, 'analytics.forecast.generated', { id, ...data }, data.company_id);
  return { ok: true, id };
}

async function getHealth(db, companyId) {
  try {
    const [kpis, aggregations, trends, forecasts] = await Promise.all([
      db.query(`SELECT COUNT(*)::int AS cnt FROM analytics_kpi_registry WHERE company_id = $1`, [companyId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM analytics_aggregations WHERE company_id = $1`, [companyId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM analytics_trends WHERE company_id = $1`, [companyId]),
      db.query(`SELECT COUNT(*)::int AS cnt FROM analytics_forecasts WHERE company_id = $1`, [companyId])
    ]);
    return {
      ok: true,
      layer: LAYER,
      domain: 'analytics',
      company_id: companyId,
      counts: {
        kpi_records: kpis.rows[0]?.cnt ?? 0,
        aggregations: aggregations.rows[0]?.cnt ?? 0,
        trends: trends.rows[0]?.cnt ?? 0,
        forecasts: forecasts.rows[0]?.cnt ?? 0
      }
    };
  } catch (err) {
    return { ok: false, layer: LAYER, error: err.message };
  }
}

module.exports = {
  LAYER,
  recordKpi,
  recordAggregation,
  recordTrend,
  recordForecast,
  getHealth
};
