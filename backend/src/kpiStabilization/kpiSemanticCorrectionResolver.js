'use strict';

const { extractKpiList } = require('../kpiRollout/kpiTargetingValidator');
const { inferKpiDomain, normalizeAxis } = require('../kpiRollout/kpiDomainRegistry');

function resolveKpiSemanticCorrections(user, kpiPayload, ctx = {}) {
  const kpis = extractKpiList(kpiPayload);
  const userAxis = normalizeAxis(ctx.functional_axis || user?.functional_axis);
  const resolutions = [];

  for (const k of kpis) {
    const domain = inferKpiDomain(k);
    const drift = k.semantic_drift || (k.label && !k.definition);
    if (drift) {
      resolutions.push({
        kpi_id: k.id || k.key,
        type: 'semantic_drift',
        recommendation: 'Alinhar definição semântica ao eixo operacional',
        auto_apply: false
      });
    }
    if (domain !== userAxis && domain !== 'general') {
      resolutions.push({
        kpi_id: k.id || k.key,
        type: 'semantic_domain_mismatch',
        expected_axis: userAxis,
        detected_domain: domain,
        recommendation: `Confirmar relevância semântica para ${userAxis}`,
        auto_apply: false
      });
    }
  }

  return {
    resolutions,
    semantic_stable: resolutions.length === 0,
    auto_correct: false
  };
}

module.exports = { resolveKpiSemanticCorrections };
