'use strict';

/**
 * AIOI-P2.9 — Executive Attention Map Service (READ ONLY)
 *
 * Mapa de atenção executiva por domínio — composição P2.x, sem IA.
 */

const { isValidUUID } = require('../../utils/security');
const cmdMetrics = require('./aioiExecutiveCommandMetrics');
const priorityService = require('./aioiPriorityAnalysisService');
const valueService = require('./aioiOperationalValueService');
const resilienceService = require('./aioiOperationalResilienceService');

const ATTENTION_DOMAINS = Object.freeze([
  'sla', 'backlog', 'governance', 'maturity', 'stability', 'value', 'resilience'
]);

function buildAttentionDomains({ slaScore, backlogScore, governanceScore, maturityScore,
  stabilityScore, valueScore, resilienceScore }) {
  const scores = {
    sla:        slaScore,
    backlog:    backlogScore,
    governance: governanceScore,
    maturity:   maturityScore,
    stability:  stabilityScore,
    value:      valueScore,
    resilience: resilienceScore
  };

  return ATTENTION_DOMAINS.map(domain => ({
    domain,
    attention_level: cmdMetrics.classifyAttentionLevel(scores[domain]),
    attention_score:   cmdMetrics.clampScore(scores[domain])
  }));
}

function buildExecutiveAttentionMap(signals) {
  return { domains: buildAttentionDomains(signals) };
}

async function getExecutiveAttentionMap(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const [priorityRes, valueRes, resilienceRes] = await Promise.all([
      priorityService.getStrategicPriorities(companyId),
      valueService.getOperationalValue(companyId),
      resilienceService.getOperationalResilience(companyId)
    ]);

    if (!priorityRes.ok || !valueRes.ok || !resilienceRes.ok) {
      const err = priorityRes.error || valueRes.error || resilienceRes.error;
      cmdMetrics.recordError(companyId, 'getExecutiveAttentionMap', err);
      return { ok: false, error: err };
    }

    const priorities = priorityRes.strategic_priorities.priorities;
    const byDomain = {};
    for (const p of priorities) byDomain[p.domain] = p.priority_score;

    const valueGap = cmdMetrics.clampScore(
      100 - (valueRes.operational_value.operational_value_score ?? 50)
    );

    const executive_attention_map = buildExecutiveAttentionMap({
      slaScore:        byDomain.sla ?? priorityService.scoreSlaDomain(null),
      backlogScore:    byDomain.backlog ?? 0,
      governanceScore: byDomain.governance ?? 0,
      maturityScore:   byDomain.maturity ?? 0,
      stabilityScore:  byDomain.stability ?? 0,
      valueScore:      valueGap,
      resilienceScore: cmdMetrics.resilienceAttentionScore(
        resilienceRes.operational_resilience.resilience_status
      )
    });

    cmdMetrics.recordAttentionMapAnalyzed(companyId);
    return { ok: true, executive_attention_map };

  } catch (err) {
    cmdMetrics.recordError(companyId, 'getExecutiveAttentionMap', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  ATTENTION_DOMAINS,
  buildAttentionDomains,
  buildExecutiveAttentionMap,
  getExecutiveAttentionMap
};
