'use strict';

function buildFieldOccurrenceCenter(bindings = []) {
  const field = bindings.find((b) => b.block_id === 'sst.field_occurrences');
  return {
    center_id: 'safety_field_occurrences',
    label: 'Ocorrências de Campo',
    layer: 'operational',
    weight: 0.12,
    render_slot: 'operacoes',
    metrics: {
      field_reports: field?.metrics?.field_reports ?? 0,
      unsafe_behavior_flags: field?.metrics?.unsafe_behavior_flags ?? 0
    },
    summary: field?.summary || 'Ocorrências de campo',
    ok: true
  };
}

module.exports = { buildFieldOccurrenceCenter };
