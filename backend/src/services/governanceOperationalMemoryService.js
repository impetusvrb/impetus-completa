'use strict';

/**
 * EVENT-GOVERNANCE-14 — memória operacional governada (organiza conhecimento do Learning).
 * Não substitui governanceLearningService — apenas indexa e consulta experiência acumulada.
 */

const crypto = require('crypto');
const observability = require('./observabilityService');

const METRIC_MEMORY_STORED = 'event_governance_memory_stored';
const METRIC_PATTERN_UPDATED = 'event_governance_memory_patterns';

const MAX_ENTRIES_PER_COMPANY = Math.max(
  100,
  parseInt(String(process.env.GOVERNANCE_MEMORY_MAX_ENTRIES || '1000'), 10) || 1000
);

/** @type {Map<string, object[]>} */
const _memoryByCompany = new Map();
/** @type {Map<string, object>} pattern key → aggregate */
const _patterns = new Map();

function isMemoryEnabled() {
  return String(process.env.EVENT_GOVERNANCE_MEMORY || '').toLowerCase() === 'true';
}

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _extractContext(payload = {}) {
  return {
    equipment: payload.equipment || payload.equipamento || payload.assetId || null,
    sector: payload.sector || payload.setor || payload.functional_area || null,
    tags: Array.isArray(payload.tags)
      ? payload.tags.map(String)
      : payload.tag
        ? [String(payload.tag)]
        : [],
    origin: payload.origin || payload.source || payload.originatedFrom || null
  };
}

function _patternKey(entry) {
  return [
    entry.companyId,
    entry.eventType,
    entry.category,
    entry.policyId,
    entry.context?.equipment || '',
    entry.context?.sector || ''
  ].join('|');
}

/**
 * Regista decisão consolidada na memória operacional.
 * @param {object} params
 */
function registerDecision(params) {
  const entry = Object.freeze({
    memoryId: params.memoryId || crypto.randomUUID(),
    companyId: params.companyId,
    eventId: params.eventId || crypto.randomUUID(),
    eventType: String(params.eventType || 'unknown'),
    category: String(params.category || 'general'),
    severity: String(params.severity || 'medium'),
    policyId: String(params.policyId || 'UNMATCHED'),
    sourceModule: String(params.sourceModule || 'unknown'),
    context: _extractContext(params.payload || params.context || {}),
    resolved: params.resolved === true,
    resolutionTimeMs: Number.isFinite(params.resolutionTimeMs) ? params.resolutionTimeMs : null,
    falsePositive: params.falsePositive === true,
    recurrenceCount: Number(params.recurrenceCount) || 1,
    confidenceAtTime: Number.isFinite(params.confidenceAtTime) ? params.confidenceAtTime : null,
    timestamp: params.timestamp || new Date().toISOString()
  });

  if (!entry.companyId) return { stored: false, reason: 'missing_companyId' };

  if (!isMemoryEnabled()) {
    return { stored: false, shadow: true, entry };
  }

  const key = String(entry.companyId);
  const list = _memoryByCompany.get(key) || [];
  list.push(entry);
  while (list.length > MAX_ENTRIES_PER_COMPANY) list.shift();
  _memoryByCompany.set(key, list);

  _updatePattern(entry);
  _metric(METRIC_MEMORY_STORED);

  return { stored: true, entry };
}

function registerResolution(params) {
  return registerDecision({
    ...params,
    resolved: true,
    resolutionTimeMs: params.resolutionTimeMs ?? params.elapsedMs ?? null
  });
}

function registerRecurrence(params) {
  const existing = findSimilarCases(params.companyId, params, { limit: 1 });
  const count = (existing[0]?.recurrenceCount || 0) + 1;
  return registerDecision({ ...params, recurrenceCount: count });
}

function registerOperationalContext(params) {
  return registerDecision(params);
}

function _updatePattern(entry) {
  const pk = _patternKey(entry);
  const prev = _patterns.get(pk) || {
    patternKey: pk,
    eventType: entry.eventType,
    category: entry.category,
    policyId: entry.policyId,
    count: 0,
    resolvedCount: 0,
    falsePositiveCount: 0,
    totalResolutionMs: 0,
    resolutionSamples: 0
  };

  prev.count += 1;
  if (entry.resolved) {
    prev.resolvedCount += 1;
    if (entry.resolutionTimeMs != null) {
      prev.totalResolutionMs += entry.resolutionTimeMs;
      prev.resolutionSamples += 1;
    }
  }
  if (entry.falsePositive) prev.falsePositiveCount += 1;

  _patterns.set(pk, prev);
  _metric(METRIC_PATTERN_UPDATED);
}

function _similarityScore(query, entry) {
  let score = 0;
  if (query.eventType && entry.eventType === query.eventType) score += 4;
  if (query.category && entry.category === query.category) score += 2;
  if (query.policyId && entry.policyId === query.policyId) score += 2;
  if (query.sourceModule && entry.sourceModule === query.sourceModule) score += 1;
  if (query.severity && entry.severity === query.severity) score += 1;

  const qCtx = query.context || _extractContext(query.payload || {});
  const eCtx = entry.context || {};

  if (qCtx.equipment && eCtx.equipment && qCtx.equipment === eCtx.equipment) score += 2;
  if (qCtx.sector && eCtx.sector && qCtx.sector === eCtx.sector) score += 1;
  if (qCtx.origin && eCtx.origin && qCtx.origin === eCtx.origin) score += 1;

  const qTags = new Set(qCtx.tags || []);
  for (const t of eCtx.tags || []) {
    if (qTags.has(t)) score += 1;
  }

  if (entry.recurrenceCount > 1) score += 0.5;

  return score;
}

/**
 * Consulta eventos semelhantes (similaridade determinística, sem IA generativa).
 * @param {string} companyId
 * @param {object} query
 * @param {object} [opts]
 */
function findSimilarCases(companyId, query, opts = {}) {
  const limit = Math.max(1, opts.limit || 5);
  const minScore = opts.minScore ?? 2;
  const list = _memoryByCompany.get(String(companyId)) || [];

  const q = {
    eventType: query.eventType,
    category: query.category,
    policyId: query.policyId,
    sourceModule: query.sourceModule,
    severity: query.severity,
    context: query.context || _extractContext(query.payload || {})
  };

  const scored = list
    .map((entry) => ({ entry, score: _similarityScore(q, entry) }))
    .filter((s) => s.score >= minScore)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored.map((s) => ({ ...s.entry, similarityScore: s.score }));
}

function getEntries(companyId) {
  return [...(_memoryByCompany.get(String(companyId)) || [])];
}

function getTopPatterns(limit = 10) {
  return [..._patterns.values()]
    .sort((a, b) => b.count - a.count)
    .slice(0, limit);
}

function getMemoryStats() {
  let entries = 0;
  for (const list of _memoryByCompany.values()) entries += list.length;
  return {
    tenants: _memoryByCompany.size,
    entries_buffered: entries,
    patterns_tracked: _patterns.size
  };
}

function resetForTests() {
  _memoryByCompany.clear();
  _patterns.clear();
}

module.exports = {
  isMemoryEnabled,
  registerDecision,
  registerResolution,
  registerRecurrence,
  registerOperationalContext,
  findSimilarCases,
  getEntries,
  getTopPatterns,
  getMemoryStats,
  resetForTests,
  _extractContext,
  _similarityScore,
  METRIC_MEMORY_STORED,
  METRIC_PATTERN_UPDATED
};
