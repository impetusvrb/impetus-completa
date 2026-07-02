#!/usr/bin/env node
'use strict';

/**
 * Smoke test — instalação limpa (sem enrichment sintético).
 * Uso: node backend/scripts/ops/smoke-clean-install.js
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });

const living = require('../../src/services/cognitiveLivingEnrichment');

let failed = 0;
function assert(cond, msg) {
  if (!cond) {
    failed++;
    console.error('  FAIL', msg);
  } else {
    console.log('  OK  ', msg);
  }
}

async function main() {
  console.log('Smoke — instalação industrial limpa\n');

  assert(
    living.isLivingEnrichmentEnabled() === false,
    'IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false (dados sintéticos OFF)'
  );

  const labOn = String(process.env.IMPETUS_INDUSTRIAL_LAB_ENABLED || '').toLowerCase() === 'true';
  assert(!labOn, 'IMPETUS_INDUSTRIAL_LAB_ENABLED=false (lab industrial OFF)');

  const port = process.env.PORT || '4000';
  const base = `http://127.0.0.1:${port}`;

  let health;
  try {
    const r = await fetch(`${base}/health`);
    health = r.status;
  } catch (e) {
    health = 0;
  }
  assert(health === 200, `GET /health → ${health}`);

  const pulse = require('../../src/services/cognitivePulseService');
  const mockUser = {
    id: '00000000-0000-0000-0000-000000000099',
    company_id: '00000000-0000-0000-0000-000000000098',
    role: 'ceo',
    hierarchy_level: 1,
    email: 'smoke@test.local'
  };

  try {
    const p = await pulse.buildCognitivePulse(mockUser);
    assert(p.ok !== false, 'cognitive pulse ok');
    assert(p.living === false, 'cognitive pulse living=false');
    assert(
      p.data_state === 'empty' || p.data_state === 'live',
      `data_state honesto: ${p.data_state}`
    );
    const sectors = p.digital_twin?.sectors || p.cognitive_core?.digital_twin?.sectors || [];
    if (p.data_state === 'empty') {
      assert(sectors.length === 0, 'twin sem setores fictícios quando vazio');
    }
  } catch (e) {
    assert(false, `buildCognitivePulse: ${e.message}`);
  }

  console.log(failed ? `\n${failed} falha(s)` : '\nSmoke OK');
  process.exit(failed > 0 ? 1 : 0);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
