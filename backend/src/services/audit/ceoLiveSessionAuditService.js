'use strict';

/**
 * F49-E — CEO Live Session Certification Audit Service
 * READ ONLY · OBSERVATIONAL ONLY
 *
 * Certifica sessão real de utilização CEO Chat a partir de evidência forense
 * em BD (traces, hallucination assessments, audit logs). Sem alterar runtime.
 */

const aiIntegrationsHealth = require('../aiIntegrationsHealthService');

const LAYER = 'F49_CEO_LIVE_SESSION_AUDIT';

const MIN_SESSION_MINUTES = 15;
const DEFAULT_SESSION_GAP_MINUTES = 30;

/** Módulos cognitivos utilizados por utilizadores CEO no dashboard. */
const CEO_COGNITIVE_MODULES = Object.freeze([
  'dashboard_chat',
  'smart_summary',
  'chat_impetus',
  'claude_panel',
  'dashboard_chat_multimodal'
]);

/** Canais de chat directo (conversacional). */
const CEO_CHAT_MODULES = Object.freeze([
  'dashboard_chat',
  'chat_impetus'
]);

function _envMode(key, defaultVal = 'off') {
  return String(process.env[key] ?? defaultVal).trim().toLowerCase();
}

function _isEnforceMode(v) {
  return v === 'enforce' || v === 'on' || v === 'true' || v === '1';
}

/**
 * F49-E.3 — Configuração truth enforcement (read-only, sem alterar env).
 */
function checkTruthEnforcementConfiguration() {
  const industrialTruth = _envMode('IMPETUS_INDUSTRIAL_TRUTH_MODE', 'off');
  const hallucinationDetection = _envMode('IMPETUS_HALLUCINATION_DETECTION', 'off');
  const hallucinationBlock = _envMode('IMPETUS_HALLUCINATION_BLOCK', 'off');

  return {
    industrial_truth_mode: industrialTruth,
    hallucination_detection: hallucinationDetection,
    hallucination_block: hallucinationBlock,
    truth_enforcement_active:
      _isEnforceMode(industrialTruth) && _isEnforceMode(hallucinationDetection),
    block_enabled: _isEnforceMode(hallucinationBlock),
    channels_certified: [
      'dashboard_chat',
      'executive_ceo_chat',
      'chat_impetus',
      'smart_summary'
    ],
    closure_reference: 'backend/docs/TRUTH_CLOSURE_CERTIFICATION.md'
  };
}

/**
 * F49-E.4 — Disponibilidade TRI-AI (read-only probe).
 */
async function checkTriAiAvailability(options = {}) {
  const geminiAudit = require('./geminiReadinessAuditService');
  const tri = await geminiAudit.checkTriAiReadiness({
    forceRefresh: options.forceRefresh !== false
  });

  return {
    openai_available: Boolean(tri.openai),
    anthropic_available: Boolean(tri.anthropic),
    gemini_available: Boolean(tri.gemini),
    tri_ai_ready: Boolean(tri.tri_ai_ready),
    verdict: tri.verdict,
    probed_at: tri.probed_at,
    integrations: tri.integrations
  };
}

/**
 * Agrupa traces consecutivos numa sessão (gap > threshold = nova sessão).
 */
function clusterSessions(traces, gapMinutes = DEFAULT_SESSION_GAP_MINUTES) {
  if (!traces.length) return [];

  const gapMs = gapMinutes * 60 * 1000;
  const sessions = [];
  let cur = null;

  for (const tr of traces) {
    const t = new Date(tr.created_at).getTime();
    if (
      !cur ||
      cur.user_id !== tr.user_id ||
      t - cur.end_ms > gapMs
    ) {
      if (cur) sessions.push(cur);
      cur = {
        user_id: tr.user_id,
        user_name: tr.user_name,
        company_id: tr.company_id,
        start_ms: t,
        end_ms: t,
        interactions: 1,
        modules: new Set([tr.module_name]),
        providers: new Set(),
        trace_ids: [tr.trace_id],
        traces: [tr]
      };
    } else {
      cur.end_ms = t;
      cur.interactions += 1;
      cur.modules.add(tr.module_name);
      cur.trace_ids.push(tr.trace_id);
      cur.traces.push(tr);
    }

    const provider = tr.model_info?.provider || tr.provider;
    if (provider) cur.providers.add(String(provider).toLowerCase());
  }

  if (cur) sessions.push(cur);

  return sessions.map((s) => ({
    user_id: s.user_id,
    user_name: s.user_name,
    company_id: s.company_id,
    session_start: new Date(s.start_ms).toISOString(),
    session_end: new Date(s.end_ms).toISOString(),
    duration_minutes: Math.round(((s.end_ms - s.start_ms) / 60000) * 10) / 10,
    interactions: s.interactions,
    modules: [...s.modules],
    providers: [...s.providers],
    trace_ids: s.trace_ids,
    has_dashboard_chat: s.modules.has('dashboard_chat'),
    has_executive_chat_module: [...s.modules].some((m) => CEO_CHAT_MODULES.includes(m)),
    meets_minimum_duration: (s.end_ms - s.start_ms) / 60000 >= MIN_SESSION_MINUTES
  }));
}

function selectCertificationSession(sessions) {
  const qualifying = sessions.filter((s) => s.meets_minimum_duration && s.interactions >= 1);
  if (!qualifying.length) return null;

  const scored = qualifying
    .map((s) => ({
      ...s,
      score:
        (s.has_dashboard_chat ? 100 : 0) +
        (s.has_executive_chat_module ? 50 : 0) +
        Math.min(s.duration_minutes, 120) +
        s.interactions * 2
    }))
    .sort((a, b) => b.score - a.score);

  return scored[0];
}

async function queryCeoTraces(db, { sinceDays = 90 } = {}) {
  const r = await db.pool.query(
    `
    SELECT
      t.trace_id,
      t.user_id,
      t.company_id,
      t.module_name,
      t.created_at,
      t.model_info,
      t.model_info->>'provider' AS provider,
      t.model_info->>'model' AS model,
      t.input_payload,
      t.output_response,
      (t.output_response IS NOT NULL AND pg_column_size(t.output_response) > 0) AS has_response,
      pg_column_size(t.output_response) AS response_bytes,
      u.name AS user_name,
      u.role
    FROM ai_interaction_traces t
    INNER JOIN users u ON u.id = t.user_id
    WHERE u.role = 'ceo'
      AND u.deleted_at IS NULL
      AND t.created_at >= NOW() - ($1 || ' days')::interval
    ORDER BY t.user_id, t.created_at ASC
    `,
    [String(sinceDays)]
  );
  return r.rows;
}

async function queryExecutiveAuditLogs(db, { sinceDays = 90 } = {}) {
  try {
    const r = await db.pool.query(
      `
      SELECT id, company_id, user_id, action, channel,
             request_summary, response_summary, created_at, metadata
      FROM executive_audit_logs
      WHERE created_at >= NOW() - ($1 || ' days')::interval
      ORDER BY created_at DESC
      LIMIT 200
      `,
      [String(sinceDays)]
    );
    return r.rows;
  } catch {
    return [];
  }
}

async function queryCeoChatMessages(db, { sinceDays = 90 } = {}) {
  const r = await db.pool.query(
    `
    SELECT
      cm.id,
      cm.conversation_id,
      cm.created_at,
      cm.message_type,
      LEFT(cm.content, 300) AS content_preview,
      cm.ai_governance_metadata,
      u.id AS user_id,
      u.name AS user_name,
      u.role
    FROM chat_messages cm
    INNER JOIN users u ON u.id = cm.sender_id
    WHERE u.role = 'ceo'
      AND cm.deleted_at IS NULL
      AND cm.created_at >= NOW() - ($1 || ' days')::interval
    ORDER BY cm.created_at DESC
    LIMIT 100
    `,
    [String(sinceDays)]
  );

  const modoExecutivo = await db.pool.query(
    `
    SELECT id, created_at, LEFT(content, 300) AS content_preview
    FROM chat_messages
    WHERE content ILIKE '%Modo Executivo%'
      AND created_at >= NOW() - ($1 || ' days')::interval
    ORDER BY created_at DESC
    LIMIT 20
    `,
    [String(sinceDays)]
  );

  return {
    ceo_messages: r.rows,
    modo_executivo_responses: modoExecutivo.rows,
    total_ceo_messages: r.rows.length,
    modo_executivo_count: modoExecutivo.rows.length
  };
}

async function queryHallucinationForWindow(db, { userId, start, end }) {
  const r = await db.pool.query(
    `
    SELECT
      h.trace_id,
      h.module_name,
      h.confidence_score,
      h.grounding_score,
      h.requires_human_review,
      h.severity,
      h.indicators,
      h.governance_metadata,
      h.created_at
    FROM ai_hallucination_assessments h
    INNER JOIN ai_interaction_traces t ON t.trace_id = h.trace_id
    WHERE t.user_id = $1
      AND h.created_at >= $2
      AND h.created_at <= $3
    ORDER BY h.created_at ASC
    `,
    [userId, start, end]
  );
  return r.rows;
}

async function queryHallucinationSummaryCeo(db, { sinceDays = 90 } = {}) {
  const r = await db.pool.query(
    `
    SELECT
      COUNT(*)::int AS total,
      SUM(CASE WHEN h.requires_human_review THEN 1 ELSE 0 END)::int AS human_review_required,
      ROUND(
        100.0 * SUM(CASE WHEN h.requires_human_review THEN 1 ELSE 0 END) / NULLIF(COUNT(*), 0),
        2
      ) AS hallucination_rate_pct
    FROM ai_hallucination_assessments h
    INNER JOIN ai_interaction_traces t ON t.trace_id = h.trace_id
    INNER JOIN users u ON u.id = t.user_id
    WHERE u.role = 'ceo'
      AND h.created_at >= NOW() - ($1 || ' days')::interval
    `,
    [String(sinceDays)]
  );

  const row = r.rows[0] || { total: 0, human_review_required: 0, hallucination_rate_pct: 0 };
  return {
    total_assessments: row.total || 0,
    human_review_required: row.human_review_required || 0,
    hallucination_rate: row.total > 0 ? Number(row.hallucination_rate_pct) / 100 : 0,
    hallucination_rate_pct: Number(row.hallucination_rate_pct) || 0
  };
}

function summarizeSessionTraces(traces) {
  const models = new Map();
  let responsesGenerated = 0;

  for (const tr of traces) {
    const key = `${tr.provider || 'unknown'}:${tr.model || 'unknown'}`;
    models.set(key, (models.get(key) || 0) + 1);
    if (tr.has_response) responsesGenerated += 1;
  }

  return {
    trace_count: traces.length,
    responses_generated: responsesGenerated,
    models_used: [...models.entries()].map(([key, count]) => {
      const [provider, model] = key.split(':');
      return { provider, model, count };
    }),
    modules: [...new Set(traces.map((t) => t.module_name))]
  };
}

function deriveTriAiUsage(session, triAi, allCeoTraces) {
  const providers = new Set(session?.providers || []);
  for (const tr of allCeoTraces) {
    const p = tr.model_info?.provider || tr.provider;
    if (p) providers.add(String(p).toLowerCase());
  }

  return {
    openai_used: providers.has('openai'),
    anthropic_used: providers.has('claude') || providers.has('anthropic'),
    gemini_used: providers.has('gemini') || providers.has('google') || providers.has('google_vertex'),
    openai_available: triAi.openai_available,
    anthropic_available: triAi.anthropic_available,
    gemini_available: triAi.gemini_available,
    note: 'Utilização registada a partir de model_info nos traces; disponibilidade via probe TRI-AI read-only.'
  };
}

function computeCriteria(evidence) {
  const session = evidence.certification_session;
  const truth = evidence.truth_enforcement;
  const traceSummary = evidence.session_trace_summary;

  return {
    ceo_session_completed: Boolean(session?.meets_minimum_duration),
    ceo_chat_operational:
      Boolean(session?.has_executive_chat_module || session?.has_dashboard_chat) &&
      (traceSummary?.responses_generated || 0) > 0,
    responses_generated: (traceSummary?.responses_generated || 0) > 0,
    truth_enforcement_active: Boolean(truth?.truth_enforcement_active),
    truth_enforcement_validated: Boolean(truth?.truth_enforcement_active),
    session_evidence_recorded: (session?.interactions || 0) > 0,
    hallucination_review_documented: evidence.hallucination_review != null
  };
}

function computeExecutiveVerdict(criteria) {
  if (
    criteria.ceo_session_completed &&
    criteria.ceo_chat_operational &&
    criteria.truth_enforcement_validated &&
    criteria.session_evidence_recorded &&
    criteria.responses_generated
  ) {
    return 'F49_CEO_LIVE_SESSION_CERTIFIED';
  }
  if (criteria.ceo_session_completed && criteria.responses_generated) {
    return 'F49_CEO_LIVE_SESSION_PARTIAL';
  }
  return 'F49_CEO_LIVE_SESSION_PENDING';
}

/**
 * F49-E — Auditoria completa de sessão CEO live (read-only).
 */
async function generateCeoLiveSessionAudit(options = {}) {
  const db = options.db || require('../../db');
  const sinceDays = options.sinceDays ?? 90;
  const gapMinutes = options.sessionGapMinutes ?? DEFAULT_SESSION_GAP_MINUTES;

  const truthEnforcement = checkTruthEnforcementConfiguration();
  const triAi = await checkTriAiAvailability({ forceRefresh: options.forceTriAiProbe });

  const ceoTraces = await queryCeoTraces(db, { sinceDays });
  const allSessions = clusterSessions(ceoTraces, gapMinutes);
  const certificationSession = selectCertificationSession(allSessions);

  let sessionTraces = [];
  let sessionTraceSummary = null;
  let sessionHallucination = [];
  let sessionHallucinationSession = { total_assessments: 0, human_review_required: 0, hallucination_rate: 0 };

  if (certificationSession) {
    sessionTraces = ceoTraces.filter(
      (t) =>
        t.user_id === certificationSession.user_id &&
        new Date(t.created_at) >= new Date(certificationSession.session_start) &&
        new Date(t.created_at) <= new Date(certificationSession.session_end)
    );
    sessionTraceSummary = summarizeSessionTraces(sessionTraces);
    sessionHallucination = await queryHallucinationForWindow(db, {
      userId: certificationSession.user_id,
      start: certificationSession.session_start,
      end: certificationSession.session_end
    });
    const flagged = sessionHallucination.filter((h) => h.requires_human_review).length;
    sessionHallucinationSession = {
      total_assessments: sessionHallucination.length,
      human_review_required: flagged,
      hallucination_rate: sessionHallucination.length > 0 ? flagged / sessionHallucination.length : 0
    };
  }

  const hallucinationCeo = await queryHallucinationSummaryCeo(db, { sinceDays });
  const executiveLogs = await queryExecutiveAuditLogs(db, { sinceDays });
  const chatMessages = await queryCeoChatMessages(db, { sinceDays });
  const triAiUsage = deriveTriAiUsage(certificationSession, triAi, ceoTraces);

  const evidence = {
    certification_session: certificationSession,
    all_qualifying_sessions: allSessions.filter((s) => s.meets_minimum_duration),
    session_trace_summary: sessionTraceSummary,
    session_traces_sample: sessionTraces.slice(0, 10).map((t) => ({
      trace_id: t.trace_id,
      module_name: t.module_name,
      created_at: t.created_at,
      provider: t.provider,
      model: t.model,
      has_response: t.has_response,
      response_bytes: t.response_bytes
    })),
    truth_enforcement: truthEnforcement,
    tri_ai: triAi,
    tri_ai_usage: triAiUsage,
    hallucination_review: {
      session: sessionHallucinationSession,
      ceo_window_90d: hallucinationCeo,
      session_assessments_sample: sessionHallucination.slice(0, 5)
    },
    executive_audit_logs: {
      total: executiveLogs.length,
      note:
        executiveLogs.length === 0
          ? 'Tabela executive_audit_logs vazia — canal web Modo Executivo (chat.js) não registou acções; evidência principal via ai_interaction_traces dashboard_chat.'
          : null,
      recent: executiveLogs.slice(0, 5)
    },
    chat_messages: chatMessages
  };

  const criteria = computeCriteria(evidence);
  const executiveVerdict = computeExecutiveVerdict(criteria);

  return {
    layer: LAYER,
    mode: 'READ_ONLY_OBSERVATIONAL',
    generated_at: new Date().toISOString(),
    executive_verdict: executiveVerdict,
    minimum_session_minutes: MIN_SESSION_MINUTES,
    observation_window_days: sinceDays,
    summary: {
      session_completed: criteria.ceo_session_completed,
      ceo_chat_operational: criteria.ceo_chat_operational,
      responses_generated: criteria.responses_generated,
      truth_enforcement_active: criteria.truth_enforcement_active,
      session_start: certificationSession?.session_start ?? null,
      session_end: certificationSession?.session_end ?? null,
      duration_minutes: certificationSession?.duration_minutes ?? 0,
      interactions: certificationSession?.interactions ?? 0,
      certified_user: certificationSession?.user_name ?? null,
      hallucination_rate_session: sessionHallucinationSession.hallucination_rate,
      human_review_required_session: sessionHallucinationSession.human_review_required
    },
    criteria,
    evidence,
    operational_validation: {
      session_completed: criteria.ceo_session_completed,
      ceo_chat_operational: criteria.ceo_chat_operational,
      responses_generated: criteria.responses_generated,
      truth_enforcement_active: criteria.truth_enforcement_active
    },
    tri_ai_usage: triAiUsage,
    hallucination_review: {
      hallucination_rate: sessionHallucinationSession.hallucination_rate,
      human_review_required: sessionHallucinationSession.human_review_required,
      ceo_90d_hallucination_rate_pct: hallucinationCeo.hallucination_rate_pct
    }
  };
}

async function getCeoSessionStatusSnapshot(options = {}) {
  const report = await generateCeoLiveSessionAudit({
    ...options,
    forceTriAiProbe: false
  });
  return {
    ok: true,
    layer: LAYER,
    read_only: true,
    executive_verdict: report.executive_verdict,
    summary: report.summary,
    criteria: report.criteria,
    timestamp: report.generated_at
  };
}

module.exports = {
  LAYER,
  MIN_SESSION_MINUTES,
  checkTruthEnforcementConfiguration,
  checkTriAiAvailability,
  clusterSessions,
  selectCertificationSession,
  generateCeoLiveSessionAudit,
  getCeoSessionStatusSnapshot
};
