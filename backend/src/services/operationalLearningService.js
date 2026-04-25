'use strict';

/**
 * Aprendizado operacional leve em memória (por processo).
 * Agrega taxa de sucesso por máquina e, opcionalmente, por tipo de ação.
 */

/** @type {Map<string, { success_rate: number, attempts: number }>} */
const machineOutcomes = new Map();

/** @type {Map<string, Map<string, { attempts: number, successes: number }>>} */
const machineActionStats = new Map();

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

function recordActionOutcome(machineId, actionKey, success) {
  if (!machineActionStats.has(machineId)) {
    machineActionStats.set(machineId, new Map());
  }
  const am = machineActionStats.get(machineId);
  const prev = am.get(actionKey) || { attempts: 0, successes: 0 };
  const attempts = prev.attempts + 1;
  const successes = prev.successes + (success ? 1 : 0);
  am.set(actionKey, { attempts, successes });
}

function pickMostEffectiveAction(machineId) {
  const am = machineActionStats.get(machineId);
  if (!am || am.size === 0) {
    return null;
  }
  let bestKey = null;
  let bestRate = -1;
  let bestAttempts = 0;
  for (const [k, v] of am) {
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
 * Regista o desfecho de uma ação operacional e atualiza métricas por máquina.
 * `result.success: null` = não confirmado — não altera success_rate nem contagens (apenas sinal explícito).
 * Opcional: `result.confidence: 'auto_generated'` para marcar sinais sem validação humana.
 *
 * @param {object} params
 * @param {{ machine_id?: string, action_type?: string, action_key?: string, action?: string } & Record<string, unknown>} [params.action]
 * @param {{ success?: boolean|null, outcome?: string, confidence?: string }|boolean} [params.result]
 */
function recordOperationalOutcome({ action, result } = {}) {
  const mid =
    action && action.machine_id != null ? String(action.machine_id).trim() : '';
  if (!mid) {
    return;
  }

  const success = resolveSuccess(result);
  if (success === null) {
    return;
  }

  const actionKey = resolveActionKey(action);
  recordActionOutcome(mid, actionKey, success);

  const prev = machineOutcomes.get(mid) || { success_rate: 0, attempts: 0 };
  const attempts = prev.attempts + 1;
  const success_rate =
    prev.attempts === 0
      ? success
        ? 1
        : 0
      : (prev.success_rate * prev.attempts + (success ? 1 : 0)) / attempts;

  machineOutcomes.set(mid, {
    success_rate: Math.round(success_rate * 10000) / 10000,
    attempts
  });
}

/**
 * Métricas agregadas por máquina (memória do processo).
 * @param {string} machine_id
 * @returns {{ success_rate: number, attempts: number }|null}
 */
function getMachineLearningMetrics(machine_id) {
  const mid = machine_id != null ? String(machine_id).trim() : '';
  if (!mid || !machineOutcomes.has(mid)) {
    return null;
  }
  const row = machineOutcomes.get(mid);
  return row ? { success_rate: row.success_rate, attempts: row.attempts } : null;
}

/**
 * Resumo de aprendizado para as máquinas do contexto (ex.: ativos do tenant).
 * Sem histórico: success_rate 0 e most_effective_action null.
 *
 * @param {object} [params]
 * @param {string[]} [params.machine_ids] — geralmente ids de `machines` do contexto operacional
 * @returns {Array<{ machine_id: string, most_effective_action: string|null, success_rate: number }>}
 */
function getLearningSummary({ machine_ids = [] } = {}) {
  const list = Array.isArray(machine_ids) ? machine_ids : [];
  const out = [];

  for (const raw of list) {
    const machine_id = raw != null ? String(raw).trim() : '';
    if (!machine_id) continue;

    const overall = getMachineLearningMetrics(machine_id);
    const bestAction = pickMostEffectiveAction(machine_id);

    out.push({
      machine_id,
      most_effective_action: bestAction,
      success_rate: overall != null ? overall.success_rate : 0
    });
  }

  return out;
}

module.exports = {
  recordOperationalOutcome,
  getMachineLearningMetrics,
  getLearningSummary
};
