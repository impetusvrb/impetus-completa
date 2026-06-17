'use strict';

/**
 * M1.3 — Analytics Schemas
 * Bounded context: industrial_analytics
 */

const KPI_RECORD_SCHEMA = {
  required: ['company_id', 'kpi_code', 'value', 'period_start', 'period_end'],
  properties: {
    company_id: { type: 'uuid' },
    kpi_code: { type: 'string', minLength: 1, maxLength: 64 },
    domain: { type: 'string', maxLength: 32 },
    value: { type: 'number' },
    unit: { type: 'string', maxLength: 16 },
    period_start: { type: 'datetime' },
    period_end: { type: 'datetime' },
    dimension: { type: 'string', maxLength: 64 },
    dimension_id: { type: 'uuid' },
    target_value: { type: 'number' },
    threshold_min: { type: 'number' },
    threshold_max: { type: 'number' }
  }
};

const AGGREGATION_SCHEMA = {
  required: ['company_id', 'metric_code', 'granularity', 'period_start', 'period_end', 'value'],
  properties: {
    company_id: { type: 'uuid' },
    metric_code: { type: 'string', minLength: 1, maxLength: 64 },
    granularity: { type: 'string', enum: ['hourly', 'daily', 'weekly', 'monthly'] },
    period_start: { type: 'datetime' },
    period_end: { type: 'datetime' },
    value: { type: 'number' },
    count: { type: 'number', minimum: 0 },
    min_value: { type: 'number' },
    max_value: { type: 'number' },
    avg_value: { type: 'number' },
    domain: { type: 'string', maxLength: 32 }
  }
};

const TREND_SCHEMA = {
  required: ['company_id', 'metric_code', 'direction', 'confidence'],
  properties: {
    company_id: { type: 'uuid' },
    metric_code: { type: 'string', minLength: 1, maxLength: 64 },
    direction: { type: 'string', enum: ['up', 'down', 'stable', 'volatile'] },
    confidence: { type: 'number', minimum: 0, maximum: 1 },
    slope: { type: 'number' },
    window_hours: { type: 'number', minimum: 1 },
    data_points: { type: 'number', minimum: 2 },
    domain: { type: 'string', maxLength: 32 }
  }
};

const FORECAST_SCHEMA = {
  required: ['company_id', 'metric_code', 'horizon_hours', 'predicted_value'],
  properties: {
    company_id: { type: 'uuid' },
    metric_code: { type: 'string', minLength: 1, maxLength: 64 },
    horizon_hours: { type: 'number', minimum: 1 },
    predicted_value: { type: 'number' },
    confidence_lower: { type: 'number' },
    confidence_upper: { type: 'number' },
    model: { type: 'string', maxLength: 64 },
    domain: { type: 'string', maxLength: 32 }
  }
};

module.exports = {
  KPI_RECORD_SCHEMA,
  AGGREGATION_SCHEMA,
  TREND_SCHEMA,
  FORECAST_SCHEMA
};
