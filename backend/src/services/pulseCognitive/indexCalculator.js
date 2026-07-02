/**
 * CERT-PULSE-02 FASE 4 — Algoritmo do Pulse Index (0–100 por dimensão).
 */
'use strict';

const { DIMENSIONS } = require('./constants');

function clamp(n, min = 0, max = 100) {
  return Math.max(min, Math.min(max, Math.round(n * 100) / 100));
}

function scaleActivity(count, thresholds = [0, 1, 3, 6, 10]) {
  const c = parseInt(count, 10) || 0;
  if (c >= thresholds[4]) return 95;
  if (c >= thresholds[3]) return 82;
  if (c >= thresholds[2]) return 68;
  if (c >= thresholds[1]) return 52;
  if (c >= thresholds[0]) return 38;
  return 28;
}

function inverseRate(rate, maxBad = 0.25) {
  const r = parseFloat(rate) || 0;
  return clamp(100 - (r / maxBad) * 70, 15, 95);
}

/**
 * @param {object} perception
 * @param {object} correlationPack
 * @param {object} [previousDimensions]
 */
function computePulseIndex(perception, correlationPack = {}, previousDimensions = null) {
  const op = perception.operational || {};
  const hs = perception.human_signals || {};
  const tc = hs.time_clock || {};
  const self = hs.latest_self_evaluation || {};

  const tpm = op.tpm_incidents_recorded || 0;
  const proacao = op.proacao_proposals_submitted || 0;
  const intel = op.intelligent_registrations || 0;
  const opVolume = tpm + proacao + intel;

  const engagement = clamp(
    scaleActivity(opVolume, [0, 1, 2, 5, 8]) * 0.6 +
      (hs.tasks_completed ? scaleActivity(hs.tasks_completed, [0, 1, 2, 4, 8]) : 40) * 0.4
  );

  const participation = clamp(
    scaleActivity(hs.communications_read || 0, [0, 1, 3, 6, 12]) * 0.45 +
      scaleActivity(hs.tasks_completed || 0, [0, 1, 2, 5, 10]) * 0.55
  );

  const development = scaleActivity(proacao, [0, 1, 2, 4, 7]);
  const learning = clamp(development * 0.7 + scaleActivity(intel, [0, 1, 2, 4, 6]) * 0.3);

  const synergy = parseFloat(self.synergy);
  const collaboration = clamp(
    !Number.isNaN(synergy) && synergy > 0 ? synergy * 20 : scaleActivity(opVolume, [0, 1, 2, 4, 6]) * 0.85
  );

  const stability = tc.records
    ? clamp(
        inverseRate(tc.absence_rate, 0.2) * 0.55 +
          inverseRate(tc.delay_rate, 0.3) * 0.25 +
          (tc.overtime_minutes > 900 ? 35 : tc.overtime_minutes > 500 ? 55 : 75) * 0.2
      )
    : 62;

  const tenure = hs.tenure_days;
  let integration = 55;
  if (tenure != null) {
    if (tenure > 365 * 3) integration = 88;
    else if (tenure > 365) integration = 78;
    else if (tenure > 90) integration = 65;
    else integration = 48;
  }

  const prevEng = previousDimensions?.engagement;
  const consistency = prevEng != null ? clamp(100 - Math.abs(engagement - prevEng) * 1.2) : 58;

  let evolution = 55;
  if (previousDimensions) {
    const prevAvg =
      DIMENSIONS.reduce((s, d) => s + (parseFloat(previousDimensions[d.key]) || 50), 0) / DIMENSIONS.length;
    const curAvg =
      (engagement + participation + development + collaboration + learning + stability + integration) / 7;
    evolution = clamp(50 + (curAvg - prevAvg) * 2.5);
  } else {
    evolution = clamp(engagement * 0.4 + participation * 0.3 + development * 0.3);
  }

  const dimensions = {
    engagement,
    participation,
    development,
    collaboration,
    learning,
    stability,
    integration,
    consistency,
    evolution
  };

  let pulseIndex = 0;
  for (const d of DIMENSIONS) {
    pulseIndex += (dimensions[d.key] || 50) * d.weight;
  }
  pulseIndex = clamp(pulseIndex);

  const confidence = clamp(
    (correlationPack.confidence || 0.45) * 40 +
      (hs.latest_pulse_at ? 25 : 10) +
      (tc.records ? 20 : 8) +
      (opVolume > 0 ? 15 : 5),
    35,
    92
  );

  return {
    pulse_index: pulseIndex,
    dimensions,
    confidence: Math.round(confidence) / 100,
    indicators_used: [
      { key: 'tpm_incidents', value: tpm },
      { key: 'proacao_proposals', value: proacao },
      { key: 'intelligent_registrations', value: intel },
      { key: 'tasks_completed', value: hs.tasks_completed || 0 },
      { key: 'communications_read', value: hs.communications_read || 0 },
      { key: 'absence_rate', value: tc.absence_rate || 0 },
      { key: 'overtime_minutes', value: tc.overtime_minutes || 0 },
      { key: 'tenure_days', value: tenure }
    ]
  };
}

module.exports = { computePulseIndex, DIMENSIONS };
