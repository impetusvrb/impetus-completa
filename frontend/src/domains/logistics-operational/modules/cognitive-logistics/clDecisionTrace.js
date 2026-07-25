/** OPM-008 — Decision trace (Recommendation → Evidence → Metrics → Events → Contracts). */
export function buildDecisionTrace({ recommendation, snapshot = {}, wiAnalytics = {} }) {
  const rec = recommendation?._recommendation || recommendation;
  if (!rec) return null;

  const evidence = rec.evidence || rec.trace ? [rec.trace].flat().filter(Boolean) : [];
  const metrics = {
    healthScore: wiAnalytics.healthScore,
    riskScore: wiAnalytics.riskScore,
    openQueues: wiAnalytics.flow?.summary?.totalOpenQueues,
    criticalCapacity: (wiAnalytics.capacity || []).filter((c) => c.critical).length
  };

  const events = [];
  if (snapshot.receiving?.length) events.push({ domain: 'receiving', count: snapshot.receiving.length, source: 'GET /v1/receiving' });
  if (snapshot.picking?.length) events.push({ domain: 'picking', count: snapshot.picking.length, source: 'GET /v1/picking' });
  if (snapshot.shipping?.length) events.push({ domain: 'shipping', count: snapshot.shipping.length, source: 'GET /v1/shipping' });
  if (snapshot.transfers?.length) events.push({ domain: 'transfers', count: snapshot.transfers.length, source: 'GET /v1/transfers' });
  if (snapshot.movements?.length) events.push({ domain: 'inventory', count: snapshot.movements.length, source: 'GET /v1/inventory/movements' });

  return Object.freeze({
    recommendation: Object.freeze({
      id: rec.id,
      title: rec.title,
      priority: rec.priority,
      confidence: rec.confidence,
      impact: rec.impact,
      action: rec.action || 'advisory'
    }),
    evidence: Object.freeze(evidence),
    metrics: Object.freeze(metrics),
    events: Object.freeze(events),
    contracts: Object.freeze(['OPM-GOV-001', 'OPM-007', 'WMS-003 v1']),
    modulesInvolved: Object.freeze(rec.modules || rec.modulesInvolved || [])
  });
}

export function buildInsightTrace(insight) {
  if (!insight) return null;
  return Object.freeze({
    recommendation: Object.freeze({
      id: insight.id,
      title: insight.title,
      priority: insight.severity,
      confidence: insight.confidence,
      impact: insight.category,
      action: 'predictive_advisory'
    }),
    evidence: Object.freeze(insight.evidence || []),
    metrics: Object.freeze({ ruleId: insight.ruleId, horizon: insight.horizon }),
    events: Object.freeze([]),
    contracts: Object.freeze(['OPM-GOV-001', 'OPM-007', 'clHeuristicRules']),
    modulesInvolved: Object.freeze(insight.modules || [])
  });
}
