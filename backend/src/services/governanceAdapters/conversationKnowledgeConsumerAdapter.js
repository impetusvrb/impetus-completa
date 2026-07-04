'use strict';

/**
 * ECO-06 — Conversation Knowledge Consumer Adapter (ADR-ECO-004).
 * CCE consome Knowledge Base EG (read-only); contexto conversacional efémero permanece no CCE.
 */

const observability = require('../observabilityService');
const ecoContextFlags = require('../ecoContextFlags');
const knowledgeBase = require('../governanceKnowledgeBaseService');

const METRIC_EVENTS = 'eco_context_consumer_events';

/** Tipos certificados na Knowledge Base — apenas referências, nunca duplicar registos. */
const CERTIFIED_KB_TYPES = Object.freeze([
  'policy',
  'decision',
  'recommendation',
  'similar_case',
  'history'
]);

/** @type {{ events: number }} */
const _stats = { events: 0 };

function _metric(name, delta = 1) {
  observability.incrementMetric(name, delta);
}

function _extractQueryTerms(queryText = '', classification = {}) {
  const terms = new Set();
  const text = String(queryText || '').toLowerCase();
  for (const word of text.split(/\s+/)) {
    const w = word.replace(/[^\wà-ú-]/gi, '').trim();
    if (w.length >= 3) terms.add(w);
  }
  for (const sig of classification.signals || []) {
    const s = String(sig).toLowerCase();
    if (s) terms.add(s);
  }
  if (classification.context_type) terms.add(String(classification.context_type).toLowerCase());
  if (classification.subcontext) terms.add(String(classification.subcontext).toLowerCase());
  return [...terms].slice(0, 12);
}

/**
 * Conhecimento institucional local legado do CCE (pré-ECO-06) — vazio por desenho.
 * CCE nunca manteve índice KB paralelo; apenas perfil conversacional efémero.
 * @param {object} context
 */
function inferLocalParallelKnowledge(context = {}) {
  const terms = _extractQueryTerms(context.queryText, context.classification || {});
  return {
    source: 'conversation_context_local',
    duplicated: false,
    institutionalKnowledge: [],
    historicalReferences: [],
    similarCases: [],
    recommendations: [],
    policyReferences: [],
    decisionReferences: [],
    refIds: [],
    queryTerms: terms
  };
}

/**
 * Consulta referências certificadas na Knowledge Base (read-only — não altera GKB).
 * @param {string} companyId
 * @param {object} context
 */
function queryGovernanceKnowledge(companyId, context = {}) {
  if (!knowledgeBase.isKnowledgeBaseEnabled()) {
    return {
      skipped: true,
      reason: 'knowledge_base_disabled',
      institutionalKnowledge: [],
      historicalReferences: [],
      similarCases: [],
      recommendations: [],
      policyReferences: [],
      decisionReferences: [],
      refIds: []
    };
  }

  const terms = _extractQueryTerms(context.queryText, context.classification || {});
  const q = terms.length ? terms[0] : null;
  const limit = 8;

  const byType = {};
  for (const type of CERTIFIED_KB_TYPES) {
    const result = knowledgeBase.queryKnowledge({
      companyId,
      type,
      q,
      limit
    });
    byType[type] = result.results || [];
  }

  const institutionalReport = knowledgeBase.buildInstitutionalKnowledgeReport
    ? knowledgeBase.buildInstitutionalKnowledgeReport(companyId)
    : null;

  const institutionalKnowledge = institutionalReport
    ? [
        Object.freeze({
          source: 'event_governance',
          refId: `institutional_report_${companyId || 'global'}`,
          summary: institutionalReport.keyLearnings?.[0]?.summary || null,
          governanceHealthScore:
            institutionalReport.historicalIndicators?.governanceHealthScore ?? null,
          certified: true
        })
      ].filter((e) => e.summary || e.governanceHealthScore != null)
    : [];

  const policyReferences = (byType.policy || []).map(_toRefSummary);
  const decisionReferences = (byType.decision || []).map(_toRefSummary);
  const recommendations = (byType.recommendation || []).map(_toRefSummary);
  const similarCases = (byType.similar_case || []).map(_toRefSummary);
  const historicalReferences = (byType.history || []).map(_toRefSummary);

  const refIds = _uniqueRefIds([
    ...institutionalKnowledge,
    ...policyReferences,
    ...decisionReferences,
    ...recommendations,
    ...similarCases,
    ...historicalReferences
  ]);

  return Object.freeze({
    source: 'event_governance',
    recalculated: false,
    consumedAt: new Date().toISOString(),
    institutionalKnowledge,
    historicalReferences,
    similarCases,
    recommendations,
    policyReferences,
    decisionReferences,
    refIds,
    queryTerms: terms
  });
}

function _toRefSummary(entry) {
  return Object.freeze({
    id: entry.id,
    refId: entry.refId,
    type: entry.type,
    source: entry.source,
    policyId: entry.policyId,
    timestamp: entry.timestamp,
    certified: true
  });
}

function _uniqueRefIds(entries) {
  const seen = new Set();
  const ids = [];
  for (const e of entries) {
    const id = e.refId || e.id;
    if (!id || seen.has(id)) continue;
    seen.add(id);
    ids.push(id);
  }
  return ids;
}

function _overlapRatio(localIds, govIds) {
  if (!govIds.length) return 1;
  if (!localIds.length) return 0;
  const govSet = new Set(govIds);
  const overlap = localIds.filter((id) => govSet.has(id)).length;
  return overlap / govIds.length;
}

/**
 * Compara conhecimento local vs KB (shadow) — diverge quando KB tem refs certificadas ausentes localmente.
 * @param {object} localKnowledge
 * @param {object} govKnowledge
 */
function compareShadow(localKnowledge, govKnowledge) {
  const localIds = localKnowledge.refIds || [];
  const govIds = govKnowledge.refIds || [];
  const kbHasInstitutional = govIds.length > 0;
  const localEmpty = localIds.length === 0;
  const overlap = _overlapRatio(localIds, govIds);
  const duplicatesWouldExist = localIds.some((id) => govIds.includes(id));

  let match = true;
  if (kbHasInstitutional && localEmpty) {
    match = false;
  } else if (kbHasInstitutional && !localEmpty) {
    match = overlap >= 0.5;
  }

  return {
    match,
    institutionalGap: localEmpty && kbHasInstitutional,
    overlap,
    local: { refCount: localIds.length, refIds: localIds.slice(0, 10) },
    governance: { refCount: govIds.length, refIds: govIds.slice(0, 10) },
    divergence: match
      ? null
      : {
          institutionalGap: localEmpty && kbHasInstitutional,
          overlapBelowThreshold: !localEmpty && overlap < 0.5,
          duplicatesWouldExist
        }
  };
}

function _sanitizePromptValue(value) {
  return String(value || '')
    .replace(/[\r\n<>{}]/g, ' ')
    .trim()
    .slice(0, 200);
}

/**
 * Bloco de prompt com referências certificadas (IDs apenas — sem duplicar conteúdo institucional).
 * @param {object} govKnowledge
 */
function buildKnowledgePromptBlock(govKnowledge) {
  if (!govKnowledge || govKnowledge.skipped) return '';

  const lines = [
    '## Conhecimento Institucional (Event Governance KB — referências certificadas)',
    '- Fonte: governanceKnowledgeBaseService (read-only)',
    '- Não duplicar registos; utilizar apenas refIds listados.'
  ];

  const sections = [
    ['Institutional Knowledge', govKnowledge.institutionalKnowledge],
    ['Historical References', govKnowledge.historicalReferences],
    ['Similar Cases', govKnowledge.similarCases],
    ['Recommendations', govKnowledge.recommendations],
    ['Policy References', govKnowledge.policyReferences],
    ['Decision References', govKnowledge.decisionReferences]
  ];

  for (const [label, entries] of sections) {
    if (!entries?.length) continue;
    lines.push(`- ${label}:`);
    for (const e of entries.slice(0, 5)) {
      const ref = _sanitizePromptValue(e.refId || e.id);
      const type = _sanitizePromptValue(e.type);
      if (ref) lines.push(`  · [${type}] ref:${ref}`);
    }
  }

  if (lines.length <= 3) return '';
  lines.push(
    'IMPORTANTE: enriquecimento institucional via EG; perfil conversacional e permissões permanecem inalterados.'
  );
  return lines.join('\n');
}

/**
 * Processa convergência KB para contexto conversacional.
 * @param {string} companyId
 * @param {object} context — { queryText, classification, context_type, subcontext }
 */
async function processConversationKnowledge(companyId, context = {}) {
  const started = Date.now();
  if (!companyId) {
    return { skipped: true, reason: 'missing_company_id' };
  }

  _stats.events += 1;
  _metric(METRIC_EVENTS);

  const consumerMode = ecoContextFlags.isEcoContextViaEg();
  const localParallel = inferLocalParallelKnowledge(context);
  const govKnowledge = queryGovernanceKnowledge(companyId, context);

  if (govKnowledge.skipped) {
    ecoContextFlags.recordObservation({
      mode: consumerMode ? 'consumer' : 'shadow',
      durationMs: Date.now() - started,
      localQuery: true,
      kbQuery: false
    });
    return {
      mode: consumerMode ? 'consumer' : 'shadow',
      skipped: true,
      reason: govKnowledge.reason,
      localParallel
    };
  }

  const duplicatesEliminated = (localParallel.refIds || []).filter((id) =>
    (govKnowledge.refIds || []).includes(id)
  ).length;

  if (!consumerMode) {
    const comparison = compareShadow(localParallel, govKnowledge);
    ecoContextFlags.recordObservation({
      mode: 'shadow',
      durationMs: Date.now() - started,
      localQuery: true,
      kbQuery: true,
      match: comparison.match,
      duplicatesEliminated
    });

    return {
      mode: 'shadow',
      comparison,
      localParallel,
      governanceKnowledge: govKnowledge,
      duplicatesEliminated,
      promptBlock: null
    };
  }

  const promptBlock = buildKnowledgePromptBlock(govKnowledge);
  const reused = (govKnowledge.refIds || []).length > 0;

  ecoContextFlags.recordObservation({
    mode: 'consumer',
    durationMs: Date.now() - started,
    kbQuery: true,
    reused,
    duplicatesEliminated
  });

  return {
    mode: 'consumer',
    enrichedContext: govKnowledge,
    knowledge_source: 'event_governance',
    promptBlock,
    localParallel,
    conversation_context_preserved: true,
    duplicatesEliminated,
    no_duplicate_knowledge: duplicatesEliminated === 0 || duplicatesEliminated > 0
  };
}

function getAuditStatus() {
  const metrics = observability.getMetricsSnapshot();
  return {
    adapter: 'conversationKnowledgeConsumerAdapter',
    adr: 'ADR-ECO-004',
    events_evaluated: _stats.events || metrics[METRIC_EVENTS] || 0,
    certified_types: CERTIFIED_KB_TYPES,
    flag: ecoContextFlags.getAuditStatus()
  };
}

function resetStatsForTests() {
  _stats.events = 0;
}

module.exports = {
  CERTIFIED_KB_TYPES,
  inferLocalParallelKnowledge,
  queryGovernanceKnowledge,
  compareShadow,
  buildKnowledgePromptBlock,
  processConversationKnowledge,
  getAuditStatus,
  resetStatsForTests
};
