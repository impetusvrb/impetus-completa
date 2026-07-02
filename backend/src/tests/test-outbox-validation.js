'use strict';

/**
 * CERT-OUTBOX-VALIDATION-01 — Testes de modos e validação.
 * node src/tests/test-outbox-validation.js
 */

let passed = 0;
let failed = 0;
const saved = {};

function assert(label, cond) {
  if (cond) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

function saveEnv(k) {
  saved[k] = process.env[k];
}
function restoreEnv(k) {
  if (saved[k] === undefined) delete process.env[k];
  else process.env[k] = saved[k];
}

(async () => {
  console.log('\n══ CERT-OUTBOX-VALIDATION-01 — TESTES ══\n');

  const mode = require('../domains/environment/telemetry/environmentTelemetryOutboxMode');
  const validation = require('../domains/environment/telemetry/validation/environmentTelemetryOutboxValidationService');

  console.log('── Modos ──');
  saveEnv('IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE');
  delete process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE;
  assert('V1.1 default legacy', mode.getOutboxMode() === 'legacy');

  process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE = 'shadow';
  const shadow = mode.evaluateOutboxPublish({ metadata: {}, validationCtx: {} });
  assert('V1.2 shadow publica', shadow.publish === true);
  assert('V1.3 shadow simula', shadow.shadow_simulated === true);

  process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE = 'disabled';
  const dis = mode.evaluateOutboxPublish({});
  assert('V1.4 disabled não publica', dis.publish === false);

  process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE = 'selective';
  const selNo = mode.evaluateOutboxPublish({ metadata: { environmental_area: 'other' }, validationCtx: {} });
  assert('V1.5 selective filtra normal', selNo.publish === false);
  const selYes = mode.evaluateOutboxPublish({
    metadata: { environmental_area: 'utilities' },
    validationCtx: { range_breached: true }
  });
  assert('V1.6 selective passa breach', selYes.publish === true);

  restoreEnv('IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE');

  console.log('\n── Validação / métricas ──');
  validation.resetValidationCounters();
  validation.recordTimeseriesWrite({ table: 'telemetry_timeseries_v1' });
  validation.recordPublished();
  process.env.IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE = 'shadow';
  validation.recordShadowWouldSuppress({ mode: 'shadow' });
  const cmp = validation.runComparisonCheck();
  assert('V2.1 comparação executa', cmp && typeof cmp.ok === 'boolean');

  const obs = require('../services/observabilityService');
  obs.incrementMetric('telemetry_sample_outbox_published');
  const snap = obs.getMetricsSnapshot();
  assert('V2.2 métrica publicada', (snap.telemetry_sample_outbox_published || 0) >= 1);

  console.log('\n── Projeções ──');
  const proj = validation.getImpactProjections();
  assert('V3.1 projeção disabled', proj.disabled_mode_projection.daily_disk_saved_events > 0);
  assert('V3.2 explainability', validation.getExplainabilityReport().cert === 'CERT-OUTBOX-VALIDATION-01');

  restoreEnv('IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE');

  console.log(`\n══ RESULTADO: ${passed} passou, ${failed} falhou ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
