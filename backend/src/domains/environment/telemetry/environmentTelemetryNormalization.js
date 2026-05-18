'use strict';

/**
 * Normalização industrial ambiental — metadados dimensionais e tagging contextual.
 */

const ENVIRONMENTAL_AREAS = new Set([
  'water',
  'effluent',
  'emissions',
  'energy',
  'utilities',
  'eta',
  'ete',
  'flare',
  'field'
]);

const TELEMETRY_TYPES = new Set([
  'flow',
  'pressure',
  'consumption',
  'temperature',
  'quality',
  'ph',
  'dbo',
  'dqo',
  'solids',
  'co2',
  'nox',
  'sox',
  'voc',
  'particulate',
  'demand',
  'efficiency',
  'vapor',
  'compressed_air',
  'generic'
]);

function validateSchema(sample) {
  if (!sample || typeof sample !== 'object') return { ok: false, reason: 'invalid_sample' };
  const mk = sample.metric_key != null ? String(sample.metric_key).trim() : '';
  if (!mk || mk.length > 256) return { ok: false, reason: 'metric_key_required' };
  const v = Number(sample.value);
  if (!Number.isFinite(v)) return { ok: false, reason: 'value_not_finite' };
  return { ok: true };
}

function normalizeEnvironmentalSample(companyId, body) {
  const b = body && typeof body === 'object' ? body : {};
  const areaRaw = b.environmental_area != null ? String(b.environmental_area).trim().toLowerCase() : '';
  const environmental_area = ENVIRONMENTAL_AREAS.has(areaRaw) ? areaRaw : areaRaw || 'field';

  const typeRaw = b.telemetry_type != null ? String(b.telemetry_type).trim().toLowerCase() : '';
  const telemetry_type = TELEMETRY_TYPES.has(typeRaw) ? typeRaw : 'generic';

  const labels = b.labels && typeof b.labels === 'object' && !Array.isArray(b.labels) ? { ...b.labels } : {};

  if (b.plant_id != null) labels.plant_id = String(b.plant_id).trim().slice(0, 128);
  if (b.equipment_id != null) labels.equipment_id = String(b.equipment_id).trim().slice(0, 128);
  if (b.process_stage != null) labels.process_stage = String(b.process_stage).trim().slice(0, 128);
  if (b.telemetry_source != null) labels.telemetry_source = String(b.telemetry_source).trim().slice(0, 64);
  if (b.operational_layer != null) labels.operational_layer = String(b.operational_layer).trim().slice(0, 32);

  labels.company_id = companyId;
  labels.environmental_area = environmental_area;
  labels.telemetry_type = telemetry_type;
  labels.telemetry_domain = 'environment';

  if (Array.isArray(b.contextual_labels)) {
    labels.contextual_labels = b.contextual_labels
      .slice(0, 16)
      .map((x) => String(x).trim().slice(0, 64))
      .filter(Boolean);
  }

  const sample = {
    company_id: companyId,
    domain: 'environment',
    metric_key: String(b.metric_key).trim().slice(0, 256),
    value: Number(b.value),
    unit: b.unit != null ? String(b.unit).trim().slice(0, 32) : null,
    labels,
    recorded_at: b.recorded_at,
    source: b.source || 'environment_telemetry_runtime'
  };

  const schema = validateSchema(sample);
  if (!schema.ok) return { ok: false, reason: schema.reason };

  return {
    ok: true,
    sample,
    metadata: {
      environmental_area,
      telemetry_type,
      telemetry_source: labels.telemetry_source || sample.source,
      operational_layer: labels.operational_layer || 'operational'
    }
  };
}

module.exports = {
  ENVIRONMENTAL_AREAS,
  TELEMETRY_TYPES,
  validateSchema,
  normalizeEnvironmentalSample
};
