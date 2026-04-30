'use strict';

/**
 * Ponte operacional → recordOperationalOutcome (somente registo em memória).
 * Não altera ODE nem executionLayer.
 */

const operationalFeedbackService = require('./operationalFeedbackService');

function normEventImpact(ev) {
  const t = ev && ev.type != null ? String(ev.type).toLowerCase() : '';
  const sev =
    ev && (ev.severity != null || ev.severidade != null)
      ? String(ev.severity || ev.severidade).toLowerCase()
      : '';
  if (/crit|alta|high|failure|falha/.test(t) || /crit|alta|high/.test(sev)) return 'high';
  if (/alert|task|operational|warning|media|medium/.test(t) || /med|média|media/.test(sev))
    return 'medium';
  return 'low';
}

/**
 * @param {object} payload
 * @param {string} payload.decisionId
 * @param {string|null} [payload.companyId]
 * @param {object[]} [payload.operationalEvents] — itens normalizados { type, severity?, ... }
 * @returns {{ ingested: number }}
 */
function ingestOperationalFeedback(payload) {
  const p = payload && typeof payload === 'object' ? payload : {};
  const decisionId = p.decisionId != null ? String(p.decisionId) : '';
  if (!decisionId) return { ingested: 0 };

  const events = Array.isArray(p.operationalEvents) ? p.operationalEvents : [];
  if (events.length === 0) {
    return { ingested: 0 };
  }

  let maxLevel = 'low';
  for (const ev of events) {
    const lvl = normEventImpact(ev);
    if (lvl === 'high') maxLevel = 'high';
    else if (lvl === 'medium' && maxLevel !== 'high') maxLevel = 'medium';
  }

  try {
    operationalFeedbackService.recordOperationalOutcome({
      decisionId,
      companyId: p.companyId != null ? p.companyId : null,
      impactLevel: maxLevel
    });
  } catch (_e) {
    return { ingested: 0 };
  }

}

module.exports = {
  ingestOperationalFeedback,
  normEventImpact
};
