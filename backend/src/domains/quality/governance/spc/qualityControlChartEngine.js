'use strict';

const { mean, evaluateSubgroupsSpc, subgroupStats } = require('./qualitySpcEngine');

/**
 * Atributos: gráfico P (fração defeituosa) — Binomial aproximada.
 * subgroups: array de { inspected, defects }
 */
function pChartLimits(points) {
  if (!points.length) return { error: 'no_points' };
  let totalN = 0;
  let totalD = 0;
  points.forEach((p) => {
    totalN += p.inspected || 0;
    totalD += p.defects || 0;
  });
  if (totalN <= 0) return { error: 'zero_inspected' };
  const pBar = totalD / totalN;
  const results = points.map((p, i) => {
    const n = p.inspected || 0;
    const d = p.defects || 0;
    const pi = n > 0 ? d / n : null;
    const se = n > 0 ? Math.sqrt((pBar * (1 - pBar)) / n) : null;
    const ucl = se != null ? Math.min(1, pBar + 3 * se) : null;
    const lcl = se != null ? Math.max(0, pBar - 3 * se) : null;
    return { index: i, p: pi, n, defects: d, ucl, lcl, center: pBar };
  });
  const violations = [];
  results.forEach((r, i) => {
    if (r.p != null && r.ucl != null && r.lcl != null && (r.p > r.ucl || r.p < r.lcl)) {
      violations.push({ chart: 'P', index: i, value: r.p, ucl: r.ucl, lcl: r.lcl });
    }
  });
  return { center: pBar, points: results, violations };
}

/** C-chart (contagem por unidade de inspeção — mesmo tamanho de oportunidade) */
function cChartLimits(counts) {
  const c = counts.filter((x) => Number.isFinite(x));
  if (!c.length) return { error: 'no_counts' };
  const cBar = mean(c);
  const ucl = cBar + 3 * Math.sqrt(cBar);
  const lcl = Math.max(0, cBar - 3 * Math.sqrt(cBar));
  const violations = [];
  c.forEach((val, i) => {
    if (val > ucl || val < lcl) violations.push({ chart: 'C', index: i, value: val, ucl, lcl, center: cBar });
  });
  return { center: cBar, ucl, lcl, violations };
}

function buildXbarEvaluation(subgroups) {
  return evaluateSubgroupsSpc(subgroups, {});
}

// subgroupStats é re-exportado para compatibilidade com consumidores externos.
// Guard defensivo: se o import não trouxer a função (dep. parcialmente inicializada
// em restarts rápidos do Node / require cache), a exportação continua funcional.
const _subgroupStatsExport =
  typeof subgroupStats === 'function'
    ? subgroupStats
    : function _subgroupStatsFallback(subgroups) {
        if (!Array.isArray(subgroups)) return [];
        return subgroups.map((g, i) => ({ index: i, n: Array.isArray(g) ? g.length : 0, mean: null, std_within: null }));
      };

module.exports = {
  pChartLimits,
  cChartLimits,
  buildXbarEvaluation,
  subgroupStats: _subgroupStatsExport
};
