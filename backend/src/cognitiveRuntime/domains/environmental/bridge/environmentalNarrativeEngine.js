'use strict';

function buildEnvironmentalNarrative(signalBundle = {}, governance = {}) {
  const op = signalBundle.operational || {};
  const paragraphs = [];
  if (signalBundle.telemetry_readiness === 'empty') {
    paragraphs.push('Telemetria ambiental sem feed — registar licenças, emissões ou medições regulatórias.');
  } else {
    if (op.licenses_expiring > 0) paragraphs.push(`${op.licenses_expiring} licença(s) com vencimento próximo.`);
    if (op.regulatory_alerts > 0) paragraphs.push(`${op.regulatory_alerts} alerta(s) de compliance activos.`);
    if (op.esg_score != null) paragraphs.push(`ESG contextual: score ${op.esg_score}.`);
    if (op.waste_tonnes > 0) paragraphs.push(`Resíduos agregados: ${op.waste_tonnes} t.`);
  }
  return {
    title: 'Narrativa Ambiental',
    paragraphs: paragraphs.length ? paragraphs : ['Cockpit environmental-native activo.'],
    focus: ['conformidade', 'emissões', 'resíduos', 'licenciamento', 'ESG', 'auditoria'],
    generic_enterprise: false
  };
}

module.exports = { buildEnvironmentalNarrative };
