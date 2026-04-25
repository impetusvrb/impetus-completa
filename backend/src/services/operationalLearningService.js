'use strict';

/**
 * Aprendizado operacional: agrega taxa de sucesso por (empresa, máquina) e por tipo de ação.
 * Memória de processo + persistência em PostgreSQL (fallback silencioso se BD indisponível).
 */

const db = require('../db');
const { isValidUUID } = require('../utils/security');

/** Linha de agregado por máquina (todas as ações combinadas no serviço). */
const AGGREGATE_ACTION_TYPE = '__machine_aggregate__';

/** @type {Map<string, { success_rate: number, attempts: number }>} chave: companyScope::machine_id */
const machineOutcomes = new Map();

/** @type {Map<string, Map<string, { attempts: number, successes: number }>>} chave: companyScope::machine_id */
const machineActionStats = new Map();

/**
 * Estatísticas in-memory por contexto (failure | maintenance | quality). Não persiste no PostgreSQL;
 * o modelo global (machineOutcomes) mantém a persistência actual.
 * @type {Map<string, Map<string, { attempts: number, successes: number }>>} chave: companyScope::machine_id, sub-chave: context_tag
 */
const machineContextStats = new Map();

/** @typedef {'failure' | 'maintenance' | 'quality'} ContextTag */
const CONTEXT_TAGS = Object.freeze(['failure', 'maintenance', 'quality']);

/**
 * Série temporal in-memory: até MAX_OUTCOMES_PER_MACHINE eventos por (empresa, máquina),
 * com `{ action_type, success, timestamp, context_tag }`. Não persiste no PostgreSQL (extensão; agregados mantêm a persistência actual).
 * @type {Map<string, Array<{ action_type: string, success: boolean, timestamp: string, context_tag: ContextTag }>>}
 */
const machineOutcomeTimeline = new Map();

/** Máximo de desfechos guardados por máquina (escopo empresa+máquina). */
const MAX_OUTCOMES_PER_MACHINE = 50;

/** Janela recente p/ taxa e tendência. */
const TREND_RECENT_N = 20;
const TREND_MIN_EVENTS = 4;
const TREND_EPS = 0.08;

/**
 * @param {string|null|undefined} companyId
 * @param {string} machineId
 * @returns {string}
 */
function scopeKey(companyId, machineId) {
  const mid = machineId != null ? String(machineId).trim() : '';
  const cid =
    companyId != null && String(companyId).trim() !== '' ? String(companyId).trim() : '';
  return `${cid}::${mid}`;
}

function isUnconfirmedOutcome(result) {
  return result && typeof result === 'object' && 'success' in result && result.success === null;
}

function resolveSuccess(result) {
  if (isUnconfirmedOutcome(result)) {
    return null;
  }
  if (result == null) return false;
  if (typeof result === 'boolean') return result;
  if (typeof result === 'object') {
    if (typeof result.success === 'boolean') return result.success;
    if (result.outcome != null) {
      const o = String(result.outcome).trim().toLowerCase();
      return o === 'success' || o === 'ok' || o === 'succeeded' || o === 'true';
    }
  }
  return false;
}

function resolveActionKey(action) {
  if (!action || typeof action !== 'object') return 'intervencao_geral';
  const k =
    action.action_type != null
      ? String(action.action_type).trim()
      : action.action_key != null
        ? String(action.action_key).trim()
        : action.action != null
          ? String(action.action).trim()
          : '';
  return k || 'intervencao_geral';
}

/**
 * @param {string|undefined} raw
 * @returns {ContextTag}
 */
function normalizeContextTag(raw) {
  if (raw == null) {
    return 'failure';
  }
  const t = String(raw).trim().toLowerCase();
  if (t === 'maintenance' || t === 'quality' || t === 'failure') {
    return t;
  }
  return 'failure';
}

/**
 * Infere o contexto operacional a partir de sinais (tipo de evento, risco, intent, texto livre).
 * Heurística estável: preferência para qualidade e manutenção quando palavras-chave coincidem; caso contrário, falha operacional.
 *
 * @param {object} [params]
 * @param {string} [params.event_type]
 * @param {string} [params.risk_level]
 * @param {string} [params.intent]
 * @param {string} [params.text] motivo, descrição ou corpo a analisar
 * @returns {ContextTag}
 */
function inferContextTagFromSignals({ event_type, risk_level, intent, text } = {}) {
  const parts = [event_type, intent, text]
    .filter((x) => x != null)
    .map((x) => String(x).toLowerCase());
  const blob = parts.join(' ');

  const hasQuality =
    /quali|qms|conformi|lote|inspe|reprova|nc\b|não[- ]?conform|rejeit|amostra|produt(o|a)\s+fora|sensor\s+de\s+qualid/.test(
      blob
    ) ||
    /get_product|quality|qms|inspe/.test(intent != null ? String(intent).toLowerCase() : '');
  const hasMaintenance =
    /manuten|tpm|lubric|lubrif|preditiv|preventiv|taref(a|as)|\bos\b|ordem\s+de\s+servi|falta\s+de\s+lub/.test(
      blob
    ) ||
    /manuten|tpm|os_/.test(intent != null ? String(intent).toLowerCase() : '');

  if (hasQuality) {
    return 'quality';
  }
  if (hasMaintenance) {
    return 'maintenance';
  }

  const ev = event_type != null ? String(event_type).toLowerCase() : '';
  if (/falh|falha|parad|paragem|perda|alarm|crit|emerg|trip|down|parad/.test(ev + ' ' + blob)) {
    return 'failure';
  }
  if (event_type && /qms|qualidade|lote|inspe/.test(ev)) {
    return 'quality';
  }
  if (event_type && /manut|tarefa|tpm|os_/.test(ev)) {
    return 'maintenance';
  }

  const risk = risk_level != null ? String(risk_level).trim().toLowerCase() : '';
  if (/(critical|cr[ií]tico|muito\s+alto|high|alto|elev|sever)/.test(risk)) {
    return 'failure';
  }

  if (/operational|maquin|sens?or|parad|falh/.test(intent != null ? String(intent).toLowerCase() : '')) {
    return 'failure';
  }

  return 'failure';
}

/**
 * @param {object} [action]
 * @param {object|boolean} [result]
 * @returns {ContextTag}
 */
function inferContextTagFromActionResult(action, result) {
  const a = action && typeof action === 'object' ? action : null;
  const r = result && typeof result === 'object' && result !== null ? result : null;
  const event_type =
    (a && a.event_type != null ? String(a.event_type) : '') ||
    (r && r.event_type != null ? String(r.event_type) : '');
  const risk_level = a && a.risk_level != null ? a.risk_level : r && r.risk_level;
  const intent = a && (a.intent != null ? a.intent : a.intent_key);
  const text =
    (a && a.reason != null ? String(a.reason) : '') ||
    (a && a.message != null ? String(a.message) : '') ||
    (r && r.message != null ? String(r.message) : '') ||
    (r && r.detail != null ? String(r.detail) : '');

  if (r && r.context_tag != null) {
    return normalizeContextTag(r.context_tag);
  }
  if (a && a.context_tag != null) {
    return normalizeContextTag(a.context_tag);
  }

  return inferContextTagFromSignals({ event_type, risk_level, intent, text });
}

/**
 * @param {string|null|undefined} companyId
 * @param {string} machineId
 * @param {string} actionKey
 * @param {boolean} success
 */
function recordActionOutcome(companyId, machineId, actionKey, success) {
  const sk = scopeKey(companyId, machineId);
  if (!machineActionStats.has(sk)) {
    machineActionStats.set(sk, new Map());
  }
  const am = machineActionStats.get(sk);
  const prev = am.get(actionKey) || { attempts: 0, successes: 0 };
  const attempts = prev.attempts + 1;
  const successes = prev.successes + (success ? 1 : 0);
  am.set(actionKey, { attempts, successes });
}

/**
 * @param {string|null|undefined} companyId
 * @param {string} machineId
 * @param {ContextTag} contextTag
 * @param {boolean} success
 */
function recordContextOutcome(companyId, machineId, contextTag, success) {
  const tag = normalizeContextTag(contextTag);
  const sk = scopeKey(companyId, machineId);
  if (!machineContextStats.has(sk)) {
    machineContextStats.set(sk, new Map());
  }
  const cm = machineContextStats.get(sk);
  const prev = cm.get(tag) || { attempts: 0, successes: 0 };
  const attempts = prev.attempts + 1;
  const successes = prev.successes + (success ? 1 : 0);
  cm.set(tag, { attempts, successes });
}

/**
 * @param {string|null|undefined} companyId
 * @param {string} machineId
 * @returns {string|null}
 */
function pickMostEffectiveAction(companyId, machineId) {
  const sk = scopeKey(companyId, machineId);
  const am = machineActionStats.get(sk);
  if (!am || am.size === 0) {
    return null;
  }
  let bestKey = null;
  let bestRate = -1;
  let bestAttempts = 0;
  for (const [k, v] of am) {
    if (k === AGGREGATE_ACTION_TYPE) continue;
    const rate = v.attempts > 0 ? v.successes / v.attempts : 0;
    if (rate > bestRate || (rate === bestRate && v.attempts > bestAttempts)) {
      bestRate = rate;
      bestKey = k;
      bestAttempts = v.attempts;
    }
  }
  return bestKey;
}

/**
 * @param {object} row
 */
function applyDbRowToMemory(row) {
  const cid = row && row.company_id != null ? String(row.company_id) : '';
  const mid = row && row.machine_id != null ? String(row.machine_id).trim() : '';
  if (!cid || !mid) return;
  const sk = scopeKey(cid, mid);
  const at = row.action_type != null ? String(row.action_type) : 'intervencao_geral';
  const attempts = parseInt(row.attempts, 10) || 0;
  const sr = row.success_rate != null ? parseFloat(String(row.success_rate)) : 0;
  if (Number.isNaN(sr)) {
    return;
  }

  if (at === AGGREGATE_ACTION_TYPE) {
    machineOutcomes.set(sk, {
      success_rate: Math.round(Math.min(1, Math.max(0, sr)) * 10000) / 10000,
      attempts
    });
    return;
  }

  if (!machineActionStats.has(sk)) {
    machineActionStats.set(sk, new Map());
  }
  const successes =
    attempts > 0 ? Math.min(attempts, Math.max(0, Math.round(sr * attempts))) : 0;
  machineActionStats.get(sk).set(at, { attempts, successes });
}

/**
 * Remove da memória todas as chaves de uma empresa (antes de recarregar do BD).
 * @param {string} companyId
 */
function clearLearningMemoryForCompany(companyId) {
  const cid = String(companyId).trim();
  if (!cid) return;
  const prefix = `${cid}::`;
  for (const k of machineOutcomes.keys()) {
    if (k.startsWith(prefix)) {
      machineOutcomes.delete(k);
    }
  }
  for (const k of machineActionStats.keys()) {
    if (k.startsWith(prefix)) {
      machineActionStats.delete(k);
    }
  }
  for (const k of machineOutcomeTimeline.keys()) {
    if (k.startsWith(prefix)) {
      machineOutcomeTimeline.delete(k);
    }
  }
  for (const k of machineContextStats.keys()) {
    if (k.startsWith(prefix)) {
      machineContextStats.delete(k);
    }
  }
}

/**
 * @param {string} companyId
 * @param {string} machineId
 * @param {string} actionType
 * @param {number} successRate
 * @param {number} attempts
 * @returns {Promise<void>}
 */
async function upsertLearningRow(companyId, machineId, actionType, successRate, attempts) {
  await db.query(
    `
    INSERT INTO operational_learning (company_id, machine_id, action_type, success_rate, attempts, updated_at)
    VALUES ($1::uuid, $2, $3, $4, $5, now())
    ON CONFLICT (company_id, machine_id, action_type)
    DO UPDATE SET
      success_rate = EXCLUDED.success_rate,
      attempts = EXCLUDED.attempts,
      updated_at = now()
    `,
    [companyId, machineId, actionType, successRate, attempts]
  );
}

/**
 * Persiste o estado em memória para a máquina (agregado + linhas por ação).
 * @param {string} companyId
 * @param {string} machineId
 * @returns {Promise<void>}
 */
async function persistMachineLearningToDb(companyId, machineId) {
  if (!companyId || !isValidUUID(String(companyId)) || !machineId) {
    return;
  }
  const sk = scopeKey(companyId, machineId);
  const agg = machineOutcomes.get(sk);
  const am = machineActionStats.get(sk);
  if (!agg && !am) {
    return;
  }
  if (agg) {
    await upsertLearningRow(
      companyId,
      machineId,
      AGGREGATE_ACTION_TYPE,
      Math.min(1, Math.max(0, agg.success_rate)),
      Math.max(0, parseInt(agg.attempts, 10) || 0)
    );
  }
  if (am) {
    for (const [actionKey, row] of am) {
      if (actionKey === AGGREGATE_ACTION_TYPE) continue;
      const att = row.attempts || 0;
      const sr = att > 0 ? row.successes / att : 0;
      await upsertLearningRow(
        companyId,
        machineId,
        actionKey,
        Math.round(Math.min(1, Math.max(0, sr)) * 10000) / 10000,
        att
      );
    }
  }
}

/**
 * @param {string} companyId
 * @param {string} machineId
 */
function schedulePersistMachineLearning(companyId, machineId) {
  if (!companyId || !isValidUUID(String(companyId)) || !machineId) {
    return;
  }
  setImmediate(() => {
    persistMachineLearningToDb(companyId, machineId).catch((e) => {
      console.warn('[OPERATIONAL_LEARNING_PERSIST]', e && e.message ? String(e.message) : e);
    });
  });
}

/**
 * Regista o desfecho de uma ação operacional e atualiza métricas por máquina.
 * `result.success: null` = não confirmado — não altera success_rate nem contagens.
 * Opcional: `company_id` no corpo ou em `action.company_id` para multi-tenant e persistência.
 *
 * @param {object} params
 * @param {object} [params.action]
 * @param {boolean|object} [params.result]
 * @param {string} [params.company_id]
 */
function recordOperationalOutcome({ action, result, company_id: companyIdParam } = {}) {
  const mid = action && action.machine_id != null ? String(action.machine_id).trim() : '';
  if (!mid) {
    return;
  }

  const companyId =
    companyIdParam != null && String(companyIdParam).trim() !== ''
      ? String(companyIdParam).trim()
      : action && action.company_id != null
        ? String(action.company_id).trim()
        : '';

  const success = resolveSuccess(result);
  if (success === null) {
    return;
  }

  const actionKey = resolveActionKey(action);
  const contextTag = inferContextTagFromActionResult(action, result);
  recordActionOutcome(companyId, mid, actionKey, success);
  recordContextOutcome(companyId, mid, contextTag, success);

  const sk = scopeKey(companyId, mid);
  const prev = machineOutcomes.get(sk) || { success_rate: 0, attempts: 0 };
  const attempts = prev.attempts + 1;
  const success_rate =
    prev.attempts === 0
      ? success
        ? 1
        : 0
      : (prev.success_rate * prev.attempts + (success ? 1 : 0)) / attempts;

  machineOutcomes.set(sk, {
    success_rate: Math.round(success_rate * 10000) / 10000,
    attempts
  });

  const ts = new Date().toISOString();
  if (!machineOutcomeTimeline.has(sk)) {
    machineOutcomeTimeline.set(sk, []);
  }
  const timeline = machineOutcomeTimeline.get(sk);
  timeline.push({ action_type: actionKey, success, timestamp: ts, context_tag: contextTag });
  while (timeline.length > MAX_OUTCOMES_PER_MACHINE) {
    timeline.shift();
  }

  if (companyId && isValidUUID(companyId)) {
    schedulePersistMachineLearning(companyId, mid);
  }
}

/**
 * Métricas agregadas por máquina (memória + opcionalmente hidratada do BD no arranque).
 * Compatível: (machine_id) legado ou (company_id, machine_id).
 * @param {string|null|undefined} companyId
 * @param {string} [machine_id]
 * @returns {{ success_rate: number, attempts: number }|null}
 */
function getMachineLearningMetrics(companyId, machine_id) {
  let cid = companyId;
  let mid = machine_id;
  if (mid === undefined && cid != null) {
    mid = cid;
    cid = null;
  }
  mid = mid != null ? String(mid).trim() : '';
  if (!mid) {
    return null;
  }
  const sk = scopeKey(cid, mid);
  const row = machineOutcomes.get(sk);
  return row ? { success_rate: row.success_rate, attempts: row.attempts } : null;
}

/**
 * Métricas de aprendizado filtradas por contexto (failure | maintenance | quality).
 * Compatível com a assinatura de getMachineLearningMetrics: (machine_id) legado ou (company_id, machine_id, context_tag).
 * Se não houver dados para o contexto, devolve `null` (o chamador usa o modelo global).
 *
 * @param {string|null|undefined} companyId
 * @param {string} [machine_id]
 * @param {string} [context_tag]
 * @returns {{ success_rate: number, attempts: number, context_tag: ContextTag }|null}
 */
function getLearningByContext(companyId, machine_id, context_tag) {
  if (arguments.length < 2) {
    return null;
  }
  let cid;
  let mid;
  let tag;
  if (arguments.length >= 3) {
    cid = companyId;
    mid = machine_id;
    tag = context_tag;
  } else {
    cid = null;
    mid = companyId;
    tag = machine_id;
  }
  mid = mid != null ? String(mid).trim() : '';
  if (!mid) {
    return null;
  }
  const ctx = normalizeContextTag(tag);
  const sk = scopeKey(cid, mid);
  const m = machineContextStats.get(sk)?.get(ctx);
  if (!m || m.attempts < 1) {
    return null;
  }
  return {
    success_rate: m.attempts > 0 ? m.successes / m.attempts : 0,
    attempts: m.attempts,
    context_tag: ctx
  };
}

/**
 * @param {object} [params]
 * @param {string[]} [params.machine_ids]
 * @param {string} [params.company_id]
 * @returns {Array<{ machine_id: string, most_effective_action: string|null, success_rate: number }>}
 */
function getLearningSummary({ machine_ids = [], company_id = null } = {}) {
  const list = Array.isArray(machine_ids) ? machine_ids : [];
  const cid = company_id != null ? String(company_id).trim() : '';
  const out = [];

  for (const raw of list) {
    const machine_id = raw != null ? String(raw).trim() : '';
    if (!machine_id) continue;

    const overall = getMachineLearningMetrics(cid || null, machine_id);
    const bestAction = pickMostEffectiveAction(cid || null, machine_id);

    out.push({
      machine_id,
      most_effective_action: bestAction,
      success_rate: overall != null ? overall.success_rate : 0
    });
  }

  return out;
}

/**
 * Histórico agrupado por tipo de ação (formato pedido para telemetria / extensões).
 * @param {string|null|undefined} companyId
 * @param {string} machine_id
 * @returns {Array<{ machine_id: string, action_type: string, outcomes: Array<{ success: boolean, timestamp: string, context_tag: ContextTag }> }>}
 */
function getMachineActionOutcomeHistory(companyId, machine_id) {
  let cid = companyId;
  let mid = machine_id;
  if (mid === undefined && cid != null) {
    mid = cid;
    cid = null;
  }
  mid = mid != null ? String(mid).trim() : '';
  if (!mid) {
    return [];
  }
  const sk = scopeKey(cid, mid);
  const raw = machineOutcomeTimeline.get(sk) || [];
  const byAction = new Map();
  for (const e of raw) {
    const at = e.action_type != null ? String(e.action_type) : 'intervencao_geral';
    if (!byAction.has(at)) {
      byAction.set(at, []);
    }
    byAction.get(at).push({
      success: Boolean(e.success),
      timestamp: e.timestamp,
      context_tag: e.context_tag != null ? normalizeContextTag(e.context_tag) : 'failure'
    });
  }
  const out = [];
  for (const [action_type, outcomes] of byAction) {
    out.push({ machine_id: mid, action_type, outcomes });
  }
  return out;
}

/**
 * Taxa de sucesso dos últimos `n` eventos (ordenados por tempo).
 * @param {Array<{ success: boolean, timestamp: string }>} sorted
 * @param {number} n
 * @returns {{ rate: number|null, n: number }}
 */
function successRateLastN(sorted, n) {
  const take = Math.min(n, sorted.length);
  if (take === 0) {
    return { rate: null, n: 0 };
  }
  const slice = sorted.slice(-take);
  const ok = slice.filter((e) => e.success).length;
  return { rate: ok / slice.length, n: slice.length };
}

/**
 * Compara primeira metade vs segunda metade da janela recente (orden cronológico).
 * @param {Array<{ success: boolean, timestamp: string }>} events
 * @returns {{
 *   trend: 'improving'|'worsening'|'stable'|'insufficient_data',
 *   recent_success_rate: number|null,
 *   recent_window_n: number,
 *   split_older_rate: number|null,
 *   split_newer_rate: number|null
 * }}
 */
function computeOutcomeTrend(events) {
  if (!Array.isArray(events) || events.length < TREND_MIN_EVENTS) {
    return {
      trend: 'insufficient_data',
      recent_success_rate: null,
      recent_window_n: events && events.length ? events.length : 0,
      split_older_rate: null,
      split_newer_rate: null
    };
  }
  const sorted = events
    .slice()
    .sort((a, b) => String(a.timestamp).localeCompare(String(b.timestamp)));
  const win = sorted.slice(-Math.min(TREND_RECENT_N, sorted.length));
  const recent = successRateLastN(win, win.length);
  const half = Math.floor(win.length / 2);
  if (half < 1) {
    return {
      trend: 'insufficient_data',
      recent_success_rate: recent.rate,
      recent_window_n: win.length,
      split_older_rate: null,
      split_newer_rate: null
    };
  }
  const older = win.slice(0, half);
  const newer = win.slice(half);
  const rOlder = older.filter((e) => e.success).length / older.length;
  const rNewer = newer.filter((e) => e.success).length / newer.length;
  const diff = rNewer - rOlder;
  let trend = 'stable';
  if (diff > TREND_EPS) {
    trend = 'improving';
  } else if (diff < -TREND_EPS) {
    trend = 'worsening';
  }
  return {
    trend,
    recent_success_rate: recent.rate,
    recent_window_n: win.length,
    split_older_rate: rOlder,
    split_newer_rate: rNewer
  };
}

/**
 * Analisa taxa de sucesso recente e tendência (melhorar / piorar) com base no histórico temporal.
 * Compatível com getMachineLearningMetrics: (machine_id) legado ou (company_id, machine_id).
 *
 * @param {string|null|undefined} companyId
 * @param {string} [machine_id]
 * @returns {{
 *   machine_id: string,
 *   company_id: string|null,
 *   event_count: number,
 *   recent_success_rate: number|null,
 *   recent_window_n: number,
 *   trend: 'improving'|'worsening'|'stable'|'insufficient_data',
 *   split_older_rate: number|null,
 *   split_newer_rate: number|null
 * }}
 */
function getMachineTrend(companyId, machine_id) {
  let cid = companyId;
  let mid = machine_id;
  if (mid === undefined && cid != null) {
    mid = cid;
    cid = null;
  }
  mid = mid != null ? String(mid).trim() : '';
  const company_id = cid != null && String(cid).trim() !== '' ? String(cid).trim() : null;
  if (!mid) {
    return {
      machine_id: '',
      company_id,
      event_count: 0,
      recent_success_rate: null,
      recent_window_n: 0,
      trend: 'insufficient_data',
      split_older_rate: null,
      split_newer_rate: null
    };
  }
  const sk = scopeKey(cid, mid);
  const events = machineOutcomeTimeline.get(sk) || [];
  const t = computeOutcomeTrend(events);
  return {
    machine_id: mid,
    company_id,
    event_count: events.length,
    recent_success_rate: t.recent_success_rate,
    recent_window_n: t.recent_window_n,
    trend: t.trend,
    split_older_rate: t.split_older_rate,
    split_newer_rate: t.split_newer_rate
  };
}

/**
 * Carrega linhas de aprendizado do BD para memória (escopo de uma empresa).
 * Em falha: mantém o estado em memória existente.
 * @param {string} company_id
 * @returns {Promise<void>}
 */
async function loadLearningFromDB(company_id) {
  const cid = company_id != null ? String(company_id).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return;
  }
  try {
    clearLearningMemoryForCompany(cid);
    const r = await db.query(
      `SELECT company_id, machine_id, action_type, success_rate, attempts
       FROM operational_learning
       WHERE company_id = $1::uuid`,
      [cid]
    );
    for (const row of r.rows || []) {
      applyDbRowToMemory(row);
    }
  } catch (e) {
    console.warn('[OPERATIONAL_LEARNING_LOAD_COMPANY]', e && e.message ? String(e.message) : e);
  }
}

/**
 * Carrega toda a tabela no arranque (repõe memória a partir do BD).
 * Em falha: continua só com o que houver em memória.
 * @returns {Promise<void>}
 */
async function loadAllOperationalLearningFromDB() {
  try {
    const r = await db.query(
      `SELECT company_id, machine_id, action_type, success_rate, attempts
       FROM operational_learning`
    );
    machineOutcomes.clear();
    machineActionStats.clear();
    machineOutcomeTimeline.clear();
    machineContextStats.clear();
    for (const row of r.rows || []) {
      applyDbRowToMemory(row);
    }
    console.info(
      '[OPERATIONAL_LEARNING] Hidratação concluída:',
      (r.rows || []).length,
      'registo(s)'
    );
  } catch (e) {
    console.warn(
      '[OPERATIONAL_LEARNING_LOAD_ALL]',
      e && e.message ? String(e.message) : e
    );
  }
}

module.exports = {
  recordOperationalOutcome,
  getMachineLearningMetrics,
  getMachineActionOutcomeHistory,
  getMachineTrend,
  getLearningSummary,
  getLearningByContext,
  inferContextTagFromSignals,
  inferContextTagFromActionResult,
  CONTEXT_TAGS,
  loadLearningFromDB,
  loadAllOperationalLearningFromDB,
  AGGREGATE_ACTION_TYPE,
  MAX_OUTCOMES_PER_MACHINE
};
