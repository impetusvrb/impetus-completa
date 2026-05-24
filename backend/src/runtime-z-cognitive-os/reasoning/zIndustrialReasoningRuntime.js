'use strict';

const { reasonOperational } = require('./zOperationalReasoningEngine');

const SST_RISKS = [/nr-?\d+/i, /epi/i, /altura/i, /confinado/i, /quim[ií]co/i, /eletric/i];
const ENV_RISKS = [/vazamento/i, /derrame/i, /emissao/i, /residuo/i];
const PROD_RISKS = [/parada/i, /oee/i, /turno/i, /setup/i, /lote/i];
const LOG_RISKS = [/expedicao/i, /transporte/i, /armazem/i, /carga/i];

function _normalize(t = '') {
  return String(t || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function reasonIndustrial(tenantId, text = '', ctx = {}) {
  const base = reasonOperational(tenantId, text, ctx);
  const t = _normalize(text);

  const detected_risks = [];
  if (SST_RISKS.some((p) => p.test(t))) detected_risks.push('safety');
  if (ENV_RISKS.some((p) => p.test(t))) detected_risks.push('environmental');
  if (PROD_RISKS.some((p) => p.test(t))) detected_risks.push('production');
  if (LOG_RISKS.some((p) => p.test(t))) detected_risks.push('logistics');

  const industrial_intelligence_score = Number(
    Math.min(1, base.reasoning_quality * 0.7 + detected_risks.length * 0.1 + 0.1).toFixed(3)
  );

  return {
    ...base,
    detected_risks,
    industrial_intelligence_score,
    domain_risks: {
      safety: detected_risks.includes('safety'),
      environmental: detected_risks.includes('environmental'),
      production: detected_risks.includes('production'),
      logistics: detected_risks.includes('logistics')
    }
  };
}

module.exports = { reasonIndustrial };
