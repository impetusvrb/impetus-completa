'use strict';

/**
 * Detecção de drift cognitivo — só observação: compara baseline (replay) vs estado actual declarado.
 * Não altera tuning, autonomia, prompts nem decisões.
 */

const cognitiveDbPersistence = require('./cognitiveDbPersistenceService');

function isDriftDetectionEnabled() {
  return String(process.env.IMPETUS_COGNITIVE_DRIFT_ENABLED ?? '')
    .trim()
    .toLowerCase() === 'true';
}

function calculatePercentageDelta(oldValue, newValue) {
  if (!oldValue) return 0;
  return ((newValue - oldValue) / oldValue) * 100;
}

async function detectConfidenceDrift({ baselineConfidence, currentConfidence }) {
  const base = Number(baselineConfidence);
  const cur = Number(currentConfidence);
  if (!Number.isFinite(base) || !Number.isFinite(cur)) {
    return { drift_detected: false, delta: null, reason: 'insufficient_data' };
  }
  const delta = calculatePercentageDelta(base, cur);
  return {
    drift_detected: Math.abs(delta) > 25,
    delta
  };
}

async function detectDataStateDrift({ baseline, current }) {
  const b = baseline && typeof baseline === 'object' ? baseline : {};
  const c = current && typeof current === 'object' ? current : {};
  return {
    production_active_changed: b.production_active !== c.production_active
  };
}

function detectNarrativeDrift({ previousNarrative, currentNarrative }) {
  const prev = String(previousNarrative || '').toLowerCase();
  const curr = String(currentNarrative || '').toLowerCase();
  const riskyTerms = ['operação parada', 'produção interrompida', 'falha crítica'];
  return riskyTerms.some((term) => curr.includes(term) && !prev.includes(term));
}

function narrativeHintFromReplay(replay) {
  if (!replay || !replay.context || typeof replay.context !== 'object') return '';
  const ctx = replay.context;
  if (typeof ctx.output === 'string') return ctx.output;
  if (ctx.output && typeof ctx.output === 'object') {
    if (typeof ctx.output.content === 'string') return ctx.output.content;
    if (typeof ctx.output.reply === 'string') return ctx.output.reply;
  }
  if (typeof ctx.input === 'string') return ctx.input;
  return '';
}

function severityFromSignals({ confidence, dataState, narrativeDrift }) {
  if (narrativeDrift) return 'high';
  if (confidence?.drift_detected) return 'medium';
  if (dataState?.production_active_changed) return 'low';
  return 'info';
}

/**
 * @param {object} replay — saída válida de cognitiveReplayService.replayInteraction
 * @param {object} current — { confidence?, data_state?, production_active?, currentNarrative?, previousNarrative? }
 */
async function generateDriftReport({ replay, current }) {
  const cur = current && typeof current === 'object' ? current : {};

  const baselineConf = replay?.reconstructed_state?.confidence;
  const currentConf = cur.confidence != null ? Number(cur.confidence) : null;

  const confidence = await detectConfidenceDrift({
    baselineConfidence: baselineConf,
    currentConfidence: currentConf
  });

  const baselineDs = replay?.reconstructed_state?.data_state;
  const baselinePA = baselineDs === 'production_active';
  let currentPA = cur.production_active === true;
  if (cur.data_state != null) {
    currentPA = String(cur.data_state) === 'production_active';
  }

  const data_state = await detectDataStateDrift({
    baseline: { production_active: baselinePA },
    current: { production_active: currentPA }
  });

  const prevNar =
    cur.previousNarrative != null && String(cur.previousNarrative).length > 0
      ? String(cur.previousNarrative)
      : narrativeHintFromReplay(replay);
  const currNar = cur.currentNarrative != null ? String(cur.currentNarrative) : '';

  const narrativeDrift = detectNarrativeDrift({
    previousNarrative: prevNar,
    currentNarrative: currNar
  });

  const report = {
    confidence,
    data_state,
    narrative: { drift_detected: narrativeDrift }
  };

  try {
    console.log('[COGNITIVE_DRIFT]', {
      confidence_drift: confidence.drift_detected,
      data_state_drift: data_state.production_active_changed,
      narrative_drift: narrativeDrift
    });
  } catch (_e) {}

  return report;
}

/**
 * Persiste evento de drift (paralelo; falhas não propagam).
 * @param {object} p
 * @param {string|null} p.companyId
 * @param {string} p.drift_type
 * @param {string} p.severity
 * @param {object} p.payload
 */
function schedulePersistDriftReport(companyId, report, interactionId) {
  if (!isDriftDetectionEnabled()) return;
  const any =
    report.confidence?.drift_detected ||
    report.data_state?.production_active_changed ||
    report.narrative?.drift_detected;
  if (!any) return;

  const severity = severityFromSignals({
    confidence: report.confidence,
    dataState: report.data_state,
    narrativeDrift: report.narrative?.drift_detected
  });

  Promise.resolve()
    .then(() =>
      cognitiveDbPersistence.persistDriftEventToDb({
        companyId,
        drift_type: 'composite',
        severity,
        payload: {
          interaction_id: interactionId,
          at: new Date().toISOString(),
          report
        }
      })
    )
    .catch((err) => {
      try {
        console.warn('[COGNITIVE_DRIFT_ERROR]', { op: 'schedulePersistDriftReport', message: err?.message });
      } catch (_e) {}
    });
}

module.exports = {
  isDriftDetectionEnabled,
  calculatePercentageDelta,
  detectConfidenceDrift,
  detectDataStateDrift,
  detectNarrativeDrift,
  narrativeHintFromReplay,
  generateDriftReport,
  schedulePersistDriftReport
};
