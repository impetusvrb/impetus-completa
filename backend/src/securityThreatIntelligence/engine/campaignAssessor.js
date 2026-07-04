'use strict';

/**
 * SEC-03 — Campaign Assessment.
 * Nunca conclui identidade ou número de actores — apenas hipóteses com níveis de evidência.
 */

/**
 * @param {object} incident
 * @param {object[]} priorProfiles — perfis históricos (read-only)
 * @returns {object}
 */
function assessCampaign(incident, priorProfiles = []) {
  const related = findRelatedIncidents(incident, priorProfiles);

  if (related.length === 0) {
    return {
      kind: 'campaign',
      level: 'Unknown',
      label: 'Incidente isolado (sem histórico correlacionável)',
      hypothesis: 'Sem incidentes anteriores suficientemente similares na janela histórica',
      confidence: 0.4,
      evidence: [{ type: 'related_count', value: 0 }],
      is_isolated: true,
      campaign_id: null,
      related_incident_ids: []
    };
  }

  const strong = related.filter((r) => r.similarity >= 0.7);
  const moderate = related.filter((r) => r.similarity >= 0.45 && r.similarity < 0.7);

  if (strong.length >= 2) {
    return {
      kind: 'campaign',
      level: 'Likely',
      label: 'Mesma campanha provável',
      hypothesis: 'Padrões consistentes (classificação, alvo, infra) sugerem campanha relacionada — número de actores indeterminado',
      confidence: 0.72,
      evidence: strong.slice(0, 5).map((r) => ({ type: 'prior_incident', value: r.incidentId, similarity: r.similarity })),
      is_isolated: false,
      campaign_id: deriveCampaignId(incident, strong),
      related_incident_ids: strong.map((r) => r.incidentId)
    };
  }

  if (strong.length === 1 || moderate.length >= 2) {
    return {
      kind: 'campaign',
      level: 'Possible',
      label: 'Campanhas independentes possíveis ou mesma campanha parcial',
      hypothesis: 'Similaridade parcial — pode ser scanners distintos com comportamento semelhante',
      confidence: 0.5,
      evidence: [...strong, ...moderate].slice(0, 5).map((r) => ({ type: 'prior_incident', value: r.incidentId, similarity: r.similarity })),
      is_isolated: false,
      campaign_id: deriveCampaignId(incident, [...strong, ...moderate]),
      related_incident_ids: [...strong, ...moderate].map((r) => r.incidentId)
    };
  }

  return {
    kind: 'campaign',
    level: 'Unknown',
    label: 'Evidência insuficiente para campanha',
    hypothesis: 'Incidentes anteriores existem mas similaridade baixa',
    confidence: 0.25,
    evidence: related.slice(0, 3).map((r) => ({ type: 'prior_incident', value: r.incidentId, similarity: r.similarity })),
    is_isolated: true,
    campaign_id: null,
    related_incident_ids: []
  };
}

function findRelatedIncidents(incident, priorProfiles) {
  const results = [];
  const ips = new Set(incident.participants?.ips || []);
  const asns = new Set(incident.participants?.asns || []);
  const cls = incident.classification;
  const components = new Set(incident.affectedComponents || []);

  for (const prior of priorProfiles) {
    if (prior.incidentId === incident.incidentId) continue;

    let score = 0;
    const priorIps = prior._incidentSnapshot?.participants?.ips || [];
    const priorAsns = prior._incidentSnapshot?.participants?.asns || [];

    if (priorIps.some((ip) => ips.has(ip))) score += 0.35;
    if (priorAsns.length && priorAsns.some((a) => asns.has(a))) score += 0.25;
    if (prior.primaryAssessment === require('./threatAssessor').determinePrimaryAssessment(incident)) score += 0.15;
    if (prior._incidentSnapshot?.classification === cls) score += 0.15;

    const priorComps = prior._incidentSnapshot?.affectedComponents || [];
    if (priorComps.some((c) => components.has(c))) score += 0.1;

    if (score >= 0.25) {
      results.push({ incidentId: prior.incidentId, similarity: Math.min(1, score) });
    }
  }

  return results.sort((a, b) => b.similarity - a.similarity);
}

function deriveCampaignId(incident, related) {
  const cls = incident.classification || 'unknown';
  const provider = require('./providerRegistry').resolveProvidersForIncident(incident)[0];
  const key = provider ? `${cls}-${provider.id}` : cls;
  const ids = [incident.incidentId, ...related.map((r) => r.incidentId)].sort();
  return `camp-${key}-${ids[0]?.slice(-8) || 'x'}`;
}

module.exports = { assessCampaign, findRelatedIncidents, deriveCampaignId };
