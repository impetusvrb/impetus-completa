import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createSuite } from './_opmGov001TestHarness.mjs';
import {
  OPM_GOV_001_COMPATIBILITY,
  getCertifiedModuleIds
} from '../../governance/opm-gov-001/opmGov001CompatibilityMatrix.js';
import { OPM_GOV_001_REGISTRY, isOpmGov001Frozen } from '../../governance/opm-gov-001/opmGov001Registry.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const suite = createSuite('compatibility.test');

console.log('OPM-GOV-001 compatibility.test\n');

suite.test('registry frozen and references E2E-001', () => {
  assert.ok(isOpmGov001Frozen());
  assert.equal(OPM_GOV_001_REGISTRY.certifiedBy, 'OPM-E2E-001');
  assert.equal(OPM_GOV_001_REGISTRY.nextPhase, 'OPM-006');
});

suite.test('four certified modules in compatibility matrix', () => {
  assert.deepEqual(getCertifiedModuleIds().sort(), ['inventory', 'picking', 'receiving', 'shipping']);
});

suite.test('each module has state machine movement observability timeline', () => {
  for (const mod of OPM_GOV_001_COMPATIBILITY.modules) {
    assert.ok(mod.stateMachine, mod.moduleId);
    assert.ok(mod.observabilityPrefix, mod.moduleId);
    assert.ok(mod.timelineBuilder, mod.moduleId);
  }
});

suite.test('chain has four E2E steps', () => {
  assert.equal(OPM_GOV_001_COMPATIBILITY.chain.length, 4);
});

suite.test('governance files exist', () => {
  const govDir = path.join(FE, 'src/governance/opm-gov-001');
  for (const f of [
    'opmGov001Registry.js',
    'opmGov001LifecycleContracts.js',
    'opmGov001MovementContracts.js',
    'opmGov001HandoffContracts.js',
    'opmGov001ObservabilityContracts.js',
    'opmGov001OperationalInvariants.js',
    'opmGov001CompatibilityMatrix.js',
    'index.js'
  ]) {
    assert.ok(fs.existsSync(path.join(govDir, f)), f);
  }
});

suite.test('registry summary counts consistent', () => {
  const s = OPM_GOV_001_REGISTRY.summary;
  assert.equal(s.handoffs, 4);
  assert.equal(s.activeMovements, 3);
  assert.equal(s.reservedInternalMovements, 4);
});

process.exit(suite.finish() ? 1 : 0);
