'use strict';

/**
 * AIOI-P2.4 — Strategic Read Model Service (READ ONLY)
 *
 * Agregador da camada estratégica + read models P2.1/P2.2/P2.3.
 */

const { isValidUUID } = require('../../utils/security');
const stratMetrics = require('./aioiStrategicMetrics');
const maturityReadModel = require('./aioiExecutiveMaturityReadModelService');
const priorityService = require('./aioiPriorityAnalysisService');
const opportunityService = require('./aioiImprovementOpportunityService');
const focusService = require('./aioiExecutiveFocusService');
const alignmentService = require('./aioiStrategicAlignmentService');

async function getStrategicReadModel(companyId) {
  if (!companyId || !isValidUUID(String(companyId))) {
    return { ok: false, error: 'companyId inválido' };
  }

  stratMetrics.recordStrategicRequested(companyId);
  const startMs = Date.now();

  try {
    const [
      maturityRes,
      priorityRes,
      opportunityRes,
      focusRes,
      alignmentRes
    ] = await Promise.all([
      maturityReadModel.getExecutiveMaturityReadModel(companyId),
      priorityService.getStrategicPriorities(companyId),
      opportunityService.getImprovementOpportunities(companyId),
      focusService.getExecutiveFocus(companyId),
      alignmentService.getStrategicAlignment(companyId)
    ]);

    const failures = [maturityRes, priorityRes, opportunityRes, focusRes, alignmentRes].filter(r => !r.ok);
    if (failures.length) {
      stratMetrics.recordError(companyId, 'getStrategicReadModel', failures[0].error);
      return { ok: false, error: failures[0].error };
    }

    const mrm = maturityRes.executive_maturity_read_model;
    stratMetrics.recordStrategicCompleted(companyId, Date.now() - startMs);

    return {
      ok: true,
      strategic_read_model: {
        governance_read_model:       mrm.governance_read_model,
        predictive_read_model:       mrm.predictive_read_model,
        maturity_read_model: {
          maturity:               mrm.maturity,
          benchmark:              mrm.benchmark,
          stability:              mrm.stability,
          governance_consistency: mrm.governance_consistency
        },
        strategic_priorities:        priorityRes.strategic_priorities,
        improvement_opportunities:   opportunityRes.improvement_opportunities,
        executive_focus:             focusRes.executive_focus,
        strategic_alignment:         alignmentRes.strategic_alignment
      }
    };

  } catch (err) {
    stratMetrics.recordError(companyId, 'getStrategicReadModel', err.message);
    return { ok: false, error: err.message };
  }
}

module.exports = {
  getStrategicReadModel
};
