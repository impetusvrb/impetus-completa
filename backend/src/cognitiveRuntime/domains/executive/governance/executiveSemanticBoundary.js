'use strict';

const STRATEGIC = /enterprise|risco|maturidade|convergência|estratég|boardroom|saúde corporativa/i;
const DENIED = /apr\/pt|loto|nc individual|throughput linha|scrap operacional|turnover operador/i;

function validateExecutiveSemanticBoundary(payload = {}, consolidated = {}) {
  const text = JSON.stringify({ summary: payload.specialized_summary, centers: consolidated.centers });
  return {
    ok: STRATEGIC.test(text) || consolidated.centers?.length > 0,
    strategic_native: STRATEGIC.test(text),
    operational_granular: DENIED.test(text),
    cross_domain_clean: !DENIED.test(text)
  };
}

module.exports = { validateExecutiveSemanticBoundary };
