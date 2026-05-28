'use strict';

/**
 * Hallucination Detection V1 — Enterprise orchestrator
 *
 * Integra validadores existentes (contextual, structure, facts) + SZ5 cross-check,
 * contradiction detector, confidence scoring. Deny-first para bloqueio: OFF por defeito.
 *
 * Flags:
 *   IMPETUS_HALLUCINATION_DETECTION=off|shadow|audit|enforce
 *   IMPETUS_HALLUCINATION_BLOCK=off|on (default off — evita falsos positivos críticos)
 *   IMPETUS_HALLUCINATION_REVIEW_THRESHOLD=0.55
 *
 * Princípios: non-blocking, tenant-scoped, audit trail, no LLM calls (performance)
 */

const db = require('../db');
const contextualValidation = require('../ai/contextualResponseValidation');
const structureValidation = require('../ai/responseStructureValidation');
const cognitiveBudget = require('../cognitiveBudget/cognitiveBudgetContracts');

const LAYER = 'HALLUCINATION_DETECTION';

const SEVERITY = Object.freeze({
  INFO: 'INFO',
  WARNING: 'WARNING',
  HIGH: 'HIGH',
  CRITICAL: 'CRITICAL',
});

function _getMode() {
  const v = String(process.env.IMPETUS_HALLUCINATION_DETECTION || 'shadow').trim().toLowerCase();
  if (['off', 'shadow', 'audit', 'enforce'].includes(v)) return v;
  return 'shadow';
}

function _isBlockEnabled() {
  return String(process.env.IMPETUS_HALLUCINATION_BLOCK || 'off').trim().toLowerCase() === 'on';
}

function _reviewThreshold() {
  const v = parseFloat(process.env.IMPETUS_HALLUCINATION_REVIEW_THRESHOLD || '0.55');
  return Number.isFinite(v) && v > 0 && v < 1 ? v : 0.55;
}

function _log(event, data) {
  try {
    console.info('[HALLUCINATION_DETECTION]', JSON.stringify({
      _type: 'hallucination_detection',
      layer: LAYER,
      event,
      ts: new Date().toISOString(),
      mode: _getMode(),
      ...data,
    }));
  } catch { /* never throw */ }
}

function _extractAnswer(row) {
  const out = row.output_response || {};
  if (typeof out === 'string') return out;
  return String(out.answer || out.content || out.response || '');
}

function _extractContextualData(row) {
  const input = row.input_payload || {};
  if (typeof input === 'string') {
    try { return JSON.parse(input); } catch { return {}; }
  }
  return input.contextual_data || input.context || input;
}

/**
 * 1. Fact grounding — contextual + structure validators
 */
function _assessFactGrounding(answer, contextualData) {
  const ctxResult = contextualValidation.isResponseContextuallyValid(answer, contextualData);
  const structResult = structureValidation.validateResponseStructure(answer);

  const groundingScore = Math.min(1, (
    (ctxResult.valid ? 0.5 : 0) +
    (structResult.score / 6) * 0.5
  ));

  return {
    grounding_score: Number(groundingScore.toFixed(4)),
    contextual: ctxResult,
    structure: structResult,
    passed: ctxResult.valid && !structResult.needs_fallback,
  };
}

/**
 * 2. SZ5 cross-check — facts operacionais + memória (read-only, limitado)
 */
async function _assessSz5CrossCheck(answer, companyId, contextualData) {
  const indicators = [];
  let passed = true;
  let factsChecked = 0;

  const facts = [];
  if (contextualData?.prioritized_actions) {
    for (const a of contextualData.prioritized_actions.slice(0, 5)) {
      if (a?.machine_id) facts.push({ text: String(a.machine_id), source: 'operational_memory' });
    }
  }
  if (contextualData?.predictions) {
    for (const p of contextualData.predictions.slice(0, 5)) {
      if (p?.machine_id) facts.push({ text: String(p.machine_id), source: 'eventos_empresa' });
    }
  }

  for (const f of facts) {
    factsChecked++;
    const v = cognitiveBudget.validateFact(f);
    if (!v.ok) continue;
    const needle = String(v.fact.text).toLowerCase().slice(0, 8);
    if (needle.length >= 4 && !answer.toLowerCase().includes(needle)) {
      indicators.push('sz5_fact_not_reflected');
      passed = false;
    }
  }

  if (factsChecked === 0) {
    try {
      const r = await db.query(
        `SELECT COUNT(*)::int AS cnt FROM operational_memory
         WHERE company_id = $1 AND created_at > NOW() - INTERVAL '7 days'`,
        [companyId]
      );
      const memCount = r.rows[0]?.cnt || 0;
      if (memCount > 0 && answer.length > 300 && !OP_LEXEME_RE.test(answer)) {
        indicators.push('sz5_operational_context_ignored');
        passed = false;
      }
    } catch { /* table optional */ }
  }

  return { sz5_cross_check_passed: passed, indicators, facts_checked: factsChecked };
}

const OP_LEXEME_RE =
  /risco|operacional|m[aá]quina|equipamento|linha|manuten|evento|sensor|planta|indicad|kpi/i;

/**
 * 3. Contradiction detector — heurísticas leves (sem LLM)
 */
function _assessContradictions(answer) {
  const t = String(answer);
  const indicators = [];

  const numbers = t.match(/\b\d+([.,]\d+)?\s*%?\b/g) || [];
  if (numbers.length >= 2) {
    const unique = new Set(numbers.map((n) => n.replace(/\s/g, '')));
    if (unique.size >= 2 && /\bnão\b|\bsem\b|\bnunca\b/i.test(t) && /\bsim\b|\btodos\b|\bsempre\b/i.test(t)) {
      indicators.push('contradictory_polarity');
    }
  }

  if (/\b0\s*%/.test(t) && /\b100\s*%/.test(t)) indicators.push('extreme_percentage_conflict');
  if (/\binexistente\b/i.test(t) && /\bconfirmado\b/i.test(t)) indicators.push('existence_conflict');

  const score = Math.min(1, indicators.length * 0.35);
  return {
    contradiction_score: Number(score.toFixed(4)),
    contradictions_detected: indicators.length > 0,
    indicators,
  };
}

/**
 * 4. Semantic validator — overlap com entidades do contexto
 */
function _assessSemanticValidity(answer, contextualData) {
  const t = answer.toLowerCase();
  const entities = [];

  if (Array.isArray(contextualData?.machines)) {
    for (const m of contextualData.machines) {
      if (m?.name) entities.push(String(m.name).toLowerCase());
    }
  }

  if (entities.length === 0) {
    return { semantic_valid: true, overlap_ratio: null, reason: 'no_entities_to_validate' };
  }

  let hits = 0;
  for (const e of entities) {
    if (e.length > 2 && t.includes(e)) hits++;
  }

  const ratio = hits / entities.length;
  return {
    semantic_valid: ratio >= 0.2 || t.length < 100,
    overlap_ratio: Number(ratio.toFixed(4)),
  };
}

/**
 * 5. Confidence score — agregação multi-sinal
 */
function _computeConfidenceScore(components) {
  const weights = {
    grounding: 0.35,
    semantic: 0.2,
    contradiction: 0.2,
    sz5: 0.15,
    model: 0.1,
  };

  const grounding = components.grounding?.grounding_score ?? 0.5;
  const semantic = components.semantic?.semantic_valid ? 1 : 0.3;
  const contradiction = 1 - (components.contradiction?.contradiction_score ?? 0);
  const sz5 = components.sz5?.sz5_cross_check_passed ? 1 : 0.4;
  const modelConf = components.model_confidence ?? 0.7;

  const score =
    grounding * weights.grounding +
    semantic * weights.semantic +
    contradiction * weights.contradiction +
    sz5 * weights.sz5 +
    modelConf * weights.model;

  return Number(Math.min(1, Math.max(0, score)).toFixed(4));
}

/**
 * 6. Multi-domain validation — regras por módulo
 */
function _assessMultiDomain(moduleName, answer, contextualData) {
  const mod = String(moduleName || '').toLowerCase();
  const domains = [];

  if (mod.includes('manut') || mod.includes('maintenance')) domains.push('maintenance');
  if (mod.includes('prod')) domains.push('production');
  if (mod.includes('env') || mod.includes('ambient')) domains.push('environmental');
  if (mod.includes('exec') || mod.includes('cockpit')) domains.push('executive');
  if (domains.length === 0) domains.push('general');

  const issues = [];
  if (domains.includes('maintenance') && contextualData?.prioritized_actions?.length && !ACTION_RE.test(answer)) {
    issues.push('maintenance_missing_action_language');
  }

  return { domains, domain_issues: issues, passed: issues.length === 0 };
}

const ACTION_RE = /a(ção|cao)|tarefa|prioridad|manuten|corretiv|inspe(c|ç)/i;

/**
 * Avaliação completa de um trace.
 */
async function assessTrace(row, opts = {}) {
  const mode = _getMode();
  if (mode === 'off') return { ok: false, reason: 'mode_off' };

  const start = Date.now();
  const answer = _extractAnswer(row);
  const contextualData = _extractContextualData(row);
  const companyId = row.company_id;
  const moduleName = row.module_name;

  const grounding = _assessFactGrounding(answer, contextualData);
  const contradiction = _assessContradictions(answer);
  const semantic = _assessSemanticValidity(answer, contextualData);
  const sz5 = await _assessSz5CrossCheck(answer, companyId, contextualData);
  const multiDomain = _assessMultiDomain(moduleName, answer, contextualData);

  const modelConfidence =
    row.output_response?.confidence_score ??
    row.output_response?.confidence ??
    row.model_info?.confidence ??
    null;

  const confidenceScore = _computeConfidenceScore({
    grounding,
    semantic,
    contradiction,
    sz5,
    model_confidence: typeof modelConfidence === 'number' ? modelConfidence / (modelConfidence > 1 ? 100 : 1) : 0.7,
  });

  const indicators = [
    ...(grounding.passed ? [] : ['grounding_failed']),
    ...(contradiction.indicators || []),
    ...(sz5.indicators || []),
    ...(multiDomain.domain_issues || []),
    ...(semantic.semantic_valid ? [] : ['semantic_weak_overlap']),
  ];

  const threshold = _reviewThreshold();
  const lowConfidenceFlag = confidenceScore < threshold;
  const requiresHumanReview =
    lowConfidenceFlag ||
    contradiction.contradictions_detected ||
    (!sz5.sz5_cross_check_passed && indicators.length >= 2);

  let severity = SEVERITY.INFO;
  if (requiresHumanReview && confidenceScore < 0.35) severity = SEVERITY.CRITICAL;
  else if (requiresHumanReview) severity = SEVERITY.WARNING;
  else if (indicators.length > 0) severity = SEVERITY.INFO;

  const assessment = {
    trace_id: row.trace_id,
    company_id: companyId,
    user_id: row.user_id,
    module_name: moduleName,
    confidence_score: confidenceScore,
    grounding_score: grounding.grounding_score,
    contradiction_score: contradiction.contradiction_score,
    semantic_valid: semantic.semantic_valid,
    sz5_cross_check_passed: sz5.sz5_cross_check_passed,
    low_confidence_flag: lowConfidenceFlag,
    requires_human_review: requiresHumanReview,
    severity,
    indicators,
    governance_metadata: {
      mode,
      block_enabled: _isBlockEnabled(),
      elapsed_ms: Date.now() - start,
      multi_domain: multiDomain.domains,
      drift_tracking: opts.drift_ref || null,
    },
    explainability: {
      contextual_reason: grounding.contextual?.reason,
      structure_reason: grounding.structure?.reason,
      structure_score: grounding.structure?.score,
      overlap_ratio: semantic.overlap_ratio,
      review_threshold: threshold,
    },
    should_block: false,
  };

  if (_isBlockEnabled() && severity === SEVERITY.CRITICAL && confidenceScore < 0.25 && indicators.length >= 3) {
    assessment.should_block = mode === 'enforce';
  }

  if (mode === 'shadow' || mode === 'audit') {
    assessment.persisted = false;
    assessment.dry_run = true;
  }

  _log('assessment_completed', {
    trace_id: row.trace_id,
    confidence: confidenceScore,
    severity,
    requires_review: requiresHumanReview,
    elapsed_ms: assessment.governance_metadata.elapsed_ms,
    dry_run: mode !== 'enforce',
  });

  return { ok: true, assessment, mode };
}

async function persistAssessment(assessment) {
  const mode = _getMode();
  if (mode === 'off' || mode === 'shadow') return { persisted: false };

  try {
    await db.query(
      `INSERT INTO ai_hallucination_assessments (
        trace_id, company_id, user_id, module_name,
        confidence_score, grounding_score, contradiction_score,
        semantic_valid, sz5_cross_check_passed, low_confidence_flag,
        requires_human_review, severity, indicators, governance_metadata, explainability
      ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13::jsonb,$14::jsonb,$15::jsonb)
      ON CONFLICT (trace_id) DO UPDATE SET
        confidence_score = EXCLUDED.confidence_score,
        requires_human_review = EXCLUDED.requires_human_review,
        severity = EXCLUDED.severity,
        indicators = EXCLUDED.indicators,
        governance_metadata = EXCLUDED.governance_metadata,
        explainability = EXCLUDED.explainability`,
      [
        assessment.trace_id,
        assessment.company_id,
        assessment.user_id,
        assessment.module_name,
        assessment.confidence_score,
        assessment.grounding_score,
        assessment.contradiction_score,
        assessment.semantic_valid,
        assessment.sz5_cross_check_passed,
        assessment.low_confidence_flag,
        assessment.requires_human_review,
        assessment.severity,
        JSON.stringify(assessment.indicators),
        JSON.stringify(assessment.governance_metadata),
        JSON.stringify(assessment.explainability),
      ]
    );
    return { persisted: true };
  } catch (err) {
    if (err.code === '42P01') return { persisted: false, reason: 'table_missing' };
    _log('persist_error', { error: err?.message });
    return { persisted: false, error: err?.message };
  }
}

async function onTraceAssessed(row, opts = {}) {
  const result = await assessTrace(row, opts);
  if (!result.ok) return result;

  const { assessment } = result;

  if (result.mode === 'enforce' || result.mode === 'audit') {
    await persistAssessment(assessment);
  }

  if (assessment.requires_human_review && (result.mode === 'enforce' || result.mode === 'audit')) {
    try {
      const reviewQueue = require('./hallucinationReviewQueueService');
      await reviewQueue.enqueueForReview(assessment, row);
    } catch { /* non-blocking */ }
  }

  try {
    const metrics = require('./hallucinationMetricsService');
    metrics.recordAssessment(assessment);
  } catch { /* non-blocking */ }

  try {
    const apm = require('../observability/apmEnterpriseBridge');
    apm.recordHallucinationAssessment(assessment, { company_id: row.company_id });
    const slo = require('../observability/sloSliRegistry');
    slo.recordAiSafetySli(!!assessment.requires_human_review);
  } catch { /* non-blocking */ }

  try {
    const continuousValidation = require('./enterprise/continuousValidationEngine');
    continuousValidation.validate(
      { prompt_length: 0 },
      {
        confidence: assessment.confidence_score,
        content_length: _extractAnswer(row).length,
        sources_cited: assessment.grounding_score > 0.5 ? 1 : 0,
        claims_count: assessment.indicators.length,
        contradictions_detected: assessment.contradiction_score > 0.3,
        quality_score: assessment.confidence_score,
      },
      { company_id: row.company_id, model: row.module_name }
    );
  } catch { /* optional */ }

  try {
    await db.query(
      `INSERT INTO audit_logs (action, entity_type, description, user_name, created_at, company_id)
       VALUES ('hallucination_assessment', 'ai_trace', $1, 'system:hallucination_detection', NOW(), $2)`,
      [
        JSON.stringify({
          trace_id: assessment.trace_id,
          mode: String(assessment.governance_metadata?.mode || result.mode || _getMode()),
          confidence_score: assessment.confidence_score,
          severity: assessment.severity,
          domains: Array.isArray(assessment.governance_metadata?.multi_domain)
            ? assessment.governance_metadata.multi_domain
            : [],
          elapsed_ms:
            typeof assessment.governance_metadata?.elapsed_ms === 'number'
              ? assessment.governance_metadata.elapsed_ms
              : null,
          requires_human_review: assessment.requires_human_review,
          indicator_count: assessment.indicators.length,
          should_block: assessment.should_block === true,
        }),
        assessment.company_id,
      ]
    );
  } catch { /* non-blocking */ }

  return { ok: true, assessment, should_block: assessment.should_block };
}

function enqueueTraceAssessment(row, opts = {}) {
  setImmediate(() => {
    onTraceAssessed(row, opts).catch((e) => {
      _log('enqueue_error', { error: e?.message, trace_id: row?.trace_id });
    });
  });
}

function getDiagnostics() {
  return {
    mode: _getMode(),
    block_enabled: _isBlockEnabled(),
    review_threshold: _reviewThreshold(),
  };
}

module.exports = {
  assessTrace,
  persistAssessment,
  onTraceAssessed,
  enqueueTraceAssessment,
  getDiagnostics,
  SEVERITY,
};
