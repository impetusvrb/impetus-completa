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
  recordActionOutcome(companyId, mid, actionKey, success);

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
  getLearningSummary,
  loadLearningFromDB,
  loadAllOperationalLearningFromDB,
  AGGREGATE_ACTION_TYPE
};
