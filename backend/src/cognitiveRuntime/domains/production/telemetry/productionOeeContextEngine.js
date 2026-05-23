'use strict';

function buildOeeContext(lines = [], shiftRows = []) {
  if (!lines.length) {
    return {
      weighted_oee: null,
      availability_proxy: null,
      performance_proxy: null,
      quality_proxy: null,
      stability_index: 0,
      line_contexts: [],
      narrative_hints: ['Sem dados de turno — registar produção ou integrar MES/PLC.']
    };
  }

  const lineContexts = lines.map((ln) => {
    const row = shiftRows.find((r) => r.line_identifier === ln.line_identifier) || {};
    const produced = parseFloat(ln.produced_qty || 0);
    const target = parseFloat(ln.target_qty || 0);
    const scrap = parseFloat(row.scrap_qty || 0);
    const eff = target > 0 ? Math.round((produced / target) * 100) : parseFloat(ln.efficiency_pct || 0);
    const quality = produced > 0 ? Math.max(0, Math.round(((produced - scrap) / produced) * 100)) : 100;
    return {
      line_identifier: ln.line_identifier,
      line_name: ln.line_name || ln.line_identifier,
      shift_code: ln.shift_code,
      efficiency_pct: eff,
      quality_pct: quality,
      scrap_qty: scrap,
      deterioration: eff < 70 ? 'high' : eff < 85 ? 'medium' : 'low'
    };
  });

  const avgEff =
    lineContexts.reduce((s, c) => s + (c.efficiency_pct || 0), 0) / Math.max(lineContexts.length, 1);
  const avgQual =
    lineContexts.reduce((s, c) => s + (c.quality_pct || 0), 0) / Math.max(lineContexts.length, 1);
  const weighted_oee = Math.round((avgEff * 0.65 + avgQual * 0.35) * 10) / 10;
  const unstable = lineContexts.filter((c) => c.deterioration !== 'low').length;
  const stability_index = Math.max(0, Math.round(100 - unstable * 15));

  const worst = [...lineContexts].sort((a, b) => (a.efficiency_pct || 0) - (b.efficiency_pct || 0))[0];

  return {
    weighted_oee,
    availability_proxy: avgEff,
    performance_proxy: avgEff,
    quality_proxy: avgQual,
    stability_index,
    line_contexts: lineContexts,
    worst_line: worst?.line_identifier || null,
    narrative_hints: worst
      ? [`Linha ${worst.line_name || worst.line_identifier} com maior deterioração (eficiência ${worst.efficiency_pct}%).`]
      : []
  };
}

module.exports = { buildOeeContext };
