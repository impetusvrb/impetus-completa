/**
 * CPL-001 — Cognitive Platform Layer certification tests.
 * Valida: inventário, contratos, registry, integridade — sem regressões WMS.
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  COGNITIVE_PLATFORM_REGISTRY,
  COGNITIVE_ADAPTER_REGISTRY,
  WMS_ENTERPRISE_BASELINE,
  validateCpl001RegistryIntegrity,
  COGNITIVE_DISCOVERY_CATALOG,
  COGNITIVE_CONTRACT_DESCRIPTORS,
  COGNITIVE_CONTRACT_IDS
} from '../../platform/cognitive/index.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const FE = path.join(__dirname, '../../..');
const PLATFORM_COG = path.join(FE, 'src/platform/cognitive');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    passed += 1;
    console.log(`  ✓ ${name}`);
  } catch (e) {
    failed += 1;
    console.error(`  ✗ ${name}: ${e.message}`);
  }
}

function read(rel) {
  return fs.readFileSync(path.join(FE, 'src', rel), 'utf8');
}

function pathExists(rel) {
  return fs.existsSync(path.join(FE, 'src', rel));
}

console.log('CPL-001 — Cognitive Platform Layer (Architecture Consolidation) Tests\n');

test('platform/cognitive structure exists with required dirs only', () => {
  assert.ok(fs.existsSync(path.join(PLATFORM_COG, 'registry')));
  assert.ok(fs.existsSync(path.join(PLATFORM_COG, 'contracts')));
  assert.ok(fs.existsSync(path.join(PLATFORM_COG, 'discovery')));
  assert.ok(fs.existsSync(path.join(PLATFORM_COG, 'docs')) || fs.existsSync(path.join(FE, 'docs/evidence/CPL-001-COGNITIVE-DISCOVERY.md')));
});

test('forbidden engine directories do NOT exist under platform/cognitive', () => {
  for (const forbidden of ['engines', 'recommendation', 'simulation', 'risk', 'timeline', 'analytics']) {
    assert.ok(!fs.existsSync(path.join(PLATFORM_COG, forbidden)), `forbidden: ${forbidden}`);
  }
});

test('discovery catalog has entries across multiple domains', () => {
  assert.ok(COGNITIVE_DISCOVERY_CATALOG.length >= 20);
  const domains = new Set(COGNITIVE_DISCOVERY_CATALOG.map((e) => e.domain));
  assert.ok(domains.has('logistics_wms'));
  assert.ok(domains.has('quality'));
  assert.ok(domains.has('safety'));
  assert.ok(domains.has('environment'));
  assert.ok(domains.has('command_center'));
});

test('capability matrix registry references existing implementations', () => {
  assert.ok(COGNITIVE_PLATFORM_REGISTRY.length >= 10);
  for (const cap of COGNITIVE_PLATFORM_REGISTRY) {
    assert.ok(cap.canonicalImplementation, cap.capabilityId);
    assert.equal(cap.migrateInCpl001, false, cap.capabilityId);
    assert.equal(cap.reuse, 'required');
  }
});

test('corporate contracts are interface-only', () => {
  assert.ok(COGNITIVE_CONTRACT_IDS.length >= 8);
  for (const id of COGNITIVE_CONTRACT_IDS) {
    const c = COGNITIVE_CONTRACT_DESCRIPTORS[id];
    assert.equal(c.status, 'interface_only', id);
    assert.ok(c.currentImplementations?.length >= 1, id);
  }
});

test('registry integrity validation passes', () => {
  const result = validateCpl001RegistryIntegrity();
  assert.equal(result.valid, true, result.issues.join('; '));
  assert.ok(result.discoveryCount >= 20);
});

test('adapters defined — CPL-002 active or CPL-003 planned', () => {
  assert.ok(COGNITIVE_ADAPTER_REGISTRY.length >= 6);
  for (const a of COGNITIVE_ADAPTER_REGISTRY) {
    assert.ok(['planned', 'active', 'not_started'].includes(a.status), a.adapterId);
    assert.ok(a.cplPhase === 'CPL-002' || a.cplPhase === 'CPL-003');
  }
});

test('logistics adapter bridges OPM-007 and OPM-008 without migration', () => {
  const adapter = COGNITIVE_ADAPTER_REGISTRY.find((a) => a.adapterId === 'logistics_adapter');
  assert.ok(adapter);
  assert.ok(adapter.bridges.includes('OPM-007'));
  assert.ok(adapter.bridges.includes('OPM-008'));
  assert.ok(['planned', 'active'].includes(adapter.status));
});

test('WMS Enterprise Baseline marked complete and frozen', () => {
  assert.equal(WMS_ENTERPRISE_BASELINE.status, 'complete');
  assert.equal(WMS_ENTERPRISE_BASELINE.frozen, true);
  assert.ok(WMS_ENTERPRISE_BASELINE.phases.includes('OPM-008'));
  assert.ok(WMS_ENTERPRISE_BASELINE.phases.includes('OPM-GOV-001'));
});

test('canonical implementations reference real files (sample)', () => {
  const samples = [
    'domains/logistics-operational/modules/cognitive-logistics/clRecommendationEngine.js',
    'domains/logistics-operational/modules/cognitive-logistics/clDecisionTrace.js',
    'domains/quality/cognitive/CognitiveQualityHub.jsx',
    'cognitiveRuntime/foundation/multiDomainResolver.js',
    'features/smartPanel/SmartPanel.jsx'
  ];
  for (const p of samples) {
    assert.ok(pathExists(p), p);
  }
});

test('OPM-003–008 operational modules unchanged', () => {
  assert.ok(read('domains/logistics-operational/pages/standalone/CognitiveLogisticsModulePage.jsx').includes('CognitiveLogisticsModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/WarehouseIntelligenceModulePage.jsx').includes('WarehouseIntelligenceModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/TransferModulePage.jsx').includes('TransferOperationalModule'));
  assert.ok(read('domains/logistics-operational/pages/standalone/ShippingModulePage.jsx').includes('ShippingOperationalModule'));
});

test('no duplicate recommendation engine under platform/cognitive', () => {
  const platformFiles = [];
  function walk(dir) {
    if (!fs.existsSync(dir)) return;
    for (const f of fs.readdirSync(dir, { withFileTypes: true })) {
      const p = path.join(dir, f.name);
      if (f.isDirectory()) walk(p);
      else platformFiles.push(f.name);
    }
  }
  walk(PLATFORM_COG);
  assert.ok(!platformFiles.some((f) => f.includes('RecommendationEngine')));
  assert.ok(!platformFiles.some((f) => f.includes('ScenarioUtils')));
  assert.ok(!platformFiles.some((f) => f.includes('HeuristicRules')));
});

test('governance evidence documents exist', () => {
  const docs = [
    'docs/evidence/CPL-001-COGNITIVE-DISCOVERY.md',
    'docs/evidence/CPL-001-CAPABILITY-MATRIX.md',
    'docs/evidence/CPL-001-CONTRACTS.md',
    'docs/evidence/CPL-001-ADAPTER-STRATEGY.md',
    'docs/evidence/CPL-001-REGISTRY.md',
    'docs/evidence/CPL-001-EXECUTIVE-SUMMARY.md'
  ];
  for (const d of docs) {
    assert.ok(fs.existsSync(path.join(FE, d)), d);
  }
});

test('cognitiveRuntime preserved — not replaced by platform layer', () => {
  assert.ok(fs.existsSync(path.join(FE, 'src/cognitiveRuntime/foundation/multiDomainResolver.js')));
  assert.ok(fs.existsSync(path.join(FE, 'src/cognitiveRuntime/cockpit/qualityNativeCockpitRegistry.js')));
});

console.log(`\n${passed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
