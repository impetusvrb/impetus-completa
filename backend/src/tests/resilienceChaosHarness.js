#!/usr/bin/env node
'use strict';

/**
 * Simulação offline de cenários de stress (sem servidor HTTP).
 * Uso: IMPETUS_ARCHITECTURE_BOOT_RELAX=true node src/tests/resilienceChaosHarness.js
 */

process.env.IMPETUS_ARCHITECTURE_BOOT_RELAX = process.env.IMPETUS_ARCHITECTURE_BOOT_RELAX || 'true';

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env'), override: false });

const srs = require('../services/systemRuntimeState');
const wd = require('../services/architectureWatchdogService');
const gate = require('../ai/orchestratorExecutionGate');
const latency = require('../services/aiLatencyMonitor');

function log(label) {
  console.log(`\n--- ${label} ---`);
  console.log(JSON.stringify(srs.getSnapshot(), null, 2));
}

async function scenarioBurstStrict() {
  const prev = process.env.IMPETUS_STRICT_AI_PIPELINE;
  process.env.IMPETUS_STRICT_AI_PIPELINE = 'true';
  log('initial');
  for (let i = 0; i < 2; i++) {
    gate.recordCouncilFailure('STRICT_SIM', `fail ${i}`);
  }
  log('after 2 STRICT (LIMITED se estrito)');
  gate.recordCouncilFailure('STRICT_SIM', 'third');
  log('after 3 STRICT (DEGRADED se estrito)');
  process.env.IMPETUS_STRICT_AI_PIPELINE = prev;
}

function scenarioLatencySpike() {
  for (let i = 0; i < 14; i++) {
    latency.recordLatency('claude', 16000 + i * 400);
  }
  log('after injecção de latência Claude (verificar LIMITED por média)');
}

function scenarioWatchdogFlap() {
  console.log('\n--- watchdog ticks x4 ---');
  for (let i = 0; i < 4; i++) {
    const r = wd.runWatchdogTick();
    console.log('tick', i, r.skipped ? 'skipped' : r.ok, 'status', srs.system_state.status);
  }
}

async function main() {
  console.log('IMPETUS resilience chaos harness (offline)\n');
  try {
    scenarioWatchdogFlap();
    scenarioBurstStrict();
    scenarioLatencySpike();
    console.log('\nDone.');
    process.exit(0);
  } catch (e) {
    console.error(e);
    process.exit(1);
  }
}

main();
