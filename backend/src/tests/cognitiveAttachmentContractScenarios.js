'use strict';

/**
 * Contrato cognitiveAttachment — sem BD nem LLM.
 * Executar: node src/tests/cognitiveAttachmentContractScenarios.js
 */

const assert = require('assert');
const {
  buildEnvironmentalAttachmentFromDashboardPack,
  attachmentToCouncilIngress,
  parseCognitiveAttachment
} = require('../services/cognitiveAttachmentIngress');

function run() {
  assert.strictEqual(buildEnvironmentalAttachmentFromDashboardPack(null), null);
  assert.strictEqual(buildEnvironmentalAttachmentFromDashboardPack(undefined), null);

  const pack = {
    kpis: [{ id: 'k1' }],
    events: [],
    assets: [],
    contextual_data: { zone: 'A' }
  };
  const att = buildEnvironmentalAttachmentFromDashboardPack(pack);
  assert.strictEqual(att.kind, 'environmental');
  assert.strictEqual(att.version, 1);
  assert.strictEqual(att.payload.kpis.length, 1);
  assert.ok(att.payload.meta && typeof att.payload.meta === 'object');
  assert.strictEqual(att.payload.meta.unit, null);
  assert.strictEqual(att.payload.meta.window, null);
  assert.ok(typeof att.payload.meta.as_of === 'string' && att.payload.meta.as_of.length > 10);
  assert.deepStrictEqual(att.payload.metrics, {});
  assert.strictEqual(att.payload.meta.completeness, 0);
  assert.strictEqual(att.payload.meta.source, 'mixed');

  const mapped = attachmentToCouncilIngress(att);
  assert.deepStrictEqual(mapped.data.kpis, att.payload.kpis);
  assert.strictEqual(mapped.data.contextual_data.zone, 'A');
  assert.deepStrictEqual(mapped.data.meta, att.payload.meta);
  assert.deepStrictEqual(mapped.data.metrics, att.payload.metrics);
  assert.strictEqual(mapped.context.attachment_kind, 'environmental');
  assert.strictEqual(mapped.context.cognitive_attachment_kind, 'environmental');
  assert.strictEqual(mapped.context.cognitive_attachment_version, 1);
  assert.strictEqual(mapped.context.source, 'cognitive_controller_attachment');
  assert.strictEqual(mapped.module, 'dashboard_chat');

  const rich = buildEnvironmentalAttachmentFromDashboardPack({
    kpis: [],
    events: [],
    assets: [],
    contextual_data: {},
    unit: 'm3_per_ton',
    window: 'monthly',
    as_of: '2026-05-01T12:00:00.000Z',
    source: 'sensor',
    metrics: {
      water_intensity: {
        value: 1.2,
        target: 1.0,
        deviation: 0.2,
        unit: 'm3_per_ton',
        window: 'monthly'
      }
    }
  });
  assert.strictEqual(rich.payload.meta.unit, 'm3_per_ton');
  assert.strictEqual(rich.payload.meta.window, 'monthly');
  assert.strictEqual(rich.payload.meta.as_of, '2026-05-01T12:00:00.000Z');
  assert.strictEqual(rich.payload.meta.source, 'sensor');
  assert.strictEqual(rich.payload.meta.completeness, 0.2);
  assert.strictEqual(rich.payload.metrics.water_intensity.value, 1.2);

  const ing = attachmentToCouncilIngress(rich);
  assert.strictEqual(ing.data.meta.unit, 'm3_per_ton');
  assert.strictEqual(ing.data.metrics.water_intensity.target, 1.0);

  assert.throws(
    () => attachmentToCouncilIngress({ kind: 'other', version: 1, payload: {} }),
    (e) => e.code === 'ATTACHMENT_NOT_ALLOWED'
  );

  assert.throws(
    () =>
      attachmentToCouncilIngress({
        kind: 'environmental',
        version: 1,
        payload: { extra_field: 1 }
      }),
    (e) => e.code === 'ATTACHMENT_PAYLOAD_FORBIDDEN_KEYS'
  );

  assert.throws(
    () => parseCognitiveAttachment({ kind: 'environmental', version: 99, payload: {} }),
    (e) => e.code === 'ATTACHMENT_VERSION_UNSUPPORTED'
  );

  console.log('cognitiveAttachmentContractScenarios: OK');
}

try {
  run();
  process.exitCode = 0;
} catch (e) {
  console.error('cognitiveAttachmentContractScenarios: FAIL', e);
  process.exitCode = 1;
}
