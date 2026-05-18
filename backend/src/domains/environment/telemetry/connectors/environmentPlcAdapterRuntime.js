'use strict';

/**
 * Abstração vendor-safe — gateway edge sem acoplamento a PLC específico.
 */

const vendors = new Set(['siemens', 'allen_bradley', 'schneider', 'generic']);

function createPlcAdapter(vendor = 'generic') {
  const v = String(vendor).trim().toLowerCase();
  const safeVendor = vendors.has(v) ? v : 'generic';
  return {
    vendor: safeVendor,
    readTag(tagId) {
      return {
        ok: true,
        tag_id: String(tagId).slice(0, 128),
        value: null,
        simulated: true,
        note: 'shadow_plc_adapter_no_field_write'
      };
    },
    normalizeToTelemetry(tagId, value, meta = {}) {
      return {
        metric_key: meta.metric_key || `plc.${safeVendor}.${String(tagId).slice(0, 100)}`,
        value,
        telemetry_source: `plc_${safeVendor}`,
        labels: { plc_vendor: safeVendor, plc_tag: String(tagId).slice(0, 128) },
        environmental_area: meta.environmental_area || 'utilities',
        telemetry_type: meta.telemetry_type || 'generic',
        source: 'environment_plc_adapter'
      };
    }
  };
}

module.exports = { createPlcAdapter, vendors };
