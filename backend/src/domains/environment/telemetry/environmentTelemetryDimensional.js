'use strict';

const MAX_ID_LEN = 128;
const MAX_LABEL_DEPTH_KEYS = 32;

function _countKeys(obj, depth = 0) {
  if (!obj || typeof obj !== 'object' || depth > 3) return 0;
  let n = 0;
  for (const k of Object.keys(obj)) {
    n++;
    if (typeof obj[k] === 'object' && obj[k] != null) n += _countKeys(obj[k], depth + 1);
  }
  return n;
}

function validateDimensionalBlock(dim) {
  if (dim == null) return { ok: true, labels: {} };
  if (typeof dim !== 'object' || Array.isArray(dim)) {
    return { ok: false, reason: 'invalid_dimensional_shape' };
  }
  const keys = Object.keys(dim);
  if (keys.length > MAX_LABEL_DEPTH_KEYS) {
    return { ok: false, reason: 'dimensional_too_large' };
  }
  const out = {};
  const sensorId = dim.sensor_id != null ? String(dim.sensor_id).trim().slice(0, MAX_ID_LEN) : '';
  if (sensorId) out.sensor_id = sensorId;
  const stationId = dim.station_id != null ? String(dim.station_id).trim().slice(0, MAX_ID_LEN) : '';
  if (stationId) out.station_id = stationId;
  const processStage = dim.process_stage != null ? String(dim.process_stage).trim().slice(0, MAX_ID_LEN) : '';
  if (processStage) out.process_stage = processStage;

  const nested = { ...dim };
  delete nested.sensor_id;
  delete nested.station_id;
  delete nested.process_stage;
  if (_countKeys(nested) > MAX_LABEL_DEPTH_KEYS) {
    return { ok: false, reason: 'dimensional_nested_too_deep' };
  }
  const dimensional = { ...out, ...nested };
  if (!Object.keys(dimensional).length) {
    return { ok: true, labels: {} };
  }
  return { ok: true, labels: { dimensional } };
}

function mergeLabelsForIngest(baseLabels, dimensionalResult) {
  const b = baseLabels && typeof baseLabels === 'object' && !Array.isArray(baseLabels) ? { ...baseLabels } : {};
  if (dimensionalResult && dimensionalResult.labels && dimensionalResult.labels.dimensional) {
    b.dimensional = {
      ...(b.dimensional && typeof b.dimensional === 'object' ? b.dimensional : {}),
      ...dimensionalResult.labels.dimensional
    };
  }
  return b;
}

module.exports = {
  validateDimensionalBlock,
  mergeLabelsForIngest
};
