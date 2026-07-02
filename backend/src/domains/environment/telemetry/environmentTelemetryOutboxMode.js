'use strict';

/**
 * CERT-OUTBOX-VALIDATION-01 — Modos de publicação do sample_ingested no Outbox.
 * legacy (defeito) | shadow | selective | disabled
 * Rollback imediato: IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE=legacy
 */

const MODES = Object.freeze(['legacy', 'shadow', 'selective', 'disabled']);
const EVENT_NAME = 'environment.telemetry.sample_ingested';

function getOutboxMode() {
  const raw = process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE;
  if (raw == null || String(raw).trim() === '') return 'legacy';
  const v = String(raw).trim().toLowerCase();
  return MODES.includes(v) ? v : 'legacy';
}

function isShadowMode() {
  return getOutboxMode() === 'shadow';
}

function getSelectiveAreas() {
  const raw = process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_SELECTIVE_AREAS || '';
  return String(raw)
    .split(',')
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Regras selective: publica sample_ingested apenas se exceção operacional.
 * @param {{ metadata?: object, validationCtx?: object }} ctx
 */
function _wouldPublishSelective(ctx = {}) {
  const vctx = ctx.validationCtx || {};
  const metadata = ctx.metadata || {};
  const area = String(metadata.environmental_area || '').toLowerCase();
  const areas = getSelectiveAreas();

  if (vctx.range_breached === true) return { publish: true, reason: 'range_breached' };
  if (Number(vctx.anomaly_score) >= 0.5) return { publish: true, reason: 'anomaly_score' };
  if (areas.length && areas.includes(area)) return { publish: true, reason: 'selective_area' };
  if (vctx.critical === true) return { publish: true, reason: 'critical_flag' };

  return { publish: false, reason: 'selective_filtered' };
}

/**
 * @param {{ metadata?: object, validationCtx?: object }} ctx
 * @returns {{ publish: boolean, mode: string, reason: string, shadow_simulated?: boolean }}
 */
function evaluateOutboxPublish(ctx = {}) {
  const mode = getOutboxMode();

  if (mode === 'legacy') {
    return { publish: true, mode, reason: 'legacy_always' };
  }

  if (mode === 'disabled') {
    return { publish: false, mode, reason: 'disabled_mode' };
  }

  if (mode === 'selective') {
    const sel = _wouldPublishSelective(ctx);
    return { publish: sel.publish, mode, reason: sel.reason };
  }

  if (mode === 'shadow') {
    const simulated = { publish: false, mode: 'disabled', reason: 'shadow_simulates_disabled' };
    return {
      publish: true,
      mode,
      reason: 'shadow_still_publishes',
      shadow_simulated: true,
      shadow_would_publish: simulated.publish,
      shadow_would_reason: simulated.reason
    };
  }

  return { publish: true, mode: 'legacy', reason: 'fallback_legacy' };
}

function getOutboxModeSnapshot() {
  return {
    mode: getOutboxMode(),
    event_name: EVENT_NAME,
    selective_areas: getSelectiveAreas(),
    rollback: 'IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE=legacy',
    supported_modes: [...MODES]
  };
}

module.exports = {
  MODES,
  EVENT_NAME,
  getOutboxMode,
  isShadowMode,
  evaluateOutboxPublish,
  getOutboxModeSnapshot,
  getSelectiveAreas
};
