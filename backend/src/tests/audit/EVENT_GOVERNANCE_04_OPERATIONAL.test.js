'use strict';

/**
 * EVENT-GOVERNANCE-04 — testes migração Operational Alerts → Governance.
 */

const fs = require('fs');
const path = require('path');
const assert = require('assert');

const BACKEND_ROOT = path.resolve(__dirname, '../../..');
const SRC = path.join(BACKEND_ROOT, 'src');

function readSrc(rel) {
  const p = path.join(SRC, rel);
  return fs.existsSync(p) ? fs.readFileSync(p, 'utf8') : null;
}

let passed = 0;
let failed = 0;

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

(async () => {
  console.log('\n  EVENT-GOVERNANCE-04-OPERATIONAL\n');

  const adapterPath = path.join(SRC, 'services/governanceAdapters/operationalAlertsGovernanceAdapter.js');
  const opAlertsPath = path.join(SRC, 'services/operationalAlertsService.js');
  const auditSrc = readSrc('routes/audit.js');
  const observabilitySrc = readSrc('services/observabilityService.js');

  const prevFlag = process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS;
  delete process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS;

  delete require.cache[require.resolve(adapterPath)];
  const adapter = require(adapterPath);
  adapter.resetStatsForTests();

  await test('T1 — adapter exporta funções principais', () => {
    assert(fs.existsSync(adapterPath));
    assert(typeof adapter.dispatchOperationalAlert === 'function');
    assert(typeof adapter.buildGovernanceEvent === 'function');
    assert(typeof adapter.inferLegacyDistribution === 'function');
    assert(typeof adapter.compareShadow === 'function');
    assert(typeof adapter.getAuditStatus === 'function');
  });

  await test('T2 — buildGovernanceEvent DTO canónico', () => {
    const event = adapter.buildGovernanceEvent({
      companyId: '00000000-0000-0000-0000-000000000001',
      severity: 'alta',
      title: 'Máquina parada',
      description: 'Linha 2 parada',
      tipo_alerta: 'maquina_parada'
    });
    assert.strictEqual(event.companyId, '00000000-0000-0000-0000-000000000001');
    assert.strictEqual(event.category, 'operational');
    assert.strictEqual(event.sourceModule, 'operationalAlertsService');
    assert.strictEqual(event.eventType, 'maquina_parada');
    assert.strictEqual(event.severity, 'alta');
    assert.strictEqual(event.payload.titulo, 'Máquina parada');
  });

  await test('T3 — inferLegacyDistribution alta inclui NC', () => {
    const legacy = adapter.inferLegacyDistribution({
      severidade: 'alta',
      titulo: 'Alerta',
      tipo_alerta: 'maquina_parada'
    });
    assert.strictEqual(legacy.severity, 'high');
    assert(legacy.channels.includes('notification_center'));
    assert(legacy.channels.includes('dashboard'));
    assert.strictEqual(legacy.bridgeEligible, true);
    assert.strictEqual(legacy.escalationLevel, 2);
  });

  await test('T4 — inferLegacyDistribution media sem NC', () => {
    const legacy = adapter.inferLegacyDistribution({
      severidade: 'media',
      tipo_alerta: 'tarefa_atrasada'
    });
    assert.strictEqual(legacy.severity, 'medium');
    assert(!legacy.channels.includes('notification_center'));
    assert(legacy.channels.includes('dashboard'));
    assert.strictEqual(legacy.bridgeEligible, false);
    assert.strictEqual(legacy.escalationLevel, 1);
  });

  await test('T5 — compareShadow match severidade alta / OPERATIONAL_CRITICAL', () => {
    const legacy = adapter.inferLegacyDistribution({ severidade: 'alta', tipo_alerta: 'maquina_parada' });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'OPERATIONAL_CRITICAL',
        channels: ['notification_center', 'dashboard', 'operational_alerts'],
        escalationLevel: 2,
        decision: {
          policyId: 'OPERATIONAL_CRITICAL',
          severity: 'high',
          channels: ['notification_center', 'dashboard', 'operational_alerts'],
          escalationLevel: 2
        }
      },
      execution: {
        channelsReady: ['notification_center', 'dashboard', 'operational_alerts']
      }
    };
    const cmp = adapter.compareShadow(legacy, governanceResult);
    assert.strictEqual(cmp.match, true);
    assert.strictEqual(cmp.divergence, null);
  });

  await test('T6 — compareShadow match severidade media / OPERATIONAL_MEDIUM', () => {
    const legacy = adapter.inferLegacyDistribution({ severidade: 'media', tipo_alerta: 'tarefa_atrasada' });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'OPERATIONAL_MEDIUM',
        decision: {
          policyId: 'OPERATIONAL_MEDIUM',
          severity: 'medium',
          channels: ['dashboard', 'operational_alerts'],
          escalationLevel: 1
        }
      },
      execution: {
        channelsReady: ['dashboard', 'operational_alerts']
      }
    };
    const cmp = adapter.compareShadow(legacy, governanceResult);
    assert.strictEqual(cmp.match, true);
  });

  await test('T7 — flag OFF (shadow): dispatch não migra', async () => {
    delete process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS;

    const bridgePath = path.join(SRC, 'services/notificationBridgeService.js');
    delete require.cache[require.resolve(bridgePath)];
    delete require.cache[require.resolve(adapterPath)];

    const bridge = require(bridgePath);
    let bridgeCalled = false;
    const origBridge = bridge.bridgeOperationalAlert;
    bridge.bridgeOperationalAlert = async () => {
      bridgeCalled = true;
      return { bridged: 1 };
    };

    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const result = await mod.dispatchOperationalAlert('00000000-0000-0000-0000-000000000001', {
      severidade: 'alta',
      titulo: 'Teste shadow',
      mensagem: 'Msg',
      tipo_alerta: 'maquina_parada'
    });

    assert.strictEqual(result.mode, 'shadow');
    assert.strictEqual(bridgeCalled, true);
    assert(result.comparison);
    assert.strictEqual(typeof result.comparison.match, 'boolean');

    bridge.bridgeOperationalAlert = origBridge;
    delete require.cache[require.resolve(bridgePath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T8 — flag ON: dispatch usa governance sem bridge', async () => {
    process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS = 'true';
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    mod.resetStatsForTests();

    const bridgePath = path.join(SRC, 'services/notificationBridgeService.js');
    delete require.cache[require.resolve(bridgePath)];
    const bridge = require(bridgePath);

    let bridgeCalled = false;
    bridge.bridgeOperationalAlert = async () => {
      bridgeCalled = true;
      return { bridged: 1 };
    };
    bridge.findSupervisorNcRecipients = async () => [];

    const result = await mod.dispatchOperationalAlert('00000000-0000-0000-0000-000000000001', {
      severidade: 'alta',
      titulo: 'Teste migrado',
      mensagem: 'Msg',
      tipo_alerta: 'maquina_parada'
    });

    assert.strictEqual(result.mode, 'governance');
    assert.strictEqual(bridgeCalled, false);
    assert(result.governanceResult);

    delete process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS;
    delete require.cache[require.resolve(bridgePath)];
    delete require.cache[require.resolve(adapterPath)];
  });

  await test('T9 — operationalAlertsService integra _dispatchOperationalAlert', () => {
    const src = readSrc('services/operationalAlertsService.js');
    assert(src.includes('_dispatchOperationalAlert'));
    assert(src.includes('operationalAlertsGovernanceAdapter'));
    assert(src.includes('persistDecisionEngineAlerts'));
    assert(src.includes('createPlanningDerivedAlert'));
    assert(!src.includes('bridgeOperationalAlert(cid'));
  });

  await test('T10 — observability métricas operational', () => {
    assert(observabilitySrc.includes('event_governance_operational_events'));
    assert(observabilitySrc.includes('event_governance_operational_migrated'));
    assert(observabilitySrc.includes('event_governance_operational_shadow_total'));
    assert(observabilitySrc.includes('event_governance_operational_shadow_match'));
    assert(observabilitySrc.includes('event_governance_operational_shadow_divergence'));
  });

  await test('T11 — GET /api/audit/event-governance/operational-alerts', () => {
    assert(auditSrc.includes('/event-governance/operational-alerts'));
    assert(auditSrc.includes('operationalAlertsGovernance'));
    assert(auditSrc.includes('requireTenantAdminRole'));
  });

  await test('T12 — getAuditStatus shape', () => {
    adapter.resetStatsForTests();
    const st = adapter.getAuditStatus();
    assert.strictEqual(typeof st.enabled, 'boolean');
    assert.strictEqual(typeof st.shadow_mode, 'boolean');
    assert.strictEqual(typeof st.events_evaluated, 'number');
    assert.strictEqual(typeof st.matches, 'number');
    assert.strictEqual(typeof st.divergences, 'number');
    assert.strictEqual(st.shadow_mode, !st.enabled);
  });

  await test('T13 — feature flag EVENT_GOVERNANCE_OPERATIONAL_ALERTS registada', () => {
    const fgSrc = readSrc('services/featureGovernanceService.js');
    assert(fgSrc.includes('EVENT_GOVERNANCE_OPERATIONAL_ALERTS'));
  });

  await test('T14 — isOperationalAlertsGovernanceEnabled default false', () => {
    delete process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS;
    delete require.cache[require.resolve(adapterPath)];
    const mod = require(adapterPath);
    assert.strictEqual(mod.isOperationalAlertsGovernanceEnabled(), false);
  });

  await test('T15 — equivalência canais: divergência detectada', () => {
    const legacy = adapter.inferLegacyDistribution({ severidade: 'media', tipo_alerta: 'x' });
    const governanceResult = {
      evaluation: {
        approved: true,
        policyId: 'OPERATIONAL_CRITICAL',
        decision: {
          policyId: 'OPERATIONAL_CRITICAL',
          severity: 'high',
          channels: ['notification_center', 'dashboard'],
          escalationLevel: 2
        }
      },
      execution: { channelsReady: ['notification_center', 'dashboard'] }
    };
    const cmp = adapter.compareShadow(legacy, governanceResult);
    assert.strictEqual(cmp.match, false);
    assert(cmp.divergence);
  });

  if (prevFlag !== undefined) {
    process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS = prevFlag;
  } else {
    delete process.env.EVENT_GOVERNANCE_OPERATIONAL_ALERTS;
  }

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);

  if (failed > 0) {
    process.exit(1);
  }

  console.log(JSON.stringify({ passed, failed }));
})();
