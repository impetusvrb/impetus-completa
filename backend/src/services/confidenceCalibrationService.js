'use strict';

/**
 * Calibração matemática de confiança — só observabilidade e relatório auditável.
 * Não altera confidence em runtime, pipeline, autonomia ou tuning.
 */

function isConfidenceCalibrationEnabled() {
  return process.env.IMPETUS_CONFIDENCE_CALIBRATION_ENABLED === 'true';
}

function normalizeConfidence(value) {
  const n = Number(value || 0);

  if (n <= 1) {
    return n * 100;
  }

  return n;
}

function detectOverconfidence({ confidence, consensusScore, driftDetected }) {
  const normalized = normalizeConfidence(confidence);
  const cs = Number(consensusScore);

  return normalized > 80 && cs < 50 && driftDetected === true;
}

function detectUnderconfidence({ confidence, consensusScore, driftDetected }) {
  const normalized = normalizeConfidence(confidence);
  const cs = Number(consensusScore);

  return normalized < 40 && cs > 80 && driftDetected === false;
}

function calculateCalibratedConfidence({ confidence, consensusScore, driftDetected }) {
  let calibrated = normalizeConfidence(confidence);

  const cs = Number(consensusScore);
  calibrated *= cs / 100;

  if (driftDetected) {
    calibrated *= 0.85;
  }

  return Math.max(Math.min(Math.round(calibrated), 100), 0);
}

/**
 * @param {{ confidence: number, consensusScore: number, driftDetected: boolean }} params
 */
async function generateCalibrationReport({ confidence, consensusScore, driftDetected }) {
  const original_confidence = normalizeConfidence(confidence);
  const calibrated_confidence = calculateCalibratedConfidence({
    confidence,
    consensusScore,
    driftDetected
  });

  const overconfidence = detectOverconfidence({ confidence, consensusScore, driftDetected });
  const underconfidence = detectUnderconfidence({ confidence, consensusScore, driftDetected });

  try {
    console.log('[CONFIDENCE_CALIBRATION]', {
      original_confidence,
      calibrated_confidence,
      consensusScore: Number(consensusScore),
      driftDetected: driftDetected === true
    });
  } catch (_e) {}

  if (overconfidence) {
    try {
      console.log('[OVERCONFIDENCE_DETECTED]', {
        original_confidence,
        consensusScore: Number(consensusScore),
        driftDetected: true
      });
    } catch (_e) {}
  }

  if (underconfidence) {
    try {
      console.log('[UNDERCONFIDENCE_DETECTED]', {
        original_confidence,
        consensusScore: Number(consensusScore),
        driftDetected: false
      });
    } catch (_e) {}
  }

  return {
    original_confidence,
    calibrated_confidence,
    overconfidence,
    underconfidence
  };
}

module.exports = {
  isConfidenceCalibrationEnabled,
  normalizeConfidence,
  detectOverconfidence,
  detectUnderconfidence,
  calculateCalibratedConfidence,
  generateCalibrationReport
};
