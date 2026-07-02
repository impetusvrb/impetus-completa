/**
 * CERT-PULSE-02 FASE 2 — Motor de Correlação Humana.
 * Analisa sinais em conjunto; nunca um indicador isolado para conclusões.
 */
'use strict';

function clamp(n, min = 0, max = 1) {
  return Math.max(min, Math.min(max, n));
}

function trendDirection(current, previous, invert = false) {
  if (current == null || previous == null) return 'stable';
  const delta = current - previous;
  if (Math.abs(delta) < 0.05) return 'stable';
  const up = delta > 0;
  if (invert) return up ? 'worsening' : 'improving';
  return up ? 'improving' : 'worsening';
}

/**
 * @param {object} perception — saída de buildOrganizationalPerception
 * @param {object} [previousDimensions] — dimensões anteriores para evolução
 */
function correlateHumanSignals(perception, previousDimensions = null) {
  if (!perception?.ok) return { correlations: [], patterns: [], confidence: 0.3 };

  const op = perception.operational || {};
  const hs = perception.human_signals || {};
  const tc = hs.time_clock || {};
  const self = hs.latest_self_evaluation || {};
  const correlations = [];
  const patterns = [];

  const tpm = op.tpm_incidents_recorded || 0;
  const proacao = op.proacao_proposals_submitted || 0;
  const intel = op.intelligent_registrations || 0;
  const absenceRate = tc.absence_rate || 0;
  const delayRate = tc.delay_rate || 0;
  const overtime = tc.overtime_minutes || 0;
  const sst = hs.safety?.sst_related_alerts || 0;
  const tasks = hs.tasks_completed || 0;
  const comms = hs.communications_read || 0;

  const avgSelf =
    self && Object.keys(self).length
      ? ['efficiency', 'confidence', 'proactivity', 'synergy']
          .map((k) => parseFloat(self[k]))
          .filter((v) => !Number.isNaN(v) && v > 0)
          .reduce((s, v, _, arr) => s + v / arr.length, 0)
      : null;

  // Padrão: desengajamento (múltiplos sinais)
  if (absenceRate > 0.12 && proacao < 1 && tpm < 1 && (avgSelf == null || avgSelf < 3)) {
    patterns.push({
      code: 'disengagement_risk',
      label: 'Possível risco de desengajamento',
      severity: 'elevated',
      signals: ['absence_elevated', 'low_proacao', 'low_tpm', 'low_self_perception'],
      confidence: clamp(0.45 + absenceRate + (avgSelf != null ? (3 - avgSelf) * 0.1 : 0.1))
    });
    correlations.push({
      type: 'disengagement_cluster',
      indicators: { absence_rate: absenceRate, proacao, tpm, avg_self: avgSelf },
      note: 'Absenteísmo elevado combinado com queda de participação operacional.',
      confidence: 0.65
    });
  }

  // Baixa autoconfiança vs boa participação
  if (avgSelf != null && avgSelf < 3 && (tpm + proacao + intel) >= 3) {
    patterns.push({
      code: 'low_self_confidence_high_activity',
      label: 'Baixa autoconfiança com participação operacional relevante',
      severity: 'watch',
      signals: ['low_self_scores', 'high_operational_activity'],
      confidence: 0.62
    });
    correlations.push({
      type: 'perception_activity_gap',
      indicators: { avg_self: avgSelf, operational_volume: tpm + proacao + intel },
      note: 'Autoavaliação modesta, porém dados operacionais indicam engajamento.',
      confidence: 0.7
    });
  }

  // Divergência: autoavaliação alta, pouco envolvimento
  if (avgSelf != null && avgSelf >= 4 && tpm + proacao + intel < 2 && tasks < 2) {
    patterns.push({
      code: 'perception_divergence',
      label: 'Possível divergência de percepção',
      severity: 'watch',
      signals: ['high_self_scores', 'low_operational_activity'],
      confidence: 0.58
    });
    correlations.push({
      type: 'self_operational_divergence',
      indicators: { avg_self: avgSelf, operational_volume: tpm + proacao + intel },
      note: 'Autoavaliação elevada sem volume correspondente de ações registradas.',
      confidence: 0.6
    });
  }

  // Sobrecarga
  if (overtime > 600 || (tc.records > 0 && overtime / Math.max(tc.records, 1) > 45)) {
    patterns.push({
      code: 'overload_signal',
      label: 'Sinais de sobrecarga operacional',
      severity: delayRate > 0.2 ? 'elevated' : 'watch',
      signals: ['high_overtime', delayRate > 0.15 ? 'elevated_delays' : null].filter(Boolean),
      confidence: 0.68
    });
    correlations.push({
      type: 'workload_pressure',
      indicators: { overtime_minutes: overtime, delay_rate: delayRate },
      note: 'Carga de horas extras e/ou atrasos acima do habitual.',
      confidence: 0.72
    });
  }

  // SST + queda participação
  if (sst >= 2 && proacao < 2 && tpm < 2) {
    patterns.push({
      code: 'safety_participation_decline',
      label: 'Alertas de segurança com participação reduzida',
      severity: 'elevated',
      signals: ['sst_alerts', 'low_participation'],
      confidence: 0.64
    });
    correlations.push({
      type: 'safety_engagement_correlation',
      indicators: { sst_alerts: sst, proacao, tpm },
      note: 'Múltiplos sinais SST com baixa atividade em melhoria e TPM.',
      confidence: 0.66
    });
  }

  // Evolução positiva
  if (previousDimensions?.evolution != null && proacao >= 2 && tpm >= 1 && absenceRate < 0.08) {
    patterns.push({
      code: 'positive_evolution',
      label: 'Trajetória de evolução operacional',
      severity: 'info',
      signals: ['stable_attendance', 'active_improvement', 'tpm_active'],
      confidence: 0.6
    });
  }

  // Participação comunicação + tarefas
  if (comms >= 3 && tasks >= 2) {
    correlations.push({
      type: 'communication_task_engagement',
      indicators: { communications_read: comms, tasks_completed: tasks },
      note: 'Participação em comunicações oficiais e conclusão de tarefas.',
      confidence: 0.55
    });
  }

  const confidence =
    patterns.length > 0
      ? clamp(patterns.reduce((s, p) => s + (p.confidence || 0.5), 0) / patterns.length)
      : 0.45;

  return {
    correlations,
    patterns,
    confidence,
    meta: {
      avg_self_evaluation: avgSelf,
      operational_volume: tpm + proacao + intel,
      absence_rate: absenceRate,
      evolution_trend: previousDimensions
        ? trendDirection(
            (tpm + proacao) / 10,
            ((previousDimensions.engagement || 50) + (previousDimensions.participation || 50)) / 200
          )
        : 'unknown'
    }
  };
}

module.exports = { correlateHumanSignals, trendDirection };
