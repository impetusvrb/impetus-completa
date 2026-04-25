'use strict';

/**
 * Validação semântica pós-síntese: substitui checagem exclusivamente por regex
 * (answerHonors* no executionLayer) por pontuação + regras de ancoragem ao dossier.
 */

const MIN_ACCEPTABLE_SCORE = 2;
const ENTITIES_WEIGHT = 2;
const OPERATIONAL_LEXEME_WEIGHT = 1;

const RISK_RE =
  /risco|cr[ií]tica|cr[ií]tico|severidade|previs(ão|ões|ao|oes)|falha|alarme|anomali|degrad|urg[eê]ncia|emerg|down|parada|trip|stop|fail|erro/i;
const OP_LEX_RE =
  /risco|operacional|m[aá]quina|equipamento|linha|setor|manuten(ç|c)ao|evento|sensor|janela|turno|planta|f[aá]brica|indicad|kpi|prioridad|a(ç|c)ao|tarefa|recomend|inspe(c|ç)/i;
const ACTION_OR_PRIORITY_RE =
  /a(ção|cao|coes|ções)|tarefa|prioridad|urg[eê]ncia|cr[ií]t|verifica(ç|c)(a|ã)o|recomend|interven(ç|c)|execut|corretiv|inspe(c|ç)/i;

/**
 * @param {object|undefined} cd
 * @returns {string[]}
 */
function machineNamesFromContextualData(cd) {
  const names = [];
  if (cd && Array.isArray(cd.machines)) {
    for (const m of cd.machines) {
      if (m && m.name) names.push(String(m.name).trim().toLowerCase());
    }
  }
  return names.filter((n) => n.length > 1);
}

/**
 * @param {object|undefined} cd
 * @returns {string[]}
 */
function collectMachineIdsFromPredictions(cd) {
  const out = [];
  if (cd && Array.isArray(cd.predictions)) {
    for (const p of cd.predictions) {
      if (p && p.machine_id != null) out.push(String(p.machine_id).trim());
    }
  }
  return out;
}

/**
 * @param {object|undefined} cd
 * @returns {string[]}
 */
function collectMachineIdsFromPrioritizedActions(cd) {
  const out = [];
  if (cd && Array.isArray(cd.prioritized_actions)) {
    for (const p of cd.prioritized_actions) {
      if (p && p.machine_id != null) out.push(String(p.machine_id).trim());
    }
  }
  return out;
}

function textReferencesMachineIds(text, ids) {
  const t = text != null ? String(text).toLowerCase() : '';
  if (!t || !Array.isArray(ids) || !ids.length) return false;
  for (const raw of ids) {
    const id = String(raw).trim().toLowerCase();
    if (!id) continue;
    if (t.includes(id)) return true;
    if (id.length > 8 && t.includes(id.slice(0, 8))) return true;
  }
  return false;
}

function textReferencesAnyMachineName(text, names) {
  const t = text != null ? String(text).toLowerCase() : '';
  if (!t) return false;
  for (const n of names) {
    if (n && t.includes(n)) return true;
  }
  return false;
}

/**
 * Há bloco `machine` (get_machine_status) a exigir ancoragem explícita.
 * @param {object|undefined} cd
 * @returns {boolean}
 */
function hasMachineObjectGrounding(cd) {
  if (!cd || !cd.machine || typeof cd.machine !== 'object' || Array.isArray(cd.machine)) {
    return false;
  }
  const m = cd.machine;
  const id = m.id != null ? String(m.id).trim() : '';
  const name = m.name != null ? String(m.name).trim() : '';
  return id.length > 0 || name.length > 0;
}

/**
 * Regra: predictions → risco **ou** referência a máquina (id/nome em contexto).
 * @param {string} text
 * @param {object|undefined} cd
 * @returns {boolean}
 */
function meetsPredictionsGroundingRule(text, cd) {
  if (RISK_RE.test(text)) return true;
  if (textReferencesMachineIds(text, collectMachineIdsFromPredictions(cd))) return true;
  if (textReferencesAnyMachineName(text, machineNamesFromContextualData(cd))) return true;
  return false;
}

/**
 * Regra: prioritized_actions → ação **ou** prioridade (ou texto das entradas).
 * @param {string} text
 * @param {object|undefined} cd
 * @returns {boolean}
 */
function meetsPrioritiesGroundingRule(text, cd) {
  const t = String(text);
  if (ACTION_OR_PRIORITY_RE.test(t)) return true;
  if (/prioridad|urg[eê]ncia|cr[ií]tico?|a(ç|c)ao|tarefa|recomend|execut|corretiv/i.test(t)) {
    return true;
  }
  if (cd && Array.isArray(cd.prioritized_actions)) {
    const low = t.toLowerCase();
    for (const a of cd.prioritized_actions) {
      const fields = [a && a.title, a && a.action, a && a.suggested_action, a && a.description, a && a.priority];
      for (const f of fields) {
        if (f == null) continue;
        const s = String(f).trim();
        if (s.length < 2) continue;
        const h = s.toLowerCase().slice(0, Math.min(48, s.length));
        if (low.includes(h) || low.includes(s.toLowerCase())) return true;
      }
    }
  }
  return false;
}

/**
 * Regra: objeto `machine` → nome ou id presentes na resposta.
 * @param {string} text
 * @param {object|undefined} cd
 * @returns {boolean}
 */
function meetsMachineObjectGroundingRule(text, cd) {
  if (!cd || !cd.machine || typeof cd.machine !== 'object') return true;
  const m = cd.machine;
  const t = String(text).toLowerCase();
  const id = m.id != null ? String(m.id).trim() : '';
  const name = m.name != null ? String(m.name).trim() : '';
  if (id) {
    const low = id.toLowerCase();
    if (t.includes(low)) return true;
    if (id.length > 8 && t.includes(low.slice(0, 8))) return true;
  }
  if (name) {
    const n = name.toLowerCase();
    if (n.length > 1 && t.includes(n)) return true;
  }
  return false;
}

/**
 * +2: menção a entidades concretas do dossier (ids, nomes, produto, utilizador).
 * @param {string} text
 * @param {object|undefined} cd
 * @returns {boolean}
 */
function hasEntityPresenceScore(text, cd) {
  if (!text || !cd) return false;
  const t = String(text).toLowerCase();
  if (textReferencesMachineIds(t, collectMachineIdsFromPredictions(cd))) return true;
  if (textReferencesMachineIds(t, collectMachineIdsFromPrioritizedActions(cd))) return true;
  if (textReferencesAnyMachineName(t, machineNamesFromContextualData(cd))) return true;
  if (cd.machine && cd.machine.id != null) {
    const id = String(cd.machine.id).trim().toLowerCase();
    if (id && t.includes(id)) return true;
  }
  if (cd.machine && cd.machine.name) {
    const n = String(cd.machine.name).trim().toLowerCase();
    if (n.length > 1 && t.includes(n)) return true;
  }
  if (cd.product && (cd.product.name != null || cd.product.code != null)) {
    const pn = cd.product.name != null ? String(cd.product.name).toLowerCase() : '';
    const pc = cd.product.code != null ? String(cd.product.code).toLowerCase() : '';
    if (pn.length > 1 && t.includes(pn)) return true;
    if (pc && t.includes(pc)) return true;
  }
  if (Array.isArray(cd.users) && cd.users[0] && cd.users[0].name) {
    const n = String(cd.users[0].name).trim().toLowerCase();
    if (n.length > 2 && t.includes(n)) return true;
  }
  if (Array.isArray(cd.users)) {
    for (const u of cd.users) {
      if (u && u.nome) {
        const n = String(u.nome).trim().toLowerCase();
        if (n.length > 2 && t.includes(n)) return true;
      }
    }
  }
  return false;
}

/**
 * +1: vocabulário operacional (sem ser só match de entidade bruta).
 * @param {string} text
 * @returns {boolean}
 */
function hasOperationalLexemeScore(text) {
  if (text == null || !String(text).trim()) return false;
  return OP_LEX_RE.test(String(text));
}

/**
 * @param {string|null|undefined} answer
 * @param {object|null|undefined} contextual_data
 * @returns {{ valid: boolean, score: number, reason: string }}
 */
function isResponseContextuallyValid(answer, contextual_data) {
  const t = answer != null ? String(answer) : '';
  if (!t.trim()) {
    return { valid: false, score: 0, reason: 'empty_answer' };
  }

  const cd = contextual_data && typeof contextual_data === 'object' && !Array.isArray(contextual_data) ? contextual_data : {};

  const hasPred = Array.isArray(cd.predictions) && cd.predictions.length > 0;
  const hasPri = Array.isArray(cd.prioritized_actions) && cd.prioritized_actions.length > 0;
  const hasMach = hasMachineObjectGrounding(cd);
  const anyGate = hasPred || hasPri || hasMach;

  if (!anyGate) {
    return { valid: true, score: Math.max(MIN_ACCEPTABLE_SCORE, 2), reason: 'no_contextual_gates' };
  }

  if (hasPred && !meetsPredictionsGroundingRule(t, cd)) {
    return { valid: false, score: 0, reason: 'predictions_not_grounded' };
  }
  if (hasPri && !meetsPrioritiesGroundingRule(t, cd)) {
    return { valid: false, score: 0, reason: 'priorities_not_grounded' };
  }
  if (hasMach && !meetsMachineObjectGroundingRule(t, cd)) {
    return { valid: false, score: 0, reason: 'machine_not_grounded' };
  }

  let score = 0;
  if (hasEntityPresenceScore(t, cd)) {
    score += ENTITIES_WEIGHT;
  }
  if (hasOperationalLexemeScore(t)) {
    score += OPERATIONAL_LEXEME_WEIGHT;
  }

  if (score < MIN_ACCEPTABLE_SCORE) {
    if (hasPred && RISK_RE.test(t)) {
      score = Math.max(score, MIN_ACCEPTABLE_SCORE);
    } else if (hasPri) {
      score = Math.max(score, MIN_ACCEPTABLE_SCORE);
    } else if (hasMach && meetsMachineObjectGroundingRule(t, cd)) {
      score = Math.max(score, MIN_ACCEPTABLE_SCORE);
    }
  }

  if (score < MIN_ACCEPTABLE_SCORE) {
    return { valid: false, score, reason: 'score_below_threshold' };
  }

  return { valid: true, score, reason: 'ok' };
}

module.exports = {
  isResponseContextuallyValid,
  hasMachineObjectGrounding,
  MIN_ACCEPTABLE_SCORE
};
