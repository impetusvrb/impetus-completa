'use strict';

function buildRiskMatrixCenter(bindings = []) {
  const risk = bindings.find((b) => b.block_id === 'sst.risk_matrix');
  return {
    center_id: 'safety_risk_matrix',
    label: 'Matriz de Risco',
    layer: 'governance',
    weight: 0.15,
    render_slot: 'grafico_tendencia',
    metrics: {
      risks_evaluated: risk?.metrics?.risks_evaluated ?? 0,
      critical_risks: risk?.metrics?.critical_risks ?? 0,
      requires_pt: risk?.metrics?.requires_pt ?? 0
    },
    summary: risk?.summary || 'Matriz SST',
    ok: risk?.ok !== false
  };
}

module.exports = { buildRiskMatrixCenter };
