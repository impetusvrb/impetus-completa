'use strict';

/**
 * AIOI-P1F — Controlled Horizontal Runtime Validation (SHADOW)
 * ADDITIVE ONLY — não altera produção.
 */

const validationMetrics = require('../src/services/aioi/runtime/aioiHorizontalValidationMetricsService');

async function main() {
  const results = await validationMetrics.collectValidationMetrics();
  results.started_at = results.timestamp;
  results.completed_at = new Date().toISOString();

  console.log(JSON.stringify({ phase: 'P1F_VALIDATION', pass: results.criteria.horizontal_runtime_validation_pass }));
  console.log('P1F_VALIDATION_RESULTS:' + JSON.stringify(results));

  try {
    await require('../src/db').pool.end();
  } catch { /* ignore */ }
  process.exit(results.criteria.horizontal_runtime_validation_pass ? 0 : 1);
}

main().catch(e => {
  console.error('FATAL', e.message);
  process.exit(1);
});
