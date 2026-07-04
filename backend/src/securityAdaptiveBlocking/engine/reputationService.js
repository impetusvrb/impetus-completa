'use strict';

/**
 * SEC-14 — Reputation Engine (evidências internas only).
 */

const store = require('../store/adaptiveBlockingStore');
const metrics = require('../metrics/adaptiveBlockingMetrics');

function computeReputationFromIncidents(incidents, ip) {
  const related = (incidents || []).filter((inc) =>
    (inc.participants?.ips || []).includes(ip)
  );

  let score = 100;
  const incidentIds = [];
  let firstSeen = null;
  let lastSeen = null;

  for (const inc of related) {
    incidentIds.push(inc.incidentId);
    const fs = inc.firstSeen;
    const ls = inc.lastSeen;
    if (!firstSeen || fs < firstSeen) firstSeen = fs;
    if (!lastSeen || ls > lastSeen) lastSeen = ls;

    const sev = { CRITICAL: 25, HIGH: 18, MEDIUM: 10, LOW: 5, INFO: 2 };
    score -= sev[inc.severity] || 5;
    score -= Math.min(15, (inc.metrics?.requestCount || 0) / 2000);
  }

  const recurrence = related.length;
  if (recurrence >= 3) score -= 15;
  if (recurrence >= 5) score -= 10;

  score = Math.min(100, Math.max(0, score));
  const confidence = Math.min(1, related.length * 0.2 + (related[0]?.confidence || 0) * 0.5);

  return {
    reputationScore: Math.round(score),
    firstSeen: firstSeen || new Date().toISOString(),
    lastSeen: lastSeen || new Date().toISOString(),
    incidentHistory: incidentIds,
    recurrence,
    confidence: Math.min(1, confidence),
    incidentCount: related.length
  };
}

function updateReputationForIp(ip, incidents) {
  const rep = computeReputationFromIncidents(incidents, ip);
  store.setReputation(ip, rep);
  metrics.increment('reputation_updates');
  return store.getReputation(ip);
}

function buildAllReputations(incidents) {
  const ips = new Set();
  for (const inc of incidents || []) {
    for (const ip of inc.participants?.ips || []) ips.add(ip);
  }
  return [...ips].map((ip) => updateReputationForIp(ip, incidents));
}

module.exports = { computeReputationFromIncidents, updateReputationForIp, buildAllReputations };
