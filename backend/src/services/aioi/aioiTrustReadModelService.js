'use strict';

/**
 * AIOI-P3.0 — Trust Read Model Service (READ ONLY)
 *
 * Agregador da camada de trust + read model P2.9.
 */

const { isValidUUID } = require('../../utils/security');
const trustMetrics = require('./aioiTrustMetrics');
const commandReadModel = require('./aioiExecutiveCommandReadModelService');
const integrityService = require('./aioiDataIntegrityService');
const consistencyService = require('./aioiModelConsistencyService');
const reliabilityService = require('./aioiForecastReliabilityService');
const trustService = require('./aioiIntelligenceTrustService');

async function getTrustReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  trustMetrics.recordTrustRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      commandRes,
      integrityRes,
      consistencyRes,
      reliabilityRes,
      trustRes
    ] = await Promise.all([
      commandReadModel.getExecutiveCommandReadModel(companyId),
      integrityService.getDataIntegrity(companyId),
      consistencyService.getModelConsistency(companyId),
      reliabilityService.getForecastReliability(companyId),
      trustService.getIntelligenceTrust(companyId)
    ]);

    const failures = [commandRes, integrityRes, consistencyRes, reliabilityRes, trustRes]
      .filter(r => !r.ok);
    if (failures.length) {
      trustMetrics.recordError(companyId, 'getTrustReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    trustMetrics.recordTrustCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      trust_read_model: {
        executive_command_read_model: commandRes.executive_command_read_model,
        data_integrity:               integrityRes.data_integrity,
        model_consistency:            consistencyRes.model_consistency,
        forecast_reliability:         reliabilityRes.forecast_reliability,
        intelligence_trust:           trustRes.intelligence_trust
      }
    };

  } catch (err) {
    trustMetrics.recordError(companyId, 'getTrustReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getTrustReadModel
};
