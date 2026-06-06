'use strict';

/**
 * AIOI-P2.9 — Executive Command Read Model Service (READ ONLY)
 *
 * Agregador da camada de comando executivo + read models P2.1–P2.8.
 */

const { isValidUUID } = require('../../utils/security');
const cmdMetrics = require('./aioiExecutiveCommandMetrics');
const digitalTwinReadModel = require('./aioiDigitalTwinReadModelService');
const commandStateService = require('./aioiExecutiveCommandStateService');
const priorityMatrixService = require('./aioiExecutivePriorityMatrixService');
const attentionMapService = require('./aioiExecutiveAttentionMapService');
const readinessService = require('./aioiExecutiveReadinessService');

async function getExecutiveCommandReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  cmdMetrics.recordCommandRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      twinRes,
      commandStateRes,
      priorityRes,
      attentionRes,
      readinessRes
    ] = await Promise.all([
      digitalTwinReadModel.getDigitalTwinReadModel(companyId),
      commandStateService.getExecutiveCommandState(companyId),
      priorityMatrixService.getExecutivePriorityMatrix(companyId),
      attentionMapService.getExecutiveAttentionMap(companyId),
      readinessService.getExecutiveReadiness(companyId)
    ]);

    const failures = [twinRes, commandStateRes, priorityRes, attentionRes, readinessRes]
      .filter(r => !r.ok);
    if (failures.length) {
      cmdMetrics.recordError(companyId, 'getExecutiveCommandReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const dtm = twinRes.digital_twin_read_model;
    cmdMetrics.recordCommandCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      executive_command_read_model: {
        governance_read_model:        dtm.governance_read_model,
        predictive_read_model:        dtm.predictive_read_model,
        maturity_read_model:          dtm.maturity_read_model,
        strategic_read_model:         dtm.strategic_read_model,
        value_read_model:             dtm.value_read_model,
        resilience_read_model:        dtm.resilience_read_model,
        scenario_read_model:          dtm.scenario_read_model,
        digital_twin_read_model: {
          operational_state:  dtm.operational_state,
          future_state:       dtm.future_state,
          scenario_state:     dtm.scenario_state,
          twin_consistency:   dtm.twin_consistency
        },
        executive_command_state:      commandStateRes.executive_command_state,
        executive_priority_matrix:    priorityRes.executive_priority_matrix,
        executive_attention_map:      attentionRes.executive_attention_map,
        executive_readiness:          readinessRes.executive_readiness
      }
    };

  } catch (err) {
    cmdMetrics.recordError(companyId, 'getExecutiveCommandReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getExecutiveCommandReadModel
};
