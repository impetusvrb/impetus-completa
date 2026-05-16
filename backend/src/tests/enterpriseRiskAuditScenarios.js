'use strict';

/**
 * Validação dos 4 riscos enterprise (cache, deploy, shadow, structured input).
 */

let passed = 0;
let failed = 0;

function assert(label, condition) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${label}`);
  } else {
    failed++;
    console.log(`  ❌ ${label}`);
  }
}

(async () => {
  console.log('\n══ ENTERPRISE RISK AUDIT — TESTES ══\n');

  console.log('── Risco 4: Structured Input Schema Registry ──');
  try {
    const registry = require('../services/structuredInputSchemaRegistry');
    assert('R4.1 registry carregado', !!registry);
    assert('R4.2 environmental permitido', registry.ALLOWED_TYPES.includes('environmental'));

    const ok = registry.validateStructuredInput({
      type: 'environmental',
      payload: { metrics: { water_intensity: { value: 1 } } }
    });
    assert('R4.3 payload ambiental válido', ok.ok === true);

    const bad = registry.validateStructuredInput({ type: 'other', payload: {} });
    assert('R4.4 tipo other rejeitado', bad.ok === false);

    const noMetrics = registry.validateStructuredInput({
      type: 'environmental',
      payload: {}
    });
    assert('R4.5 sem metrics rejeitado', noMetrics.ok === false);
  } catch (e) {
    assert('R4.X ' + e.message, false);
  }

  console.log('\n── Risco 3: Shadow Route Registry ──');
  try {
    const shadow = require('../middleware/shadowRouteRegistry');
    assert('R3.1 registry definido', shadow.REGISTRY.length >= 1);
    assert('R3.2 env-cognitive-test registado', shadow.REGISTRY.some((r) => r.id === 'env-cognitive-test'));

    const guard = shadow.requireShadowRoute('env-cognitive-test');
    assert('R3.3 guard é função', typeof guard === 'function');

    const prev = process.env.IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW;
    process.env.IMPETUS_SHADOW_ROUTES_ENABLED = 'true';
    process.env.IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW = 'false';

    let statusCode = 0;
    const req = { originalUrl: '/test', method: 'POST', ip: '127.0.0.1', user: { id: 'u1' } };
    const res = {
      status(c) {
        statusCode = c;
        return this;
      },
      json() {}
    };
    let nextCalled = false;
    await new Promise((resolve) => {
      guard(req, res, () => {
        nextCalled = true;
        resolve();
      });
      setTimeout(resolve, 50);
    });
    assert('R3.4 flag OFF bloqueia (403/404)', !nextCalled && (statusCode === 403 || statusCode === 404));

    if (prev != null) process.env.IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW = prev;
    else delete process.env.IMPETUS_ENVIRONMENTAL_COGNITIVE_SHADOW;
  } catch (e) {
    assert('R3.X ' + e.message, false);
  }

  console.log('\n── Risco 1: Frontend Build Version ──');
  try {
    const bv = require('../services/frontendBuildVersionService');
    const info = bv.getPublicBuildInfo();
    assert('R1.1 getPublicBuildInfo retorna build_id', !!info.build_id);
    assert('R1.2 server_time presente', !!info.server_time);
  } catch (e) {
    assert('R1.X ' + e.message, false);
  }

  console.log('\n── Risco 2: Atomic deploy script ──');
  try {
    const fs = require('fs');
    const path = require('path');
    const script = path.join(__dirname, '../../../frontend/scripts/atomic-deploy-build.cjs');
    assert('R2.1 script atomic-deploy existe', fs.existsSync(script));
  } catch (e) {
    assert('R2.X ' + e.message, false);
  }

  console.log(`\n══ RESULTADO: ${passed} ok | ${failed} falhas ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
