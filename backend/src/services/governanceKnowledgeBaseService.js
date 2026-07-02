'use strict';

/**
 * EVENT-GOVERNANCE-19 — Governance Knowledge Base (GKB).
 * Consolida conhecimento institucional por referências — nunca altera o motor ou pipeline.
 */

const observability = require('./observabilityService');
const {
  buildGovernanceKnowledgeBaseDto,
  buildInstitutionalKnowledgeReportDto
} = require('../governance/governanceKnowledgeBaseDto');

const METRIC_QUERIES = 'event_governance_knowledge_queries';
const METRIC_REPORTS = 'event_governance_knowledge_reports_generated';
const METRIC_INDEX = 'event_governance_knowledge_index_updates';
const METRIC_STATISTICS = 'event_governance_knowledge_statistics_generated';
const METRIC_ERRORS = 'event_governance_knowledge_errors';

const INDEX_TYPES = new Set([
  'policy',
  'decision',
  'evidence',
  'trend',
  'recommendation',
  'similar_case',
  'history',
  'audit'
]);

/** @type {Map<string, object[]>} companyId -> index entries (referências) */
const _indexByCompany = new Map();
/** @type {{ queries: number, reports: number, indexUpdates: number, errors: number, lastIndexAt: string|null }} */
const _stats = { queries: 0, reports: 0, indexUpdates: 0, errors: 0, lastIndexAt: null };

function isKnowledgeBaseEnabled() {
  return String(process.env.EVENT_GOVERNANCE_KNOWLEDGE_BASE || '').toLowerCase() === 'true';
}

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _safeRequire(relPath) {
  try {
    return require(relPath);
  } catch {
    return null;
  }
}

function _normalizeKeywords(values) {
  const set = new Set();
  for (const v of values) {
    if (v == null) continue;
    const s = String(v).toLowerCase().trim();
    if (s) set.add(s);
  }
  return [...set];
}

function _entry(id, type, source, refId, companyId, policyId, keywords, metadata, timestamp) {
  return Object.freeze({
    id,
    type,
    source,
    refId,
    companyId: companyId || null,
    policyId: policyId || null,
    keywords: Object.freeze(_normalizeKeywords(keywords)),
    metadata: Object.freeze(metadata || {}),
    timestamp: timestamp || new Date().toISOString()
  });
}

function _indexLearning(companyId, entries) {
  const learning = _safeRequire('./governanceLearningService');
  if (!learning) return;

  const records =
    companyId && typeof learning.getAllRecordsForCompany === 'function'
      ? learning.getAllRecordsForCompany(companyId)
      : [];

  for (const rec of records) {
    entries.push(
      _entry(
        `kb_learning_${rec.eventId || rec.feedbackId || entries.length}`,
        'decision',
        'learning',
        rec.eventId || rec.feedbackId,
        rec.companyId || companyId,
        rec.policyId,
        [rec.policyId, rec.feedbackType, rec.outcome, rec.sourceModule, rec.severity],
        { feedbackType: rec.feedbackType, outcome: rec.outcome },
        rec.timestamp
      )
    );
  }

  const status = typeof learning.getAuditStatus === 'function' ? learning.getAuditStatus() : {};
  entries.push(
    _entry(
      `kb_learning_audit_${companyId || 'global'}`,
      'audit',
      'learning',
      'learning_audit',
      companyId,
      null,
      ['learning', 'audit', 'outcome', 'false_positive'],
      {
        records_buffered: status.records_buffered ?? 0,
        learning_events: status.learning_events ?? 0
      }
    )
  );
}

function _indexMemory(companyId, entries) {
  const memory = _safeRequire('./governanceOperationalMemoryService');
  if (!memory) return;

  const memEntries =
    companyId && typeof memory.getEntries === 'function' ? memory.getEntries(companyId) : [];

  for (const entry of memEntries) {
    entries.push(
      _entry(
        `kb_memory_${entry.eventId || entry.id || entries.length}`,
        'similar_case',
        'memory',
        entry.eventId || entry.id,
        companyId,
        entry.policyId,
        [entry.eventType, entry.category, entry.policyId, entry.severity, entry.sourceModule],
        { recurrenceCount: entry.recurrenceCount ?? 0, similarityRef: true },
        entry.timestamp || entry.registeredAt
      )
    );
  }

  const patterns = typeof memory.getTopPatterns === 'function' ? memory.getTopPatterns(10) : [];
  for (const p of patterns) {
    entries.push(
      _entry(
        `kb_pattern_${p.key || p.patternId || entries.length}`,
        'history',
        'memory',
        p.key || p.patternId,
        companyId,
        p.policyId,
        [p.category, p.eventType, p.policyId, 'pattern'],
        { count: p.count ?? 0 },
        p.lastSeen
      )
    );
  }
}

function _indexExplainability(companyId, entries) {
  const explainability = _safeRequire('./governanceExplainabilityService');
  if (!explainability || typeof explainability.getRecentTraces !== 'function') return;

  for (const trace of explainability.getRecentTraces(50)) {
    if (companyId && trace.companyId && String(trace.companyId) !== String(companyId)) continue;
    entries.push(
      _entry(
        `kb_explain_${trace.explainabilityId || trace.eventId}`,
        'evidence',
        'explainability',
        trace.explainabilityId || trace.eventId,
        trace.companyId || companyId,
        trace.decisionTrace?.policyId,
        [trace.eventId, 'explainability', trace.decisionTrace?.policyId, 'evidence'],
        { explainabilityScore: trace.explainabilityScore ?? null },
        trace.timestamp
      )
    );
  }
}

function _indexIntelligence(companyId, entries) {
  const intelligence = _safeRequire('./governanceIntelligenceService');
  if (!intelligence) return;

  const snapshots =
    typeof intelligence.getSnapshots === 'function' ? intelligence.getSnapshots(companyId) : [];

  for (const snap of snapshots) {
    entries.push(
      _entry(
        `kb_intel_decision_${snap.eventId}`,
        'decision',
        'intelligence',
        snap.eventId,
        snap.companyId || companyId,
        snap.policyId,
        [snap.eventType, snap.category, snap.policyId, snap.severity, 'decision'],
        { success: snap.success, confidence: snap.confidence },
        snap.timestamp
      )
    );
  }

  const improvement =
    typeof intelligence.buildImprovementReport === 'function'
      ? intelligence.buildImprovementReport(companyId)
      : null;

  for (const trend of improvement?.trends || []) {
    entries.push(
      _entry(
        `kb_intel_trend_${trend.metric}`,
        'trend',
        'intelligence',
        trend.metric,
        companyId,
        null,
        [trend.metric, trend.direction, 'trend'],
        { delta: trend.delta, direction: trend.direction }
      )
    );
  }

  const recs =
    typeof intelligence.getOpenRecommendations === 'function'
      ? intelligence.getOpenRecommendations()
      : improvement?.recommendations || [];

  for (const rec of recs) {
    entries.push(
      _entry(
        `kb_intel_rec_${rec.id}`,
        'recommendation',
        'intelligence',
        rec.id,
        companyId,
        rec.policyId,
        [rec.type, rec.policyId, 'recommendation'],
        { severity: rec.severity, actionable: false },
        rec.timestamp
      )
    );
  }
}

function _indexPolicyOptimization(companyId, entries) {
  const policyOpt = _safeRequire('./governancePolicyOptimizationService');
  if (!policyOpt || typeof policyOpt.buildOptimizationReport !== 'function') return;

  const report = policyOpt.buildOptimizationReport(companyId);

  for (const pa of report.policyAnalytics || []) {
    entries.push(
      _entry(
        `kb_policy_${pa.policyId}`,
        'policy',
        'policy_optimization',
        pa.policyId,
        companyId,
        pa.policyId,
        [pa.policyId, 'policy', 'analytics'],
        {
          usageFrequency: pa.usageFrequency,
          policyEffectivenessScore: pa.policyEffectivenessScore ?? null
        }
      )
    );
  }

  for (const rec of report.recommendations || []) {
    entries.push(
      _entry(
        `kb_opt_rec_${rec.id}`,
        'recommendation',
        'policy_optimization',
        rec.id,
        companyId,
        rec.policyId,
        [rec.type, rec.policyId, 'optimization'],
        { actionable: false },
        rec.timestamp
      )
    );
  }

  for (const c of report.conflicts || []) {
    entries.push(
      _entry(
        `kb_conflict_${c.policyA}_${c.policyB}`,
        'audit',
        'policy_optimization',
        `${c.policyA}_${c.policyB}`,
        companyId,
        c.policyA,
        [c.policyA, c.policyB, 'conflict'],
        { reason: c.reason, severity: c.severity }
      )
    );
  }
}

function _indexExecutive(companyId, entries) {
  const executive = _safeRequire('./governanceExecutiveInsightsService');
  if (!executive) return;

  if (typeof executive.buildExecutiveSummary === 'function') {
    const summary = executive.buildExecutiveSummary(companyId);
    entries.push(
      _entry(
        `kb_exec_summary_${companyId || 'global'}`,
        'history',
        'executive_insights',
        'executive_summary',
        companyId,
        null,
        ['executive', 'summary', 'governance', summary.headline],
        {
          governanceEvolutionTrend: summary.historicalEvolution?.governanceEvolutionTrend
        },
        summary.generatedAt
      )
    );

    for (const risk of summary.risks || []) {
      entries.push(
        _entry(
          `kb_exec_risk_${risk.id}`,
          'audit',
          'executive_insights',
          risk.id,
          companyId,
          null,
          [risk.category, risk.severity, 'risk'],
          { message: risk.message },
          summary.generatedAt
        )
      );
    }
  }
}

/**
 * Reconstrói índice de referências (sem duplicar payloads completos).
 * @param {string} [companyId]
 */
function rebuildKnowledgeIndex(companyId) {
  if (!isKnowledgeBaseEnabled()) {
    return { updated: false, entries: [] };
  }

  const key = String(companyId || 'global');
  const entries = [];

  _indexLearning(companyId, entries);
  _indexMemory(companyId, entries);
  _indexExplainability(companyId, entries);
  _indexIntelligence(companyId, entries);
  _indexPolicyOptimization(companyId, entries);
  _indexExecutive(companyId, entries);

  _indexByCompany.set(key, entries);
  _stats.indexUpdates += 1;
  _stats.lastIndexAt = new Date().toISOString();
  _metric(METRIC_INDEX);

  return { updated: true, entries: [...entries], entryCount: entries.length };
}

function _getIndex(companyId) {
  const key = String(companyId || 'global');
  return _indexByCompany.get(key) || [];
}

/**
 * Pesquisa determinística no índice.
 * @param {object} [query]
 */
function queryKnowledge(query = {}) {
  if (!isKnowledgeBaseEnabled()) {
    return { results: [], total: 0, skipped: true };
  }

  _stats.queries += 1;
  _metric(METRIC_QUERIES);

  const companyId = query.companyId || null;
  let entries = _getIndex(companyId);

  if (!entries.length && companyId) {
    rebuildKnowledgeIndex(companyId);
    entries = _getIndex(companyId);
  }

  const type = query.type ? String(query.type).toLowerCase() : null;
  const policyId = query.policyId ? String(query.policyId) : null;
  const source = query.source ? String(query.source).toLowerCase() : null;
  const q = query.q ? String(query.q).toLowerCase().trim() : null;
  const limit = Math.max(1, Math.min(100, parseInt(String(query.limit || '25'), 10) || 25));

  let filtered = entries;

  if (type && INDEX_TYPES.has(type)) {
    filtered = filtered.filter((e) => e.type === type);
  }
  if (policyId) {
    filtered = filtered.filter((e) => e.policyId === policyId);
  }
  if (source) {
    filtered = filtered.filter((e) => e.source === source);
  }
  if (q) {
    filtered = filtered.filter(
      (e) =>
        e.keywords.some((k) => k.includes(q)) ||
        String(e.refId || '').toLowerCase().includes(q) ||
        String(e.id).toLowerCase().includes(q)
    );
  }

  filtered = filtered.slice(0, limit);

  return Object.freeze({
    results: filtered,
    total: filtered.length,
    query: Object.freeze({ companyId, type, policyId, source, q, limit })
  });
}

/**
 * Referências cruzadas por policyId ou refId.
 * @param {string} [companyId]
 * @param {object} [opts]
 */
function buildCrossReferences(companyId, opts = {}) {
  const entries = _getIndex(companyId);
  const policyId = opts.policyId || null;
  const refId = opts.refId || null;

  const related = entries.filter((e) => {
    if (policyId && e.policyId === policyId) return true;
    if (refId && (e.refId === refId || e.id === refId)) return true;
    return false;
  });

  const byType = {};
  for (const e of related) {
    byType[e.type] = (byType[e.type] || 0) + 1;
  }

  return related.map((e) =>
    Object.freeze({
      id: e.id,
      type: e.type,
      source: e.source,
      refId: e.refId,
      policyId: e.policyId,
      relatedTypes: Object.freeze({ ...byType })
    })
  );
}

/**
 * Estatísticas do índice institucional.
 * @param {string} [companyId]
 */
function getKnowledgeStatistics(companyId) {
  if (!isKnowledgeBaseEnabled()) {
    return { available: false };
  }

  const entries = _getIndex(companyId);
  const byType = {};
  const bySource = {};

  for (const e of entries) {
    byType[e.type] = (byType[e.type] || 0) + 1;
    bySource[e.source] = (bySource[e.source] || 0) + 1;
  }

  _metric(METRIC_STATISTICS);

  return Object.freeze({
    available: true,
    entryCount: entries.length,
    byType: Object.freeze({ ...byType }),
    bySource: Object.freeze({ ...bySource }),
    lastIndexAt: _stats.lastIndexAt,
    indexTypes: Object.freeze([...INDEX_TYPES])
  });
}

/**
 * Relatório institucional estruturado (sem IA generativa).
 * @param {string} [companyId]
 */
function buildInstitutionalKnowledgeReport(companyId) {
  const indexResult = rebuildKnowledgeIndex(companyId);
  const entries = indexResult.entries || [];
  const statistics = getKnowledgeStatistics(companyId);

  const learning = _safeRequire('./governanceLearningService');
  const memory = _safeRequire('./governanceOperationalMemoryService');
  const executive = _safeRequire('./governanceExecutiveInsightsService');
  const intelligence = _safeRequire('./governanceIntelligenceService');

  const learningRecords =
    companyId && learning?.getAllRecordsForCompany
      ? learning.getAllRecordsForCompany(companyId)
      : [];

  const keyLearnings = [];
  const outcomes = { success: 0, failure: 0 };
  for (const rec of learningRecords) {
    if (rec.outcome === 'success') outcomes.success += 1;
    else if (rec.outcome === 'failure') outcomes.failure += 1;
  }
  if (learningRecords.length) {
    keyLearnings.push({
      source: 'learning',
      summary: `${learningRecords.length} registo(s) de aprendizagem — ${outcomes.success} sucesso(s), ${outcomes.failure} falha(s).`,
      refCount: learningRecords.length
    });
  }

  const patterns = memory?.getTopPatterns ? memory.getTopPatterns(5) : [];
  const recurringPatterns = patterns.map((p) =>
    Object.freeze({
      source: 'memory',
      patternKey: p.key || p.patternId,
      category: p.category,
      count: p.count ?? 0,
      policyId: p.policyId ?? null
    })
  );

  const improvement = intelligence?.buildImprovementReport
    ? intelligence.buildImprovementReport(companyId)
    : null;
  const execSummary = executive?.buildExecutiveSummary
    ? executive.buildExecutiveSummary(companyId)
    : null;

  const crossReferences = buildCrossReferences(companyId);

  return buildInstitutionalKnowledgeReportDto({
    companyId: companyId || null,
    consolidatedHistory: Object.freeze({
      indexEntries: entries.length,
      snapshotsAnalyzed: improvement?.analytics?.sampleSize ?? 0,
      reportsIndexed: statistics.bySource || {}
    }),
    governanceEvolution: Object.freeze({
      governanceHealthScore: improvement?.governanceHealthScore ?? null,
      governanceEvolutionTrend:
        execSummary?.historicalEvolution?.governanceEvolutionTrend ?? 'stable',
      trends: improvement?.trends ?? []
    }),
    keyLearnings: Object.freeze(keyLearnings),
    recurringPatterns: Object.freeze(recurringPatterns),
    historicalIndicators: Object.freeze({
      governanceHealthScore: improvement?.governanceHealthScore ?? null,
      governanceMaturityIndex: execSummary?.mainIndicators?.governanceMaturityIndex ?? null,
      resolutionRate: execSummary?.mainIndicators?.resolutionRate ?? null,
      falsePositiveRate: improvement?.analytics?.falsePositiveRate ?? null
    }),
    crossReferences: Object.freeze(crossReferences.slice(0, 50))
  });
}

/**
 * Relatório completo da GKB.
 * @param {string} [companyId]
 */
function generateKnowledgeReport(companyId) {
  if (!isKnowledgeBaseEnabled()) {
    return { mode: 'shadow', skipped: true };
  }

  try {
    const institutionalReport = buildInstitutionalKnowledgeReport(companyId);
    const statistics = getKnowledgeStatistics(companyId);
    const index = _getIndex(companyId);
    const crossReferences = buildCrossReferences(companyId);

    const dto = buildGovernanceKnowledgeBaseDto({
      companyId: companyId || null,
      index: index.slice(0, 100),
      statistics,
      crossReferences: crossReferences.slice(0, 50),
      institutionalReport
    });

    _stats.reports += 1;
    _metric(METRIC_REPORTS);

    return Object.freeze({
      mode: 'knowledge_base',
      report: Object.freeze({
        generatedAt: new Date().toISOString(),
        companyId: companyId || null,
        dto,
        institutionalReport,
        statistics,
        indexSummary: Object.freeze({
          totalEntries: index.length,
          byType: statistics.byType,
          bySource: statistics.bySource
        })
      })
    });
  } catch (err) {
    _stats.errors += 1;
    _metric(METRIC_ERRORS);
    console.warn('[governanceKnowledgeBaseService][generate]', err?.message ?? err);
    return { mode: 'error', error: err?.message };
  }
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  let totalEntries = 0;
  for (const list of _indexByCompany.values()) totalEntries += list.length;

  return {
    enabled: isKnowledgeBaseEnabled(),
    knowledge_queries: _stats.queries || metrics[METRIC_QUERIES] || 0,
    knowledge_reports_generated: _stats.reports || metrics[METRIC_REPORTS] || 0,
    knowledge_index_updates: _stats.indexUpdates || metrics[METRIC_INDEX] || 0,
    knowledge_statistics_generated: metrics[METRIC_STATISTICS] || 0,
    knowledge_errors: _stats.errors || metrics[METRIC_ERRORS] || 0,
    last_index_at: _stats.lastIndexAt,
    indexed_companies: _indexByCompany.size,
    total_index_entries: totalEntries
  };
}

function resetForTests() {
  _indexByCompany.clear();
  _stats.queries = 0;
  _stats.reports = 0;
  _stats.indexUpdates = 0;
  _stats.errors = 0;
  _stats.lastIndexAt = null;
}

module.exports = {
  isKnowledgeBaseEnabled,
  rebuildKnowledgeIndex,
  queryKnowledge,
  buildCrossReferences,
  getKnowledgeStatistics,
  buildInstitutionalKnowledgeReport,
  generateKnowledgeReport,
  getAuditStatus,
  resetForTests,
  INDEX_TYPES,
  METRIC_QUERIES,
  METRIC_REPORTS,
  METRIC_INDEX,
  METRIC_STATISTICS,
  METRIC_ERRORS
};
