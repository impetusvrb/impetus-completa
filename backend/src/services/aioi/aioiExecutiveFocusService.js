'use strict';

/**
 * AIOI-P2.4 — Executive Focus Analysis Service (READ ONLY)
 *
 * Determina área de foco executivo com rationale_code determinístico.
 */

const { isValidUUID } = require('../../utils/security');
const stratMetrics = require('./aioiStrategicMetrics');
const priorityService = require('./aioiPriorityAnalysisService');

function resolveExecutiveFocus(priorities) {
  if (!priorities || !priorities.length) {
    return { focus_area: 'governance', rationale_code: 'GOVERNANCE_RISK' };
  }

  const top = priorities[0];
  const rationale_code = stratMetrics.DOMAIN_RATIONALE_MAP[top.domain] || 'GOVERNANCE_RISK';
  return { focus_area: top.domain, rationale_code };
}

async function getExecutiveFocus(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const priorityRes = await priorityService.getStrategicPriorities(companyId);
    if (!priorityRes.ok) {
      stratMetrics.recordError(companyId, 'getExecutiveFocus', priorityRes.error);
      return { ok: false, error: priorityRes.error };
    }

    const executive_focus = resolveExecutiveFocus(priorityRes.strategic_priorities.priorities);
    stratMetrics.recordFocusAnalyzed(companyId);
    return { ok: true, executive_focus };

  } catch (err) {
    stratMetrics.recordError(companyId, 'getExecutiveFocus', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  resolveExecutiveFocus,
  getExecutiveFocus
};
