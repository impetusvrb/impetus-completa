'use strict';

/**
 * SEC-10 — Attack Escalation Engine.
 * Produz LOW | MEDIUM | HIGH | CRITICAL — nunca executa acções.
 */

const ESCALATION_LEVELS = Object.freeze(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']);

function computeVolumeScore(incidents) {
  let totalRequests = 0;
  let openCount = 0;
  for (const inc of incidents || []) {
    totalRequests += inc.metrics?.requestCount || 0;
    if (inc.status === 'OPEN') openCount += 1;
  }
  if (totalRequests >= 20000 || openCount >= 5) return 1;
  if (totalRequests >= 5000 || openCount >= 3) return 0.75;
  if (totalRequests >= 1000 || openCount >= 2) return 0.5;
  if (totalRequests >= 100 || openCount >= 1) return 0.25;
  return 0;
}

function computeRecurrenceScore(incidents, closed) {
  const all = [...(incidents || []), ...(closed || [])];
  const ipCounts = new Map();
  for (const inc of all) {
    for (const ip of inc.participants?.ips || []) {
      ipCounts.set(ip, (ipCounts.get(ip) || 0) + 1);
    }
  }
  let maxRepeat = 0;
  for (const c of ipCounts.values()) maxRepeat = Math.max(maxRepeat, c);
  if (maxRepeat >= 5) return 1;
  if (maxRepeat >= 3) return 0.7;
  if (maxRepeat >= 2) return 0.4;
  return 0;
}

function computeAccelerationScore(incidents) {
  for (const inc of incidents || []) {
    const duration = inc.durationMs || 1;
    const rate = (inc.metrics?.requestCount || 0) / (duration / 1000);
    if (rate > 50) return 1;
    if (rate > 20) return 0.7;
    if (rate > 5) return 0.4;
  }
  return 0;
}

function computeDistributedScore(incidents) {
  let maxIps = 0;
  for (const inc of incidents || []) {
    const ips = inc.participants?.ips?.length || inc.metrics?.uniqueIps || 0;
    maxIps = Math.max(maxIps, ips);
  }
  if (maxIps >= 10) return 1;
  if (maxIps >= 5) return 0.75;
  if (maxIps >= 3) return 0.5;
  return 0;
}

function computeSeverityScore(incidents) {
  const weights = { CRITICAL: 1, HIGH: 0.8, MEDIUM: 0.5, LOW: 0.25, INFO: 0.1 };
  let max = 0;
  for (const inc of incidents || []) {
    max = Math.max(max, weights[inc.severity] || 0);
  }
  return max;
}

function escalateThreatLevel(openIncidents, closedIncidents, patterns, integrityReport) {
  const volume = computeVolumeScore(openIncidents);
  const recurrence = computeRecurrenceScore(openIncidents, closedIncidents);
  const acceleration = computeAccelerationScore(openIncidents);
  const distributed = computeDistributedScore(openIncidents);
  const severity = computeSeverityScore(openIncidents);

  let integrityBoost = 0;
  if (integrityReport?.integrityStatus === 'COMPROMISED') integrityBoost = 0.3;
  else if (integrityReport?.integrityStatus === 'DEGRADED') integrityBoost = 0.15;

  const patternBoost = Math.min(0.2, (patterns?.length || 0) * 0.05);

  const composite =
    volume * 0.25 +
    recurrence * 0.2 +
    acceleration * 0.2 +
    distributed * 0.15 +
    severity * 0.2 +
    integrityBoost +
    patternBoost;

  let level = 'LOW';
  if (composite >= 0.85) level = 'CRITICAL';
  else if (composite >= 0.65) level = 'HIGH';
  else if (composite >= 0.4) level = 'MEDIUM';

  return {
    level,
    compositeScore: Math.min(1, composite),
    factors: {
      volume,
      recurrence,
      acceleration,
      distributed,
      severity,
      integrityBoost,
      patternBoost
    }
  };
}

module.exports = {
  ESCALATION_LEVELS,
  escalateThreatLevel,
  computeVolumeScore,
  computeRecurrenceScore,
  computeAccelerationScore,
  computeDistributedScore
};
