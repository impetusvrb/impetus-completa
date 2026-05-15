'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 11 (Policy Governance Diff Engine — read-only)
 * Comparação estrutural produção vs sandbox / simulação: deltas topológicos e normativos.
 * Não altera runtime real, gateway, orchestrator nem executa governance.
 * Rollout: IMPETUS_POLICY_DIFF_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_DIFF_MODES = Object.freeze({
  PRODUCTION_VS_SANDBOX: 'production_vs_sandbox',
  BASELINE_VS_SIMULATION: 'baseline_vs_simulation',
  GRAPH_VS_RUNTIME: 'graph_vs_runtime',
  ARBITRATION_VS_OBLIGATION: 'arbitration_vs_obligation'
});

const POLICY_DIFF_SEVERITY = Object.freeze({
  MINIMAL: 'minimal',
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical'
});

const POLICY_DIFF_TYPES = Object.freeze({
  TOPOLOGY_SHIFT: 'TOPOLOGY_SHIFT',
  OBLIGATION_EXPANSION: 'OBLIGATION_EXPANSION',
  ARBITRATION_DOMINANCE: 'ARBITRATION_DOMINANCE',
  TRACE_GROWTH: 'TRACE_GROWTH',
  SAFETY_ESCALATION: 'SAFETY_ESCALATION',
  TENANT_FRAGMENTATION: 'TENANT_FRAGMENTATION',
  GOVERNANCE_PRESSURE: 'GOVERNANCE_PRESSURE'
});

function isPolicyDiffEnabled() {
  return String(process.env.IMPETUS_POLICY_DIFF_ENABLED || '')
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

function _rankPressure(lv) {
  const m = { minimal: 0, none: 0, low: 1, moderate: 2, high: 3, critical: 4 };
  return m[_normLower(lv, 16)] ?? 0;
}

function _maxSeverity(sevs) {
  const order = ['minimal', 'low', 'moderate', 'high', 'critical'];
  let best = 0;
  for (const s of sevs) {
    const i = order.indexOf(_normLower(s, 16));
    if (i > best) best = i;
  }
  return order[best] || POLICY_DIFF_SEVERITY.MINIMAL;
}

function _defaultProductionBaseline() {
  return {
    governance_topology_nodes: 0,
    governance_topology_edges: 0,
    obligations_active_count: 0,
    arbitration_domain_active: null,
    runtime_pressure_level: 'minimal',
    trace_depth: 0,
    hitl_active: false,
    label: 'production_governance_baseline_readonly'
  };
}

/** @param {Record<string, unknown>} partial */
function createGovernanceDiff(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const modeKeys = new Set(Object.values(POLICY_DIFF_MODES));
  let comparison_mode = _normLower(p.comparison_mode, 64);
  if (!modeKeys.has(comparison_mode)) comparison_mode = POLICY_DIFF_MODES.PRODUCTION_VS_SANDBOX;

  const topology_changes = Array.isArray(p.topology_changes) ? p.topology_changes.filter((x) => x && typeof x === 'object') : [];
  const obligation_deltas = Array.isArray(p.obligation_deltas) ? p.obligation_deltas.filter((x) => x && typeof x === 'object') : [];
  const arbitration_deltas = Array.isArray(p.arbitration_deltas) ? p.arbitration_deltas.filter((x) => x && typeof x === 'object') : [];

  let runtime_pressure_delta = {};
  try {
    if (p.runtime_pressure_delta && typeof p.runtime_pressure_delta === 'object' && !Array.isArray(p.runtime_pressure_delta)) {
      runtime_pressure_delta = { ...p.runtime_pressure_delta };
    }
  } catch (_e2) {
    runtime_pressure_delta = {};
  }

  let governance_shift = { severity: POLICY_DIFF_SEVERITY.MINIMAL };
  try {
    if (p.governance_shift && typeof p.governance_shift === 'object' && !Array.isArray(p.governance_shift)) {
      governance_shift = { ...governance_shift, ...p.governance_shift };
    }
  } catch (_e3) {}

  let risk_delta = { severity: POLICY_DIFF_SEVERITY.MINIMAL };
  try {
    if (p.risk_delta && typeof p.risk_delta === 'object' && !Array.isArray(p.risk_delta)) {
      risk_delta = { ...risk_delta, ...p.risk_delta };
    }
  } catch (_e4) {}

  const trace = Array.isArray(p.trace) ? p.trace.filter((t) => t && typeof t === 'object') : [];

  const rec = {
    diff_id: p.diff_id != null ? _safeStr(p.diff_id, 64) : randomUUID(),
    comparison_mode,
    topology_changes,
    obligation_deltas,
    arbitration_deltas,
    runtime_pressure_delta,
    governance_shift,
    risk_delta,
    trace,
    generated_at: p.generated_at != null ? _safeStr(p.generated_at, 40) : _nowIso()
  };

  try {
    console.info('[POLICY_DIFF]', JSON.stringify({ action: 'create', mode: rec.comparison_mode, topo: topology_changes.length }));
  } catch (_e5) {}
  return rec;
}

function detectTopologyChanges(production, graph) {
  const topology_changes = [];
  try {
    const prod =
      production && typeof production === 'object' && !Array.isArray(production) ? production : _defaultProductionBaseline();
    const gr = graph && typeof graph === 'object' ? graph : {};
    const nodes = Array.isArray(gr.nodes) ? gr.nodes : [];
    const edges = Array.isArray(gr.edges) ? gr.edges : [];
    const pn = typeof prod.governance_topology_nodes === 'number' ? prod.governance_topology_nodes : 0;
    const pe = typeof prod.governance_topology_edges === 'number' ? prod.governance_topology_edges : 0;
    const dn = nodes.length - pn;
    const de = edges.length - pe;

    if (dn > 0 || de > 0) {
      const severity =
        dn >= 15 || de >= 18 ? POLICY_DIFF_SEVERITY.HIGH : dn >= 8 || de >= 10 ? POLICY_DIFF_SEVERITY.MODERATE : POLICY_DIFF_SEVERITY.LOW;
      topology_changes.push({
        type: POLICY_DIFF_TYPES.TOPOLOGY_SHIFT,
        severity,
        detail: { delta_nodes: dn, delta_edges: de, sandbox_nodes: nodes.length, sandbox_edges: edges.length }
      });
      try {
        console.info('[POLICY_DIFF_TOPOLOGY]', JSON.stringify({ delta_nodes: dn, delta_edges: de }));
      } catch (_e) {}
    }

    const cent = gr.centrality && typeof gr.centrality === 'object' ? gr.centrality : {};
    const domG = _safeStr(cent.dominant_domain, 32).toUpperCase();
    const prodDom = prod.arbitration_domain_active != null ? _safeStr(prod.arbitration_domain_active, 32).toUpperCase() : null;
    if (prodDom && domG && prodDom !== domG) {
      topology_changes.push({
        type: POLICY_DIFF_TYPES.GOVERNANCE_PRESSURE,
        severity: POLICY_DIFF_SEVERITY.MODERATE,
        detail: { graph_dominant: domG, production_domain: prodDom }
      });
      try {
        console.info('[POLICY_DIFF_TOPOLOGY]', JSON.stringify({ governance_pressure_domain_shift: true }));
      } catch (_e2) {}
    }

    const pats = Array.isArray(gr.patterns) ? gr.patterns : [];
    if (pats.length >= 2) {
      topology_changes.push({
        type: POLICY_DIFF_TYPES.TOPOLOGY_SHIFT,
        severity: POLICY_DIFF_SEVERITY.LOW,
        detail: { pattern_cluster: pats.length }
      });
    }
  } catch (e) {
    topology_changes.push({
      type: POLICY_DIFF_TYPES.TOPOLOGY_SHIFT,
      severity: POLICY_DIFF_SEVERITY.LOW,
      detail: { error: _safeStr(e && e.message, 200) }
    });
  }
  return { topology_changes };
}

function detectObligationDeltas(production, sandbox) {
  const obligation_deltas = [];
  try {
    const prod =
      production && typeof production === 'object' && !Array.isArray(production) ? production : _defaultProductionBaseline();
    const sbx = sandbox && typeof sandbox === 'object' ? sandbox : {};
    const mirrored = Array.isArray(sbx.mirrored_obligations) ? sbx.mirrored_obligations : [];
    const simG = sbx.simulated_governance && typeof sbx.simulated_governance === 'object' ? sbx.simulated_governance : {};
    const simObs = Array.isArray(simG.simulated_obligations) ? simG.simulated_obligations : [];
    const sbxCount = Math.max(mirrored.length, simObs.length);
    const po = typeof prod.obligations_active_count === 'number' ? prod.obligations_active_count : 0;
    const delta = sbxCount - po;

    if (delta > 0) {
      obligation_deltas.push({
        type: POLICY_DIFF_TYPES.OBLIGATION_EXPANSION,
        severity: delta >= 6 ? POLICY_DIFF_SEVERITY.HIGH : delta >= 3 ? POLICY_DIFF_SEVERITY.MODERATE : POLICY_DIFF_SEVERITY.LOW,
        detail: { delta_obligations: delta, sandbox_obligations: sbxCount, production_obligations: po }
      });
      try {
        console.info('[POLICY_DIFF_OBLIGATION]', JSON.stringify({ type: POLICY_DIFF_TYPES.OBLIGATION_EXPANSION, delta }));
      } catch (_e) {}
    }

    if (mirrored.some((m) => m && m.type === 'HITL_REQUIRED') && !prod.hitl_active) {
      obligation_deltas.push({
        type: POLICY_DIFF_TYPES.SAFETY_ESCALATION,
        severity: POLICY_DIFF_SEVERITY.MODERATE,
        detail: { shadow_hitl_mirror: true }
      });
    }

    const pTrace = typeof prod.trace_depth === 'number' ? prod.trace_depth : 0;
    const sbxTrace =
      (Array.isArray(sbx.trace) ? sbx.trace.length : 0) +
      (Array.isArray(simG.predicted_effects) ? 0 : 0) +
      (mirrored.length > 0 && pTrace < 2 ? 2 : 0);
    if (sbxCount > pTrace + 3) {
      obligation_deltas.push({
        type: POLICY_DIFF_TYPES.TRACE_GROWTH,
        severity: POLICY_DIFF_SEVERITY.LOW,
        detail: { trace_growth_hint: sbxCount - pTrace }
      });
    }

    const ten = mirrored.filter((m) => m && _normLower(m.domain) === 'tenant').length;
    if (ten >= 2) {
      obligation_deltas.push({
        type: POLICY_DIFF_TYPES.TENANT_FRAGMENTATION,
        severity: POLICY_DIFF_SEVERITY.LOW,
        detail: { tenant_mirrored: ten }
      });
    }

    if ((sbx.runtime_pressure && _normLower(sbx.runtime_pressure.obligation_pressure, 16)) === 'high') {
      obligation_deltas.push({
        type: POLICY_DIFF_TYPES.GOVERNANCE_PRESSURE,
        severity: POLICY_DIFF_SEVERITY.MODERATE,
        detail: { obligation_pressure: 'high' }
      });
    }
  } catch (e) {
    obligation_deltas.push({
      type: POLICY_DIFF_TYPES.OBLIGATION_EXPANSION,
      severity: POLICY_DIFF_SEVERITY.LOW,
      detail: { error: _safeStr(e && e.message, 200) }
    });
  }
  return { obligation_deltas };
}

function detectArbitrationDeltas(production, sandbox) {
  const arbitration_deltas = [];
  try {
    const prod =
      production && typeof production === 'object' && !Array.isArray(production) ? production : _defaultProductionBaseline();
    const sbx = sandbox && typeof sandbox === 'object' ? sandbox : {};
    const arb = sbx.sandbox_arbitration && typeof sbx.sandbox_arbitration === 'object' ? sbx.sandbox_arbitration : {};
    const sbxDom = _safeStr(arb.dominant_domain, 32).toUpperCase();
    const prodDom =
      prod.arbitration_domain_active != null ? _safeStr(prod.arbitration_domain_active, 32).toUpperCase() : null;

    if (prodDom && sbxDom && prodDom !== sbxDom) {
      arbitration_deltas.push({
        type: POLICY_DIFF_TYPES.ARBITRATION_DOMINANCE,
        severity: POLICY_DIFF_SEVERITY.HIGH,
        detail: { from: prodDom, to: sbxDom }
      });
    } else if (!prodDom && sbxDom) {
      arbitration_deltas.push({
        type: POLICY_DIFF_TYPES.ARBITRATION_DOMINANCE,
        severity: POLICY_DIFF_SEVERITY.MODERATE,
        detail: { sandbox_dominant: sbxDom, production_neutral: true }
      });
    }

    if (_normLower(arb.override_pressure, 16) === 'high') {
      arbitration_deltas.push({
        type: POLICY_DIFF_TYPES.GOVERNANCE_PRESSURE,
        severity: POLICY_DIFF_SEVERITY.MODERATE,
        detail: { override_pressure: 'high' }
      });
    }

    if (arb.arbitration_loop_risk === true) {
      arbitration_deltas.push({
        type: POLICY_DIFF_TYPES.ARBITRATION_DOMINANCE,
        severity: POLICY_DIFF_SEVERITY.LOW,
        detail: { loop_risk_observed: true }
      });
    }

    for (const d of arbitration_deltas) {
      try {
        console.info('[POLICY_DIFF_ARBITRATION]', JSON.stringify({ type: d.type, severity: d.severity }));
      } catch (_e) {}
    }
  } catch (e) {
    arbitration_deltas.push({
      type: POLICY_DIFF_TYPES.ARBITRATION_DOMINANCE,
      severity: POLICY_DIFF_SEVERITY.LOW,
      detail: { error: _safeStr(e && e.message, 200) }
    });
  }
  return { arbitration_deltas };
}

function calculateGovernanceShift(ctx) {
  try {
    const all = [];
    const c = ctx && typeof ctx === 'object' ? ctx : {};
    for (const arr of [c.topology_changes, c.obligation_deltas, c.arbitration_deltas]) {
      if (!Array.isArray(arr)) continue;
      for (const x of arr) {
        if (x && x.severity) all.push(x.severity);
      }
    }
    const severity = _maxSeverity(all.length ? all : [POLICY_DIFF_SEVERITY.MINIMAL]);
    const structural_score = (c.topology_changes?.length || 0) + (c.obligation_deltas?.length || 0) + (c.arbitration_deltas?.length || 0);
    try {
      console.info('[POLICY_DIFF]', JSON.stringify({ action: 'governance_shift', severity, structural_score }));
    } catch (_e) {}
    return {
      governance_shift: {
        severity,
        structural_score,
        normative_pressure: severity === POLICY_DIFF_SEVERITY.CRITICAL || severity === POLICY_DIFF_SEVERITY.HIGH ? 'elevated' : 'nominal'
      }
    };
  } catch (e) {
    return {
      governance_shift: {
        severity: POLICY_DIFF_SEVERITY.LOW,
        error: _safeStr(e && e.message, 200)
      }
    };
  }
}

function calculateRiskDelta(production, sandbox, simulation) {
  try {
    const prod =
      production && typeof production === 'object' && !Array.isArray(production) ? production : _defaultProductionBaseline();
    const sbx = sandbox && typeof sandbox === 'object' ? sandbox : {};
    const sim = simulation && typeof simulation === 'object' ? simulation : {};
    const prLevel = _safeStr(prod.runtime_pressure_level, 16) || 'minimal';
    const sbxPress = sbx.runtime_pressure && typeof sbx.runtime_pressure === 'object' ? sbx.runtime_pressure : {};
    const sbxLevel = _safeStr(sbxPress.level, 16) || 'low';
    const deltaMag = _rankPressure(sbxLevel) - _rankPressure(prLevel);

    const rr = sim.runtime_risk && typeof sim.runtime_risk === 'object' ? sim.runtime_risk : {};
    const simLevel = _safeStr(rr.level, 16) || 'low';
    const severity = _maxSeverity([prLevel, sbxLevel, simLevel, deltaMag >= 2 ? POLICY_DIFF_SEVERITY.MODERATE : POLICY_DIFF_SEVERITY.LOW]);

    const risk_delta = {
      severity,
      simulation_risk_level: simLevel,
      sandbox_pressure_level: sbxLevel,
      delta_magnitude: deltaMag,
      trace_explosion_hint: Array.isArray(sim.predicted_effects) && sim.predicted_effects.includes('governance_complexity')
    };
    try {
      console.info('[POLICY_DIFF]', JSON.stringify({ action: 'risk_delta', severity: risk_delta.severity }));
    } catch (_e) {}
    return { risk_delta };
  } catch (e) {
    return {
      risk_delta: {
        severity: POLICY_DIFF_SEVERITY.LOW,
        error: _safeStr(e && e.message, 200)
      }
    };
  }
}

function appendGovernanceDiffTrace(trace, entry) {
  const list = Array.isArray(trace) ? [...trace] : [];
  try {
    list.push({
      type: _safeStr(entry && entry.type, 32).toUpperCase() || 'DIFF',
      message: _safeStr(entry && entry.message, 2000),
      timestamp: _nowIso(),
      detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
    });
  } catch (_e) {
    list.push({ type: 'DIFF', message: 'trace_append_failed', timestamp: _nowIso() });
  }
  try {
    console.info('[POLICY_DIFF]', JSON.stringify({ action: 'trace', steps: list.length }));
  } catch (_e2) {}
  return list;
}

/**
 * @param {Record<string, unknown>} input
 */
function runGovernanceDiffAnalysis(input) {
  try {
    const raw = input && typeof input === 'object' ? input : {};
    const production = raw.production && typeof raw.production === 'object' ? raw.production : _defaultProductionBaseline();
    const sandbox = raw.sandbox && typeof raw.sandbox === 'object' ? raw.sandbox : {};
    const graph = raw.graph && typeof raw.graph === 'object' ? raw.graph : {};
    const simulation = raw.simulation && typeof raw.simulation === 'object' ? raw.simulation : {};

    const { topology_changes } = detectTopologyChanges(production, graph);
    const { obligation_deltas } = detectObligationDeltas(production, sandbox);
    const { arbitration_deltas } = detectArbitrationDeltas(production, sandbox);

    const { governance_shift } = calculateGovernanceShift({ topology_changes, obligation_deltas, arbitration_deltas });
    const { risk_delta } = calculateRiskDelta(production, sandbox, simulation);

    const sbxPress = sandbox.runtime_pressure && typeof sandbox.runtime_pressure === 'object' ? sandbox.runtime_pressure : {};
    const runtime_pressure_delta = {
      production_level: _safeStr(production.runtime_pressure_level, 24) || 'minimal',
      sandbox_level: _safeStr(sbxPress.level, 24) || 'low',
      delta_magnitude: _rankPressure(sbxPress.level) - _rankPressure(production.runtime_pressure_level),
      obligation_pressure_delta: _safeStr(sbxPress.obligation_pressure, 24),
      arbitration_pressure_delta: _safeStr(sandbox.sandbox_arbitration && sandbox.sandbox_arbitration.override_pressure, 24)
    };

    try {
      console.info(
        '[POLICY_DIFF]',
        JSON.stringify({ action: 'analysis_complete', topology: topology_changes.length, obligations: obligation_deltas.length })
      );
    } catch (_e) {}

    return {
      topology_changes,
      obligation_deltas,
      arbitration_deltas,
      runtime_pressure_delta,
      governance_shift,
      risk_delta
    };
  } catch (e) {
    try {
      console.warn('[POLICY_DIFF]', { action: 'analysis_failed', message: _safeStr(e && e.message, 200) });
    } catch (_e2) {}
    return {
      topology_changes: [{ type: POLICY_DIFF_TYPES.TOPOLOGY_SHIFT, severity: POLICY_DIFF_SEVERITY.LOW, detail: { degraded: true } }],
      obligation_deltas: [],
      arbitration_deltas: [],
      runtime_pressure_delta: { production_level: 'minimal', sandbox_level: 'low', delta_magnitude: 0 },
      governance_shift: { severity: POLICY_DIFF_SEVERITY.LOW },
      risk_delta: { severity: POLICY_DIFF_SEVERITY.LOW }
    };
  }
}

function buildDemoDiffInput() {
  try {
    const cognitivePolicySandboxRuntimeService = require('./cognitivePolicySandboxRuntimeService');
    const cognitivePolicySimulationRuntimeService = require('./cognitivePolicySimulationRuntimeService');
    const cognitivePolicyGovernanceGraphService = require('./cognitivePolicyGovernanceGraphService');

    const sandbox = cognitivePolicySandboxRuntimeService.generateSandboxExecutionReport();
    const simulationPayload = cognitivePolicySimulationRuntimeService.buildDemoSimulationInput();
    const simulation = cognitivePolicySimulationRuntimeService.runPolicySimulation(simulationPayload);
    let graph = simulationPayload.graph && typeof simulationPayload.graph === 'object' ? simulationPayload.graph : {};
    if (!Array.isArray(graph.nodes) || graph.nodes.length === 0) {
      graph = cognitivePolicyGovernanceGraphService.generateGovernanceGraphReport({
        signals: simulationPayload.signals,
        decision: simulationPayload.decision,
        arbitration: simulationPayload.arbitration,
        obligations: simulationPayload.obligations && simulationPayload.obligations.obligations ? simulationPayload.obligations.obligations : []
      });
    }

    const production = {
      ..._defaultProductionBaseline(),
      trace_depth: 0
    };

    return { production, sandbox, graph, simulation };
  } catch (_e) {
    return {
      production: _defaultProductionBaseline(),
      sandbox: {},
      graph: { nodes: [], edges: [] },
      simulation: { runtime_risk: { level: 'low' } }
    };
  }
}

function generateGovernanceDiffReport(input) {
  const rawIn = input != null && typeof input === 'object' ? input : buildDemoDiffInput();
  const analysis = runGovernanceDiffAnalysis(rawIn);

  let trace = [];
  trace = appendGovernanceDiffTrace(trace, {
    type: 'DIFF',
    message: 'Governance topology shift detected',
    detail: { changes: analysis.topology_changes.length }
  });
  trace = appendGovernanceDiffTrace(trace, {
    type: 'DIFF',
    message: `Obligation delta count ${analysis.obligation_deltas.length}`,
    detail: { arbitration_deltas: analysis.arbitration_deltas.length }
  });

  const diff = createGovernanceDiff({
    comparison_mode: POLICY_DIFF_MODES.PRODUCTION_VS_SANDBOX,
    topology_changes: analysis.topology_changes,
    obligation_deltas: analysis.obligation_deltas,
    arbitration_deltas: analysis.arbitration_deltas,
    runtime_pressure_delta: analysis.runtime_pressure_delta,
    governance_shift: analysis.governance_shift,
    risk_delta: analysis.risk_delta,
    trace
  });

  diff.diff_meta = {
    read_only: true,
    baseline: 'production_surface',
    subject: 'sandbox_twin'
  };

  return diff;
}

function validateGovernanceDiff(record) {
  const errors = [];
  try {
    if (!record || typeof record !== 'object') {
      errors.push({ path: '', message: 'diff_missing' });
      return { valid: false, errors };
    }
    const modeSet = new Set(Object.values(POLICY_DIFF_MODES));
    if (!modeSet.has(_normLower(record.comparison_mode, 64))) {
      errors.push({ path: 'comparison_mode', message: 'invalid_mode' });
    }
    const typeSet = new Set(Object.values(POLICY_DIFF_TYPES));
    const sevSet = new Set(Object.values(POLICY_DIFF_SEVERITY));

    const topo = Array.isArray(record.topology_changes) ? record.topology_changes : [];
    for (let i = 0; i < topo.length; i++) {
      const x = topo[i];
      if (!x || !typeSet.has(_safeStr(x.type, 64))) errors.push({ path: `topology_changes[${i}].type`, message: 'invalid_diff_type' });
      if (x && x.severity != null && !sevSet.has(_normLower(x.severity, 16))) {
        errors.push({ path: `topology_changes[${i}].severity`, message: 'invalid_severity' });
      }
    }
    const ob = Array.isArray(record.obligation_deltas) ? record.obligation_deltas : [];
    for (let i = 0; i < ob.length; i++) {
      const x = ob[i];
      if (!x || !typeSet.has(_safeStr(x.type, 64))) errors.push({ path: `obligation_deltas[${i}].type`, message: 'invalid_diff_type' });
      if (x && x.severity != null && !sevSet.has(_normLower(x.severity, 16))) {
        errors.push({ path: `obligation_deltas[${i}].severity`, message: 'invalid_severity' });
      }
    }
    const ar = Array.isArray(record.arbitration_deltas) ? record.arbitration_deltas : [];
    for (let i = 0; i < ar.length; i++) {
      const x = ar[i];
      if (!x || !typeSet.has(_safeStr(x.type, 64))) errors.push({ path: `arbitration_deltas[${i}].type`, message: 'invalid_diff_type' });
      if (x && x.severity != null && !sevSet.has(_normLower(x.severity, 16))) {
        errors.push({ path: `arbitration_deltas[${i}].severity`, message: 'invalid_severity' });
      }
    }

    const gs = record.governance_shift && typeof record.governance_shift === 'object' ? record.governance_shift : {};
    if (!sevSet.has(_normLower(gs.severity, 16))) errors.push({ path: 'governance_shift.severity', message: 'invalid' });

    const rd = record.risk_delta && typeof record.risk_delta === 'object' ? record.risk_delta : {};
    if (!sevSet.has(_normLower(rd.severity, 16))) errors.push({ path: 'risk_delta.severity', message: 'invalid' });

    if (!record.runtime_pressure_delta || typeof record.runtime_pressure_delta !== 'object') {
      errors.push({ path: 'runtime_pressure_delta', message: 'missing' });
    }
    if (!Array.isArray(record.trace)) errors.push({ path: 'trace', message: 'not_array' });
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) });
  }
  return { valid: errors.length === 0, errors };
}

function generateGovernanceDiffSnapshot() {
  return {
    generated_at: _nowIso(),
    diff_modes: [...Object.values(POLICY_DIFF_MODES)],
    diff_types: [...Object.values(POLICY_DIFF_TYPES)],
    severity_levels: [...Object.values(POLICY_DIFF_SEVERITY)],
    diff_enabled: isPolicyDiffEnabled()
  };
}

function getPolicyGovernanceDiffDashboardSummary() {
  if (!isPolicyDiffEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_DIFF_DISABLED',
      message: 'Defina IMPETUS_POLICY_DIFF_ENABLED=true para o diff engine de governança (read-only).'
    };
  }
  const report = generateGovernanceDiffReport();
  const validation = validateGovernanceDiff(report);
  const allChanges = [
    ...(report.topology_changes || []).map((x) => x.type),
    ...(report.obligation_deltas || []).map((x) => x.type),
    ...(report.arbitration_deltas || []).map((x) => x.type)
  ];
  return {
    enabled: true,
    generated_at: _nowIso(),
    comparison_mode: report.comparison_mode,
    topology_changes_count: (report.topology_changes || []).length,
    obligation_deltas_count: (report.obligation_deltas || []).length,
    arbitration_deltas_count: (report.arbitration_deltas || []).length,
    governance_shift_severity: report.governance_shift?.severity ?? '—',
    risk_delta_severity: report.risk_delta?.severity ?? '—',
    runtime_pressure_delta_magnitude: report.runtime_pressure_delta?.delta_magnitude ?? '—',
    dominant_divergence: allChanges[0] ?? '—',
    divergence_preview: allChanges.slice(0, 5),
    validation_ok: validation.valid,
    trace_steps: (report.trace || []).length
  };
}

function generatePolicyGovernanceDiffAdminPayload() {
  return {
    snapshot: generateGovernanceDiffSnapshot(),
    demo_diff: generateGovernanceDiffReport()
  };
}

module.exports = {
  POLICY_DIFF_MODES,
  POLICY_DIFF_SEVERITY,
  POLICY_DIFF_TYPES,
  isPolicyDiffEnabled,
  createGovernanceDiff,
  detectTopologyChanges,
  detectObligationDeltas,
  detectArbitrationDeltas,
  calculateGovernanceShift,
  calculateRiskDelta,
  appendGovernanceDiffTrace,
  runGovernanceDiffAnalysis,
  generateGovernanceDiffReport,
  validateGovernanceDiff,
  generateGovernanceDiffSnapshot,
  buildDemoDiffInput,
  getPolicyGovernanceDiffDashboardSummary,
  generatePolicyGovernanceDiffAdminPayload
};
