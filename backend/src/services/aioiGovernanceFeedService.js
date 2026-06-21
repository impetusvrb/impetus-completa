'use strict';

/**
 * EVENT-GOVERNANCE-12 — feed de eventos já governados para consumo AIOI.
 * Fonte exclusiva: Event Governance (não consulta produtores directamente).
 */

const crypto = require('crypto');
const { getPolicies } = require('../governance/eventPolicyCatalog');
const { normalizeSeverity } = require('../governance/severityNormalizer');

const MAX_EVENTS_PER_TENANT = Math.max(
  50,
  parseInt(String(process.env.AIOI_GOVERNANCE_FEED_MAX || '200'), 10) || 200
);

/** @type {Map<string, object[]>} */
const _feedByCompany = new Map();

function _normalizeGovernedRecord(event, governanceResult) {
  const evaluation = governanceResult?.evaluation || {};
  const decision = evaluation.decision || {};
  const payloadEsc = event.payload?.escalationLevel;
  const escalationLevel =
    Number.isFinite(payloadEsc) && payloadEsc >= 0
      ? payloadEsc
      : decision.escalationLevel ?? evaluation.escalationLevel ?? 0;

  return Object.freeze({
    eventId: decision.eventId || event.eventId || crypto.randomUUID(),
    companyId: event.companyId,
    eventType: String(event.eventType || 'unknown'),
    category: String(event.category || decision.category || 'general'),
    severity: normalizeSeverity(event.severity || decision.severity || 'medium'),
    policyId: evaluation.policyId || decision.policyId || null,
    escalationLevel,
    sourceModule: String(event.sourceModule || 'unknown'),
    channels: Array.isArray(decision.channels)
      ? [...decision.channels]
      : Array.isArray(evaluation.channels)
        ? [...evaluation.channels]
        : [],
    timestamp: decision.generatedAt || new Date().toISOString(),
    approved: evaluation.approved === true
  });
}

/**
 * Regista evento após passagem pelo Governance (chamado pelo pipeline EG-12).
 * @param {object} event
 * @param {object} governanceResult
 */
function recordGovernedEvent(event, governanceResult) {
  if (!event?.companyId) return null;

  const record = _normalizeGovernedRecord(event, governanceResult);
  const key = String(event.companyId);
  const list = _feedByCompany.get(key) || [];
  list.push(record);
  while (list.length > MAX_EVENTS_PER_TENANT) {
    list.shift();
  }
  _feedByCompany.set(key, list);
  return record;
}

/**
 * Eventos normalizados já governados — não consulta produtores.
 * @param {string} companyId
 * @param {object} [opts]
 * @returns {object[]}
 */
function getGovernedEvents(companyId, opts = {}) {
  if (!companyId) return [];

  const limit = Math.min(
    MAX_EVENTS_PER_TENANT,
    Math.max(1, parseInt(String(opts.limit || 50), 10) || 50)
  );
  const list = _feedByCompany.get(String(companyId)) || [];
  let filtered = list;

  if (opts.approvedOnly) {
    filtered = filtered.filter((e) => e.approved);
  }
  if (opts.category) {
    const cat = String(opts.category).toLowerCase();
    filtered = filtered.filter((e) => String(e.category).toLowerCase() === cat);
  }
  if (opts.since) {
    const sinceMs = new Date(opts.since).getTime();
    filtered = filtered.filter((e) => new Date(e.timestamp).getTime() >= sinceMs);
  }

  return filtered.slice(-limit);
}

/**
 * Metadados do catálogo de políticas (read-only).
 */
function getGovernanceCatalogSnapshot() {
  const policies = getPolicies();
  const severities = new Set();
  const channels = new Set();
  const escalationLevels = new Set();

  for (const p of policies) {
    for (const s of p.severities || []) severities.add(s);
    for (const c of p.channels || []) channels.add(c);
    if (Number.isFinite(p.escalationLevel)) escalationLevels.add(p.escalationLevel);
  }

  return {
    policies: policies.map((p) => ({
      id: p.id,
      category: p.category,
      eventTypes: p.eventTypes || [],
      sourceModules: p.sourceModules || [],
      channels: p.channels || [],
      escalationLevel: p.escalationLevel ?? 0
    })),
    severities: [...severities],
    channels: [...channels],
    escalationLevels: [...escalationLevels].sort((a, b) => a - b)
  };
}

function resetFeedForTests() {
  _feedByCompany.clear();
}

function getFeedStats() {
  let total = 0;
  for (const list of _feedByCompany.values()) total += list.length;
  return { tenants: _feedByCompany.size, events_buffered: total };
}

module.exports = {
  recordGovernedEvent,
  getGovernedEvents,
  getGovernanceCatalogSnapshot,
  resetFeedForTests,
  getFeedStats,
  MAX_EVENTS_PER_TENANT
};
