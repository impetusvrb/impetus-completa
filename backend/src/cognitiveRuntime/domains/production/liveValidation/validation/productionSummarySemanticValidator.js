'use strict';

const DENIED = /ebitda|faturamento|margem|boardroom|turnover|absenteismo|esg executivo|people analytics|resumo executivo corporativo/i;
const INDUSTRIAL = /oee|throughput|gargalo|scrap|parada|downtime|linha|turno|telemetria|manutenção|perda/i;

function validateProductionSummarySemantic(payload = {}, consolidated = {}) {
  const narrative = consolidated.production_narrative || payload.specialized_summary || '';
  const text = typeof narrative === 'string' ? narrative : JSON.stringify(narrative);
  const leaks = DENIED.test(text);
  const industrial = INDUSTRIAL.test(text) || consolidated.centers?.length > 0;
  return {
    summary_semantic_valid: !leaks && (industrial || payload.telemetry_readiness === 'empty'),
    enterprise_generic: /resumo corporativo|indicadores executivos/i.test(text),
    hybrid_narrative: leaks && industrial,
    operational_focus: industrial
  };
}

module.exports = { validateProductionSummarySemantic };
