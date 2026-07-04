'use strict';

/**
 * SEC-10 — Enterprise Active Defense Audit.
 * node backend/src/tests/securityActiveDefense/SEC_10_ACTIVE_DEFENSE.test.js
 */

process.env.SECURITY_ACTIVE_DEFENSE = 'true';
process.env.SECURITY_ACTIVE_DEFENSE_MODE = 'observe';
process.env.SECURITY_ACTIVE_DEFENSE_MAX_LEVEL = '2';
process.env.SECURITY_CORRELATION_ENGINE = 'true';
process.env.SECURITY_THREAT_INTELLIGENCE = 'true';
process.env.SEC04_SKIP_GIT_CHECK = 'true';

const assert = require('assert');
const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');

const ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(ROOT, 'src');
const DOCS = path.join(ROOT, 'docs');

const SEC_DOCS = [
  'SEC_10_ACTIVE_DEFENSE.md',
  'SEC_10_ARCHITECTURE.md',
  'SEC_10_PATTERN_ENGINE.md',
  'SEC_10_RECOMMENDATIONS.md',
  'SEC_10_OBSERVABILITY.md',
  'SEC_10_ROLLBACK.md',
  'SEC_10_REPORT.md'
];

const REGRESSION_TESTS = [
  { name: 'SEC-01', file: 'tests/securityObservatory/SEC_01_OBSERVATORY_AUDIT.test.js' },
  { name: 'SEC-02', file: 'tests/securityCorrelation/SEC_02_CORRELATION_AUDIT.test.js' },
  { name: 'SEC-03', file: 'tests/securityThreatIntelligence/SEC_03_THREAT_INTELLIGENCE_AUDIT.test.js' },
  { name: 'SEC-04', file: 'tests/securityRuntimeIntegrity/SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js' },
  { name: 'SEC-05', file: 'tests/securityNotification/SEC_05_NOTIFICATION_AUDIT.test.js' },
  { name: 'SEC-06', file: 'tests/securityResponse/SEC_06_RESPONSE_AUDIT.test.js' },
  { name: 'SEC-07', file: 'tests/securitySOC/SEC_07_SOC_AUDIT.test.js' },
  { name: 'SEC-08', file: 'tests/audit/SEC_08_ENTERPRISE_SECURITY_CERTIFICATION.test.js' },
  { name: 'SEC-09', file: 'tests/audit/SEC_09_ENTERPRISE_SECURITY_PROMOTION.test.js' }
];

let passed = 0;
let failed = 0;

function freshSec10() {
  const mods = [
    '../../securityActiveDefense/index.js',
    '../../securityActiveDefense/config/securityActiveDefenseFlags.js',
    '../../securityActiveDefense/engine/activeDefenseEngine.js',
    '../../securityActiveDefense/runtime/activeDefenseRuntime.js',
    '../../securityActiveDefense/metrics/activeDefenseMetrics.js',
    '../../securityActiveDefense/store/activeDefenseStore.js',
    '../../securityCorrelation/store/incidentStore.js'
  ];
  for (const m of mods) delete require.cache[require.resolve(m)];
  const sec10 = require('../../securityActiveDefense');
  sec10.store.resetForTests();
  sec10.metrics.resetForTests();
  sec10.shutdown?.();
  return sec10;
}

function seedIncidents() {
  const { createSecurityIncidentDto } = require('../../securityCorrelation/dto/securityIncidentDto');
  const sec02 = require('../../securityCorrelation');
  sec02.store.resetForTests();
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-ad-1',
    severity: 'HIGH',
    classification: 'CREDENTIAL_SCAN',
    status: 'OPEN',
    participants: { ips: ['203.0.113.10', '203.0.113.11', '203.0.113.12'], userAgents: ['scanner-a'], asns: ['AS12345'] },
    metrics: { requestCount: 8000, uniqueIps: 3, eventCount: 50 },
    durationMs: 7200000,
    tags: ['recurrence']
  }));
  sec02.store.addIncident(createSecurityIncidentDto({
    incidentId: 'inc-ad-2',
    severity: 'MEDIUM',
    classification: 'PATH_ENUMERATION',
    status: 'OPEN',
    participants: { ips: ['198.51.100.5'], userAgents: ['bot/1'] },
    metrics: { requestCount: 1500, uniqueIps: 1 }
  }));
}

async function test(label, fn) {
  try {
    await fn();
    passed++;
    console.log(`  ✅  ${label}`);
  } catch (e) {
    failed++;
    console.error(`  ❌  ${label}\n       ${e.message}`);
  }
}

function runRegression(relPath) {
  try {
    execSync(`node "${path.join(SRC, relPath)}"`, {
      cwd: ROOT,
      stdio: 'pipe',
      timeout: 180000,
      env: { ...process.env, NODE_ENV: 'test' }
    });
    return true;
  } catch (_e) {
    return false;
  }
}

(async () => {
  console.log('\n  SEC-10 — ENTERPRISE ACTIVE DEFENSE AUDIT\n');

  await test('01 — módulo securityActiveDefense exporta API', () => {
    const s = freshSec10();
    assert.ok(s.evaluateDefense);
    assert.ok(s.getAuditPayload);
    assert.ok(s.buildDashboard);
  });

  await test('02 — feature flag default false sem env', () => {
    const prev = process.env.SECURITY_ACTIVE_DEFENSE;
    delete process.env.SECURITY_ACTIVE_DEFENSE;
    delete require.cache[require.resolve('../../securityActiveDefense/config/securityActiveDefenseFlags.js')];
    const f = require('../../securityActiveDefense/config/securityActiveDefenseFlags');
    assert.strictEqual(f.isSecurityActiveDefenseEnabled(), false);
    process.env.SECURITY_ACTIVE_DEFENSE = prev || 'true';
  });

  await test('03 — SECURITY_ACTIVE_DEFENSE_MODE observe default', () => {
    delete process.env.SECURITY_ACTIVE_DEFENSE_MODE;
    delete require.cache[require.resolve('../../securityActiveDefense/config/securityActiveDefenseFlags.js')];
    const f = require('../../securityActiveDefense/config/securityActiveDefenseFlags');
    assert.strictEqual(f.activeDefenseMode(), 'observe');
  });

  await test('04 — SECURITY_RESPONSE_PROTECT não existe em SEC-10', () => {
    const eng = fs.readFileSync(path.join(SRC, 'securityActiveDefense/engine/activeDefenseEngine.js'), 'utf8');
    assert.ok(!eng.includes('blockIp'));
    assert.ok(!eng.includes('execSync'));
    assert.ok(!eng.includes('nginx'));
  });

  await test('05 — colector read-only SEC-01→07', () => {
    const { collectSecModulesData } = require('../../securityActiveDefense/collectors/secModuleCollector');
    const data = collectSecModulesData();
    assert.ok('sec07' in data);
    assert.ok(!('sec08' in data));
  });

  await test('06 — threat pattern detection', () => {
    seedIncidents();
    const tp = require('../../securityActiveDefense/engine/threatPatternService');
    const sec02 = require('../../securityCorrelation');
    const patterns = tp.detectPatternsFromIncidents(sec02.store.getOpenIncidents());
    assert.ok(patterns.some((p) => p.pattern === 'Credential Scan'));
    assert.ok(patterns.some((p) => p.pattern === 'Persistent Campaign' || p.pattern === 'Repeated Campaign'));
  });

  await test('07 — attack escalation CRITICAL/HIGH', () => {
    const esc = require('../../securityActiveDefense/engine/attackEscalationService');
    const sec02 = require('../../securityCorrelation');
    const tp = require('../../securityActiveDefense/engine/threatPatternService');
    const patterns = tp.detectPatternsFromIncidents(sec02.store.getOpenIncidents());
    const result = esc.escalateThreatLevel(sec02.store.getOpenIncidents(), [], patterns, null);
    assert.ok(['MEDIUM', 'HIGH', 'CRITICAL'].includes(result.level));
  });

  await test('08 — security modes lógicos', () => {
    const mm = require('../../securityActiveDefense/engine/securityModeManager');
    assert.strictEqual(mm.resolveModeFromThreatLevel('CRITICAL'), 'PROTECTED');
    assert.strictEqual(mm.resolveModeFromThreatLevel('LOW'), 'MONITORING');
    assert.ok(mm.MODES.includes('DEFENSE'));
  });

  await test('09 — adaptive surface recommended_actions only', () => {
    const asp = require('../../securityActiveDefense/engine/adaptiveSurfaceProtection');
    const actions = asp.buildRecommendedActions('HIGH', [{ pattern: 'Credential Scan' }], 'OK');
    assert.ok(actions.length > 0);
    assert.ok(actions.every((a) => a.auto_execute === false));
  });

  await test('10 — operator notification package Wellington/Gustavo', () => {
    seedIncidents();
    const sec02 = require('../../securityCorrelation');
    const pkg = require('../../securityActiveDefense/notification/operatorNotificationPackage');
    const packages = pkg.preparePackagesForOperators({
      incident: sec02.store.getOpenIncidents()[0],
      threatLevel: 'HIGH',
      patterns: ['Credential Scan'],
      recommendations: [{ action: 'enable_rate_limiting' }],
      integrity: { status: 'OK', score: 0.9 }
    });
    assert.ok(packages.some((p) => p.operator === 'Wellington'));
    assert.ok(packages.some((p) => p.operator === 'Gustavo'));
    assert.strictEqual(packages[0].deliveryStatus, 'PREPARED_NOT_SENT');
  });

  await test('11 — adapters não enviam', () => {
    const adapters = require('../../securityActiveDefense/notification/adapters/notificationAdapters');
    const result = adapters.prepareEmailAdapter({ operator: 'Wellington', incident: { severity: 'HIGH', classification: 'SCAN' }, recommendations: [] });
    assert.strictEqual(result.sent, false);
    assert.strictEqual(result.status, 'SKIPPED');
  });

  await test('12 — defense dashboard DTO', () => {
    seedIncidents();
    const sec10 = freshSec10();
    const dash = sec10.buildDashboard({ force: true });
    assert.ok(dash);
    assert.strictEqual(dash.schema_version, 'active_defense_dashboard_v1');
    assert.strictEqual(dash.read_only, true);
    assert.ok('threatLevel' in dash);
    assert.ok(Array.isArray(dash.recommendations));
    assert.ok(Array.isArray(dash.operatorPackages));
  });

  await test('13 — defense recommendations never auto_execute', () => {
    seedIncidents();
    const sec10 = freshSec10();
    const dash = sec10.buildDashboard({ force: true });
    for (const r of dash.recommendations) {
      assert.strictEqual(r.auto_execute, false);
      assert.strictEqual(r.read_only, true);
    }
  });

  await test('14 — métricas obrigatórias', () => {
    seedIncidents();
    const sec10 = freshSec10();
    sec10.buildDashboard({ force: true });
    const snap = sec10.metrics.getSnapshot();
    assert.ok(snap.active_defense_events >= 1);
    assert.ok('attack_patterns_detected' in snap);
    assert.ok('defense_state_changes' in snap);
  });

  await test('15 — rota audit /security-active-defense', () => {
    const audit = fs.readFileSync(path.join(SRC, 'routes/audit.js'), 'utf8');
    assert.ok(audit.includes('/security-active-defense'));
  });

  await test('16 — SEC-10 não importa eventGovernance', () => {
    const idx = fs.readFileSync(path.join(SRC, 'securityActiveDefense/index.js'), 'utf8');
    assert.ok(!idx.includes('eventGovernance'));
  });

  await test('17 — SEC-01→09 módulos não importam securityActiveDefense', () => {
    const modules = [
      'securityObservatory/index.js',
      'securityCorrelation/index.js',
      'securityThreatIntelligence/index.js',
      'securitySOC/index.js'
    ];
    for (const m of modules) {
      const src = fs.readFileSync(path.join(SRC, m), 'utf8');
      assert.ok(!src.includes('securityActiveDefense'), m);
    }
  });

  for (const doc of SEC_DOCS) {
    await test(`18 — documentação ${doc}`, () => {
      assert.ok(fs.existsSync(path.join(DOCS, doc)), doc);
    });
  }

  await test('19 — flags em .env.example', () => {
    const ex = fs.readFileSync(path.join(ROOT, '.env.example'), 'utf8');
    assert.ok(ex.includes('SECURITY_ACTIVE_DEFENSE=false'));
    assert.ok(ex.includes('SECURITY_ACTIVE_DEFENSE_MODE'));
    assert.ok(ex.includes('SECURITY_ACTIVE_DEFENSE_MAX_LEVEL'));
  });

  for (const t of REGRESSION_TESTS) {
    await test(`REG — ${t.name} regressão`, () => {
      assert.ok(runRegression(t.file), `${t.name} failed`);
    });
  }

  const criteria = {
    active_defense_available: failed === 0,
    attack_pattern_detection_available: failed === 0,
    security_modes_available: failed === 0,
    recommendation_engine_available: failed === 0,
    notification_package_available: failed === 0,
    audit_endpoint_available: failed === 0,
    feature_flag_available: failed === 0,
    enterprise_security_preserved: failed === 0,
    event_governance_preserved: failed === 0,
    eco_preserved: failed === 0,
    baseline_preserved: failed === 0,
    tests_passing: failed === 0
  };

  const evidenceDir = path.join(DOCS, 'evidence/sec-10');
  if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
  fs.writeFileSync(path.join(evidenceDir, 'criteria.json'), JSON.stringify({ certification: 'SEC-10', criteria, passed, failed }, null, 2));

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  console.log(JSON.stringify(criteria, null, 2));

  if (failed > 0) process.exit(1);
})();
