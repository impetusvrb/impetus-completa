'use strict';

/**
 * Aprendizado estratégico: qualidade de decisões e padrões por empresa.
 * Não persiste texto do utilizador nem resposta do modelo — apenas metadados.
 * Independente do operationalLearningService.
 */

const db = require('../db');
const { isValidUUID } = require('../utils/security');
const { detectFallbackQuality } = require('../utils/detectFallbackQuality');

const MAX_CONTEXT_TAGS = 8;
const INTENT_MAX = 160;
const TAG_MAX = 64;
const DEFAULT_LOOKBACK_DAYS = 90;

/**
 * @param {unknown} v
 * @returns {string}
 */
function normIntent(v) {
  if (v == null) {
    return '';
  }
  return String(v).trim().slice(0, INTENT_MAX);
}

/**
 * @param {unknown} v
 * @returns {string[]}
 */
function normContextTags(v) {
  if (!Array.isArray(v)) {
    return [];
  }
  const out = [];
  for (const x of v) {
    if (out.length >= MAX_CONTEXT_TAGS) {
      break;
    }
    const s = x != null ? String(x).trim().slice(0, TAG_MAX) : '';
    if (s) {
      out.push(s);
    }
  }
  return out;
}

/**
 * @param {number|null|undefined} s
 * @returns {number|null}
 */
function normScore(s) {
  if (s == null || s === '' || Number.isNaN(Number(s))) {
    return null;
  }
  const n = Number(s);
  if (!Number.isFinite(n)) {
    return null;
  }
  return Math.round(n * 100) / 100;
}

/**
 * @param {object} params
 * @param {string} [params.company_id]
 * @param {string} [params.intent]
 * @param {boolean} [params.had_data]
 * @param {boolean} [params.used_fallback]
 * @param {number|null} [params.response_score]
 * @param {string[]} [params.context_tags]
 * @returns {Promise<boolean>}
 */
async function recordDecisionTrace({
  company_id: companyId,
  intent,
  had_data: hadData = false,
  used_fallback: usedFallback = false,
  response_score: responseScore = null,
  context_tags: contextTags = []
} = {}) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return false;
  }
  const it = normIntent(intent);
  const tags = normContextTags(contextTags);
  const had = Boolean(hadData);
  const fb = Boolean(usedFallback);
  const score = normScore(responseScore);
  const rows = tags.length
    ? tags.map((tag) => ({ tag }))
    : [{ tag: null }];

  try {
    for (const { tag } of rows) {
      await db.query(
        `
        INSERT INTO strategic_learning
          (company_id, intent, had_data, used_fallback, response_score, context_tag, created_at)
        VALUES ($1::uuid, $2, $3, $4, $5, $6, now())
        `,
        [cid, it, had, fb, score, tag]
      );
    }
    return true;
  } catch (e) {
    if (e && e.message && String(e.message).includes('does not exist')) {
      return false;
    }
    console.warn(
      '[STRATEGIC_LEARNING] recordDecisionTrace',
      e && e.message ? String(e.message) : e
    );
    return false;
  }
}

/**
 * Não bloqueia o chamador; falhas silenciosas no callback.
 * @param {object} params
 * @param {string} [params.company_id]
 * @param {string} [params.intent]
 * @param {boolean} [params.had_data]
 * @param {boolean} [params.used_fallback]
 * @param {number|null} [params.response_score]
 * @param {string[]} [params.context_tags]
 */
function recordDecisionTraceAsync(params) {
  setImmediate(() => {
    recordDecisionTrace(params).catch(() => {});
  });
}

/**
 * @param {object} params
 * @param {string} [params.company_id]
 * @param {string} [params.user_id]
 * @param {string} [params.intent]
 * @param {boolean} [params.followup_used]
 * @param {string|number|null|undefined} [params.satisfaction_signal] código curto (ex.: 1, -1, "up")
 * @returns {Promise<boolean>}
 */
async function recordUserBehavior({
  company_id: companyId,
  user_id: userId,
  intent,
  followup_used: followupUsed = false,
  satisfaction_signal: satisfactionSignal = null
} = {}) {
  const cid = companyId != null ? String(companyId).trim() : '';
  const uid = userId != null ? String(userId).trim() : '';
  if (!cid || !uid || !isValidUUID(cid) || !isValidUUID(uid)) {
    return false;
  }
  const it = normIntent(intent);
  const fu = Boolean(followupUsed);
  let sat = null;
  if (satisfactionSignal != null) {
    if (typeof satisfactionSignal === 'number' && Number.isFinite(satisfactionSignal)) {
      sat = String(Math.max(-1, Math.min(1, Math.trunc(satisfactionSignal))));
    } else {
      sat = String(satisfactionSignal).trim().slice(0, 32);
    }
  }
  try {
    await db.query(
      `
      INSERT INTO strategic_user_behavior
        (company_id, user_id, intent, followup_used, satisfaction_signal, created_at)
      VALUES ($1::uuid, $2::uuid, $3, $4, $5, now())
      `,
      [cid, uid, it, fu, sat]
    );
    return true;
  } catch (e) {
    if (e && e.message && String(e.message).includes('does not exist')) {
      return false;
    }
    console.warn(
      '[STRATEGIC_LEARNING] recordUserBehavior',
      e && e.message ? String(e.message) : e
    );
    return false;
  }
}

/**
 * @param {object} params
 */
function recordUserBehaviorAsync(params) {
  setImmediate(() => {
    recordUserBehavior(params).catch(() => {});
  });
}

/**
 * @param {string} companyId
 * @returns {Promise<{
 *   frequent_failures: Array<{ intent: string, rate: number, samples: number }>,
 *   strong_intents: Array<{ intent: string, avg_response_score: number, samples: number }>,
 *   fallback_rate: number,
 *   avg_response_score: number
 * }|null>}
 */
async function getStrategicInsights(companyId) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return null;
  }
  try {
    const since = new Date();
    since.setDate(since.getDate() - DEFAULT_LOOKBACK_DAYS);

    const base = await db.query(
      `
      SELECT
        intent,
        COUNT(*)::int AS n,
        COUNT(*) FILTER (WHERE used_fallback = true)::int AS n_fb,
        AVG(response_score) AS avg_s
      FROM strategic_learning
      WHERE company_id = $1::uuid
        AND created_at >= $2::timestamptz
      GROUP BY intent
      HAVING COUNT(*) >= 1
      ORDER BY n DESC
      LIMIT 200
      `,
      [cid, since.toISOString()]
    );

    const global = await db.query(
      `
      SELECT
        COUNT(*)::int AS n_all,
        COUNT(*) FILTER (WHERE used_fallback = true)::int AS n_fb,
        AVG(response_score) AS avg_s
      FROM strategic_learning
      WHERE company_id = $1::uuid
        AND created_at >= $2::timestamptz
      `,
      [cid, since.toISOString()]
    );

    const g = global.rows && global.rows[0];
    const nAll = g && g.n_all != null ? parseInt(g.n_all, 10) : 0;
    const nFb = g && g.n_fb != null ? parseInt(g.n_fb, 10) : 0;
    const fallback_rate = nAll > 0 ? Math.round((nFb / nAll) * 10000) / 10000 : 0;
    const avg_response_score = g && g.avg_s != null ? Math.round(parseFloat(String(g.avg_s)) * 100) / 100 : 0;

    const byIntent = base.rows || [];
    const failureRanked = byIntent
      .map((r) => {
        const n = r.n != null ? parseInt(r.n, 10) : 0;
        const nfb = r.n_fb != null ? parseInt(r.n_fb, 10) : 0;
        return {
          intent: r.intent != null ? String(r.intent) : '',
          rate: n > 0 ? Math.round((nfb / n) * 10000) / 10000 : 0,
          samples: n
        };
      })
      .filter((r) => r.samples >= 1)
      .sort((a, b) => b.rate - a.rate || b.samples - a.samples)
      .slice(0, 12);

    const strongRanked = byIntent
      .map((r) => {
        const n = r.n != null ? parseInt(r.n, 10) : 0;
        const av = r.avg_s != null ? Math.round(parseFloat(String(r.avg_s)) * 100) / 100 : 0;
        return {
          intent: r.intent != null ? String(r.intent) : '',
          avg_response_score: av,
          samples: n
        };
      })
      .filter((r) => r.samples >= 2 && r.avg_response_score > 0)
      .sort((a, b) => b.avg_response_score - a.avg_response_score)
      .slice(0, 12);

    return {
      frequent_failures: failureRanked,
      strong_intents: strongRanked,
      fallback_rate,
      avg_response_score
    };
  } catch (e) {
    if (e && e.message && String(e.message).includes('does not exist')) {
      return {
        frequent_failures: [],
        strong_intents: [],
        fallback_rate: 0,
        avg_response_score: 0
      };
    }
    console.warn(
      '[STRATEGIC_LEARNING] getStrategicInsights',
      e && e.message ? String(e.message) : e
    );
    return null;
  }
}

/**
 * Mapeia saída do conselho cognitivo (sem PII) para `recordDecisionTrace` — uso interno.
 * @param {object} ctx
 * @param {object} [ctx.user]
 * @param {object} [ctx.dossier]
 * @param {object} [ctx.synthesis]
 * @param {boolean} [ctx.used_fallback]
 * @param {string[]} [ctx.context_tags]
 * @returns {void}
 */
function recordDecisionTraceFromCognitiveRun(ctx) {
  if (!ctx || typeof ctx !== 'object') {
    return;
  }
  const user = ctx.user && typeof ctx.user === 'object' ? ctx.user : null;
  const company_id = user && user.company_id != null ? String(user.company_id) : '';
  if (!company_id) {
    return;
  }
  const dossier = ctx.dossier && typeof ctx.dossier === 'object' ? ctx.dossier : null;
  const intent =
    (dossier && dossier.context && dossier.context.intent != null && String(dossier.context.intent)) ||
    (ctx.intent != null && String(ctx.intent)) ||
    'unknown';

  const data = dossier && dossier.data && typeof dossier.data === 'object' ? dossier.data : null;
  const had_data = Boolean(data && Object.keys(data).length > 0);

  const syn = ctx.synthesis && typeof ctx.synthesis === 'object' ? ctx.synthesis : null;
  const degraded = Boolean(dossier && dossier.meta && dossier.meta.degraded) || Boolean(syn && syn.degraded);
  const used_fallback =
    Boolean(ctx.used_fallback) ||
    degraded ||
    Boolean(
      syn &&
        typeof syn.answer === 'string' &&
        (syn.answer.includes('Não foi possível gerar') || syn.answer.includes('FALLBACK'))
    );

  let response_score = null;
  if (syn && syn.confidence_score != null) {
    response_score = normScore(syn.confidence_score);
  } else if (syn && syn.explanation_layer && syn.explanation_layer.confidence_score != null) {
    response_score = normScore(syn.explanation_layer.confidence_score);
  }

  const context_tags = Array.isArray(ctx.context_tags)
    ? ctx.context_tags
    : Array.isArray(ctx.contextTags)
      ? ctx.contextTags
      : [];

  recordDecisionTraceAsync({
    company_id,
    intent,
    had_data,
    used_fallback,
    response_score,
    context_tags: normContextTags(context_tags)
  });
}

/**
 * Hook síncrono seguro após o conselho cognitivo — delega em `recordDecisionTraceFromCognitiveRun` (já assíncrono no I/O).
 * @param {Parameters<typeof recordDecisionTraceFromCognitiveRun>[0]} ctx
 */
function onCognitiveExecutionComplete(ctx) {
  try {
    recordDecisionTraceFromCognitiveRun(ctx);
  } catch (e) {
    console.warn(
      '[STRATEGIC_LEARNING] onCognitiveExecutionComplete',
      e && e.message ? String(e.message) : e
    );
  }
}

/**
 * Agenda aprendizado estratégico no tick seguinte — não bloqueia a resposta HTTP nem usa await.
 * @param {{ user?: object, dossier?: object, synthesis?: object }} params
 */
function scheduleStrategicLearningAfterCognitiveRun({ user, dossier, synthesis } = {}) {
  try {
    setImmediate(() => {
      try {
        onCognitiveExecutionComplete({
          user,
          dossier,
          synthesis,
          used_fallback: detectFallbackQuality(synthesis),
          context_tags: dossier?.data?.contextual_data?.detected_intents || []
        });
      } catch (err) {
        console.warn('[STRATEGIC_LEARNING_HOOK_FAILED]', {
          reason: err?.message
        });
      }
    });
  } catch (err) {
    console.warn('[STRATEGIC_LEARNING_HOOK_FAILED]', {
      reason: err?.message
    });
  }
}

module.exports = {
  recordDecisionTrace,
  recordDecisionTraceAsync,
  recordUserBehavior,
  recordUserBehaviorAsync,
  getStrategicInsights,
  recordDecisionTraceFromCognitiveRun,
  onCognitiveExecutionComplete,
  scheduleStrategicLearningAfterCognitiveRun
};
