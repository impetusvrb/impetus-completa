'use strict';

const assert = require('assert');

async function main() {
  const ctrlPath = '../services/cognitiveControllerService';
  delete require.cache[require.resolve(ctrlPath)];
  const ctrl = require(ctrlPath);

  const prompt = ctrl.buildEnvironmentalStructuredSyntheticPrompt({
    metrics: {
      water_intensity: { value: 1, deviation: 0.1 },
      energy_intensity: { value: 2, deviation: 0.2 },
      waste_ratio: { value: 3, deviation: 0.3 }
    },
    window: 'w',
    data_quality: 'q'
  });
  assert.ok(prompt.includes('1'));
  assert.ok(prompt.includes('eficiência operacional'));

  const mock = require('../services/environmentalMockService');
  const snap = mock.getMockEnvironmentalSnapshot();
  assert.ok(snap.metrics.water_intensity);

  delete require.cache[require.resolve(ctrlPath)];
  const ctrl2 = require(ctrlPath);

  const bad = await ctrl2.handleCognitiveRequest({
    user: { id: 'u1', company_id: 'c1' },
    message: 'x',
    structured_input: { type: 'other', payload: {} },
    options: { skipPromptFirewall: true }
  });
  assert.strictEqual(bad.ok, false);
  assert.strictEqual(bad.error.code, 'STRUCTURED_INPUT_TYPE_NOT_ALLOWED');

  const noMetrics = await ctrl2.handleCognitiveRequest({
    user: { id: 'u1', company_id: 'c1' },
    message: null,
    structured_input: { type: 'environmental', payload: {} },
    options: { skipPromptFirewall: true }
  });
  assert.strictEqual(noMetrics.ok, false);
  assert.strictEqual(noMetrics.error.code, 'INVALID_ENVIRONMENTAL_PAYLOAD');

  console.log('[ENVIRONMENTAL_STRUCTURED_INPUT_SMOKE]', 'ok');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
