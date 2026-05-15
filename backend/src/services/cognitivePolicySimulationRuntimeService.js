'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 9 (Policy Simulation Runtime — read-only)
 * Simulação normativa e dry-run: efeitos previstos, obrigações e arbitragem só modelados.
 * Não executa governance real, não bloqueia runtime, não altera gateway nem orchestrator.
 * Rollout: IMPETUS_POLICY_SIMULATION_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_SIMULATION_MODES = Object.freeze({
  DRY_RUN: 'dry_run',
  PASSIVE_RUNTIME: 'passive_runtime',
  SIMULATED_GOVERNANCE: 'simulated_governance',
  SHADOW_EXECUTION: 'shadow_execution'
});

const POLICY_SIMULATION_IMPACT = Object.freeze({
  MINIMAL: 'minimal',
  LOW: 'low',
  MODERATE: 'moderate',
  HIGH: 'high',
  CRITICAL: 'critical'
});

const POLICY_SIMULATION_RISKS = Object.freeze({
  RUNTIME_FRAGMENTATION: 'RUNTIME_FRAGMENTATION',
  OVER_BLOCKING: 'OVER_BLOCKING',
  ARBITRATION_CONFLICT: 'ARBITRATION_CONFLICT',
  OBLIGATION_OVERLOAD: 'OBLIGATION_OVERLOAD',
  TRACE_SATURATION: 'TRACE_SATURATION',
  TENANT_RISK: 'TENANT_RISK',
  SAFETY_ESCALATION: 'SAFETY_ESCALATION'
});

function isPolicySimulationEnabled() {
  return String(process.env.IMPETUS_POLICY_SIMULATION_ENABLED || '')
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

/** @param {Record<string, unknown>} partial */
function createPolicySimulation(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const modeKeys = new Set(Object.values(POLICY_SIMULATION_MODES));
  let simulation_mode = _normLower(p.simulation_mode, 48);
  if (!modeKeys.has(simulation_mode)) simulation_mode = POLICY_SIMULATION_MODES.DRY_RUN;

  const impactKeys = new Set(Object.values(POLICY_SIMULATION_IMPACT));
  let overall_impact = _normLower(p.overall_impact, 32);
  if (!impactKeys.has(overall_impact)) overall_impact = POLICY_SIMULATION_IMPACT.MODERATE;

  const predicted_effects = Array.isArray(p.predicted_effects)
    ? [...new Set(p.predicted_effects.map((x) => _safeStr(x, 64)).filter(Boolean))]
    : [];

  const simulated_obligations = Array.isArray(p.simulated_obligations)
    ? p.simulated_obligations.filter((x) => x && typeof x === 'object')
    : [];

  let simulated_arbitration = {};
  try {
    if (p.simulated_arbitration && typeof p.simulated_arbitration === 'object' && !Array.isArray(p.simulated_arbitration)) {
      simulated_arbitration = { ...p.simulated_arbitration };
    }
  } catch (_e2) {
    simulated_arbitration = {};
  }

  let runtime_risk = { level: 'low', risks: [] };
  try {
    if (p.runtime_risk && typeof p.runtime_risk === 'object' && !Array.isArray(p.runtime_risk)) {
      runtime_risk = {
        level: _normLower(p.runtime_risk.level, 16) || 'low',
        risks: Array.isArray(p.runtime_risk.risks) ? p.runtime_risk.risks : []
      };
    }
  } catch (_e3) {
    runtime_risk = { level: 'low', risks: [] };
  }

  const blocked_paths = Array.isArray(p.blocked_paths) ? p.blocked_paths.map((x) => _safeStr(x, 256)) : [];
  const warnings = Array.isArray(p.warnings) ? p.warnings.map((x) => _safeStr(x, 500)) : [];
  const trace = Array.isArray(p.trace) ? p.trace.filter((t) => t && typeof t === 'object') : [];

  const rec = {
    simulation_id: p.simulation_id != null ? _safeStr(p.simulation_id, 64) : randomUUID(),
    simulation_mode,
    overall_impact,
    predicted_effects,
    simulated_obligations,
    simulated_arbitration,
    runtime_risk,
    blocked_paths,
    warnings,
    trace,
    generated_at: p.generated_at != null ? _safeStr(p.generated_at, 40) : _nowIso()
  };

  try {
    console.info('[POLICY_SIMULATION]', JSON.stringify({ action: 'create', mode: rec.simulation_mode, impact: rec.overall_impact }));
  } catch (_e4) {}
  return rec;
}

function _extractMetrics(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const sig = raw.signals && typeof raw.signals === 'object' ? raw.signals : {};
  const sigItems = Array.isArray(sig.items) ? sig.items : Array.isArray(raw.signals) ? raw.signals : [];
  const signal_count = typeof sig.count === 'number' ? sig.count : sigItems.length;

  const arb = raw.arbitration && typeof raw.arbitration === 'object' ? raw.arbitration : {};
  const winner = arb.winner && typeof arb.winner === 'object' ? arb.winner : {};
  const dominant_domain = _safeStr(winner.domain, 32).toUpperCase();
  const conflicts = Array.isArray(arb.conflicts) ? arb.conflicts : [];
  const overrides = Array.isArray(arb.simulated_overrides) ? arb.simulated_overrides : [];

  const obl = raw.obligations && typeof raw.obligations === 'object' ? raw.obligations : {};
  const obList = Array.isArray(obl.obligations) ? obl.obligations : [];

  const gr = raw.graph && typeof raw.graph === 'object' ? raw.graph : {};
  const nodeCount = Array.isArray(gr.nodes) ? gr.nodes.length : 0;
  const edgeCount = Array.isArray(gr.edges) ? gr.edges.length : 0;

  const rd = raw.readiness && typeof raw.readiness === 'object' ? raw.readiness : {};
  const readiness_score = typeof rd.overall_score === 'number' ? rd.overall_score : null;

  const safety_dominant = dominant_domain === 'SAFETY' || obList.some((o) => o && _safeStr(o.domain, 16).toUpperCase() === 'SAFETY' && _normLower(o.severity) === 'critical');

  return {
    signal_count,
    dominant_domain,
    conflict_count: conflicts.length,
    override_count: overrides.length,
    obligation_count: obList.length,
    graph_nodes: nodeCount,
    graph_edges: edgeCount,
    readiness_score,
    safety_dominant,
    obList,
    conflicts,
    trace_depth_obl: Array.isArray(obl.trace) ? obl.trace.length : 0,
    trace_depth_graph: Array.isArray(gr.trace) ? gr.trace.length : 0
  };
}

/**
 * @param {Record<string, unknown>} input
 */
function predictGovernanceEffects(input) {
  const predicted_effects = [];
  try {
    const m = _extractMetrics(input);

    if (m.safety_dominant) {
      predicted_effects.push('increased_softening');
      try {
        console.info('[POLICY_SIMULATION_EFFECT]', JSON.stringify({ effect: 'increased_softening', reason: 'safety_dominance' }));
      } catch (_e) {}
    }
    if (m.obligation_count >= 5) {
      predicted_effects.push('escalation_pressure');
      try {
        console.info('[POLICY_SIMULATION_EFFECT]', JSON.stringify({ effect: 'escalation_pressure', obligations: m.obligation_count }));
      } catch (_e2) {}
    }
    if (m.graph_nodes >= 18 || m.graph_edges >= 20) {
      predicted_effects.push('governance_complexity');
      try {
        console.info('[POLICY_SIMULATION_EFFECT]', JSON.stringify({ effect: 'governance_complexity' }));
      } catch (_e3) {}
    }
    if (m.conflict_count >= 4) {
      predicted_effects.push('arbitration_instability');
      try {
        console.info('[POLICY_SIMULATION_EFFECT]', JSON.stringify({ effect: 'arbitration_instability' }));
      } catch (_e4) {}
    }
    if (!predicted_effects.length) {
      predicted_effects.push('nominal_governance_drift');
    }
  } catch (e) {
    predicted_effects.push('simulation_effect_degraded');
    try {
      console.warn('[POLICY_SIMULATION]', { action: 'effects_error', message: _safeStr(e && e.message, 200) });
    } catch (_e5) {}
  }
  return { predicted_effects };
}

/**
 * @param {unknown} obligationsInput
 */
function simulateObligationExecution(obligationsInput) {
  const simulated_obligations = [];
  try {
    const obl = obligationsInput && typeof obligationsInput === 'object' ? obligationsInput : {};
    const list = Array.isArray(obl.obligations) ? obl.obligations : Array.isArray(obligationsInput) ? obligationsInput : [];

    for (const o of list) {
      if (!o || typeof o !== 'object') continue;
      const t = _safeStr(o.type, 64).toUpperCase();
      if (!t) continue;
      const row = {
        type: t,
        simulated: true,
        dry_run_effect: 'observe_only',
        domain: _safeStr(o.domain, 32).toUpperCase() || 'GOVERNANCE'
      };
      if (t === 'HITL_REQUIRED') row.dry_run_effect = 'would_invoke_hitl_review';
      else if (t === 'TRACE_REQUIRED') row.dry_run_effect = 'would_expand_trace_buffer';
      else if (t === 'AUDIT_REQUIRED') row.dry_run_effect = 'would_escalate_audit_trail';
      else if (t === 'LIMIT_AUTONOMY') row.dry_run_effect = 'would_cap_autonomy_band';
      simulated_obligations.push(row);
    }
    try {
      console.info('[POLICY_SIMULATION]', JSON.stringify({ action: 'sim_obligations', count: simulated_obligations.length }));
    } catch (_e) {}
  } catch (e) {
    simulated_obligations.push({
      type: 'UNKNOWN',
      simulated: true,
      dry_run_effect: 'simulation_error',
      error: _safeStr(e && e.message, 200)
    });
  }
  return { simulated_obligations };
}

/**
 * @param {unknown} arbitrationInput
 */
function simulateArbitrationRuntime(arbitrationInput) {
  const out = {
    dominant_domain: 'GOVERNANCE',
    override_pressure: 'low',
    override_cascade_depth: 0,
    governance_pressure: 'low',
    arbitration_loop_risk: false
  };
  try {
    const arb = arbitrationInput && typeof arbitrationInput === 'object' ? arbitrationInput : {};
    const w = arb.winner && typeof arb.winner === 'object' ? arb.winner : {};
    out.dominant_domain = _safeStr(w.domain, 32).toUpperCase() || 'GOVERNANCE';

    const overrides = Array.isArray(arb.simulated_overrides) ? arb.simulated_overrides : [];
    out.override_cascade_depth = Math.min(20, overrides.length);
    if (overrides.length >= 10) out.override_pressure = 'high';
    else if (overrides.length >= 5) out.override_pressure = 'medium';

    const conflicts = Array.isArray(arb.conflicts) ? arb.conflicts : [];
    if (conflicts.length >= 5 && overrides.length >= 8) {
      out.arbitration_loop_risk = true;
      out.governance_pressure = 'high';
    } else if (conflicts.length >= 3 || overrides.length >= 6) {
      out.governance_pressure = 'medium';
    }

    try {
      console.info('[POLICY_SIMULATION]', JSON.stringify({ action: 'sim_arbitration', domain: out.dominant_domain, pressure: out.override_pressure }));
    } catch (_e) {}
  } catch (e) {
    out.warnings = [_safeStr(e && e.message, 200)];
  }
  return out;
}

function analyzeSimulationRuntimeRisk(input, ctx) {
  const risks = [];
  const m = _extractMetrics(input);
  const c = ctx && typeof ctx === 'object' ? ctx : {};
  const simArb = c.simulated_arbitration && typeof c.simulated_arbitration === 'object' ? c.simulated_arbitration : {};

  try {
    if (m.override_count >= 10 || simArb.override_pressure === 'high') {
      risks.push({ type: POLICY_SIMULATION_RISKS.OVER_BLOCKING, severity: 'high' });
    }
    if (m.graph_edges >= 22 && m.obligation_count >= 6) {
      risks.push({ type: POLICY_SIMULATION_RISKS.OBLIGATION_OVERLOAD, severity: 'medium' });
    }
    if (m.conflict_count >= 4) {
      risks.push({ type: POLICY_SIMULATION_RISKS.ARBITRATION_CONFLICT, severity: 'high' });
    }
    if (m.trace_depth_obl + m.trace_depth_graph > 12) {
      risks.push({ type: POLICY_SIMULATION_RISKS.TRACE_SATURATION, severity: 'medium' });
    }
    if (m.readiness_score != null && m.readiness_score < 40) {
      risks.push({ type: POLICY_SIMULATION_RISKS.RUNTIME_FRAGMENTATION, severity: 'medium' });
    }
    if (m.safety_dominant && m.obligation_count >= 4) {
      risks.push({ type: POLICY_SIMULATION_RISKS.SAFETY_ESCALATION, severity: 'high' });
    }
    if ((c.predicted_effects || []).includes('arbitration_instability')) {
      risks.push({ type: POLICY_SIMULATION_RISKS.ARBITRATION_CONFLICT, severity: 'low' });
    }

    if (m.obList.some((o) => o && _safeStr(o.domain, 32).toUpperCase() === 'TENANT') && m.conflict_count >= 3) {
      risks.push({ type: POLICY_SIMULATION_RISKS.TENANT_RISK, severity: 'medium' });
    }

    let level = 'low';
    const high = risks.filter((r) => r.severity === 'high').length;
    const med = risks.filter((r) => r.severity === 'medium').length;
    if (high >= 2 || (high >= 1 && med >= 2)) level = 'critical';
    else if (high >= 1) level = 'high';
    else if (med >= 2 || risks.length >= 4) level = 'moderate';
    else if (risks.length) level = 'low';

    for (const r of risks) {
      try {
        console.info('[POLICY_SIMULATION_RISK]', JSON.stringify({ type: r.type, severity: r.severity }));
      } catch (_e) {}
    }

    return { runtime_risk: { level, risks } };
  } catch (e) {
    return {
      runtime_risk: {
        level: 'moderate',
        risks: [{ type: POLICY_SIMULATION_RISKS.RUNTIME_FRAGMENTATION, severity: 'low', detail: _safeStr(e && e.message, 200) }]
      }
    };
  }
}

function _impactFromRiskLevel(level) {
  const lv = _normLower(level, 16);
  if (lv === 'critical') return POLICY_SIMULATION_IMPACT.CRITICAL;
  if (lv === 'high') return POLICY_SIMULATION_IMPACT.HIGH;
  if (lv === 'moderate') return POLICY_SIMULATION_IMPACT.MODERATE;
  if (lv === 'low') return POLICY_SIMULATION_IMPACT.LOW;
  return POLICY_SIMULATION_IMPACT.MINIMAL;
}

function _deriveBlockedPaths(m, simArb, effects) {
  const paths = [];
  try {
    if (m.safety_dominant) paths.push('simulated:block:unverified_high_risk_output');
    if ((effects || []).includes('escalation_pressure')) {
      paths.push('simulated:Throttle:autonomous_runtime_branch');
    }
    if (simArb && simArb.override_pressure === 'high') {
      paths.push('simulated:Defer:non_dominant_policy_paths');
    }
    if (m.conflict_count >= 5) {
      paths.push('simulated:Hold:conflicting_executor_routes');
    }
  } catch (_e) {}
  return paths;
}

/**
 * Simulação completa (somente modelo in-memory).
 * @param {Record<string, unknown>} input
 */
function runPolicySimulation(input) {
  const warnings = [];
  try {
    const { predicted_effects } = predictGovernanceEffects(input);
    const { simulated_obligations } = simulateObligationExecution(
      input && input.obligations && typeof input.obligations === 'object' ? input.obligations : input
    );
    const simulated_arbitration = simulateArbitrationRuntime(
      input && input.arbitration && typeof input.arbitration === 'object' ? input.arbitration : {}
    );
    const riskPack = analyzeSimulationRuntimeRisk(input, {
      predicted_effects,
      simulated_arbitration
    });
    const m = _extractMetrics(input);
    const blocked_paths = _deriveBlockedPaths(m, simulated_arbitration, predicted_effects);
    const overall_impact = _impactFromRiskLevel(riskPack.runtime_risk.level);

    if (simulated_arbitration.arbitration_loop_risk) {
      warnings.push('Risco de ciclo de arbitragem simulado entre domínios.');
    }

    try {
      console.info('[POLICY_SIMULATION]', JSON.stringify({ action: 'run_complete', impact: overall_impact, effects: predicted_effects.length }));
    } catch (_e) {}

    return {
      predicted_effects,
      simulated_obligations,
      simulated_arbitration,
      runtime_risk: riskPack.runtime_risk,
      blocked_paths,
      warnings,
      governance_pressure: simulated_arbitration.governance_pressure || 'low'
    };
  } catch (e) {
    try {
      console.warn('[POLICY_SIMULATION]', { action: 'run_failed', message: _safeStr(e && e.message, 200) });
    } catch (_e2) {}
    return {
      predicted_effects: ['simulation_degraded'],
      simulated_obligations: [],
      simulated_arbitration: { dominant_domain: 'GOVERNANCE', override_pressure: 'low', governance_pressure: 'low' },
      runtime_risk: { level: 'moderate', risks: [] },
      blocked_paths: [],
      warnings: [_safeStr(e && e.message, 200)],
      governance_pressure: 'low'
    };
  }
}

function appendSimulationTrace(trace, entry) {
  const list = Array.isArray(trace) ? [...trace] : [];
  try {
    list.push({
      type: _safeStr(entry && entry.type, 32).toUpperCase() || 'SIMULATION',
      message: _safeStr(entry && entry.message, 2000),
      timestamp: _nowIso(),
      detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
    });
  } catch (_e) {
    list.push({ type: 'SIMULATION', message: 'trace_append_failed', timestamp: _nowIso() });
  }
  try {
    console.info('[POLICY_SIMULATION_TRACE]', JSON.stringify({ steps: list.length }));
  } catch (_e2) {}
  return list;
}

function buildDemoSimulationInput() {
  try {
    const cognitivePolicyObligationService = require('./cognitivePolicyObligationService');
    const cognitivePolicyGovernanceGraphService = require('./cognitivePolicyGovernanceGraphService');
    const cognitivePolicyExecutionReadinessService = require('./cognitivePolicyExecutionReadinessService');

    const comp = cognitivePolicyObligationService.buildDemoCompositionInput();
    const obligations = cognitivePolicyObligationService.generateObligationReport(comp);
    const graph = cognitivePolicyGovernanceGraphService.generateGovernanceGraphReport({
      signals: comp.signals,
      decision: comp.decision,
      arbitration: comp.arbitration,
      obligations: obligations.obligations
    });
    const readiness = cognitivePolicyExecutionReadinessService.generateExecutionReadinessReport({
      signals: { count: Array.isArray(comp.signals) ? comp.signals.length : 0, items: comp.signals },
      arbitration: comp.arbitration,
      obligations,
      graph,
      runtime: { stability_hint: 0.7, tenant_isolation_hint: true },
      safety: { coverage_hint: 0.8 },
      integrity: { coverage_hint: 0.55 },
      observability: { trace_layers: (obligations.trace?.length || 0) + (graph.trace?.length || 0) }
    });

    return {
      signals: { count: Array.isArray(comp.signals) ? comp.signals.length : 0, items: comp.signals },
      arbitration: comp.arbitration,
      obligations,
      graph,
      readiness
    };
  } catch (_e) {
    return {
      signals: { count: 0, items: [] },
      arbitration: {},
      obligations: { obligations: [], trace: [] },
      graph: { nodes: [], edges: [], trace: [] },
      readiness: { overall_score: 0, status: 'not_ready', trace: [] }
    };
  }
}

function generateSimulationRuntimeReport(input) {
  const rawIn = input != null && typeof input === 'object' ? input : buildDemoSimulationInput();
  const run = runPolicySimulation(rawIn);

  let trace = [];
  trace = appendSimulationTrace(trace, {
    type: 'SIMULATION',
    message: 'Safety governance escalation simulated',
    detail: { mode: POLICY_SIMULATION_MODES.DRY_RUN }
  });
  trace = appendSimulationTrace(trace, {
    type: 'SIMULATION',
    message: `Predicted effects: ${run.predicted_effects.join(', ') || 'none'}`,
    detail: { predicted_effects: run.predicted_effects }
  });

  const sim = createPolicySimulation({
    simulation_mode: POLICY_SIMULATION_MODES.DRY_RUN,
    overall_impact: run.runtime_risk?.level ? _impactFromRiskLevel(run.runtime_risk.level) : POLICY_SIMULATION_IMPACT.MODERATE,
    predicted_effects: run.predicted_effects,
    simulated_obligations: run.simulated_obligations,
    simulated_arbitration: run.simulated_arbitration,
    runtime_risk: run.runtime_risk,
    blocked_paths: run.blocked_paths,
    warnings: [...(run.warnings || [])],
    trace
  });

  sim.governance_pressure = run.governance_pressure;
  sim.simulation_meta = {
    obligation_candidates: run.simulated_obligations.length,
    risk_level: run.runtime_risk?.level,
    read_only: true
  };

  return sim;
}

function validateSimulationRuntime(record) {
  const errors = [];
  try {
    if (!record || typeof record !== 'object') {
      errors.push({ path: '', message: 'simulation_missing' });
      return { valid: false, errors };
    }
    const impactSet = new Set(Object.values(POLICY_SIMULATION_IMPACT));
    if (!impactSet.has(_normLower(record.overall_impact, 32))) {
      errors.push({ path: 'overall_impact', message: 'invalid_impact' });
    }
    const rr = record.runtime_risk && typeof record.runtime_risk === 'object' ? record.runtime_risk : {};
    if (!['low', 'moderate', 'high', 'critical'].includes(_normLower(rr.level, 16))) {
      errors.push({ path: 'runtime_risk.level', message: 'invalid_level' });
    }
    const riskTypes = new Set(Object.values(POLICY_SIMULATION_RISKS));
    const rlist = Array.isArray(rr.risks) ? rr.risks : [];
    for (let i = 0; i < rlist.length; i++) {
      const r = rlist[i];
      if (!r || !riskTypes.has(_safeStr(r.type, 64))) {
        errors.push({ path: `runtime_risk.risks[${i}]`, message: 'invalid_risk_type' });
      }
    }
    if (!Array.isArray(record.simulated_obligations)) {
      errors.push({ path: 'simulated_obligations', message: 'not_array' });
    } else {
      for (let i = 0; i < record.simulated_obligations.length; i++) {
        const o = record.simulated_obligations[i];
        if (!o || o.simulated !== true) {
          errors.push({ path: `simulated_obligations[${i}]`, message: 'invalid_simulated_flag' });
        }
      }
    }
    if (!record.simulated_arbitration || typeof record.simulated_arbitration !== 'object') {
      errors.push({ path: 'simulated_arbitration', message: 'missing' });
    } else if (!_safeStr(record.simulated_arbitration.dominant_domain, 1)) {
      errors.push({ path: 'simulated_arbitration.dominant_domain', message: 'missing' });
    }
    if (!Array.isArray(record.blocked_paths)) errors.push({ path: 'blocked_paths', message: 'not_array' });
    if (!Array.isArray(record.warnings)) errors.push({ path: 'warnings', message: 'not_array' });
    if (!Array.isArray(record.trace)) errors.push({ path: 'trace', message: 'not_array' });
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) });
  }
  return { valid: errors.length === 0, errors };
}

function generateSimulationRuntimeSnapshot() {
  return {
    generated_at: _nowIso(),
    simulation_modes: [...Object.values(POLICY_SIMULATION_MODES)],
    impact_levels: [...Object.values(POLICY_SIMULATION_IMPACT)],
    supported_runtime_risks: [...Object.values(POLICY_SIMULATION_RISKS)],
    simulation_enabled: isPolicySimulationEnabled()
  };
}

function getPolicySimulationDashboardSummary() {
  if (!isPolicySimulationEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_SIMULATION_DISABLED',
      message: 'Defina IMPETUS_POLICY_SIMULATION_ENABLED=true para simulação normativa read-only.'
    };
  }
  const report = generateSimulationRuntimeReport();
  const validation = validateSimulationRuntime(report);
  return {
    enabled: true,
    generated_at: _nowIso(),
    simulation_mode: report.simulation_mode,
    overall_impact: report.overall_impact,
    governance_pressure: report.governance_pressure ?? report.simulated_arbitration?.governance_pressure ?? '—',
    runtime_risk_level: report.runtime_risk?.level ?? '—',
    risks_count: Array.isArray(report.runtime_risk?.risks) ? report.runtime_risk.risks.length : 0,
    risk_types_preview: (report.runtime_risk?.risks || []).slice(0, 4).map((r) => r.type),
    predicted_effects_count: report.predicted_effects?.length ?? 0,
    predicted_effects_preview: (report.predicted_effects || []).slice(0, 4),
    simulated_obligations_count: report.simulated_obligations?.length ?? 0,
    dominant_domain_sim: report.simulated_arbitration?.dominant_domain ?? '—',
    override_pressure_sim: report.simulated_arbitration?.override_pressure ?? '—',
    blocked_paths_count: report.blocked_paths?.length ?? 0,
    validation_ok: validation.valid,
    trace_steps: report.trace?.length ?? 0
  };
}

function generatePolicySimulationAdminPayload() {
  return {
    snapshot: generateSimulationRuntimeSnapshot(),
    demo_simulation: generateSimulationRuntimeReport()
  };
}

module.exports = {
  POLICY_SIMULATION_MODES,
  POLICY_SIMULATION_IMPACT,
  POLICY_SIMULATION_RISKS,
  isPolicySimulationEnabled,
  createPolicySimulation,
  runPolicySimulation,
  predictGovernanceEffects,
  simulateObligationExecution,
  simulateArbitrationRuntime,
  analyzeSimulationRuntimeRisk,
  appendSimulationTrace,
  generateSimulationRuntimeReport,
  validateSimulationRuntime,
  generateSimulationRuntimeSnapshot,
  buildDemoSimulationInput,
  getPolicySimulationDashboardSummary,
  generatePolicySimulationAdminPayload
};
