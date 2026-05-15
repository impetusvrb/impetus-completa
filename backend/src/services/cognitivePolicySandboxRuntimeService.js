'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 10 (Policy Sandbox Execution — shadow mode)
 * Runtime normativo paralelo só observável: espelho de obrigações e arbitragem sem tocar produção.
 * Não altera respostas reais, gateway, orchestrator, HITL nem enforcement.
 * Rollout: IMPETUS_POLICY_SANDBOX_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_SANDBOX_MODES = Object.freeze({
  SHADOW: 'shadow',
  MIRROR: 'mirror',
  PASSIVE_PARALLEL: 'passive_parallel',
  SIMULATED_EXECUTION: 'simulated_execution'
});

const POLICY_SANDBOX_DIVERGENCES = Object.freeze({
  PRODUCTION_VS_SANDBOX: 'PRODUCTION_VS_SANDBOX',
  OBLIGATION_MISMATCH: 'OBLIGATION_MISMATCH',
  ARBITRATION_SHIFT: 'ARBITRATION_SHIFT',
  SAFETY_ESCALATION: 'SAFETY_ESCALATION',
  TRACE_EXPANSION: 'TRACE_EXPANSION',
  TENANT_PRESSURE: 'TENANT_PRESSURE'
});

function isPolicySandboxEnabled() {
  return String(process.env.IMPETUS_POLICY_SANDBOX_ENABLED || '')
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

function _defaultProductionSurface() {
  return {
    governance_executed: false,
    obligations_applied: false,
    hitl_active: false,
    arbitration_domain_snapshot: null,
    trace_depth: 0,
    tenant_pressure_observed: false,
    label: 'production_surface_readonly'
  };
}

/** @param {Record<string, unknown>} partial */
function createSandboxExecution(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const modeKeys = new Set(Object.values(POLICY_SANDBOX_MODES));
  let sandbox_mode = _normLower(p.sandbox_mode, 48);
  if (!modeKeys.has(sandbox_mode)) sandbox_mode = POLICY_SANDBOX_MODES.SHADOW;

  const production_untouched = p.production_untouched !== false;

  let simulated_governance = {};
  try {
    if (p.simulated_governance && typeof p.simulated_governance === 'object' && !Array.isArray(p.simulated_governance)) {
      simulated_governance = { ...p.simulated_governance };
    }
  } catch (_e2) {
    simulated_governance = {};
  }

  const mirrored_obligations = Array.isArray(p.mirrored_obligations)
    ? p.mirrored_obligations.filter((x) => x && typeof x === 'object')
    : [];

  let sandbox_arbitration = {};
  try {
    if (p.sandbox_arbitration && typeof p.sandbox_arbitration === 'object' && !Array.isArray(p.sandbox_arbitration)) {
      sandbox_arbitration = { ...p.sandbox_arbitration };
    }
  } catch (_e3) {
    sandbox_arbitration = {};
  }

  const sandbox_effects = Array.isArray(p.sandbox_effects) ? p.sandbox_effects.map((x) => _safeStr(x, 128)).filter(Boolean) : [];

  const divergences = Array.isArray(p.divergences) ? p.divergences.filter((x) => x && typeof x === 'object') : [];

  let runtime_pressure = { level: 'low' };
  try {
    if (p.runtime_pressure && typeof p.runtime_pressure === 'object' && !Array.isArray(p.runtime_pressure)) {
      runtime_pressure = { ...p.runtime_pressure };
    }
  } catch (_e4) {
    runtime_pressure = { level: 'low' };
  }

  const trace = Array.isArray(p.trace) ? p.trace.filter((t) => t && typeof t === 'object') : [];

  const rec = {
    sandbox_execution_id: p.sandbox_execution_id != null ? _safeStr(p.sandbox_execution_id, 64) : randomUUID(),
    sandbox_mode,
    production_untouched,
    simulated_governance,
    mirrored_obligations,
    sandbox_arbitration,
    sandbox_effects,
    divergences,
    runtime_pressure,
    trace,
    generated_at: p.generated_at != null ? _safeStr(p.generated_at, 40) : _nowIso()
  };

  try {
    console.info('[POLICY_SANDBOX]', JSON.stringify({ action: 'create', mode: rec.sandbox_mode, untouched: rec.production_untouched }));
  } catch (_e5) {}
  return rec;
}

/**
 * Espelho declarativo de obrigações (shadow apenas).
 * @param {unknown} obligationsInput
 */
function mirrorGovernanceObligations(obligationsInput) {
  const mirrored_obligations = [];
  try {
    const obl = obligationsInput && typeof obligationsInput === 'object' ? obligationsInput : {};
    const list = Array.isArray(obl.obligations) ? obl.obligations : Array.isArray(obligationsInput) ? obligationsInput : [];

    for (const o of list) {
      if (!o || typeof o !== 'object') continue;
      const t = _safeStr(o.type, 64).toUpperCase();
      if (!t) continue;
      mirrored_obligations.push({
        type: t,
        sandbox_only: true,
        shadow_mirror: true,
        domain: _safeStr(o.domain, 32).toUpperCase() || 'GOVERNANCE',
        dry_run: true
      });
    }
    try {
      console.info('[POLICY_SANDBOX]', JSON.stringify({ action: 'mirror_obligations', count: mirrored_obligations.length }));
    } catch (_e) {}
  } catch (e) {
    mirrored_obligations.push({
      type: 'UNKNOWN',
      sandbox_only: true,
      error: _safeStr(e && e.message, 200)
    });
  }
  return { mirrored_obligations };
}

/**
 * Arbitragem paralela sandbox (sem runtime real).
 * @param {unknown} arbitrationInput
 */
function runSandboxArbitration(arbitrationInput) {
  try {
    const cognitivePolicySimulationRuntimeService = require('./cognitivePolicySimulationRuntimeService');
    const raw = arbitrationInput && typeof arbitrationInput === 'object' ? arbitrationInput : {};
    const sim = cognitivePolicySimulationRuntimeService.simulateArbitrationRuntime(raw);
    const sandbox_arbitration = {
      dominant_domain: sim.dominant_domain,
      override_pressure: sim.override_pressure,
      governance_pressure: sim.governance_pressure,
      override_cascade_depth: sim.override_cascade_depth,
      arbitration_loop_risk: sim.arbitration_loop_risk === true,
      shadow_channel: true
    };
    try {
      console.info('[POLICY_SANDBOX]', JSON.stringify({ action: 'sandbox_arbitration', domain: sandbox_arbitration.dominant_domain }));
    } catch (_e) {}
    return { sandbox_arbitration };
  } catch (e) {
    return {
      sandbox_arbitration: {
        dominant_domain: 'GOVERNANCE',
        override_pressure: 'low',
        shadow_channel: true,
        error: _safeStr(e && e.message, 200)
      }
    };
  }
}

function detectSandboxDivergences(production, sandboxCtx) {
  const divergences = [];
  try {
    const prod =
      production && typeof production === 'object' && !Array.isArray(production) ? production : _defaultProductionSurface();
    const ctx = sandboxCtx && typeof sandboxCtx === 'object' ? sandboxCtx : {};
    const simRun = ctx.simRun && typeof ctx.simRun === 'object' ? ctx.simRun : {};
    const mirrored = Array.isArray(ctx.mirrored_obligations) ? ctx.mirrored_obligations : [];
    const arb = ctx.sandbox_arbitration && typeof ctx.sandbox_arbitration === 'object' ? ctx.sandbox_arbitration : {};

    const prodHitl = prod.hitl_active === true;
    const sbxHitl = mirrored.some((m) => m && m.type === 'HITL_REQUIRED');
    if (sbxHitl && !prodHitl) {
      divergences.push({ type: POLICY_SANDBOX_DIVERGENCES.OBLIGATION_MISMATCH, severity: 'warning', detail: 'sandbox_hitl_mirror_vs_production' });
    }

    const prodDom = prod.arbitration_domain_snapshot != null ? _safeStr(prod.arbitration_domain_snapshot, 32).toUpperCase() : null;
    const sbxDom = _safeStr(arb.dominant_domain, 32).toUpperCase();
    if (prodDom && sbxDom && prodDom !== sbxDom) {
      divergences.push({ type: POLICY_SANDBOX_DIVERGENCES.ARBITRATION_SHIFT, severity: 'medium', detail: `${prodDom}->${sbxDom}` });
    } else if (!prodDom && sbxDom) {
      divergences.push({ type: POLICY_SANDBOX_DIVERGENCES.PRODUCTION_VS_SANDBOX, severity: 'low', detail: 'neutral_production_vs_active_sandbox_model' });
    }

    if ((simRun.predicted_effects || []).includes('escalation_pressure')) {
      divergences.push({ type: POLICY_SANDBOX_DIVERGENCES.SAFETY_ESCALATION, severity: 'medium' });
    }

    const sbxTrace =
      (Array.isArray(simRun.simulated_obligations) ? simRun.simulated_obligations.length : 0) +
      (Array.isArray(ctx.trace_hint) ? ctx.trace_hint.length : 0);
    if ((prod.trace_depth || 0) < 2 && sbxTrace > 5) {
      divergences.push({ type: POLICY_SANDBOX_DIVERGENCES.TRACE_EXPANSION, severity: 'low' });
    }

    if (prod.tenant_pressure_observed === true || (simRun.predicted_effects || []).some((e) => String(e).includes('tenant'))) {
      divergences.push({ type: POLICY_SANDBOX_DIVERGENCES.TENANT_PRESSURE, severity: 'low' });
    }

    if (mirrored.length >= 6 && prod.obligations_applied !== true) {
      divergences.push({ type: POLICY_SANDBOX_DIVERGENCES.PRODUCTION_VS_SANDBOX, severity: 'warning', detail: 'obligation_load_parallel' });
    }

    for (const d of divergences) {
      try {
        console.info('[POLICY_SANDBOX_DIVERGENCE]', JSON.stringify({ type: d.type, severity: d.severity }));
      } catch (_e) {}
    }
  } catch (e) {
    divergences.push({ type: POLICY_SANDBOX_DIVERGENCES.PRODUCTION_VS_SANDBOX, severity: 'low', detail: _safeStr(e && e.message, 200) });
  }
  return { divergences };
}

function analyzeSandboxRuntimePressure(ctx) {
  try {
    const c = ctx && typeof ctx === 'object' ? ctx : {};
    const simRun = c.simRun && typeof c.simRun === 'object' ? c.simRun : {};
    const rr = simRun.runtime_risk && typeof simRun.runtime_risk === 'object' ? simRun.runtime_risk : {};
    const mirroredN = Array.isArray(c.mirrored_obligations) ? c.mirrored_obligations.length : 0;
    const arb = c.sandbox_arbitration && typeof c.sandbox_arbitration === 'object' ? c.sandbox_arbitration : {};

    let obligation_pressure = 'low';
    if (mirroredN >= 7) obligation_pressure = 'high';
    else if (mirroredN >= 4) obligation_pressure = 'moderate';

    let arbitration_pressure = _normLower(arb.override_pressure, 16) || 'low';
    let trace_growth = Array.isArray(simRun.simulated_obligations) ? simRun.simulated_obligations.length : 0;
    let safety_escalation_load = (simRun.predicted_effects || []).includes('escalation_pressure') ? 'elevated' : 'nominal';

    let governance_saturation = 'low';
    const rl = _normLower(rr.level, 16);
    if (rl === 'critical' || rl === 'high') governance_saturation = 'high';
    else if (rl === 'moderate') governance_saturation = 'moderate';

    let level = 'low';
    if (governance_saturation === 'high' || obligation_pressure === 'high') level = 'high';
    else if (governance_saturation === 'moderate' || obligation_pressure === 'moderate' || arbitration_pressure === 'high') {
      level = 'moderate';
    }

    const runtime_pressure = {
      level,
      governance_saturation,
      obligation_pressure,
      arbitration_pressure,
      trace_growth,
      safety_escalation_load
    };
    try {
      console.info('[POLICY_SANDBOX_PRESSURE]', JSON.stringify({ level: runtime_pressure.level }));
    } catch (_e) {}
    return { runtime_pressure };
  } catch (e) {
    return {
      runtime_pressure: {
        level: 'moderate',
        error: _safeStr(e && e.message, 200)
      }
    };
  }
}

function appendSandboxExecutionTrace(trace, entry) {
  const list = Array.isArray(trace) ? [...trace] : [];
  try {
    list.push({
      type: _safeStr(entry && entry.type, 32).toUpperCase() || 'SANDBOX',
      message: _safeStr(entry && entry.message, 2000),
      timestamp: _nowIso(),
      detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
    });
  } catch (_e) {
    list.push({ type: 'SANDBOX', message: 'trace_append_failed', timestamp: _nowIso() });
  }
  try {
    console.info('[POLICY_SANDBOX_TRACE]', JSON.stringify({ steps: list.length }));
  } catch (_e2) {}
  return list;
}

/**
 * Motor sandbox: combina superfície de produção (só leitura) com ramo simulado.
 * @param {Record<string, unknown>} input
 */
function runSandboxExecution(input) {
  try {
    const cognitivePolicySimulationRuntimeService = require('./cognitivePolicySimulationRuntimeService');
    const raw = input && typeof input === 'object' ? input : {};
    const production = raw.production && typeof raw.production === 'object' ? raw.production : _defaultProductionSurface();

    let simPayload = raw.simulation && typeof raw.simulation === 'object' ? raw.simulation : null;
    if (!simPayload) {
      simPayload = cognitivePolicySimulationRuntimeService.buildDemoSimulationInput();
    }

    const simRun = cognitivePolicySimulationRuntimeService.runPolicySimulation(simPayload);

    const { mirrored_obligations } = mirrorGovernanceObligations(simPayload.obligations);
    const { sandbox_arbitration } = runSandboxArbitration(simPayload.arbitration);

    const graph = raw.graph && typeof raw.graph === 'object' ? raw.graph : simPayload.graph;
    const trace_hint = [];
    if (graph && Array.isArray(graph.trace)) trace_hint.push(...graph.trace.slice(0, 3));

    const { divergences } = detectSandboxDivergences(production, {
      simRun,
      mirrored_obligations,
      sandbox_arbitration,
      trace_hint
    });

    const { runtime_pressure } = analyzeSandboxRuntimePressure({
      simRun,
      mirrored_obligations,
      sandbox_arbitration,
      readiness: raw.readiness
    });

    const sandbox_effects = [...(simRun.predicted_effects || [])];

    try {
      console.info('[POLICY_SANDBOX]', JSON.stringify({ action: 'run_complete', divergences: divergences.length, pressure: runtime_pressure.level }));
    } catch (_e) {}

    return {
      production_untouched: true,
      simulated_governance: {
        predicted_effects: simRun.predicted_effects,
        simulated_obligations: simRun.simulated_obligations,
        runtime_risk_shadow: simRun.runtime_risk,
        blocked_paths_shadow: simRun.blocked_paths
      },
      mirrored_obligations,
      sandbox_arbitration,
      sandbox_effects,
      divergences,
      runtime_pressure,
      warnings: [...(simRun.warnings || [])]
    };
  } catch (e) {
    try {
      console.warn('[POLICY_SANDBOX]', { action: 'run_failed', message: _safeStr(e && e.message, 200) });
    } catch (_e2) {}
    return {
      production_untouched: true,
      simulated_governance: { error: _safeStr(e && e.message, 200) },
      mirrored_obligations: [],
      sandbox_arbitration: { dominant_domain: 'GOVERNANCE', shadow_channel: true },
      sandbox_effects: [],
      divergences: [{ type: POLICY_SANDBOX_DIVERGENCES.PRODUCTION_VS_SANDBOX, severity: 'low', detail: 'sandbox_engine_degraded' }],
      runtime_pressure: { level: 'low' },
      warnings: [_safeStr(e && e.message, 200)]
    };
  }
}

function buildDemoSandboxInput() {
  try {
    const cognitivePolicySimulationRuntimeService = require('./cognitivePolicySimulationRuntimeService');
    const cognitivePolicyExecutionReadinessService = require('./cognitivePolicyExecutionReadinessService');

    const simulation = cognitivePolicySimulationRuntimeService.buildDemoSimulationInput();
    const readiness = cognitivePolicyExecutionReadinessService.generateExecutionReadinessReport({
      signals: simulation.signals,
      arbitration: simulation.arbitration,
      obligations: simulation.obligations,
      graph: simulation.graph,
      runtime: { stability_hint: 0.72, tenant_isolation_hint: true },
      safety: { coverage_hint: 0.8 },
      integrity: { coverage_hint: 0.55 },
      observability: {
        trace_layers:
          (simulation.obligations && simulation.obligations.trace ? simulation.obligations.trace.length : 0) +
          (simulation.graph && simulation.graph.trace ? simulation.graph.trace.length : 0)
      }
    });

    return {
      production: _defaultProductionSurface(),
      simulation,
      readiness,
      graph: simulation.graph
    };
  } catch (_e) {
    return {
      production: _defaultProductionSurface(),
      simulation: {},
      readiness: {},
      graph: {}
    };
  }
}

function generateSandboxExecutionReport(input) {
  const rawIn = input != null && typeof input === 'object' ? input : buildDemoSandboxInput();
  const run = runSandboxExecution(rawIn);

  let trace = [];
  trace = appendSandboxExecutionTrace(trace, {
    type: 'SANDBOX',
    message: 'Sandbox governance divergence detected',
    detail: { divergences: run.divergences.length }
  });
  trace = appendSandboxExecutionTrace(trace, {
    type: 'SANDBOX',
    message: `Shadow arbitration domain ${run.sandbox_arbitration && run.sandbox_arbitration.dominant_domain}`,
    detail: run.sandbox_arbitration
  });

  const exec = createSandboxExecution({
    sandbox_mode: POLICY_SANDBOX_MODES.SHADOW,
    production_untouched: run.production_untouched !== false,
    simulated_governance: run.simulated_governance,
    mirrored_obligations: run.mirrored_obligations,
    sandbox_arbitration: run.sandbox_arbitration,
    sandbox_effects: run.sandbox_effects,
    divergences: run.divergences,
    runtime_pressure: run.runtime_pressure,
    trace
  });

  exec.warnings = Array.isArray(run.warnings) ? run.warnings : [];
  exec.sandbox_meta = {
    shadow_only: true,
    production_response_path: 'untouched',
    twin_governance: true
  };

  return exec;
}

function validateSandboxExecution(record) {
  const errors = [];
  try {
    if (!record || typeof record !== 'object') {
      errors.push({ path: '', message: 'sandbox_missing' });
      return { valid: false, errors };
    }
    if (record.production_untouched !== true) {
      errors.push({ path: 'production_untouched', message: 'must_remain_true' });
    }
    const modeSet = new Set(Object.values(POLICY_SANDBOX_MODES));
    if (!modeSet.has(_normLower(record.sandbox_mode, 48))) {
      errors.push({ path: 'sandbox_mode', message: 'invalid_mode' });
    }
    const divSet = new Set(Object.values(POLICY_SANDBOX_DIVERGENCES));
    const divs = Array.isArray(record.divergences) ? record.divergences : [];
    for (let i = 0; i < divs.length; i++) {
      const d = divs[i];
      if (!d || !divSet.has(_safeStr(d.type, 64))) {
        errors.push({ path: `divergences[${i}]`, message: 'invalid_type' });
      }
    }
    if (!Array.isArray(record.mirrored_obligations)) errors.push({ path: 'mirrored_obligations', message: 'not_array' });
    else {
      for (let i = 0; i < record.mirrored_obligations.length; i++) {
        const o = record.mirrored_obligations[i];
        if (!o || o.sandbox_only !== true) {
          errors.push({ path: `mirrored_obligations[${i}]`, message: 'invalid_sandbox_flag' });
        }
      }
    }
    if (!record.sandbox_arbitration || typeof record.sandbox_arbitration !== 'object') {
      errors.push({ path: 'sandbox_arbitration', message: 'missing' });
    }
    if (!record.runtime_pressure || typeof record.runtime_pressure !== 'object') {
      errors.push({ path: 'runtime_pressure', message: 'missing' });
    }
    if (!Array.isArray(record.trace)) errors.push({ path: 'trace', message: 'not_array' });
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) });
  }
  return { valid: errors.length === 0, errors };
}

function generateSandboxExecutionSnapshot() {
  return {
    generated_at: _nowIso(),
    sandbox_modes: [...Object.values(POLICY_SANDBOX_MODES)],
    supported_divergences: [...Object.values(POLICY_SANDBOX_DIVERGENCES)],
    shadow_enabled: isPolicySandboxEnabled()
  };
}

function getPolicySandboxDashboardSummary() {
  if (!isPolicySandboxEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_SANDBOX_DISABLED',
      message: 'Defina IMPETUS_POLICY_SANDBOX_ENABLED=true para execução sandbox shadow (read-only).'
    };
  }
  const report = generateSandboxExecutionReport();
  const validation = validateSandboxExecution(report);
  return {
    enabled: true,
    generated_at: _nowIso(),
    sandbox_mode: report.sandbox_mode,
    production_untouched: report.production_untouched,
    divergences_count: (report.divergences || []).length,
    divergences_preview: (report.divergences || []).slice(0, 4).map((d) => d.type),
    mirrored_obligations_count: (report.mirrored_obligations || []).length,
    runtime_pressure_level: report.runtime_pressure?.level ?? '—',
    governance_saturation: report.runtime_pressure?.governance_saturation ?? '—',
    obligation_pressure: report.runtime_pressure?.obligation_pressure ?? '—',
    sandbox_dominant_domain: report.sandbox_arbitration?.dominant_domain ?? '—',
    sandbox_override_pressure: report.sandbox_arbitration?.override_pressure ?? '—',
    sandbox_governance_pressure: report.sandbox_arbitration?.governance_pressure ?? '—',
    sandbox_effects_count: (report.sandbox_effects || []).length,
    validation_ok: validation.valid,
    trace_steps: (report.trace || []).length
  };
}

function generatePolicySandboxAdminPayload() {
  return {
    snapshot: generateSandboxExecutionSnapshot(),
    demo_sandbox: generateSandboxExecutionReport()
  };
}

module.exports = {
  POLICY_SANDBOX_MODES,
  POLICY_SANDBOX_DIVERGENCES,
  isPolicySandboxEnabled,
  createSandboxExecution,
  mirrorGovernanceObligations,
  runSandboxArbitration,
  detectSandboxDivergences,
  analyzeSandboxRuntimePressure,
  appendSandboxExecutionTrace,
  runSandboxExecution,
  generateSandboxExecutionReport,
  validateSandboxExecution,
  generateSandboxExecutionSnapshot,
  buildDemoSandboxInput,
  getPolicySandboxDashboardSummary,
  generatePolicySandboxAdminPayload
};
