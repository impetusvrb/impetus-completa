'use strict';

/**
 * Cognitive Stability Index (CSI) — índice executivo observacional.
 * Não controla runtime, prompts, pipeline nem decisões.
 */

function isCsiEnabled() {
  return process.env.IMPETUS_CSI_ENABLED === 'true';
}

function clamp(value, min = 0, max = 100) {
  return Math.max(min, Math.min(max, value));
}

function calculateDriftStability({ recentDriftEvents }) {
  const n = Number(recentDriftEvents) || 0;
  if (n <= 0) {
    return 100;
  }

  return clamp(100 - n * 10);
}

function calculateCalibrationHealth({ overconfidenceEvents, underconfidenceEvents }) {
  let health = 100;

  health -= (Number(overconfidenceEvents) || 0) * 15;
  health -= (Number(underconfidenceEvents) || 0) * 5;

  return clamp(health);
}

function calculateAutonomyStability({ rollbackCount }) {
  return clamp(100 - (Number(rollbackCount) || 0) * 20);
}

/**
 * Peso declarado na especificação: 30% + 25% + 25% + 5% = 85%; normaliza-se para escala 0–100.
 */
const CSI_WEIGHT_SUM = 0.85;

function calculateCognitiveStabilityIndex({
  consensusScore,
  recentDriftEvents,
  overconfidenceEvents,
  underconfidenceEvents,
  rollbackCount
}) {
  const drift = calculateDriftStability({
    recentDriftEvents
  });

  const calibration = calculateCalibrationHealth({
    overconfidenceEvents,
    underconfidenceEvents
  });

  const autonomy = calculateAutonomyStability({
    rollbackCount
  });

  const consensus = clamp(Number(consensusScore) || 0);

  const csiRaw =
    consensus * 0.3 + drift * 0.25 + calibration * 0.25 + autonomy * 0.05;

  const csi = clamp(Math.round(csiRaw / CSI_WEIGHT_SUM));

  return {
    csi,
    breakdown: {
      consensus,
      drift,
      calibration,
      autonomy
    }
  };
}

/** 85–100 stable, 65–84 warning, &lt;65 critical */
function classifyCsiStatus(csi) {
  const n = Number(csi);
  if (!Number.isFinite(n)) return 'critical';
  if (n >= 85) return 'stable';
  if (n >= 65) return 'warning';
  return 'critical';
}

function logCsiObservability(csi, status) {
  try {
    console.log('[CSI_CALCULATED]', { csi, status });
    if (status === 'critical') {
      console.log('[CSI_CRITICAL]', { csi });
    } else if (status === 'warning') {
      console.log('[CSI_WARNING]', { csi });
    }
  } catch (_e) {}
}

function buildCsiExplanation({ csi, status, breakdown }) {
  const b = breakdown || {};
  return {
    summary: `CSI ${csi} (${status}). Sinais: consenso ${b.consensus}, estabilidade de drift ${b.drift}, saúde de calibração ${b.calibration}, estabilidade de autonomia ${b.autonomy}.`,
    status_label:
      status === 'stable' ? 'Estável' : status === 'warning' ? 'Atenção' : 'Crítico'
  };
}

module.exports = {
  isCsiEnabled,
  clamp,
  calculateDriftStability,
  calculateCalibrationHealth,
  calculateAutonomyStability,
  calculateCognitiveStabilityIndex,
  classifyCsiStatus,
  logCsiObservability,
  buildCsiExplanation
};
