'use strict';

/**
 * EVENT-GOVERNANCE-12 — correlação cognitiva sobre eventos governados.
 */

const CORRELATION_KINDS = Object.freeze([
  'repetition',
  'trend',
  'anomaly',
  'recurrence',
  'escalating',
  'cross_domain'
]);

/** Pares de domínios cruzados relevantes */
const CROSS_DOMAIN_PAIRS = Object.freeze([
  ['tpm', 'quality'],
  ['sst', 'esg'],
  ['operational', 'manuia'],
  ['billing', 'executive'],
  ['quality', 'operational'],
  ['esg', 'executive']
]);

function _groupKey(events, keyFn) {
  const map = new Map();
  for (const ev of events) {
    const k = keyFn(ev);
    if (!map.has(k)) map.set(k, []);
    map.get(k).push(ev);
  }
  return map;
}

/**
 * @param {object[]} events — eventos governados normalizados
 * @returns {object[]}
 */
function detectCorrelations(events) {
  if (!Array.isArray(events) || events.length === 0) return [];

  const correlations = [];
  const approved = events.filter((e) => e.approved !== false);

  const byType = _groupKey(approved, (e) => e.eventType);
  for (const [eventType, group] of byType) {
    if (group.length >= 3) {
      correlations.push({
        kind: 'repetition',
        correlationGroup: `rep:${eventType}`,
        eventIds: group.map((e) => e.eventId),
        categories: [...new Set(group.map((e) => e.category))],
        count: group.length,
        severity: group[group.length - 1].severity
      });
    }
  }

  const byPolicy = _groupKey(approved, (e) => e.policyId || 'unknown');
  for (const [policyId, group] of byPolicy) {
    if (policyId !== 'unknown' && group.length >= 2) {
      correlations.push({
        kind: 'recurrence',
        correlationGroup: `rec:${policyId}`,
        eventIds: group.map((e) => e.eventId),
        policyId,
        count: group.length
      });
    }
  }

  const sorted = [...approved].sort(
    (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
  );
  if (sorted.length >= 3) {
    const severities = sorted.map((e) => e.severity);
    const escalation = sorted.map((e) => e.escalationLevel || 0);
    const sevRank = { low: 1, medium: 2, high: 3, critical: 4, info: 0 };
    const rising =
      severities.slice(-3).every((s, i, arr) => i === 0 || (sevRank[s] || 0) >= (sevRank[arr[i - 1]] || 0));
    if (rising && severities.slice(-3).some((s) => (sevRank[s] || 0) >= 3)) {
      correlations.push({
        kind: 'trend',
        correlationGroup: `trend:severity:${sorted[sorted.length - 1].category}`,
        eventIds: sorted.slice(-3).map((e) => e.eventId),
        categories: [...new Set(sorted.slice(-3).map((e) => e.category))]
      });
    }

    const escRising =
      escalation.slice(-3).every((v, i, arr) => i === 0 || v >= arr[i - 1]) &&
      escalation.slice(-3).some((v) => v >= 2);
    if (escRising) {
      correlations.push({
        kind: 'escalating',
        correlationGroup: `esc:${sorted[sorted.length - 1].policyId || 'mixed'}`,
        eventIds: sorted.slice(-3).map((e) => e.eventId),
        escalationLevels: escalation.slice(-3)
      });
    }
  }

  const critical = approved.filter((e) => e.severity === 'critical' || e.severity === 'high');
  const low = approved.filter((e) => e.severity === 'low' || e.severity === 'medium');
  if (critical.length === 1 && low.length >= 3) {
    correlations.push({
      kind: 'anomaly',
      correlationGroup: `anomaly:${critical[0].eventId}`,
      eventIds: [critical[0].eventId],
      categories: [critical[0].category]
    });
  }

  const categoriesPresent = new Set(approved.map((e) => String(e.category).toLowerCase()));
  for (const [a, b] of CROSS_DOMAIN_PAIRS) {
    if (categoriesPresent.has(a) && categoriesPresent.has(b)) {
      const ids = approved
        .filter((e) => {
          const c = String(e.category).toLowerCase();
          return c === a || c === b;
        })
        .slice(-6)
        .map((e) => e.eventId);
      correlations.push({
        kind: 'cross_domain',
        correlationGroup: `cross:${a}+${b}`,
        eventIds: ids,
        domains: [a, b]
      });
    }
  }

  return correlations;
}

module.exports = {
  CORRELATION_KINDS,
  CROSS_DOMAIN_PAIRS,
  detectCorrelations
};
