'use strict';

/**
 * NC-03-BRIDGE — testes de consolidação de produtores no Notification Center
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
  console.log('\n  NC-03-BRIDGE\n');

  const bridgePath = path.join(SRC, 'services/notificationBridgeService.js');
  const opAlertsSrc = readSrc('services/operationalAlertsService.js');
  const tpmSrc = readSrc('services/tpmNotifications.js');
  const proactiveSrc = readSrc('services/aiProactiveMessagingService.js');
  const proactiveJobSrc = readSrc('jobs/proactiveAI.js');
  const executiveSrc = readSrc('services/executiveMode.js');
  const auditSrc = readSrc('routes/audit.js');

  await test('T1 — notificationBridgeService exporta bridges e métricas', () => {
    assert(fs.existsSync(bridgePath));
    const mod = require('../../services/notificationBridgeService');
    assert(typeof mod.bridgeOperationalAlert === 'function');
    assert(typeof mod.bridgeTpmIncident === 'function');
    assert(typeof mod.bridgeProactiveMessage === 'function');
    assert(typeof mod.bridgeExecutiveMessage === 'function');
    assert(typeof mod.getBridgeRegistry === 'function');
    assert(mod.METRIC_OPERATIONAL === 'notification_bridge_operational_alerts');
  });

  await test('T2 — Severidade operacional: alta/high/critical elegíveis', () => {
    const mod = require('../../services/notificationBridgeService');
    assert.strictEqual(mod.isOperationalSeverityEligible('alta'), true);
    assert.strictEqual(mod.isOperationalSeverityEligible('high'), true);
    assert.strictEqual(mod.isOperationalSeverityEligible('critical'), true);
    assert.strictEqual(mod.isOperationalSeverityEligible('media'), false);
    assert.strictEqual(mod.isOperationalSeverityEligible('baixa'), false);
  });

  await test('T3 — TPM crítico por severity ou perdas', () => {
    const mod = require('../../services/notificationBridgeService');
    assert.strictEqual(mod.isTpmIncidentCritical({ severity: 'critical' }), true);
    assert.strictEqual(
      mod.isTpmIncidentCritical({ losses_before: 5, losses_during: 5, losses_after: 1 }),
      true
    );
    assert.strictEqual(
      mod.isTpmIncidentCritical({ losses_before: 0, losses_during: 0, losses_after: 0 }),
      false
    );
  });

  await test('T4 — operationalAlertsService invoca bridge após insert alta', () => {
    assert(opAlertsSrc.includes('notificationBridge'));
    assert(opAlertsSrc.includes('bridgeOperationalAlert'));
    assert(opAlertsSrc.includes("severidade: 'alta'"));
    assert(opAlertsSrc.includes('INSERT INTO operational_alerts'));
  });

  await test('T5 — tpmNotifications mantém App Impetus + alerts + bridge NC', () => {
    assert(tpmSrc.includes("appImpetusService.sendMessage"));
    assert(tpmSrc.includes('maybePersistAlertRow'));
    assert(tpmSrc.includes('INSERT INTO alerts'));
    assert(tpmSrc.includes('bridgeTpmIncident'));
  });

  await test('T6 — aiProactiveMessagingService espelha NC após outbox', () => {
    assert(proactiveSrc.includes('appImpetusService.sendMessage'));
    assert(proactiveSrc.includes('bridgeProactiveMessage'));
  });

  await test('T7 — proactiveAI job espelha NC sem remover mobile', () => {
    assert(proactiveJobSrc.includes('appImpetusService.sendMessage'));
    assert(proactiveJobSrc.includes('bridgeProactiveMessage'));
    assert(proactiveJobSrc.includes('SELECT id, whatsapp_number, phone'));
  });

  await test('T8 — executiveMode sendCEOResponse dual delivery', () => {
    assert(executiveSrc.includes('appImpetusService.sendMessage'));
    assert(executiveSrc.includes('bridgeExecutiveMessage'));
    assert(executiveSrc.includes("originatedFrom: 'executive'"));
  });

  await test('T9 — Roles executivos elegíveis', () => {
    const mod = require('../../services/notificationBridgeService');
    assert.strictEqual(mod.isExecutiveRoleEligible('ceo', ''), true);
    assert.strictEqual(mod.isExecutiveRoleEligible('diretor', 'Diretor Industrial'), true);
    assert.strictEqual(mod.isExecutiveRoleEligible('gerente', 'Gerente Industrial'), true);
    assert.strictEqual(mod.isExecutiveRoleEligible('colaborador', 'Operador'), false);
  });

  await test('T10 — GET /api/audit/notification-center/bridges', () => {
    assert(auditSrc.includes('/notification-center/bridges'));
    assert(auditSrc.includes('getBridgeRegistry'));
    assert(auditSrc.includes('operational_alerts:'));
    assert(auditSrc.includes('executive_mode:'));
  });

  await test('T11 — bridgeOperationalAlert skip media severity (mock send)', async () => {
    const mod = require('../../services/notificationBridgeService');
    const r = await mod.bridgeOperationalAlert('00000000-0000-0000-0000-000000000099', {
      severidade: 'media',
      titulo: 'Teste',
      mensagem: 'Não deve enviar'
    });
    assert.strictEqual(r.bridged, 0);
  });

  await test('T12 — getBridgeRegistry reporta bridges activos', () => {
    const mod = require('../../services/notificationBridgeService');
    const reg = mod.getBridgeRegistry();
    assert.strictEqual(reg.operational_alerts, true);
    assert.strictEqual(reg.tpm, true);
    assert.strictEqual(reg.ai_proactive, true);
    assert.strictEqual(reg.executive_mode, true);
  });

  console.log(`\n  Resultado: ${passed} passed, ${failed} failed\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
