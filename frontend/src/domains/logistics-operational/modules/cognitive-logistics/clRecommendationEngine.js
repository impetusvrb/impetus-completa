/** OPM-008 — Recommendation engine (priorizadas · confiança · impacto · evidências). */
import { getHeuristicRule } from './clHeuristicRules.js';
import { buildDecisionTrace } from './clDecisionTrace.js';

const IMPACT_MAP = Object.freeze({
  high: 'Alto — impacto operacional imediato',
  medium: 'Médio — optimização recomendada',
  low: 'Baixo — oportunidade incremental'
});

function enrichRec(base, ruleId, modules, impact, confidence, evidence) {
  const rule = getHeuristicRule(ruleId);
  return {
    ...base,
    ruleId: ruleId || base.ruleId,
    confidence: confidence ?? base.confidence ?? 0.7,
    impact: impact ?? base.impact ?? 'medium',
    impactLabel: IMPACT_MAP[impact ?? base.impact ?? 'medium'] || IMPACT_MAP.medium,
    modules: modules || rule?.modules || [],
    modulesInvolved: modules || rule?.modules || [],
    evidence: evidence || base.evidence || (base.trace ? [base.trace] : []),
    action: 'advisory',
    justification: base.message || base.justification
  };
}

export function computeCognitiveRecommendations({
  wiRecommendations = [],
  insights = [],
  capacity = [],
  heatmaps,
  bottlenecks = [],
  flow,
  transfers = []
}) {
  const recs = [];
  const seen = new Set();

  for (const wi of wiRecommendations) {
    const enriched = enrichRec(
      { ...wi, source: 'OPM-007' },
      wi.type === 'capacity' ? 'RULE-REDIST' : wi.type === 'replenishment' ? 'RULE-REPLEN' : wi.type === 'transfer' ? 'RULE-XFR-RESCH' : 'RULE-DOCK-BAL',
      wi.type === 'capacity' ? ['transfers', 'inventory'] : undefined,
      wi.priority === 'high' ? 'high' : wi.priority === 'low' ? 'low' : 'medium',
      wi.priority === 'high' ? 0.85 : 0.72,
      wi.trace ? [wi.trace] : []
    );
    if (!seen.has(enriched.id)) {
      seen.add(enriched.id);
      recs.push(enriched);
    }
  }

  if (capacity.some((c) => c.critical)) {
    const rule = getHeuristicRule('RULE-REDIST');
    recs.push(enrichRec({
      id: 'cl-rec-redist-stock',
      type: 'redistribution',
      priority: 'high',
      title: 'Redistribuir estoque entre armazéns',
      message: 'Capacidade crítica detectada — redistribuição interna recomendada',
      trace: { source: 'clRecommendationEngine', rule: rule.id }
    }, rule.id, rule.modules, 'high', 0.87));
  }

  for (const u of (heatmaps?.underused || []).slice(0, 2)) {
    const rule = getHeuristicRule('RULE-REPLEN');
    recs.push(enrichRec({
      id: `cl-rec-replen-${u.id}`,
      type: 'replenishment',
      priority: 'medium',
      title: `Antecipar replenishment · ${u.id}`,
      message: 'Zona subutilizada — oportunidade reposição picking',
      trace: { source: 'clRecommendationEngine', zone: u.id }
    }, rule.id, rule.modules, 'medium', 0.78));
  }

  const rcvOpen = (flow?.stages?.find((s) => s.id === 'receiving')?.open ?? 0);
  const shpOpen = (flow?.stages?.find((s) => s.id === 'shipping')?.open ?? 0);
  if (rcvOpen > 3 && shpOpen > 3) {
    const rule = getHeuristicRule('RULE-DOCK-BAL');
    recs.push(enrichRec({
      id: 'cl-rec-dock-balance',
      type: 'dock_balance',
      priority: 'medium',
      title: 'Redistribuir carga entre docas',
      message: `Receiving ${rcvOpen} + Shipping ${shpOpen} filas — balanceamento docas`,
      trace: { source: 'clRecommendationEngine', receiving: rcvOpen, shipping: shpOpen }
    }, rule.id, rule.modules, 'medium', 0.72));
  }

  const xfrPending = transfers.filter((t) => t.status !== 'received').length;
  if (xfrPending >= 3 && capacity.some((c) => c.critical)) {
    const rule = getHeuristicRule('RULE-XFR-RESCH');
    recs.push(enrichRec({
      id: 'cl-rec-xfr-reschedule',
      type: 'transfer_reschedule',
      priority: 'high',
      title: 'Reprogramar transferências internas',
      message: `${xfrPending} transferências pendentes com capacidade crítica`,
      trace: { source: 'GET /v1/transfers', pending: xfrPending }
    }, rule.id, rule.modules, 'high', 0.8));
  }

  for (const b of bottlenecks.filter((x) => x.severity === 'high')) {
    recs.push(enrichRec({
      id: `cl-rec-bn-${b.module}`,
      type: 'bottleneck',
      priority: 'high',
      title: `Priorizar ${b.moduleLabel}`,
      message: b.hint,
      trace: b.trace
    }, 'RULE-QUEUE-GROWTH', [b.module], 'high', 0.86, [b.trace]));
  }

  for (const ins of insights.filter((i) => i.severity === 'high').slice(0, 2)) {
    recs.push(enrichRec({
      id: `cl-rec-ins-${ins.id}`,
      type: 'predictive',
      priority: 'high',
      title: ins.title,
      message: ins.message,
      trace: { source: 'clPredictiveUtils', ruleId: ins.ruleId, evidence: ins.evidence }
    }, ins.ruleId, ins.modules, 'high', ins.confidence, ins.evidence));
  }

  return recs
    .sort((a, b) => {
      const p = { high: 0, medium: 1, low: 2 };
      const pc = (p[a.priority] ?? 9) - (p[b.priority] ?? 9);
      if (pc !== 0) return pc;
      return (b.confidence ?? 0) - (a.confidence ?? 0);
    })
    .map((r) => ({ ...r, decisionTrace: buildDecisionTrace({ recommendation: { _recommendation: r } }) }));
}

export function buildCognitiveRecommendationRows(recommendations = []) {
  return recommendations.map((r) => ({
    id: r.id,
    priority: r.priority,
    type: r.type,
    title: r.title,
    confidence: r.confidence != null ? `${Math.round(r.confidence * 100)}%` : '—',
    impact: r.impact,
    modules: (r.modulesInvolved || r.modules || []).join(', ') || '—',
    trace_source: r.trace?.source || r.ruleId || 'OPM-007',
    _recommendation: r
  }));
}
