'use strict';

/**
 * Agregação leve de sinais para consumo por motores cognitivos (sem I/O).
 */
function aggregateSignals(raw = {}) {
  return {
    process_values: Array.isArray(raw.process_values) ? raw.process_values.map(Number).filter(Number.isFinite) : [],
    defect_rates: Array.isArray(raw.defect_rates) ? raw.defect_rates.map(Number).filter(Number.isFinite) : [],
    spc_subgroup_means: Array.isArray(raw.spc_subgroup_means)
      ? raw.spc_subgroup_means.map(Number).filter(Number.isFinite)
      : [],
    recurrence_records: Array.isArray(raw.recurrence_records) ? raw.recurrence_records : [],
    supplier_id: raw.supplier_id != null ? String(raw.supplier_id) : null,
    supplier_rows: Array.isArray(raw.supplier_rows) ? raw.supplier_rows : [],
    usl: raw.usl != null ? Number(raw.usl) : null,
    lsl: raw.lsl != null ? Number(raw.lsl) : null,
    dimension_labels: Array.isArray(raw.dimension_labels) ? raw.dimension_labels : [],
    correlation_id: raw.correlation_id != null ? String(raw.correlation_id) : null
  };
}

module.exports = { aggregateSignals };
