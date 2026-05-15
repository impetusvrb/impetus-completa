'use strict';

/**
 * IMPETUS — Cognitive Policy Engine · Fase 8 (Policy Execution Readiness — read-only)
 * Prontidão observável para execução normativa: scoring, gaps, capacidades e domínios.
 * Não executa governance, não activa autoridade de runtime nem altera orchestrator.
 * Rollout: IMPETUS_POLICY_READINESS_ENABLED=true
 */

const { randomUUID } = require('crypto');

const POLICY_READINESS_STATUS = Object.freeze({
  NOT_READY: 'not_ready',
  PARTIAL: 'partial',
  READY: 'ready',
  ADVANCED: 'advanced'
});

const POLICY_EXECUTION_CAPABILITIES = Object.freeze({
  SIGNAL_COVERAGE: 'SIGNAL_COVERAGE',
  ARBITRATION_COVERAGE: 'ARBITRATION_COVERAGE',
  OBLIGATION_TRACEABILITY: 'OBLIGATION_TRACEABILITY',
  GRAPH_VISIBILITY: 'GRAPH_VISIBILITY',
  AUDITABILITY: 'AUDITABILITY',
  RUNTIME_STABILITY: 'RUNTIME_STABILITY',
  SAFETY_COVERAGE: 'SAFETY_COVERAGE',
  TENANT_ISOLATION: 'TENANT_ISOLATION',
  EXECUTION_SIMULATION: 'EXECUTION_SIMULATION'
});

const READINESS_DOMAINS = Object.freeze(['SAFETY', 'INTEGRITY', 'GOVERNANCE', 'AUTONOMY', 'SECURITY', 'TENANT']);

/** Pesos sugeridos (observacional); soma = 100. */
const SCORING_WEIGHTS = Object.freeze({
  signals: 15,
  arbitration: 15,
  obligations: 15,
  graph: 20,
  safety: 15,
  integrity: 10,
  observability: 10
});

function isPolicyReadinessEnabled() {
  return String(process.env.IMPETUS_POLICY_READINESS_ENABLED || '')
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

function _clampScore(n) {
  if (typeof n !== 'number' || !Number.isFinite(n)) return 0;
  return Math.min(100, Math.max(0, Math.round(n)));
}

function _statusFromScore(overall) {
  const s = _clampScore(overall);
  if (s < 25) return POLICY_READINESS_STATUS.NOT_READY;
  if (s < 55) return POLICY_READINESS_STATUS.PARTIAL;
  if (s < 82) return POLICY_READINESS_STATUS.READY;
  return POLICY_READINESS_STATUS.ADVANCED;
}

function _domainStatusFromScore(score) {
  const sc = _clampScore(score);
  if (sc < 30) return POLICY_READINESS_STATUS.NOT_READY;
  if (sc < 55) return POLICY_READINESS_STATUS.PARTIAL;
  if (sc < 80) return POLICY_READINESS_STATUS.READY;
  return POLICY_READINESS_STATUS.ADVANCED;
}

/** @param {Record<string, unknown>} partial */
function createExecutionReadiness(partial) {
  let p = {};
  try {
    p = partial && typeof partial === 'object' ? { ...partial } : {};
  } catch (_e) {
    p = {};
  }

  const statusKeys = new Set(Object.values(POLICY_READINESS_STATUS));
  let status = _safeStr(p.status, 32).toLowerCase();
  if (!statusKeys.has(status)) status = POLICY_READINESS_STATUS.PARTIAL;

  let domains = {};
  try {
    if (p.domains && typeof p.domains === 'object' && !Array.isArray(p.domains)) {
      domains = { ...p.domains };
    }
  } catch (_e2) {
    domains = {};
  }

  let capabilities = {};
  try {
    if (p.capabilities && typeof p.capabilities === 'object' && !Array.isArray(p.capabilities)) {
      capabilities = { ...p.capabilities };
    }
  } catch (_e3) {
    capabilities = {};
  }

  const blockers = Array.isArray(p.blockers) ? p.blockers.filter((b) => b && typeof b === 'object') : [];
  const warnings = Array.isArray(p.warnings) ? p.warnings.map((x) => _safeStr(x, 500)) : [];
  const recommendations = Array.isArray(p.recommendations) ? p.recommendations.map((x) => _safeStr(x, 500)) : [];
  const trace = Array.isArray(p.trace) ? p.trace.filter((t) => t && typeof t === 'object') : [];

  const rec = {
    readiness_id: p.readiness_id != null ? _safeStr(p.readiness_id, 64) : randomUUID(),
    overall_score: _clampScore(typeof p.overall_score === 'number' ? p.overall_score : 0),
    status,
    domains,
    capabilities,
    blockers,
    warnings,
    recommendations,
    trace,
    generated_at: p.generated_at != null ? _safeStr(p.generated_at, 40) : _nowIso()
  };

  try {
    console.info('[POLICY_READINESS]', JSON.stringify({ action: 'create', status: rec.status, score: rec.overall_score }));
  } catch (_e4) {}
  return rec;
}

/**
 * Normaliza entrada heterogénea (relatórios das fases 5–7 ou objectos resumo).
 * @param {Record<string, unknown>} input
 */
function analyzeExecutionReadiness(input) {
  const raw = input && typeof input === 'object' ? input : {};
  const metrics = {
    signal_count: 0,
    has_arbitration_winner: false,
    arbitration_conflicts: 0,
    arbitration_trace_steps: 0,
    obligation_count: 0,
    obligation_trace_steps: 0,
    dominant_obligation_type: '',
    graph_nodes: 0,
    graph_edges: 0,
    graph_validation_ok: false,
    graph_pattern_count: 0,
    safety_coverage: 0,
    integrity_coverage: 0,
    runtime_stability: 0.5,
    tenant_isolation: true,
    observability_depth: 0,
    audit_event_hint: 0
  };

  try {
    const sig = raw.signals && typeof raw.signals === 'object' ? raw.signals : {};
    if (Array.isArray(sig.items)) metrics.signal_count = sig.items.length;
    else if (typeof sig.count === 'number' && Number.isFinite(sig.count)) metrics.signal_count = sig.count;
    else if (Array.isArray(sig)) metrics.signal_count = sig.length;

    const arb = raw.arbitration && typeof raw.arbitration === 'object' ? raw.arbitration : {};
    const w = arb.winner && typeof arb.winner === 'object' ? arb.winner : {};
    metrics.has_arbitration_winner = Boolean(_safeStr(w.domain, 1));
    const confl = Array.isArray(arb.conflicts) ? arb.conflicts : [];
    metrics.arbitration_conflicts = confl.length;
    const arbTrace = Array.isArray(arb.trace) ? arb.trace : [];
    metrics.arbitration_trace_steps = arbTrace.length;

    const obl = raw.obligations && typeof raw.obligations === 'object' ? raw.obligations : {};
    const obList = Array.isArray(obl.obligations) ? obl.obligations : Array.isArray(obl) ? obl : [];
    metrics.obligation_count = obList.length;
    const oblTrace = Array.isArray(obl.trace) ? obl.trace : [];
    metrics.obligation_trace_steps = oblTrace.length;
    const domO = obl.dominant_obligation && typeof obl.dominant_obligation === 'object' ? obl.dominant_obligation : {};
    metrics.dominant_obligation_type = _safeStr(domO.type, 64);

    const gr = raw.graph && typeof raw.graph === 'object' ? raw.graph : {};
    const nodes = Array.isArray(gr.nodes) ? gr.nodes : [];
    const edges = Array.isArray(gr.edges) ? gr.edges : [];
    metrics.graph_nodes = nodes.length;
    metrics.graph_edges = edges.length;
    if (gr.summary && typeof gr.summary === 'object' && typeof gr.summary.validation_ok === 'boolean') {
      metrics.graph_validation_ok = gr.summary.validation_ok;
    }
    const pats = Array.isArray(gr.patterns) ? gr.patterns : [];
    metrics.graph_pattern_count = pats.length;

    const safe = raw.safety && typeof raw.safety === 'object' ? raw.safety : {};
    if (typeof safe.coverage_hint === 'number' && Number.isFinite(safe.coverage_hint)) {
      metrics.safety_coverage = Math.min(1, Math.max(0, safe.coverage_hint));
    } else if (safe.engine_observed === true) {
      metrics.safety_coverage = 0.65;
    }

    const integ = raw.integrity && typeof raw.integrity === 'object' ? raw.integrity : {};
    if (typeof integ.coverage_hint === 'number' && Number.isFinite(integ.coverage_hint)) {
      metrics.integrity_coverage = Math.min(1, Math.max(0, integ.coverage_hint));
    } else if (integ.block_mode_observed === true) {
      metrics.integrity_coverage = 0.8;
    } else {
      metrics.integrity_coverage = 0.45;
    }

    const rt = raw.runtime && typeof raw.runtime === 'object' ? raw.runtime : {};
    if (typeof rt.stability_hint === 'number' && Number.isFinite(rt.stability_hint)) {
      metrics.runtime_stability = Math.min(1, Math.max(0, rt.stability_hint));
    }
    if (typeof rt.tenant_isolation_hint === 'boolean') metrics.tenant_isolation = rt.tenant_isolation_hint;

    const obs = raw.observability && typeof raw.observability === 'object' ? raw.observability : {};
    if (typeof obs.trace_layers === 'number' && Number.isFinite(obs.trace_layers)) {
      metrics.observability_depth = obs.trace_layers;
    } else {
      metrics.observability_depth = metrics.obligation_trace_steps + metrics.arbitration_trace_steps;
    }
    if (typeof obs.audit_event_hint === 'number' && Number.isFinite(obs.audit_event_hint)) {
      metrics.audit_event_hint = obs.audit_event_hint;
    }

    try {
      console.info(
        '[POLICY_READINESS]',
        JSON.stringify({
          action: 'analyze',
          signals: metrics.signal_count,
          obligations: metrics.obligation_count,
          graph_edges: metrics.graph_edges
        })
      );
    } catch (_e) {}
  } catch (e) {
    try {
      console.warn('[POLICY_READINESS]', { action: 'analyze_degraded', message: _safeStr(e && e.message, 200) });
    } catch (_e2) {}
  }

  return { metrics, generated_at: _nowIso() };
}

/**
 * @param {{ metrics: Record<string, unknown> }} analysis
 */
function calculateReadinessScore(analysis) {
  const m = analysis && analysis.metrics ? analysis.metrics : {};
  try {
    const sigN = typeof m.signal_count === 'number' ? m.signal_count : 0;
    const signalScore = _clampScore(Math.min(100, sigN * 16 + (sigN >= 1 ? 10 : 0)));

    const arbScore = m.has_arbitration_winner
      ? _clampScore(55 + Math.min(45, (m.arbitration_conflicts || 0) * 3 + (m.arbitration_trace_steps || 0) * 2))
      : 22;

    const oblN = typeof m.obligation_count === 'number' ? m.obligation_count : 0;
    const traceBonus = (m.obligation_trace_steps || 0) > 0 ? 18 : 0;
    const obligationScore = _clampScore(Math.min(100, oblN * 11 + traceBonus + (oblN >= 1 ? 8 : 0)));

    const gn = typeof m.graph_nodes === 'number' ? m.graph_nodes : 0;
    const ge = typeof m.graph_edges === 'number' ? m.graph_edges : 0;
    const graphScore = _clampScore(
      Math.min(100, gn * 3.5 + ge * 2.2 + (m.graph_validation_ok ? 12 : 0) + (ge >= 5 ? 10 : 0))
    );

    const safetyScore = _clampScore((m.safety_coverage || 0) * 100);

    const integrityScore = _clampScore((m.integrity_coverage || 0) * 100);

    const depth = typeof m.observability_depth === 'number' ? m.observability_depth : 0;
    const obsScore = _clampScore(Math.min(100, depth * 14 + (m.audit_event_hint || 0) * 2));

    const W = SCORING_WEIGHTS;
    const overall = _clampScore(
      (signalScore * W.signals +
        arbScore * W.arbitration +
        obligationScore * W.obligations +
        graphScore * W.graph +
        safetyScore * W.safety +
        integrityScore * W.integrity +
        obsScore * W.observability) /
        100
    );

    try {
      console.info('[POLICY_READINESS_SCORE]', JSON.stringify({ overall, signalScore, graphScore }));
    } catch (_e) {}

    return {
      overall_score: overall,
      breakdown: {
        signals: signalScore,
        arbitration: arbScore,
        obligations: obligationScore,
        graph: graphScore,
        safety: safetyScore,
        integrity: integrityScore,
        observability: obsScore
      },
      weights: { ...SCORING_WEIGHTS }
    };
  } catch (e) {
    try {
      console.warn('[POLICY_READINESS_SCORE]', { error: _safeStr(e && e.message, 200) });
    } catch (_e2) {}
    return {
      overall_score: 0,
      breakdown: {
        signals: 0,
        arbitration: 0,
        obligations: 0,
        graph: 0,
        safety: 0,
        integrity: 0,
        observability: 0
      },
      weights: { ...SCORING_WEIGHTS }
    };
  }
}

function detectExecutionBlockers(analysis, input) {
  const blockers = [];
  try {
    const m = analysis && analysis.metrics ? analysis.metrics : {};
    const raw = input && typeof input === 'object' ? input : {};

    if (!m.has_arbitration_winner) {
      blockers.push({ type: 'missing_arbitration_context', severity: 'high' });
    }
    if (!(m.obligation_count > 0)) {
      blockers.push({ type: 'missing_obligations', severity: 'high' });
    }
    if (m.graph_edges < 2 || m.graph_nodes < 3) {
      blockers.push({ type: 'sparse_graph_topology', severity: 'medium' });
    }
    if ((m.obligation_trace_steps || 0) < 1 && (m.obligation_count || 0) > 0) {
      blockers.push({ type: 'missing_obligation_traceability', severity: 'high' });
    }
    if ((m.observability_depth || 0) < 2 && (m.audit_event_hint || 0) < 1) {
      blockers.push({ type: 'low_auditability', severity: 'medium' });
    }
    if ((m.runtime_stability || 0) < 0.35) {
      blockers.push({ type: 'low_runtime_stability_signal', severity: 'medium' });
    }
    if (m.tenant_isolation === false) {
      blockers.push({ type: 'weak_tenant_isolation', severity: 'high' });
    }
    if (m.graph_validation_ok === false && m.graph_nodes > 1) {
      blockers.push({ type: 'graph_consistency_gap', severity: 'low' });
    }

    const arb = raw.arbitration && typeof raw.arbitration === 'object' ? raw.arbitration : {};
    if (!m.has_arbitration_winner && Array.isArray(arb.conflicts) && arb.conflicts.length > 520) {
      blockers.push({ type: 'arbitration_overload_observed', severity: 'low' });
    }

    for (const b of blockers) {
      try {
        console.info('[POLICY_READINESS_BLOCKER]', JSON.stringify({ type: b.type, severity: b.severity }));
      } catch (_e) {}
    }
  } catch (e) {
    blockers.push({ type: 'blocker_detection_degraded', severity: 'low', detail: _safeStr(e && e.message, 200) });
  }
  return { blockers };
}

function generateReadinessRecommendations(blockers, capabilities, domains) {
  const recommendations = [];
  try {
    const bl = blockers && Array.isArray(blockers.blockers) ? blockers.blockers : [];
    const types = new Set(bl.map((b) => b && b.type).filter(Boolean));

    if (types.has('missing_arbitration_context')) {
      recommendations.push('Activar e registar arbitragem normativa com domínio vencedor observável.');
    }
    if (types.has('missing_obligations')) {
      recommendations.push('Declarar obrigações cognitivas mínimas para rastreio de execução simulado.');
    }
    if (types.has('sparse_graph_topology')) {
      recommendations.push('Expandir topologia do grafo de governance (mais nós e relações declarativas).');
    }
    if (types.has('missing_obligation_traceability')) {
      recommendations.push('Aumentar cobertura de traceabilidade das obrigações (passos de obrigação/report).');
    }
    if (types.has('low_auditability')) {
      recommendations.push('Reforçar camadas de observabilidade e eventos auditáveis nas fases normativas.');
    }
    if (types.has('low_runtime_stability_signal')) {
      recommendations.push('Monitorizar estabilidade de runtime antes de considerar execução normativa alargada.');
    }
    if (types.has('weak_tenant_isolation')) {
      recommendations.push('Endurecer isolamento por tenant nos caminhos de policy e contexto.');
    }
    if (types.has('graph_consistency_gap')) {
      recommendations.push('Validar e corrigir referências do grafo (nós órfãos ou arestas inválidas).');
    }

    const caps = capabilities && typeof capabilities === 'object' ? capabilities : {};
    for (const [k, v] of Object.entries(caps)) {
      if (typeof v === 'number' && v < 40) {
        recommendations.push(`Reforçar capacidade ${k.replace(/_/g, ' ').toLowerCase()} (cobertura baixa).`);
      }
    }

    const doms = domains && typeof domains === 'object' ? domains : {};
    for (const [d, info] of Object.entries(doms)) {
      if (info && typeof info === 'object' && typeof info.score === 'number' && info.score < 40) {
        recommendations.push(`Elevar readiness no domínio ${d} (score & gap).`);
      }
    }

    if (!recommendations.length) {
      recommendations.push('Manter observabilidade e rever readiness após alterações nas fases normativas.');
    }

    for (const r of recommendations) {
      try {
        console.info('[POLICY_READINESS_RECOMMENDATION]', JSON.stringify({ text: r.slice(0, 120) }));
      } catch (_e) {}
    }
  } catch (e) {
    recommendations.push(_safeStr(e && e.message, 200) || 'Falha na geração de recomendações.');
  }
  return { recommendations };
}

function _obligationDomainCounts(obligations) {
  const map = new Map();
  const list = Array.isArray(obligations) ? obligations : [];
  for (const o of list) {
    if (!o || typeof o !== 'object') continue;
    const d = _safeStr(o.domain, 32).toUpperCase() || 'GOVERNANCE';
    map.set(d, (map.get(d) || 0) + 1);
  }
  return map;
}

function calculateDomainReadiness(input, analysis) {
  const domains = {};
  try {
    const m = analysis && analysis.metrics ? analysis.metrics : {};
    const raw = input && typeof input === 'object' ? input : {};
    const obl = raw.obligations && typeof raw.obligations === 'object' ? raw.obligations : {};
    const obList = Array.isArray(obl.obligations) ? obl.obligations : [];
    const byDom = _obligationDomainCounts(obList);

    const gr = raw.graph && typeof raw.graph === 'object' ? raw.graph : {};
    const cent = gr.centrality && typeof gr.centrality === 'object' ? gr.centrality : {};
    const domArb = m.has_arbitration_winner
      ? _safeStr(
          raw.arbitration && raw.arbitration.winner && raw.arbitration.winner.domain,
          32
        ).toUpperCase()
      : '';

    for (const d of READINESS_DOMAINS) {
      const count = byDom.get(d) || 0;
      let score = 28 + Math.min(50, count * 14);
      if (domArb === d) score += 18;
      if (_safeStr(cent.dominant_domain, 32).toUpperCase() === d) score += 12;
      if (d === 'SAFETY' && (m.safety_coverage || 0) > 0.5) score += 14;
      if (d === 'INTEGRITY' && (m.integrity_coverage || 0) > 0.55) score += 12;
      score = _clampScore(score);
      domains[d] = {
        score,
        status: _domainStatusFromScore(score)
      };
    }

    try {
      console.info('[POLICY_READINESS]', JSON.stringify({ action: 'domains', keys: Object.keys(domains).length }));
    } catch (_e) {}
  } catch (e) {
    for (const d of READINESS_DOMAINS) {
      domains[d] = { score: 0, status: POLICY_READINESS_STATUS.NOT_READY, error: _safeStr(e && e.message, 120) };
    }
  }
  return { domains };
}

function mapCapabilityScores(metrics) {
  const m = metrics || {};
  const caps = {};
  caps[POLICY_EXECUTION_CAPABILITIES.SIGNAL_COVERAGE] = _clampScore(Math.min(100, (m.signal_count || 0) * 16));
  caps[POLICY_EXECUTION_CAPABILITIES.ARBITRATION_COVERAGE] = m.has_arbitration_winner ? _clampScore(70 + (m.arbitration_trace_steps || 0) * 3) : 25;
  caps[POLICY_EXECUTION_CAPABILITIES.OBLIGATION_TRACEABILITY] = _clampScore(
    (m.obligation_count || 0) > 0 && (m.obligation_trace_steps || 0) > 0
      ? 85
      : (m.obligation_count || 0) > 0
        ? 45
        : 10
  );
  caps[POLICY_EXECUTION_CAPABILITIES.GRAPH_VISIBILITY] = _clampScore(
    (m.graph_edges || 0) * 4 + (m.graph_nodes || 0) * 2 + (m.graph_validation_ok ? 15 : 0)
  );
  caps[POLICY_EXECUTION_CAPABILITIES.AUDITABILITY] = _clampScore((m.observability_depth || 0) * 18 + (m.audit_event_hint || 0) * 5);
  caps[POLICY_EXECUTION_CAPABILITIES.RUNTIME_STABILITY] = _clampScore((m.runtime_stability || 0) * 100);
  caps[POLICY_EXECUTION_CAPABILITIES.SAFETY_COVERAGE] = _clampScore((m.safety_coverage || 0) * 100);
  caps[POLICY_EXECUTION_CAPABILITIES.TENANT_ISOLATION] = m.tenant_isolation === false ? 28 : 88;
  caps[POLICY_EXECUTION_CAPABILITIES.EXECUTION_SIMULATION] = _clampScore(
    (m.obligation_count || 0) > 0 && (m.graph_edges || 0) > 2 ? 80 : 35
  );
  return caps;
}

function appendExecutionReadinessTrace(trace, entry) {
  const list = Array.isArray(trace) ? [...trace] : [];
  try {
    list.push({
      type: _safeStr(entry && entry.type, 32).toUpperCase() || 'READINESS',
      message: _safeStr(entry && entry.message, 2000),
      timestamp: _nowIso(),
      detail: entry && entry.detail && typeof entry.detail === 'object' ? entry.detail : undefined
    });
  } catch (_e) {
    list.push({ type: 'READINESS', message: 'trace_append_failed', timestamp: _nowIso() });
  }
  try {
    console.info('[POLICY_READINESS]', JSON.stringify({ action: 'trace', steps: list.length }));
  } catch (_e2) {}
  return list;
}

function validateExecutionReadiness(record) {
  const errors = [];
  try {
    if (!record || typeof record !== 'object') {
      errors.push({ path: '', message: 'readiness_missing' });
      return { valid: false, errors };
    }
    const score = record.overall_score;
    if (typeof score !== 'number' || score < 0 || score > 100) {
      errors.push({ path: 'overall_score', message: 'invalid_range' });
    }
    const statusSet = new Set(Object.values(POLICY_READINESS_STATUS));
    if (!statusSet.has(_safeStr(record.status, 32).toLowerCase())) {
      errors.push({ path: 'status', message: 'invalid_status' });
    }
    const expected = _statusFromScore(typeof score === 'number' ? score : 0);
    if (_safeStr(record.status, 32).toLowerCase() !== expected) {
      errors.push({ path: 'status', message: 'inconsistent_with_score', expected });
    }

    const doms = record.domains && typeof record.domains === 'object' ? record.domains : {};
    for (const [k, v] of Object.entries(doms)) {
      if (!v || typeof v !== 'object') {
        errors.push({ path: `domains.${k}`, message: 'invalid' });
        continue;
      }
      if (typeof v.score !== 'number' || v.score < 0 || v.score > 100) {
        errors.push({ path: `domains.${k}.score`, message: 'invalid_range' });
      }
      if (!statusSet.has(_safeStr(v.status, 32).toLowerCase())) {
        errors.push({ path: `domains.${k}.status`, message: 'invalid_domain_status' });
      }
    }

    if (!Array.isArray(record.blockers)) errors.push({ path: 'blockers', message: 'not_array' });
    if (!Array.isArray(record.recommendations)) errors.push({ path: 'recommendations', message: 'not_array' });

    if (!record.capabilities || typeof record.capabilities !== 'object' || Array.isArray(record.capabilities)) {
      errors.push({ path: 'capabilities', message: 'invalid' });
    }

    if (!Array.isArray(record.trace)) errors.push({ path: 'trace', message: 'not_array' });
  } catch (e) {
    errors.push({ path: '', message: _safeStr(e && e.message, 200) });
  }
  return { valid: errors.length === 0, errors };
}

function generateExecutionReadinessSnapshot() {
  return {
    generated_at: _nowIso(),
    supported_capabilities: [...Object.values(POLICY_EXECUTION_CAPABILITIES)],
    supported_domains: [...READINESS_DOMAINS],
    readiness_statuses: [...Object.values(POLICY_READINESS_STATUS)],
    scoring_weights: { ...SCORING_WEIGHTS },
    readiness_enabled: isPolicyReadinessEnabled()
  };
}

function buildDemoReadinessInput() {
  try {
    const cognitivePolicyObligationService = require('./cognitivePolicyObligationService');
    const cognitivePolicyArbitrationService = require('./cognitivePolicyArbitrationService');
    const cognitivePolicyGovernanceGraphService = require('./cognitivePolicyGovernanceGraphService');

    const comp = cognitivePolicyObligationService.buildDemoCompositionInput();
    const obReport = cognitivePolicyObligationService.generateObligationReport(comp);
    const arbReport =
      comp.arbitration && typeof comp.arbitration === 'object'
        ? comp.arbitration
        : cognitivePolicyArbitrationService.generatePolicyArbitrationReport();
    const graphReport = cognitivePolicyGovernanceGraphService.generateGovernanceGraphReport({
      signals: comp.signals,
      decision: comp.decision,
      arbitration: comp.arbitration,
      obligations: obReport.obligations
    });

    const signalCount = Array.isArray(comp.signals) ? comp.signals.length : 0;

    return {
      signals: { count: signalCount, items: comp.signals, facade_decision: comp.decision },
      arbitration: arbReport,
      obligations: obReport,
      graph: graphReport,
      runtime: {
        stability_hint: 0.72,
        tenant_isolation_hint: true
      },
      safety: {
        engine_observed: true,
        coverage_hint: 0.82
      },
      integrity: {
        block_mode_observed: false,
        coverage_hint: 0.58
      },
      observability: {
        trace_layers: (obReport.trace?.length || 0) + (graphReport.trace?.length || 0),
        audit_event_hint: (arbReport.trace?.length || 0) > 0 ? 2 : 0
      }
    };
  } catch (_e) {
    return {
      signals: { count: 0, items: [] },
      arbitration: {},
      obligations: { obligations: [], trace: [] },
      graph: { nodes: [], edges: [], patterns: [], summary: { validation_ok: false } },
      runtime: { stability_hint: 0.4, tenant_isolation_hint: true },
      safety: { coverage_hint: 0.3 },
      integrity: { coverage_hint: 0.3 },
      observability: { trace_layers: 0 }
    };
  }
}

function generateExecutionReadinessReport(input) {
  const rawIn = input != null && typeof input === 'object' ? input : buildDemoReadinessInput();
  const analysis = analyzeExecutionReadiness(rawIn);
  const scorePack = calculateReadinessScore(analysis);
  const blockers = detectExecutionBlockers(analysis, rawIn);
  const domPack = calculateDomainReadiness(rawIn, analysis);
  const capabilities = mapCapabilityScores(analysis.metrics);
  const recs = generateReadinessRecommendations(blockers, capabilities, domPack.domains);

  let trace = [];
  trace = appendExecutionReadinessTrace(trace, {
    type: 'READINESS',
    message: 'Governance graph coverage detected',
    detail: { edges: analysis.metrics.graph_edges, nodes: analysis.metrics.graph_nodes }
  });
  trace = appendExecutionReadinessTrace(trace, {
    type: 'READINESS',
    message: `Readiness score composed: ${scorePack.overall_score}`,
    detail: scorePack.breakdown
  });

  const warnings = [];
  if ((analysis.metrics.graph_pattern_count || 0) > 2) {
    warnings.push('Múltiplos padrões normativos detectados no grafo; rever centralização.');
  }

  const status = _statusFromScore(scorePack.overall_score);
  const record = createExecutionReadiness({
    overall_score: scorePack.overall_score,
    status,
    domains: domPack.domains,
    capabilities,
    blockers: blockers.blockers,
    warnings,
    recommendations: recs.recommendations,
    trace
  });

  return {
    ...record,
    scoring_breakdown: scorePack.breakdown,
    weights_applied: scorePack.weights
  };
}

function getPolicyExecutionReadinessDashboardSummary() {
  if (!isPolicyReadinessEnabled()) {
    return {
      enabled: false,
      code: 'POLICY_READINESS_DISABLED',
      message: 'Defina IMPETUS_POLICY_READINESS_ENABLED=true para análise de prontidão normativa.'
    };
  }
  const report = generateExecutionReadinessReport();
  const validation = validateExecutionReadiness(report);
  const topBlockers = (report.blockers || []).slice(0, 4).map((b) => b.type);
  const domScores = report.domains && typeof report.domains === 'object' ? report.domains : {};
  let maturity = 'initial';
  const sc = report.overall_score;
  if (sc >= 82) maturity = 'advanced';
  else if (sc >= 55) maturity = 'structured';
  else if (sc >= 25) maturity = 'emerging';

  return {
    enabled: true,
    generated_at: _nowIso(),
    overall_score: report.overall_score,
    status: report.status,
    governance_maturity: maturity,
    dominant_blockers: topBlockers,
    blocker_count: (report.blockers || []).length,
    recommendation_count: (report.recommendations || []).length,
    recommendation_preview: (report.recommendations || []).slice(0, 3),
    domain_readiness_preview: Object.fromEntries(
      Object.entries(domScores).map(([k, v]) => [k, v && typeof v === 'object' ? v.score : null])
    ),
    validation_ok: validation.valid,
    trace_steps: (report.trace || []).length
  };
}

function generatePolicyExecutionReadinessAdminPayload() {
  return {
    snapshot: generateExecutionReadinessSnapshot(),
    demo_readiness: generateExecutionReadinessReport()
  };
}

module.exports = {
  POLICY_READINESS_STATUS,
  POLICY_EXECUTION_CAPABILITIES,
  SCORING_WEIGHTS,
  READINESS_DOMAINS,
  isPolicyReadinessEnabled,
  createExecutionReadiness,
  analyzeExecutionReadiness,
  calculateReadinessScore,
  detectExecutionBlockers,
  generateReadinessRecommendations,
  calculateDomainReadiness,
  appendExecutionReadinessTrace,
  generateExecutionReadinessReport,
  validateExecutionReadiness,
  generateExecutionReadinessSnapshot,
  buildDemoReadinessInput,
  getPolicyExecutionReadinessDashboardSummary,
  generatePolicyExecutionReadinessAdminPayload
};
