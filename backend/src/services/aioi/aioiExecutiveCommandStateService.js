'use strict';

/**
 * AIOI-P2.9 — Executive Command State Service (READ ONLY)
 *
 * Estado de comando executivo — composição direta P2.8, sem reimplementação.
 */

const { isValidUUID } = require('../../utils/security');
const cmdMetrics = require('./aioiExecutiveCommandMetrics');
const digitalTwinReadModel = require('./aioiDigitalTwinReadModelService');

function buildExecutiveCommandState(digitalTwinReadModelData) {
  const op = digitalTwinReadModelData.operational_state;
  return {
    operational_state:  op,
    future_state:       digitalTwinReadModelData.future_state,
    scenario_state:     digitalTwinReadModelData.scenario_state,
    twin_consistency:   digitalTwinReadModelData.twin_consistency,
    governance_status:  op.governance_status,
    resilience_status:  op.resilience_status
  };
}

async function getExecutiveCommandState(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  try {
    const twinRes = await digitalTwinReadModel.getDigitalTwinReadModel(companyId);
    if (!twinRes.ok) {
      cmdMetrics.recordError(companyId, 'getExecutiveCommandState', twinRes.error);
      return { ok: false, error: twinRes.error };
    }

    const executive_command_state = buildExecutiveCommandState(twinRes.digital_twin_read_model);
    cmdMetrics.recordCommandStateAnalyzed(companyId);
    return { ok: true, executive_command_state };

  } catch (err) {
    cmdMetrics.recordError(companyId, 'getExecutiveCommandState', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  buildExecutiveCommandState,
  getExecutiveCommandState
};
