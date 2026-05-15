'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 5 (Policy Arbitration — read-only)
 * Arbitragem normativa observável: conflitos, precedência e simulação de overrides sem enforcement.
 * Rollout: IMPETUS_POLICY_ARBITRATION_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_PRIORITY_LEVELS = Object.freeze({
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
  ABSOLUTE: 'ABSOLUTE'
});

const POLICY_DOMAINS = Object.freeze({
  SAFETY: 'SAFETY',
  INTEGRITY: 'INTEGRITY',
  RUNTIME: 'RUNTIME',
  GOVERNANCE: 'GOVERNANCE',
  AUTONOMY: 'AUTONOMY',
  TENANT: 'TENANT',
  SECURITY: 'SECURITY',
  STABILITY: 'STABILITY',
  LEARNING: 'LEARNING'
});

const PRIORITY_RANK = Object.freeze({
  LOW: 1,
  MEDIUM: 2,
  HIGH: 3,
  CRITICAL: 4,
  ABSOLUTE: 5
});

/** Regras mínimas observacionais (prioridade por domínio). */
const DEFAULT_POLICY_ARBITRATION_RULES = Object.freeze([
  {
    domain: POLICY_DOMAINS.SAFETY,
    priority: POLICY_PRIORITY_LEVELS.ABSOLUTE,
    source: 'cognitiveSafetyRuntimeService',
    effect: 'SOFTEN',
    condition: 'critical_safety',
    description: 'Safety runtime — efeito sugerido sob risco elevado (observacional).',
    active: true,
    metadata: {}
  },
  {
    domain: POLICY_DOMAINS.INTEGRITY,
    priority: POLICY_PRIORITY_LEVELS.CRITICAL,
    source: 'contextIntegrityService',
    effect: 'BLOCK',
    condition: 'integrity_failure',
    description: 'Integridade contextual — bloqueio sugerido (observacional).',
    active: true,
    metadata: {}
  },
  {
    domain: POLICY_DOMAINS.SECURITY,
    priority: POLICY_PRIORITY_LEVELS.CRITICAL,
    source: 'aiSecurityGateway',
    effect: 'BLOCK',
    condition: 'risk_ingress',
    description: 'Gateway IA — bloqueio/redacção (observacional).',
    active: true,
    metadata: {}
  },
  {
    domain: POLICY_DOMAINS.GOVERNANCE,
    priority: POLICY_PRIORITY_LEVELS.HIGH,
    source: 'adaptiveGovernanceEngine',
    effect: 'LIMIT',
    condition: 'governance_degrade',
    description: 'Governança adaptativa — limitação sugerida.',
    active: true,
    metadata: {}
  },
  {
    domain: POLICY_DOMAINS.AUTONOMY,
    priority: POLICY_PRIORITY_LEVELS.MEDIUM,
    source: 'autonomousOptimizationService',
    effect: 'ALLOW',
    condition: 'autonomy_cycle',
    description: 'Autonomia supervisionada — allow sugerido em ciclo seguro.',
    active: true,
    metadata: {}
  },
  {
    domain: POLICY_DOMAINS.LEARNING,
    priority: POLICY_PRIORITY_LEVELS.LOW,
    source: 'supervisedLearningService',
    effect: 'HITL',
    condition: 'proposal_pending',
    description: 'Aprendizagem — human-in-the-loop sugerido.',
    active: true,
    metadata: {}
  },
  {
    domain: POLICY_DOMAINS.RUNTIME,
    priority: POLICY_PRIORITY_LEVELS.MEDIUM,
    source: 'unifiedOrchestrator',
    effect: 'ROUTE',
    condition: 'channel_routing',
    description: 'Runtime unificado — encaminhamento (observacional).',
    active: true,
    metadata: {}
  },
  {
    domain: POLICY_DOMAINS.TENANT,
    priority: POLICY_PRIORITY_LEVELS.HIGH,
    source: 'tenant_governance',
    effect: 'LIMIT',
    condition: 'tenant_scope',
    description: 'Governança de tenant — limites sugeridos.',
    active: true,
    metadata: {}
  },
  {
    domain: POLICY_DOMAINS.STABILITY,
    priority: POLICY_PRIORITY_LEVELS.HIGH,
    source: 'cognitiveStabilityService',
    effect: 'LIMIT',
    condition: 'csi_threshold',
    description: 'Estabilidade cognitiva — limitação sob CSI degradado.',
    active: true,
    metadata: {}
  }
]);

const SUPPORTED_CONFLICT_TYPES = Object.freeze([
  'BLOCK_VS_ALLOW',
  'SOFTEN_VS_FULL_OUTPUT',
  'LIMIT_VS_AUTONOMY',
  'TRACE_VS_NO_TRACE',
  'SAFETY_VS_RUNTIME'
]);

function isPolicyArbitrationEnabled() {
  return String(process.env.IMPETUS_POLICY_ARBITRATION_ENABLED || '')
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

function _rank(priority) {
  return PRIORITY_RANK[String(priority || '').toUpperCase()] || 0;
}

/**
 * @param {Record<string, unknown>} partial
 * @returns {Record<string, unknown>}
 */
function createPolicyRule(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }
  const domain = _safeStr(p.domain, 32).toUpperCase() || POLICY_DOMAINS.GOVERNANCE;
  const priority = _safeStr(p.priority, 16).toUpperCase() || POLICY_PRIORITY_LEVELS.MEDIUM;
  const rule_id = p.rule_id != null ? _safeStr(p.rule_id, 64) : randomUUID();
  let metadata = {};
  try {
    if (p.metadata != null && typeof p.metadata === 'object' && !Array.isArray(p.metadata)) {
      metadata = { ...p.metadata };
    }
  } catch (_e2) {
    metadata = {};
  }
  return {
    rule_id,
    domain,
    priority,
    source: _safeStr(p.source, 128) || 'unknown',
    effect: _safeStr(p.effect, 32).toUpperCase() || 'ALLOW',
    condition: _safeStr(p.condition, 128) || '',
    description: _safeStr(p.description, 2000) || '',
    active: p.active !== false,
    metadata
  };
}

function loadMaterializedDefaultRules() {
  return DEFAULT_POLICY_ARBITRATION_RULES.map((row) => createPolicyRule(row));
}

/**
 * Regras demo com conflitos sintéticos para relatório (não toca no runtime).
 */
function buildDemoArbitrationRuleset() {
  const base = loadMaterializedDefaultRules();
  const extras = [
    createPolicyRule({
      domain: POLICY_DOMAINS.RUNTIME,
      priority: POLICY_PRIORITY_LEVELS.MEDIUM,
      source: 'demo_runtime_full_output',
      effect: 'FULL_OUTPUT',
      condition: 'demo_full_stream',
      description: 'Demo: saída completa (conflito com SOFTEN).',
      metadata: { demo: true }
    }),
    createPolicyRule({
      domain: POLICY_DOMAINS.GOVERNANCE,
      priority: POLICY_PRIORITY_LEVELS.HIGH,
      source: 'demo_trace',
      effect: 'ALLOW',
      condition: 'audit_trace',
      description: 'Demo: exige trace.',
      metadata: { demo: true, trace_required: true }
    }),
    createPolicyRule({
      domain: POLICY_DOMAINS.LEARNING,
      priority: POLICY_PRIORITY_LEVELS.LOW,
      source: 'demo_no_trace',
      effect: 'ALLOW',
      condition: 'fast_path',
      description: 'Demo: sem trace.',
      metadata: { demo: true, no_trace: true }
    })
  ];
  return [...base, ...extras];
}

function buildPriorityMapFromDefaults() {
  const m = {};
  for (const row of DEFAULT_POLICY_ARBITRATION_RULES) {
    m[row.domain] = row.priority;
  }
  return m;
}

/**
 * @param {unknown[]} rulesIn
 */
function detectPolicyConflicts(rulesIn) {
  const rules = Array.isArray(rulesIn) ? rulesIn.filter((r) => r && typeof r === 'object') : [];
  const conflicts = [];
  const effects = rules.map((r) => String(r.effect || '').toUpperCase());
  const domains = rules.map((r) => String(r.domain || '').toUpperCase());
  const hasEffect = (e) => effects.includes(e);

  if (hasEffect('BLOCK') && hasEffect('ALLOW')) {
    conflicts.push({ type: 'BLOCK_VS_ALLOW', severity: 'critical' });
    try {
      console.info('[POLICY_CONFLICT]', JSON.stringify({ type: 'BLOCK_VS_ALLOW' }));
    } catch (_e) {}
  }
  if (hasEffect('SOFTEN') && hasEffect('FULL_OUTPUT')) {
    conflicts.push({ type: 'SOFTEN_VS_FULL_OUTPUT', severity: 'high' });
    try {
      console.info('[POLICY_CONFLICT]', JSON.stringify({ type: 'SOFTEN_VS_FULL_OUTPUT' }));
    } catch (_e2) {}
  }
  const hasLimit = hasEffect('LIMIT');
  const autonomyLift = rules.some(
    (r) => String(r.domain).toUpperCase() === POLICY_DOMAINS.AUTONOMY && String(r.effect).toUpperCase() === 'ALLOW'
  );
  if (hasLimit && autonomyLift) {
    conflicts.push({ type: 'LIMIT_VS_AUTONOMY', severity: 'medium' });
    try {
      console.info('[POLICY_CONFLICT]', JSON.stringify({ type: 'LIMIT_VS_AUTONOMY' }));
    } catch (_e3) {}
  }
  const traceReq = rules.some((r) => r.metadata && r.metadata.trace_required);
  const noTrace = rules.some((r) => r.metadata && r.metadata.no_trace);
  if (traceReq && noTrace) {
    conflicts.push({ type: 'TRACE_VS_NO_TRACE', severity: 'medium' });
    try {
      console.info('[POLICY_CONFLICT]', JSON.stringify({ type: 'TRACE_VS_NO_TRACE' }));
    } catch (_e4) {}
  }
  const safetyFx = rules.filter((r) => String(r.domain).toUpperCase() === POLICY_DOMAINS.SAFETY).map((r) => String(r.effect).toUpperCase());
  const runtimeFx = rules.filter((r) => String(r.domain).toUpperCase() === POLICY_DOMAINS.RUNTIME).map((r) => String(r.effect).toUpperCase());
  if (
    safetyFx.length &&
    runtimeFx.length &&
    safetyFx.some((e) => e === 'BLOCK' || e === 'SOFTEN') &&
    runtimeFx.some((e) => e === 'FULL_OUTPUT' || e === 'ROUTE')
  ) {
    conflicts.push({ type: 'SAFETY_VS_RUNTIME', severity: 'high' });
    try {
      console.info('[POLICY_CONFLICT]', JSON.stringify({ type: 'SAFETY_VS_RUNTIME' }));
    } catch (_e5) {}
  }

  try {
    console.info('[POLICY_ARBITRATION]', JSON.stringify({ action: 'detect_conflicts', count: conflicts.length }));
  } catch (_e6) {}
  return { conflicts };
}

/**
 * Ordena regras por prioridade normativa (maior primeiro).
 * @param {unknown[]} rulesIn
 */
function resolvePolicyPriority(rulesIn) {
  const rules = Array.isArray(rulesIn) ? rulesIn.filter((r) => r && r.active !== false) : [];
  const ordered = [...rules].sort((a, b) => _rank(b.priority) - _rank(a.priority));
  const top = ordered[0];
  const winner = top
    ? { domain: top.domain, priority: top.priority, rule_id: top.rule_id, effect: top.effect }
    : null;
  try {
    console.info('[POLICY_PRIORITY]', JSON.stringify({ winner_domain: winner && winner.domain, rank: winner && winner.priority }));
  } catch (_e) {}
  return { ordered, winner };
}

/**
 * Simula quem prevaleceria se a arbitragem fosse aplicada (sem enforcement).
 * @param {unknown[]} rulesIn
 * @param {{ ordered?: unknown[], winner?: unknown } | null} [precomputed]
 */
function simulatePolicyOverrides(rulesIn, precomputed) {
  let ordered;
  let winner;
  if (precomputed && Array.isArray(precomputed.ordered) && precomputed.winner !== undefined) {
    ordered = precomputed.ordered;
    winner = precomputed.winner;
  } else {
    const r = resolvePolicyPriority(rulesIn);
    ordered = r.ordered;
    winner = r.winner;
  }
  const simulated_overrides = [];
  if (!winner || ordered.length < 2) {
    try {
      console.info('[POLICY_OVERRIDE_SIMULATION]', JSON.stringify({ count: 0 }));
    } catch (_e) {}
    return { simulated_overrides };
  }
  for (let i = 1; i < ordered.length; i++) {
    const r = ordered[i];
    if (String(r.domain) === String(winner.domain)) continue;
    simulated_overrides.push({
      winner: winner.domain,
      overridden: r.domain,
      winner_priority: winner.priority,
      overridden_priority: r.priority,
      simulated: true
    });
  }
  try {
    console.info('[POLICY_OVERRIDE_SIMULATION]', JSON.stringify({ count: simulated_overrides.length }));
  } catch (_e2) {}
  return { simulated_overrides };
}

/**
 * @param {unknown[]} traceList
 * @param {Record<string, unknown>} entry
 */
function appendArbitrationTrace(traceList, entry) {
  const list = Array.isArray(traceList) ? [...traceList] : [];
  list.push({
    type: _safeStr(entry && entry.type, 32).toUpperCase() || 'ARBITRATION',
    message: _safeStr(entry && entry.message, 2000),
    timestamp: entry && entry.timestamp ? String(entry.timestamp) : _nowIso(),
    detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
  });
  try {
    console.info('[POLICY_ARBITRATION]', JSON.stringify({ trace: list[list.length - 1].type, message: list[list.length - 1].message?.slice(0, 140) }));
  } catch (_e) {}
  return list;
}

function generatePolicyArbitrationReport(rulesIn) {
  const rules = rulesIn != null && Array.isArray(rulesIn) ? rulesIn : buildDemoArbitrationRuleset();
  const { conflicts } = detectPolicyConflicts(rules);
  const { ordered, winner } = resolvePolicyPriority(rules);
  const { simulated_overrides } = simulatePolicyOverrides(rules, { ordered, winner });
  const priority_map = buildPriorityMapFromDefaults();

  let trace = [];
  trace = appendArbitrationTrace(trace, {
    type: 'ARBITRATION',
    message: winner ? `${winner.domain} lead precedence (${winner.priority})` : 'No active rules',
    detail: { conflicts_before: conflicts.length }
  });
  for (const o of simulated_overrides.slice(0, 5)) {
    trace = appendArbitrationTrace(trace, {
      type: 'ARBITRATION',
      message: `${o.winner} outranked ${o.overridden}`,
      detail: o
    });
  }

  try {
    console.info('[POLICY_ARBITRATION]', JSON.stringify({ action: 'report', conflicts: conflicts.length, overrides: simulated_overrides.length }));
  } catch (_e) {}

  return {
    conflicts,
    winner,
    simulated_overrides,
    priority_map,
    ordered_rule_ids: ordered.map((r) => r.rule_id),
    ordered_preview: ordered.slice(0, 10).map((r) => ({
      rule_id: r.rule_id,
      domain: r.domain,
      priority: r.priority,
      effect: r.effect
    })),
    trace
  };
}

function validateArbitrationResult(report) {
  const errors = [];
  try {
    if (!report || typeof report !== 'object') {
      errors.push({ path: '', message: 'report_missing' });
      return { valid: false, errors };
    }
    if (!Array.isArray(report.conflicts)) errors.push({ path: 'conflicts', message: 'not_array' });
    if (report.winner != null && typeof report.winner === 'object') {
      if (!_safeStr(report.winner.domain, 1)) errors.push({ path: 'winner.domain', message: 'invalid' });
      if (!_safeStr(report.winner.priority, 1)) errors.push({ path: 'winner.priority', message: 'invalid' });
    }
    if (!Array.isArray(report.simulated_overrides)) errors.push({ path: 'simulated_overrides', message: 'not_array' });
    if (!report.priority_map || typeof report.priority_map !== 'object') errors.push({ path: 'priority_map', message: 'missing' });
    if (!Array.isArray(report.trace)) errors.push({ path: 'trace', message: 'not_array' });
    for (const c of report.conflicts || []) {
      if (!c || !SUPPORTED_CONFLICT_TYPES.includes(String(c.type))) {
        errors.push({ path: 'conflicts.type', message: `unknown_conflict_type:${c && c.type}` });
      }
    }
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) });
  }
  return { valid: errors.length === 0, errors };
}

function generatePolicyArbitrationSnapshot() {
  const demoRules = buildDemoArbitrationRuleset();
  return {
    generated_at: _nowIso(),
    domains: [...Object.values(POLICY_DOMAINS)],
    priority_levels: [...Object.values(POLICY_PRIORITY_LEVELS)],
    supported_conflicts: [...SUPPORTED_CONFLICT_TYPES],
    rules_loaded: demoRules.length,
    default_rules_count: DEFAULT_POLICY_ARBITRATION_RULES.length
  };
}

function getPolicyArbitrationDashboardSummary() {
  if (!isPolicyArbitrationEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_ARBITRATION_DISABLED',
      message: 'Defina IMPETUS_POLICY_ARBITRATION_ENABLED=true para arbitragem normativa (read-only).'
    };
  }
  const report = generatePolicyArbitrationReport();
  const validation = validateArbitrationResult(report);
  const hierarchy = (report.ordered_preview || []).slice(0, 6).map((r) => `${r.domain}:${r.priority}`);
  return {
    enabled: true,
    generated_at: _nowIso(),
    conflicts_detected: report.conflicts.length,
    dominant_domain: report.winner?.domain ?? '—',
    dominant_priority: report.winner?.priority ?? '—',
    priority_hierarchy_preview: hierarchy,
    simulated_overrides_count: report.simulated_overrides.length,
    arbitration_trace_steps: report.trace.length,
    validation_ok: validation.valid,
    critical_conflicts: report.conflicts.filter((c) => c.severity === 'critical').length
  };
}

function generatePolicyArbitrationAdminPayload() {
  return {
    snapshot: generatePolicyArbitrationSnapshot(),
    demo_report: generatePolicyArbitrationReport()
  };
}

module.exports = {
  POLICY_PRIORITY_LEVELS,
  POLICY_DOMAINS,
  DEFAULT_POLICY_ARBITRATION_RULES,
  SUPPORTED_CONFLICT_TYPES,
  isPolicyArbitrationEnabled,
  createPolicyRule,
  detectPolicyConflicts,
  resolvePolicyPriority,
  simulatePolicyOverrides,
  appendArbitrationTrace,
  generatePolicyArbitrationReport,
  validateArbitrationResult,
  generatePolicyArbitrationSnapshot,
  getPolicyArbitrationDashboardSummary,
  generatePolicyArbitrationAdminPayload,
  buildDemoArbitrationRuleset,
  loadMaterializedDefaultRules
};
