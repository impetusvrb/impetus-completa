'use strict';

function buildProductionNarrative(signalBundle = {}, engineContext = {}) {
  const op = signalBundle.operational || {};
  const paragraphs = [];

  if (signalBundle.telemetry_readiness === 'empty') {
    paragraphs.push('Telemetria de produção sem linhas activas — aguardar MES/PLC ou registo de turno.');
  } else {
    if (op.efficiency_pct != null) {
      paragraphs.push(`Eficiência global do turno: ${op.efficiency_pct}%.`);
    }
    if (op.primary_bottleneck_line) {
      paragraphs.push(`Gargalo operacional concentrado na linha ${op.primary_bottleneck_line}.`);
    }
    if (op.scrap_qty > 0) {
      paragraphs.push(`Perdas/refugo no turno: ${op.scrap_qty} unidades.`);
    }
    if (op.maintenance_open > 0) {
      paragraphs.push(`Manutenção correlacionada: ${op.maintenance_open} OS abertas.`);
    }
    if (op.stability_index < 70) {
      paragraphs.push('Instabilidade operacional detectada em múltiplas linhas.');
    }
  }

  return {
    title: 'Narrativa Produção',
    paragraphs: paragraphs.length ? paragraphs : engineContext.findings || ['Cockpit production-native activo.'],
    focus: ['estabilidade', 'throughput', 'gargalos', 'perdas', 'downtime'],
    generic_enterprise: false
  };
}

module.exports = { buildProductionNarrative };
