'use strict';

const DENIED = /ebitda|boardroom|resumo executivo corporativo|indicadores executivos|oee|turnover/i;
const REG = /conformidade|emiss|resíduo|licen|auditoria|esg|sustentabilidade|risco ambiental/i;

function validateEnvironmentalNarrative(payload = {}, consolidated = {}) {
  const text = JSON.stringify({
    summary: payload.specialized_summary,
    narrative: consolidated.environmental_narrative
  });
  return {
    regulatory_native: REG.test(text) || consolidated.telemetry_readiness === 'empty',
    corporate_filler: /corporate filler|resumo corporativo genérico/i.test(text),
    executive_generic: DENIED.test(text),
    ok: (REG.test(text) || consolidated.telemetry_readiness === 'empty') && !DENIED.test(text)
  };
}

module.exports = { validateEnvironmentalNarrative };
