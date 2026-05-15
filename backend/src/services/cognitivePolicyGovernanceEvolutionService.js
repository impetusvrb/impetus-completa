'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 12 (Policy Governance Evolution Engine — read-only)
 * Trajetória e tendências normativas no tempo: só observação; não executa governance nem altera runtime.
 * Rollout: IMPETUS_POLICY_EVOLUTION_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_EVOLUTION_WINDOWS = Object.freeze({
  H24: '24h',
  D7: '7d',
  D30: '30d',
  D90: '90d'
});

const POLICY_EVOLUTION_TRENDS = Object.freeze({
  STABLE: 'STABLE',
  EXPANDING: 'EXPANDING',
  VOLATILE: 'VOLATILE',
  SATURATED: 'SATURATED',
  DECLINING: 'DECLINING'
});

const POLICY_EVOLUTION_TYPES = Object.freeze({
  TOPOLOGY_EVOLUTION: 'TOPOLOGY_EVOLUTION',
  OBLIGATION_EVOLUTION: 'OBLIGATION_EVOLUTION',
  ARBITRATION_EVOLUTION: 'ARBITRATION_EVOLUTION',
  RISK_EVOLUTION: 'RISK_EVOLUTION',
  TRACE_EVOLUTION: 'TRACE_EVOLUTION',
  GOVERNANCE_DRIFT: 'GOVERNANCE_DRIFT'
});

function isPolicyEvolutionEnabled() {
  return String(process.env.IMPETUS_POLICY_EVOLUTION_ENABLED || '')
    .trim()
    .toLowerCase() === 'true';
}

function _nowIso() {
  return new Date().toISOString();
}

function _safeStr(v, max = 512) {
  if (v == null) return '';
  const s = String(v);
  return s.length > max ? s.slice(0, max) : s;
}

function _normLower(v, max = 64) {
  return _safeStr(v, max).trim().toLowerCase();
}

function _normTrend(v) {
  const s = _safeStr(v, 32).toUpperCase();
  const vals = new Set(Object.values(POLICY_EVOLUTION_TRENDS));
  return vals.has(s) ? s : POLICY_EVOLUTION_TRENDS.STABLE;
}

function _riskRank(lv) {
  const m = { none: 0, minimal: 0, low: 1, medium: 2, moderate: 2, high: 3, critical: 4 };
  return m[_normLower(lv, 16)] ?? 0;
}

/** @param {unknown[]} arr */
function _seriesStats(arr) {
  if (!arr.length) return { min: 0, max: 0, delta: 0, last: 0 };
  const nums = arr.map((x) => (typeof x === 'number' && !Number.isNaN(x) ? x : 0));
  const min = Math.min(...nums);
  const max = Math.max(...nums);
  return { min, max, delta: max - min, last: nums[nums.length - 1] };
}

function _extractDiffAnalysis(entry) {
  if (!entry || typeof entry !== 'object') return null;
  if (entry.analysis && typeof entry.analysis === 'object') return entry.analysis;
  if (Array.isArray(entry.topology_changes) || Array.isArray(entry.obligation_deltas)) return entry;
  return null;
}

/** @param {Record<string, unknown>} partial */
function createGovernanceEvolution(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const winSet = new Set(Object.values(POLICY_EVOLUTION_WINDOWS));
  let timeline_window = _normLower(p.timeline_window, 16);
  if (!winSet.has(timeline_window)) timeline_window = POLICY_EVOLUTION_WINDOWS.D30;

  const topology_evolution = Array.isArray(p.topology_evolution)
    ? p.topology_evolution.filter((x) => x && typeof x === 'object')
    : [];
  const obligation_evolution = Array.isArray(p.obligation_evolution)
    ? p.obligation_evolution.filter((x) => x && typeof x === 'object')
    : [];
  const arbitration_evolution = Array.isArray(p.arbitration_evolution)
    ? p.arbitration_evolution.filter((x) => x && typeof x === 'object')
    : [];
  const governance_trends = Array.isArray(p.governance_trends) ? p.governance_trends.filter((x) => x && typeof x === 'object') : [];

  let risk_evolution = {};
  try {
    if (p.risk_evolution && typeof p.risk_evolution === 'object' && !Array.isArray(p.risk_evolution)) {
      risk_evolution = { ...p.risk_evolution };
    }
  } catch (_e2) {
    risk_evolution = {};
  }

  let stability_evolution = { stability_score: 100, trend: POLICY_EVOLUTION_TRENDS.STABLE };
  try {
    if (p.stability_evolution && typeof p.stability_evolution === 'object' && !Array.isArray(p.stability_evolution)) {
      stability_evolution = { ...stability_evolution, ...p.stability_evolution };
    }
  } catch (_e3) {}

  let trajectory = { trend: POLICY_EVOLUTION_TRENDS.STABLE, direction: 'nominal' };
  try {
    if (p.trajectory && typeof p.trajectory === 'object' && !Array.isArray(p.trajectory)) {
      trajectory = { ...trajectory, ...p.trajectory };
    }
  } catch (_e4) {}

  const trace = Array.isArray(p.trace) ? p.trace.filter((t) => t && typeof t === 'object') : [];

  const rec = {
    evolution_id: p.evolution_id != null ? _safeStr(p.evolution_id, 64) : randomUUID(),
    timeline_window,
    topology_evolution,
    obligation_evolution,
    arbitration_evolution,
    governance_trends,
    risk_evolution,
    stability_evolution,
    trajectory,
    trace,
    generated_at: p.generated_at != null ? _safeStr(p.generated_at, 40) : _nowIso()
  };

  try {
    console.info(
      '[POLICY_EVOLUTION]',
      JSON.stringify({ action: 'create', window: rec.timeline_window, topo: topology_evolution.length })
    );
  } catch (_e5) {}
  return rec;
}

/**
 * @param {object} ctx
 * @param {unknown[]} ctx.diffs
 * @param {Record<string, unknown>} ctx.graph
 */
function analyzeTopologyEvolution(ctx) {
  const topology_evolution = [];
  try {
    const c = ctx && typeof ctx === 'object' ? ctx : {};
    const diffs = Array.isArray(c.diffs) ? c.diffs : [];
    const graph = c.graph && typeof c.graph === 'object' ? c.graph : {};
    const nodes = Array.isArray(graph.nodes) ? graph.nodes.length : 0;
    const edges = Array.isArray(graph.edges) ? graph.edges.length : 0;
    const patterns = Array.isArray(graph.patterns) ? graph.patterns.length : 0;
    const topoSignalLengths = [];
    for (const d of diffs) {
      const an = _extractDiffAnalysis(d);
      const tc = an && Array.isArray(an.topology_changes) ? an.topology_changes.length : 0;
      topoSignalLengths.push(tc);
    }
    const stat = _seriesStats(topoSignalLengths);
    let trend = POLICY_EVOLUTION_TRENDS.STABLE;
    if (stat.delta >= 4 || patterns >= 4) trend = POLICY_EVOLUTION_TRENDS.VOLATILE;
    else if (nodes >= 18 && edges >= 14) trend = POLICY_EVOLUTION_TRENDS.EXPANDING;
    else if (topoSignalLengths.reduce((a, b) => a + b, 0) >= 10) trend = POLICY_EVOLUTION_TRENDS.SATURATED;
    else if (stat.last === 0 && stat.max === 0 && nodes < 5) trend = POLICY_EVOLUTION_TRENDS.DECLINING;

    const cent = graph.centrality && typeof graph.centrality === 'object' ? graph.centrality : {};
    topology_evolution.push({
      type: POLICY_EVOLUTION_TYPES.TOPOLOGY_EVOLUTION,
      trend,
      detail: {
        graph_nodes: nodes,
        graph_edges: edges,
        pattern_clusters: patterns,
        dominant_domain: _safeStr(cent.dominant_domain, 32) || null,
        topology_signal_series: topoSignalLengths
      }
    });
    try {
      console.info('[POLICY_EVOLUTION_TOPOLOGY]', JSON.stringify({ trend, nodes, edges }));
    } catch (_e) {}
  } catch (e) {
    topology_evolution.push({
      type: POLICY_EVOLUTION_TYPES.TOPOLOGY_EVOLUTION,
      trend: POLICY_EVOLUTION_TRENDS.STABLE,
      detail: { error: _safeStr(e && e.message, 200) }
    });
  }
  return { topology_evolution };
}

/**
 * @param {object} ctx
 */
function analyzeObligationEvolution(ctx) {
  const obligation_evolution = [];
  try {
    const c = ctx && typeof ctx === 'object' ? ctx : {};
    const sandbox = Array.isArray(c.sandbox) ? c.sandbox : [];
    const diffs = Array.isArray(c.diffs) ? c.diffs : [];
    const hitlSeries = [];
    const traceReqSeries = [];
    const obDeltaSeries = [];

    for (const s of sandbox) {
      const mir = s && Array.isArray(s.mirrored_obligations) ? s.mirrored_obligations : [];
      hitlSeries.push(mir.filter((m) => m && m.type === 'HITL_REQUIRED').length);
      traceReqSeries.push(mir.filter((m) => m && m.type === 'TRACE_REQUIRED').length);
    }
    for (const d of diffs) {
      const an = _extractDiffAnalysis(d);
      const od = an && Array.isArray(an.obligation_deltas) ? an.obligation_deltas.length : 0;
      obDeltaSeries.push(od);
    }

    const hitlStat = _seriesStats(hitlSeries);
    const traceStat = _seriesStats(traceReqSeries);
    const obStat = _seriesStats(obDeltaSeries);

    let trend = POLICY_EVOLUTION_TRENDS.STABLE;
    if (hitlStat.delta >= 2 || traceStat.delta >= 3) trend = POLICY_EVOLUTION_TRENDS.EXPANDING;
    else if (obStat.delta >= 3) trend = POLICY_EVOLUTION_TRENDS.VOLATILE;
    else if (hitlStat.last >= 4 || traceStat.last >= 4) trend = POLICY_EVOLUTION_TRENDS.SATURATED;
    else if (hitlSeries.length >= 2 && hitlSeries[hitlSeries.length - 1] < hitlSeries[0]) trend = POLICY_EVOLUTION_TRENDS.DECLINING;

    obligation_evolution.push({
      type: POLICY_EVOLUTION_TYPES.OBLIGATION_EVOLUTION,
      trend,
      detail: {
        hitl_growth: hitlStat.delta,
        trace_required_growth: traceStat.delta,
        obligation_delta_volatility: obStat.delta,
        hitl_series: hitlSeries,
        trace_required_series: traceReqSeries
      }
    });
    try {
      console.info('[POLICY_EVOLUTION_OBLIGATION]', JSON.stringify({ trend, hitl_delta: hitlStat.delta }));
    } catch (_e) {}
  } catch (e) {
    obligation_evolution.push({
      type: POLICY_EVOLUTION_TYPES.OBLIGATION_EVOLUTION,
      trend: POLICY_EVOLUTION_TRENDS.STABLE,
      detail: { error: _safeStr(e && e.message, 200) }
    });
  }
  return { obligation_evolution };
}

/**
 * @param {object} ctx
 */
function analyzeArbitrationEvolution(ctx) {
  const arbitration_evolution = [];
  try {
    const c = ctx && typeof ctx === 'object' ? ctx : {};
    const sandbox = Array.isArray(c.sandbox) ? c.sandbox : [];
    const diffs = Array.isArray(c.diffs) ? c.diffs : [];
    const domains = [];
    const overrideRanks = [];

    for (const s of sandbox) {
      const arb = s && s.sandbox_arbitration && typeof s.sandbox_arbitration === 'object' ? s.sandbox_arbitration : {};
      domains.push(_safeStr(arb.dominant_domain, 32).toUpperCase());
      overrideRanks.push(_riskRank(arb.override_pressure));
    }
    for (const d of diffs) {
      const an = _extractDiffAnalysis(d);
      const ads = an && Array.isArray(an.arbitration_deltas) ? an.arbitration_deltas.length : 0;
      if (ads > 0) overrideRanks.push(Math.min(3, ads));
    }

    const nonEmpty = domains.filter(Boolean);
    const uniq = new Set(nonEmpty);
    const persistence = nonEmpty.length >= 2 && uniq.size <= 1;
    const ovStat = _seriesStats(overrideRanks);
    let trend = POLICY_EVOLUTION_TRENDS.STABLE;
    if (persistence && nonEmpty.length >= 2) trend = POLICY_EVOLUTION_TRENDS.SATURATED;
    if (ovStat.delta >= 2) trend = POLICY_EVOLUTION_TRENDS.EXPANDING;
    if (uniq.size >= 3) trend = POLICY_EVOLUTION_TRENDS.VOLATILE;
    if (overrideRanks.length >= 2 && ovStat.last < ovStat.min) trend = POLICY_EVOLUTION_TRENDS.DECLINING;

    arbitration_evolution.push({
      type: POLICY_EVOLUTION_TYPES.ARBITRATION_EVOLUTION,
      trend,
      detail: {
        dominant_domain_persistence: persistence,
        unique_dominant_domains: [...uniq],
        override_pressure_rank_series: overrideRanks
      }
    });
    for (const _x of arbitration_evolution) {
      try {
        console.info('[POLICY_EVOLUTION_ARBITRATION]', JSON.stringify({ trend, domains: nonEmpty.slice(0, 4) }));
      } catch (_e) {}
    }
  } catch (e) {
    arbitration_evolution.push({
      type: POLICY_EVOLUTION_TYPES.ARBITRATION_EVOLUTION,
      trend: POLICY_EVOLUTION_TRENDS.STABLE,
      detail: { error: _safeStr(e && e.message, 200) }
    });
  }
  return { arbitration_evolution };
}

/**
 * @param {Record<string, unknown>} risk_evolution
 * @param {unknown[]} simulation
 */
function analyzeRiskEvolution(simulation, riskHints) {
  const out = {
    trend: POLICY_EVOLUTION_TRENDS.STABLE,
    risk_level_series: [],
    trace_saturation: false,
    governance_pressure_growth: false
  };
  try {
    const series = Array.isArray(simulation) ? simulation : [];
    const levels = [];
    for (const sim of series) {
      const rr = sim && sim.runtime_risk && typeof sim.runtime_risk === 'object' ? sim.runtime_risk : {};
      levels.push(_safeStr(rr.level, 16) || 'low');
      const pe = sim && Array.isArray(sim.predicted_effects) ? sim.predicted_effects : [];
      if (pe.includes('governance_complexity') || pe.includes('escalation_pressure')) {
        out.governance_pressure_growth = true;
      }
      if (pe.length >= 4) out.trace_saturation = true;
    }
    out.risk_level_series = levels;
    const ranks = levels.map((l) => _riskRank(l));
    const st = _seriesStats(ranks);
    if (st.delta >= 2) out.trend = POLICY_EVOLUTION_TRENDS.EXPANDING;
    else if (st.delta >= 1) out.trend = POLICY_EVOLUTION_TRENDS.VOLATILE;
    if (out.trace_saturation && st.last >= 3) out.trend = POLICY_EVOLUTION_TRENDS.SATURATED;
    if (riskHints && typeof riskHints === 'object' && riskHints.escalation_growth) {
      out.trend =
        out.trend === POLICY_EVOLUTION_TRENDS.STABLE ? POLICY_EVOLUTION_TRENDS.EXPANDING : POLICY_EVOLUTION_TRENDS.VOLATILE;
    }
    try {
      console.info('[POLICY_EVOLUTION]', JSON.stringify({ action: 'risk_evolution', trend: out.trend }));
    } catch (_e) {}
  } catch (e) {
    out.detail = { error: _safeStr(e && e.message, 200) };
  }
  return {
    risk_evolution: {
      type: POLICY_EVOLUTION_TYPES.RISK_EVOLUTION,
      ...out
    }
  };
}

function calculateGovernanceTrajectory(parts) {
  try {
    const p = parts && typeof parts === 'object' ? parts : {};
    const trends = [];
    for (const key of ['topology', 'obligation', 'arbitration', 'risk']) {
      const t = p[key];
      if (t && typeof t === 'string') trends.push(t);
    }
    const volatile = trends.filter((x) => x === POLICY_EVOLUTION_TRENDS.VOLATILE).length;
    const expanding = trends.filter((x) => x === POLICY_EVOLUTION_TRENDS.EXPANDING || x === POLICY_EVOLUTION_TRENDS.SATURATED).length;
    const declining = trends.filter((x) => x === POLICY_EVOLUTION_TRENDS.DECLINING).length;

    let trend = POLICY_EVOLUTION_TRENDS.STABLE;
    let direction = 'nominal';
    if (volatile >= 2) {
      trend = POLICY_EVOLUTION_TRENDS.VOLATILE;
      direction = 'oscillating';
    } else if (expanding >= 2) {
      trend = POLICY_EVOLUTION_TRENDS.EXPANDING;
      direction = 'growth';
    } else if (declining >= 2) {
      trend = POLICY_EVOLUTION_TRENDS.DECLINING;
      direction = 'contraction';
    } else if (trends.includes(POLICY_EVOLUTION_TRENDS.SATURATED)) {
      trend = POLICY_EVOLUTION_TRENDS.SATURATED;
      direction = 'saturated';
    }

    try {
      console.info('[POLICY_EVOLUTION]', JSON.stringify({ action: 'trajectory', trend, direction }));
    } catch (_e) {}
    return { trajectory: { trend, direction, cognitive_growth_score: expanding - declining } };
  } catch (e) {
    return { trajectory: { trend: POLICY_EVOLUTION_TRENDS.STABLE, direction: 'unknown', error: _safeStr(e && e.message, 200) } };
  }
}

function appendEvolutionTrace(trace, entry) {
  const list = Array.isArray(trace) ? [...trace] : [];
  try {
    list.push({
      type: _safeStr(entry && entry.type, 32).toUpperCase() || 'EVOLUTION',
      message: _safeStr(entry && entry.message, 2000),
      timestamp: _nowIso(),
      detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
    });
  } catch (_e) {
    list.push({ type: 'EVOLUTION', message: 'trace_append_failed', timestamp: _nowIso() });
  }
  try {
    console.info('[POLICY_EVOLUTION]', JSON.stringify({ action: 'trace', steps: list.length }));
  } catch (_e2) {}
  return list;
}

function runGovernanceEvolutionAnalysis(input) {
  try {
    const raw = input && typeof input === 'object' ? input : {};
    const diffs = Array.isArray(raw.diffs) ? raw.diffs : [];
    const sandbox = Array.isArray(raw.sandbox) ? raw.sandbox : [];
    const simulation = Array.isArray(raw.simulation) ? raw.simulation : [];
    const graph = raw.graph && typeof raw.graph === 'object' ? raw.graph : {};

    const ctx = { diffs, sandbox, graph };

    const { topology_evolution } = analyzeTopologyEvolution(ctx);
    const { obligation_evolution } = analyzeObligationEvolution(ctx);
    const { arbitration_evolution } = analyzeArbitrationEvolution(ctx);

    let escalationGrowth = false;
    for (const d of diffs) {
      const an = _extractDiffAnalysis(d);
      const od = an && Array.isArray(an.obligation_deltas) ? an.obligation_deltas : [];
      if (od.some((x) => x && String(x.type || '').includes('SAFETY'))) escalationGrowth = true;
    }
    const { risk_evolution } = analyzeRiskEvolution(simulation, { escalation_growth: escalationGrowth });

    const topTrend = topology_evolution[0] && topology_evolution[0].trend;
    const obTrend = obligation_evolution[0] && obligation_evolution[0].trend;
    const arTrend = arbitration_evolution[0] && arbitration_evolution[0].trend;
    const rkTrend = risk_evolution && risk_evolution.trend;

    const { trajectory } = calculateGovernanceTrajectory({
      topology: topTrend,
      obligation: obTrend,
      arbitration: arTrend,
      risk: rkTrend
    });

    const governance_trends = [];
    try {
      if (topTrend && topTrend !== POLICY_EVOLUTION_TRENDS.STABLE) {
        governance_trends.push({
          type: POLICY_EVOLUTION_TYPES.GOVERNANCE_DRIFT,
          trend: topTrend,
          axis: 'topology'
        });
      }
      if (obTrend === POLICY_EVOLUTION_TRENDS.EXPANDING || obTrend === POLICY_EVOLUTION_TRENDS.SATURATED) {
        governance_trends.push({
          type: POLICY_EVOLUTION_TYPES.TRACE_EVOLUTION,
          trend: obTrend,
          axis: 'obligations'
        });
      }
      if (arTrend === POLICY_EVOLUTION_TRENDS.VOLATILE) {
        governance_trends.push({
          type: POLICY_EVOLUTION_TYPES.ARBITRATION_EVOLUTION,
          trend: arTrend,
          axis: 'arbitration'
        });
      }
    } catch (_e) {}

    let stability_score = 100;
    if (trajectory.trend === POLICY_EVOLUTION_TRENDS.VOLATILE) stability_score -= 35;
    if (trajectory.trend === POLICY_EVOLUTION_TRENDS.SATURATED) stability_score -= 20;
    if (trajectory.trend === POLICY_EVOLUTION_TRENDS.EXPANDING) stability_score -= 10;
    stability_score = Math.max(0, Math.min(100, stability_score));
    const stability_trend =
      stability_score >= 85
        ? POLICY_EVOLUTION_TRENDS.STABLE
        : stability_score >= 60
          ? POLICY_EVOLUTION_TRENDS.VOLATILE
          : POLICY_EVOLUTION_TRENDS.SATURATED;

    const stability_evolution = {
      stability_score,
      trend: stability_trend,
      normative_equilibrium: stability_score >= 75 ? 'high' : stability_score >= 50 ? 'moderate' : 'low'
    };

    try {
      console.info(
        '[POLICY_EVOLUTION]',
        JSON.stringify({
          action: 'analysis_complete',
          trajectory: trajectory.trend,
          trends: governance_trends.length
        })
      );
    } catch (_e2) {}

    return {
      topology_evolution,
      obligation_evolution,
      arbitration_evolution,
      governance_trends,
      risk_evolution,
      stability_evolution,
      trajectory
    };
  } catch (e) {
    try {
      console.warn('[POLICY_EVOLUTION]', JSON.stringify({ action: 'analysis_failed', message: _safeStr(e && e.message, 200) }));
    } catch (_e2) {}
    return {
      topology_evolution: [{ type: POLICY_EVOLUTION_TYPES.TOPOLOGY_EVOLUTION, trend: POLICY_EVOLUTION_TRENDS.STABLE }],
      obligation_evolution: [],
      arbitration_evolution: [],
      governance_trends: [],
      risk_evolution: { type: POLICY_EVOLUTION_TYPES.RISK_EVOLUTION, trend: POLICY_EVOLUTION_TRENDS.STABLE },
      stability_evolution: { stability_score: 70, trend: POLICY_EVOLUTION_TRENDS.STABLE },
      trajectory: { trend: POLICY_EVOLUTION_TRENDS.STABLE, direction: 'nominal' }
    };
  }
}

function buildDemoEvolutionInput() {
  try {
    const cognitivePolicyGovernanceDiffService = require('./cognitivePolicyGovernanceDiffService');
    const d0 = cognitivePolicyGovernanceDiffService.buildDemoDiffInput();
    const a0 = cognitivePolicyGovernanceDiffService.runGovernanceDiffAnalysis(d0);
    const mir0 = Array.isArray(d0.sandbox && d0.sandbox.mirrored_obligations) ? d0.sandbox.mirrored_obligations : [];
    const sb1 = {
      ...(d0.sandbox && typeof d0.sandbox === 'object' ? d0.sandbox : {}),
      mirrored_obligations: [
        ...mir0,
        { type: 'HITL_REQUIRED', domain: 'SAFETY', sandbox_only: true },
        { type: 'TRACE_REQUIRED', domain: 'INTEGRITY', sandbox_only: true }
      ],
      sandbox_arbitration: {
        ...(d0.sandbox && d0.sandbox.sandbox_arbitration ? d0.sandbox.sandbox_arbitration : {}),
        dominant_domain: 'GOVERNANCE',
        override_pressure: 'high'
      },
      runtime_pressure: {
        ...((d0.sandbox && d0.sandbox.runtime_pressure) || {}),
        level: 'high',
        obligation_pressure: 'high'
      }
    };
    const d1 = {
      ...d0,
      production: {
        ...(d0.production && typeof d0.production === 'object' ? d0.production : {}),
        governance_topology_nodes: 8,
        governance_topology_edges: 6
      },
      sandbox: sb1,
      graph: d0.graph && typeof d0.graph === 'object' ? d0.graph : {}
    };
    const a1 = cognitivePolicyGovernanceDiffService.runGovernanceDiffAnalysis(d1);
    const sim0 = d0.simulation && typeof d0.simulation === 'object' ? d0.simulation : {};
    const sim1 = {
      ...sim0,
      runtime_risk: { level: 'high' },
      predicted_effects: Array.isArray(sim0.predicted_effects)
        ? [...sim0.predicted_effects, 'escalation_pressure']
        : ['escalation_pressure', 'governance_complexity']
    };
    return {
      diffs: [
        { generated_at: _nowIso(), analysis: a0 },
        { generated_at: _nowIso(), analysis: a1 }
      ],
      sandbox: [d0.sandbox || {}, sb1],
      simulation: [sim0, sim1],
      graph: d1.graph
    };
  } catch (_e) {
    return { diffs: [], sandbox: [], simulation: [], graph: { nodes: [], edges: [] } };
  }
}

function generateGovernanceEvolutionReport(input) {
  const rawIn = input != null && typeof input === 'object' ? input : buildDemoEvolutionInput();
  const {
    topology_evolution,
    obligation_evolution,
    arbitration_evolution,
    governance_trends,
    risk_evolution,
    stability_evolution,
    trajectory
  } = runGovernanceEvolutionAnalysis(rawIn);

  let trace = [];
  trace = appendEvolutionTrace(trace, {
    type: 'EVOLUTION',
    message: 'Governance trajectory remained stable',
    detail: {
      trajectory_trend: trajectory && trajectory.trend,
      topology_samples: topology_evolution.length
    }
  });
  trace = appendEvolutionTrace(trace, {
    type: 'EVOLUTION',
    message: `Obligation evolution trend ${(obligation_evolution[0] && obligation_evolution[0].trend) || 'STABLE'}`,
    detail: { governance_trends: governance_trends.length }
  });

  const report = createGovernanceEvolution({
    timeline_window: POLICY_EVOLUTION_WINDOWS.D30,
    topology_evolution,
    obligation_evolution,
    arbitration_evolution,
    governance_trends,
    risk_evolution,
    stability_evolution,
    trajectory,
    trace
  });

  report.evolution_meta = {
    read_only: true,
    synthetic_timeline: true,
    note: 'Observational series derived from demo snapshots — no production mutation'
  };

  return report;
}

function validateGovernanceEvolution(record) {
  const errors = [];
  try {
    if (!record || typeof record !== 'object') {
      errors.push({ path: '', message: 'evolution_missing' });
      return { valid: false, errors };
    }
    const winSet = new Set(Object.values(POLICY_EVOLUTION_WINDOWS));
    if (!winSet.has(_normLower(record.timeline_window, 16))) {
      errors.push({ path: 'timeline_window', message: 'invalid_window' });
    }
    const trendSet = new Set(Object.values(POLICY_EVOLUTION_TRENDS));
    const typeSet = new Set(Object.values(POLICY_EVOLUTION_TYPES));

    const checkArr = (arr, pathBase) => {
      const a = Array.isArray(arr) ? arr : [];
      for (let i = 0; i < a.length; i++) {
        const x = a[i];
        if (x && x.type != null && !typeSet.has(_safeStr(x.type, 64))) {
          errors.push({ path: `${pathBase}[${i}].type`, message: 'invalid_evolution_type' });
        }
        if (x && x.trend != null && !trendSet.has(_normTrend(x.trend))) {
          errors.push({ path: `${pathBase}[${i}].trend`, message: 'invalid_trend' });
        }
      }
    };

    checkArr(record.topology_evolution, 'topology_evolution');
    checkArr(record.obligation_evolution, 'obligation_evolution');
    checkArr(record.arbitration_evolution, 'arbitration_evolution');
    checkArr(record.governance_trends, 'governance_trends');

    const tr = record.trajectory && typeof record.trajectory === 'object' ? record.trajectory : {};
    if (!trendSet.has(_normTrend(tr.trend))) errors.push({ path: 'trajectory.trend', message: 'invalid' });

    const re = record.risk_evolution && typeof record.risk_evolution === 'object' ? record.risk_evolution : {};
    if (re.trend != null && !trendSet.has(_normTrend(re.trend))) {
      errors.push({ path: 'risk_evolution.trend', message: 'invalid' });
    }

    const se = record.stability_evolution && typeof record.stability_evolution === 'object' ? record.stability_evolution : {};
    if (se.trend != null && !trendSet.has(_normTrend(se.trend))) {
      errors.push({ path: 'stability_evolution.trend', message: 'invalid' });
    }
    if (!Array.isArray(record.trace)) errors.push({ path: 'trace', message: 'not_array' });
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) });
  }
  return { valid: errors.length === 0, errors };
}

function generateGovernanceEvolutionSnapshot() {
  return {
    generated_at: _nowIso(),
    timeline_windows: [...Object.values(POLICY_EVOLUTION_WINDOWS)],
    trend_types: [...Object.values(POLICY_EVOLUTION_TRENDS)],
    evolution_types: [...Object.values(POLICY_EVOLUTION_TYPES)],
    evolution_enabled: isPolicyEvolutionEnabled()
  };
}

function getPolicyGovernanceEvolutionDashboardSummary() {
  if (!isPolicyEvolutionEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_EVOLUTION_DISABLED',
      message: 'Defina IMPETUS_POLICY_EVOLUTION_ENABLED=true para o evolution engine de governança (read-only).'
    };
  }
  const report = generateGovernanceEvolutionReport();
  const validation = validateGovernanceEvolution(report);
  const topo = report.topology_evolution && report.topology_evolution[0];
  const ob = report.obligation_evolution && report.obligation_evolution[0];
  const ar = report.arbitration_evolution && report.arbitration_evolution[0];
  return {
    enabled: true,
    generated_at: _nowIso(),
    timeline_window: report.timeline_window,
    trajectory_trend: report.trajectory?.trend ?? '—',
    trajectory_direction: report.trajectory?.direction ?? '—',
    governance_trends_preview: (report.governance_trends || []).map((t) => t.trend).slice(0, 6),
    topology_evolution_trend: topo?.trend ?? '—',
    obligation_evolution_trend: ob?.trend ?? '—',
    arbitration_evolution_trend: ar?.trend ?? '—',
    stability_score: report.stability_evolution?.stability_score ?? '—',
    stability_trend: report.stability_evolution?.trend ?? '—',
    risk_evolution_trend: report.risk_evolution?.trend ?? '—',
    validation_ok: validation.valid,
    trace_steps: (report.trace || []).length
  };
}

function generatePolicyGovernanceEvolutionAdminPayload() {
  return {
    snapshot: generateGovernanceEvolutionSnapshot(),
    demo_evolution: generateGovernanceEvolutionReport()
  };
}

module.exports = {
  POLICY_EVOLUTION_WINDOWS,
  POLICY_EVOLUTION_TRENDS,
  POLICY_EVOLUTION_TYPES,
  isPolicyEvolutionEnabled,
  createGovernanceEvolution,
  analyzeTopologyEvolution,
  analyzeObligationEvolution,
  analyzeArbitrationEvolution,
  calculateGovernanceTrajectory,
  analyzeRiskEvolution,
  appendEvolutionTrace,
  runGovernanceEvolutionAnalysis,
  generateGovernanceEvolutionReport,
  validateGovernanceEvolution,
  generateGovernanceEvolutionSnapshot,
  buildDemoEvolutionInput,
  getPolicyGovernanceEvolutionDashboardSummary,
  generatePolicyGovernanceEvolutionAdminPayload
};
