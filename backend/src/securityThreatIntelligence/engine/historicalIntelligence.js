'use strict';

/**
 * SEC-03 — Historical Intelligence.
 * Compara incidente actual com histórico interno IMPETUS.
 */

/**
 * @param {object} incident
 * @param {object[]} priorProfiles
 * @returns {object}
 */
function analyzeHistoricalSimilarity(incident, priorProfiles) {
  const notes = [];
  const priorIds = [];
  let bestMatch = null;
  let bestScore = 0;

  const ips = incident.participants?.ips || [];
  const asns = incident.participants?.asns || [];
  const hour = new Date(incident.firstSeen).getUTCHours();

  for (const prior of priorProfiles) {
    if (prior.incidentId === incident.incidentId) continue;
    const snap = prior._incidentSnapshot;
    if (!snap) continue;

    let score = 0;
    const priorIps = snap.participants?.ips || [];
    const priorAsns = snap.participants?.asns || [];

    if (priorIps.some((ip) => ips.includes(ip))) score += 0.4;
    if (priorAsns.length && priorAsns.some((a) => asns.includes(a))) score += 0.3;
    if (snap.classification === incident.classification) score += 0.2;

    const volRatio = ratioSimilarity(snap.metrics?.requestCount || 0, incident.metrics?.requestCount || 0);
    score += volRatio * 0.1;

    if (score > bestScore) {
      bestScore = score;
      bestMatch = prior;
    }

    if (score >= 0.35) priorIds.push(prior.incidentId);
  }

  const occurredBefore = priorIds.length > 0;

  if (!occurredBefore) {
    return {
      occurred_before: false,
      prior_incident_ids: [],
      behavior_changed: null,
      asn_changed: null,
      schedule_changed: null,
      target_changed: null,
      volume_changed: null,
      pattern_changed: null,
      similarity_score: 0,
      notes: ['Primeira ocorrência observada na janela histórica']
    };
  }

  const snap = bestMatch?._incidentSnapshot;
  const behaviorChanged = snap?.classification !== incident.classification ? true : snap?.classification === incident.classification ? false : null;
  const asnChanged = compareAsnChange(snap?.participants?.asns || [], asns);
  const priorHour = snap ? new Date(snap.firstSeen).getUTCHours() : null;
  const scheduleChanged = priorHour != null ? Math.abs(hour - priorHour) > 4 : null;
  const targetChanged = compareTargetChange(snap?.affectedComponents || [], incident.affectedComponents || []);
  const volumeChanged = compareVolumeChange(snap?.metrics?.requestCount || 0, incident.metrics?.requestCount || 0);
  const patternChanged = bestScore < 0.5 ? true : bestScore >= 0.7 ? false : null;

  if (behaviorChanged === true) notes.push('Classificação alterada face a ocorrência anterior');
  if (asnChanged === true) notes.push('ASN diferente da ocorrência anterior');
  if (scheduleChanged === true) notes.push('Horário de início diferente (>4h)');
  if (volumeChanged === 'increased') notes.push('Volume superior à ocorrência anterior');
  if (volumeChanged === 'decreased') notes.push('Volume inferior à ocorrência anterior');
  if (patternChanged === true) notes.push('Padrão comportamental alterado');

  return {
    occurred_before: true,
    prior_incident_ids: priorIds.slice(0, 10),
    behavior_changed: behaviorChanged,
    asn_changed: asnChanged,
    schedule_changed: scheduleChanged,
    target_changed: targetChanged,
    volume_changed: volumeChanged,
    pattern_changed: patternChanged,
    similarity_score: Math.round(bestScore * 100) / 100,
    notes
  };
}

function ratioSimilarity(a, b) {
  if (a === 0 && b === 0) return 1;
  const max = Math.max(a, b, 1);
  return 1 - Math.abs(a - b) / max;
}

function compareAsnChange(priorAsns, currentAsns) {
  if (!priorAsns.length && !currentAsns.length) return null;
  if (!priorAsns.length || !currentAsns.length) return true;
  return !priorAsns.some((a) => currentAsns.includes(a));
}

function compareTargetChange(prior, current) {
  if (!prior.length && !current.length) return null;
  const priorSet = new Set(prior);
  return !current.every((c) => priorSet.has(c));
}

function compareVolumeChange(priorVol, currentVol) {
  if (priorVol === currentVol) return 'unchanged';
  if (currentVol > priorVol * 1.5) return 'increased';
  if (currentVol < priorVol * 0.5) return 'decreased';
  return 'similar';
}

module.exports = { analyzeHistoricalSimilarity };
