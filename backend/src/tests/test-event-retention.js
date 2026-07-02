'use strict';

/**
 * CERT-EVENT-RETENTION-01 — Testes de lifecycle, retenção e arquivamento.
 * Execução: node src/tests/test-event-retention.js
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

const savedEnv = {};

function saveEnv(keys) {
  for (const k of keys) savedEnv[k] = process.env[k];
}

function restoreEnv(keys) {
  for (const k of keys) {
    if (savedEnv[k] === undefined) delete process.env[k];
    else process.env[k] = savedEnv[k];
  }
}

const ENV_KEYS = [
  'IMPETUS_EVENT_RETENTION_ENGINE',
  'IMPETUS_EVENT_RETENTION_MODE',
  'IMPETUS_EVENT_RETENTION_SCHEDULER',
  'IMPETUS_EVENT_RETENTION_ALLOW_PURGE'
];

(async () => {
  console.log('\n══ CERT-EVENT-RETENTION-01 — TESTES ══\n');

  saveEnv(ENV_KEYS);
  process.env.IMPETUS_EVENT_RETENTION_ENGINE = 'shadow';
  process.env.IMPETUS_EVENT_RETENTION_MODE = 'shadow';
  process.env.IMPETUS_EVENT_RETENTION_SCHEDULER = 'shadow';
  process.env.IMPETUS_EVENT_RETENTION_ALLOW_PURGE = 'false';

  try {
    console.log('── Estados do ciclo de vida ──');
    const states = require('../eventPipeline/retention/eventLifecycleStates');
    assert('R1.1 ACTIVE válido', states.isValidState('ACTIVE'));
    assert('R1.2 PURGED terminal', (states.ALLOWED_TRANSITIONS.PURGED || []).length === 0);
    assert('R1.3 ACTIVE→ARCHIVED permitido', states.canTransition('ACTIVE', 'ARCHIVED'));
    assert('R1.4 ACTIVE→PURGED bloqueado', !states.canTransition('ACTIVE', 'PURGED'));
    assert('R1.5 ARCHIVED→HISTORICAL permitido', states.canTransition('ARCHIVED', 'HISTORICAL'));
    assert('R1.6 HISTORICAL→PURGE_ELIGIBLE permitido', states.canTransition('HISTORICAL', 'PURGE_ELIGIBLE'));

    console.log('\n── Classificação por categoria ──');
    const catalog = require('../eventPipeline/retention/eventBackboneCategoryRegistry');
    assert('R2.1 telemetry', catalog.classifyEvent({ domain: 'telemetry', event_name: 'sensor.reading' }) === 'operational_telemetry');
    assert('R2.2 pulse', catalog.classifyEvent({ domain: 'pulse', event_name: 'pulse.signal' }) === 'human_pulse');
    assert('R2.3 cognitive', catalog.classifyEvent({ domain: 'anam', event_name: 'anam.insight' }) === 'cognitive');
    assert('R2.4 audit', catalog.classifyEvent({ domain: 'audit', event_name: 'audit.access' }) === 'audit_compliance');
    assert('R2.5 outbox', catalog.classifyEvent({ source_table: 'industrial_event_outbox' }) === 'workflow_outbox');

    console.log('\n── Integridade / checksum ──');
    const archive = require('../eventPipeline/retention/eventArchiveService');
    const payload = { event: 'test', value: 42 };
    const checksum = archive._checksum(payload);
    assert('R3.1 checksum determinístico', checksum === archive._checksum(payload));
    assert('R3.2 checksum sha256 hex', /^[a-f0-9]{64}$/.test(checksum));

    console.log('\n── Scheduler (flags) ──');
    const sched = require('../eventPipeline/retention/eventRetentionScheduler');
    assert('R4.1 scheduler shadow habilitado', sched.isRetentionSchedulerEnabled());
    assert('R4.2 scheduler mode shadow', sched.schedulerMode() === 'shadow');
    process.env.IMPETUS_EVENT_RETENTION_SCHEDULER = 'off';
    assert('R4.3 scheduler off desabilita', !sched.isRetentionSchedulerEnabled());
    process.env.IMPETUS_EVENT_RETENTION_SCHEDULER = 'shadow';

    console.log('\n── Observabilidade (métricas permitidas) ──');
    const obs = require('../services/observabilityService');
    const before = obs.getMetricsSnapshot();
    obs.incrementMetric('event_retention_processed');
    obs.incrementMetric('event_archived');
    const after = obs.getMetricsSnapshot();
    assert('R5.1 event_retention_processed', (after.event_retention_processed || 0) >= (before.event_retention_processed || 0) + 1);
    assert('R5.2 event_archived', (after.event_archived || 0) >= (before.event_archived || 0) + 1);

    console.log('\n── Engine shadow (sem purge) ──');
    const engine = require('../eventPipeline/retention/eventRetentionEngine');
    const cycle = await engine.runRetentionCycle({ compress: false });
    assert('R6.1 ciclo shadow ok', cycle.ok === true);
    assert('R6.2 modo shadow', cycle.mode === 'shadow');
    assert('R6.3 purge não permitido por defeito', cycle.transitions.every((t) => t.to !== 'PURGED'));

    console.log('\n── Transição inválida bloqueada ──');
    const bad = await engine.transitionArchiveState(
      { id: '00000000-0000-0000-0000-000000000001', lifecycle_state: 'ACTIVE' },
      'PURGED'
    );
    assert('R7.1 transição ACTIVE→PURGED rejeitada', bad.ok === false);

    console.log('\n── Diagnósticos ──');
    const diag = await engine.getRetentionDiagnostics();
    assert('R8.1 diagnostics enabled', diag.enabled === true);
    assert('R8.2 policy_version', diag.policy_version === '1.0.0');

    if (diag.policies_count > 0) {
      assert('R8.3 políticas carregadas (migration aplicada)', diag.policies_count >= 6);
    } else {
      console.log('  ⚠️  R8.3 políticas vazias — executar migration event_backbone_retention_lifecycle_migration.sql');
    }

    console.log('\n── Explainability (estrutura) ──');
    const explain = require('../eventPipeline/retention/eventRetentionExplainability');
    const missing = await explain.explainArchivedEvent('00000000-0000-0000-0000-000000000099');
    assert('R9.1 not_found para id inexistente', missing.ok === false && missing.reason === 'not_found');
  } catch (err) {
    failed++;
    console.error('  ❌ Erro fatal:', err?.message || err);
  } finally {
    restoreEnv(ENV_KEYS);
  }

  console.log(`\n══ RESULTADO: ${passed} passou, ${failed} falhou ══\n`);
  process.exit(failed > 0 ? 1 : 0);
})();
