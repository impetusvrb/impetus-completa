'use strict';

/**
 * Telemetria dimensional — validação soft de metadados (vai para labels JSONB).
 */

const MAX_ID_LEN = 128;
const MAX_LABEL_DEPTH_KEYS = 24;

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
  const cid = dim.characteristic_id != null ? String(dim.characteristic_id).trim().slice(0, MAX_ID_LEN) : '';
  if (cid) out.characteristic_id = cid;
  const nominal = Number(dim.nominal);
  if (Number.isFinite(nominal)) out.nominal = nominal;
  const tu = Number(dim.tolerance_upper);
  const tl = Number(dim.tolerance_lower);
  if (Number.isFinite(tu)) out.tolerance_upper = tu;
  if (Number.isFinite(tl)) out.tolerance_lower = tl;
  const uom = dim.uom != null ? String(dim.uom).trim().slice(0, 32) : '';
  if (uom) out.uom = uom;

  const nested = { ...dim };
  delete nested.characteristic_id;
  delete nested.nominal;
  delete nested.tolerance_upper;
  delete nested.tolerance_lower;
  delete nested.uom;
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
    b.dimensional = { ...(b.dimensional && typeof b.dimensional === 'object' ? b.dimensional : {}), ...dimensionalResult.labels.dimensional };
  }
  return b;
}

module.exports = {
  validateDimensionalBlock,
  mergeLabelsForIngest
};
