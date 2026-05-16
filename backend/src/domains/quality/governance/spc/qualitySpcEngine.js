'use strict';

/**
 * Motor SPC base — estatística de subgrupos, regras Western Electric / Nelson (subconjunto).
 * Determinístico, multi-tenant via company_id fornecido pelo chamador (sem estado global).
 */

function mean(arr) {
  const a = arr.filter((x) => Number.isFinite(x));
  if (!a.length) return null;
  return a.reduce((s, x) => s + x, 0) / a.length;
}

function stdSample(arr) {
  const a = arr.filter((x) => Number.isFinite(x));
  const n = a.length;
  if (n < 2) return null;
  const m = mean(a);
  const v = a.reduce((s, x) => s + (x - m) ** 2, 0) / (n - 1);
  return Math.sqrt(v);
}

/** Médias por subgrupo + desvio padrão dentro de cada subgrupo (para gráfico s) */
function subgroupStats(subgroups) {
  return subgroups.map((g, i) => {
    const m = mean(g);
    const s = stdSample(g);
    return { index: i, n: g.length, mean: m, std_within: s };
  });
}

/** X-bar chart: centro e limites a partir de média das médias e Rbar/d2 (subgrupos mesmo n) */
const D2 = Object.freeze({ 2: 1.128, 3: 1.693, 4: 2.059, 5: 2.326, 6: 2.534, 7: 2.704, 8: 2.847, 9: 2.97, 10: 3.078 });

function averageRange(subgroups) {
  const ranges = subgroups
    .map((g) => {
      const nums = g.filter((x) => Number.isFinite(x));
      if (nums.length < 2) return null;
      return Math.max(...nums) - Math.min(...nums);
    })
    .filter((x) => x != null);
  if (!ranges.length) return null;
  return mean(ranges);
}

function xbarControlLimits(subgroups) {
  const n = subgroups[0]?.length || 0;
  if (!n || !subgroups.every((g) => g.length === n)) {
    return { error: 'subgroup_size_inconsistent' };
  }
  const stats = subgroupStats(subgroups);
  const xdouble = mean(stats.map((s) => s.mean).filter((x) => x != null));
  const rBar = averageRange(subgroups);
  const d2 = D2[n];
  if (!d2 || xdouble == null || rBar == null) {
    return { error: 'insufficient_data' };
  }
  const sigmaEst = rBar / d2;
  const ucl = xdouble + 3 * sigmaEst / Math.sqrt(n);
  const lcl = xdouble - 3 * sigmaEst / Math.sqrt(n);
  return { center: xdouble, ucl, lcl, sigma_est_within: sigmaEst, r_bar: rBar, n, d2 };
}

/** MR entre médias de subgrupos consecutivos (proxy simples de drift entre subgrupos) */
function movingRangeOfMeans(means) {
  const out = [];
  for (let i = 1; i < means.length; i++) {
    out.push(Math.abs(means[i] - means[i - 1]));
  }
  return out;
}

/**
 * Nelson Rule 1: um ponto além de 3σ dos limites (aquí: LCL/UCL do X-bar).
 */
function nelsonRule1Violations(means, lcl, ucl) {
  const v = [];
  means.forEach((x, i) => {
    if (x == null || lcl == null || ucl == null) return;
    if (x > ucl || x < lcl) v.push({ rule: 'N1', index: i, value: x, lcl, ucl });
  });
  return v;
}

/**
 * Western Electric Rule 1: 4 de 5 pontos consecutivos além de 1σ do centro (mesmo lado).
 * sigmaHere = sigma_est_within / sqrt(n)
 */
function westernElectricFourOfFive(means, center, sigmaWithin, n) {
  if (!means.length || center == null || !sigmaWithin || !n) return [];
  const se = sigmaWithin / Math.sqrt(n);
  const u1 = center + se;
  const l1 = center - se;
  const violations = [];
  for (let i = 4; i < means.length; i++) {
    const window = means.slice(i - 4, i + 1);
    const above = window.filter((x) => x > u1).length;
    const below = window.filter((x) => x < l1).length;
    if (above >= 4) violations.push({ rule: 'WE1_high', index: i, window_start: i - 4 });
    if (below >= 4) violations.push({ rule: 'WE1_low', index: i, window_start: i - 4 });
  }
  return violations;
}

function evaluateSubgroupsSpc(subgroups, opts = {}) {
  const lim = xbarControlLimits(subgroups);
  if (lim.error) return { ok: false, reason: lim.error };
  const stats = subgroupStats(subgroups);
  const means = stats.map((s) => s.mean);
  const n1 = nelsonRule1Violations(means, lim.lcl, lim.ucl);
  const we1 = opts.skipWesternElectric ? [] : westernElectricFourOfFive(means, lim.center, lim.sigma_est_within, lim.n);
  return {
    ok: true,
    limits: lim,
    subgroup_stats: stats,
    violations: [...n1, ...we1],
    violation_count: n1.length + we1.length
  };
}

module.exports = {
  mean,
  stdSample,
  subgroupStats,
  xbarControlLimits,
  movingRangeOfMeans,
  nelsonRule1Violations,
  westernElectricFourOfFive,
  evaluateSubgroupsSpc
};
