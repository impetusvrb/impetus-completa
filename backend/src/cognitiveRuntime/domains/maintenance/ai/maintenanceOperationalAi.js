'use strict';

function runMaintenanceOperationalAi(signals = {}, reliability = {}, predictive = {}, health = {}) {
  const op = signals.operational || {};
  const questions = [];

  if (health.critical_assets > 0) {
    questions.push({
      q: 'Qual ativo apresenta maior risco?',
      a: `${health.critical_assets} ativo(s) crítico(s) identificado(s) — revisão supervisionada recomendada`
    });
  }
  if (predictive.failure_risk === 'medium' || predictive.failure_risk === 'high') {
    questions.push({
      q: 'Onde há degradação crescente?',
      a: 'Sinais de recorrência ou degradação — monitorização supervisionada activa'
    });
  }
  if (op.downtime_minutes > 0) {
    questions.push({
      q: 'Qual máquina gera mais downtime?',
      a: `Downtime agregado ${op.downtime_minutes} min (30d) — correlacionar com produção`
    });
  }
  if (op.failure_recurrence === 'elevated') {
    questions.push({ q: 'Qual falha mais recorrente?', a: 'Recorrência elevada detectada nos eventos de paragem' });
  }
  if (reliability.availability_pct != null && reliability.availability_pct < 95) {
    questions.push({
      q: 'Há risco de indisponibilidade crítica?',
      a: `Disponibilidade ${reliability.availability_pct}% — abaixo do limiar operacional`
    });
  }

  return {
    questions,
    contextual: true,
    boardroom_blocked: true,
    hr_blocked: true,
    sst_troubleshooting_blocked: true,
    auto_action: false
  };
}

function runPredictiveQuestionRuntime(ai = {}) {
  return { items: ai.questions ?? [], auto_action: false };
}

function runReliabilityInsightEngine(reliability = {}, health = {}) {
  return {
    insights: [
      reliability.mtbf_hours != null ? `MTBF proxy: ${reliability.mtbf_hours.toFixed(1)}h` : null,
      reliability.mttr_hours != null ? `MTTR proxy: ${reliability.mttr_hours.toFixed(1)}h` : null,
      health.asset_health_score != null ? `Saúde agregada: ${health.asset_health_score}` : null
    ].filter(Boolean),
    auto_action: false
  };
}

function runMaintenanceNarrativeEngine(reliability = {}, predictive = {}, summary = {}) {
  const parts = [];
  if (reliability.availability_pct != null) parts.push(`Disponibilidade ${reliability.availability_pct}%`);
  if (predictive.failure_risk && predictive.failure_risk !== 'minimal') {
    parts.push(`Risco falha: ${predictive.failure_risk}`);
  }
  if (summary.focus) parts.push(summary.focus);
  return {
    narrative: parts.length ? parts.join(' · ') : 'Sem dados de confiabilidade suficientes — runtime em modo graceful',
    reliability_native: true,
    corporate_filler: false,
    auto_action: false
  };
}

module.exports = {
  runMaintenanceOperationalAi,
  runPredictiveQuestionRuntime,
  runReliabilityInsightEngine,
  runMaintenanceNarrativeEngine
};
