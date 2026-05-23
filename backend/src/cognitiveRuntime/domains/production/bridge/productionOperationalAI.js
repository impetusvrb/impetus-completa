'use strict';

function buildProductionOperationalAI(signalBundle = {}, bindings = []) {
  const op = signalBundle.operational || {};
  const bn = signalBundle.bottlenecks || {};
  const oee = signalBundle.oee_context || {};
  const answers = [];

  if (bn.primary_line) {
    answers.push({
      q: 'Onde está o gargalo principal?',
      a: `Linha ${bn.primary_line} (score ${bn.top_score}).`
    });
  }
  if (oee.worst_line) {
    answers.push({
      q: 'Qual linha apresenta maior deterioração?',
      a: `Linha ${oee.worst_line} — revisar eficiência e scrap.`
    });
  }
  if (op.scrap_qty > 0) {
    answers.push({
      q: 'Onde há maior scrap?',
      a: `Scrap agregado do turno: ${op.scrap_qty} unidades.`
    });
  }
  if (op.maintenance_open > 0) {
    answers.push({
      q: 'Existe risco de parada?',
      a: `${op.maintenance_open} ordens de manutenção abertas — correlacionar com downtime.`
    });
  }

  return {
    contextual_questions: [
      'Qual linha apresenta maior risco?',
      'Onde está o gargalo principal?',
      'Qual turno perde mais eficiência?',
      'Quais máquinas estão degradando?',
      'Onde há maior scrap?'
    ],
    answers,
    denied_topics: ['ebitda', 'rh', 'esg_executivo', 'boardroom'],
    engine: 'production_operational_ai_v1'
  };
}

module.exports = { buildProductionOperationalAI };
