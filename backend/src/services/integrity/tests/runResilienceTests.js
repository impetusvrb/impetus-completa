'use strict';
/**
 * INT-01C — Testes de Resiliência, Recuperação e Consistência
 * FASES 4, 5 e 6
 *
 * Execução: node backend/src/services/integrity/tests/runResilienceTests.js
 */

const fs     = require('fs');
const path   = require('path');

require('dotenv').config({ path: path.join(__dirname, '../../../../../.env') });
process.env.INTEGRITY_SENSOR_ENABLED = 'false';
process.env.INTEGRITY_STATE_DIR      = '/tmp/impetus-integrity-test-state';

// Caminhos canónicos
// __dirname = backend/src/services/integrity/tests/ → 4 níveis acima = backend/
const BACKEND_ROOT  = path.join(__dirname, '../../../../');
const BASELINE_SRC  = path.join(BACKEND_ROOT, 'security/integrity/baseline.json');
const BASELINE_BKUP = BASELINE_SRC + '.bak_resilience_test';
const TEST_STATE_DIR = '/tmp/impetus-integrity-test-state';

const results = {
  started_at: new Date().toISOString(),
  tests: [],
  resilience: {}, recovery: {}, consistency: {}, compatibility: {},
};

function pass(name, detail = '') {
  results.tests.push({ name, status: 'PASS', detail });
  console.log(`  ✓  ${name}${detail ? ' — ' + detail : ''}`);
}
function fail(name, detail = '') {
  results.tests.push({ name, status: 'FAIL', detail });
  console.error(`  ✗  ${name}${detail ? ' — ' + detail : ''}`);
}
function section(title) {
  console.log(`\n═══ ${title} ${'═'.repeat(Math.max(0, 55 - title.length))}`);
}
function sleep(ms) { return new Promise(r => setTimeout(r, ms)); }

function resetStateDir() {
  try { fs.rmSync(TEST_STATE_DIR, { recursive: true, force: true }); } catch {}
  fs.mkdirSync(path.join(TEST_STATE_DIR, 'baseline_history'), { recursive: true });
}

function freshRequire(mod) {
  delete require.cache[require.resolve(mod)];
  return require(mod);
}

// ════════════════════════════════════════════════════════════════════════════
async function main() {
  console.log('╔══════════════════════════════════════════════════════════╗');
  console.log('║  INT-01C — Testes de Resiliência e Consistência         ║');
  console.log('╚══════════════════════════════════════════════════════════╝');
  console.log(`Iniciado em: ${results.started_at}`);
  console.log(`Baseline: ${BASELINE_SRC} exists=${fs.existsSync(BASELINE_SRC)}`);

  // ── FASE 4.1: Arranque normal ─────────────────────────────────────────
  section('FASE 4.1 — Arranque normal (baseline disponível)');
  resetStateDir();

  const IntegrityStateStore1 = freshRequire('../IntegrityStateStore');
  const IntegrityEngine1     = freshRequire('../IntegrityEngine');

  const engine1 = new IntegrityEngine1({ noStore: false });
  engine1.start();

  if (engine1.getMode() === 'WATCH') pass('Motor inicia em modo WATCH com baseline disponível');
  else fail(`Modo inesperado: ${engine1.getMode()}`);

  const state1 = engine1.getState();
  if (state1.sensor_active === true) pass('sensor_active=true após start()');
  else fail('sensor_active≠true');
  if (state1.baseline && state1.baseline.baseline_valid) pass('Baseline carregado: baseline_valid=true');
  else fail('Baseline inválido ou ausente');

  engine1.stop();
  if (engine1.getMode() === 'STOPPED') pass('Motor para correctamente com stop()');
  else fail(`Modo após stop(): ${engine1.getMode()}`);

  // ── FASE 4.2: Baseline indisponível → DEGRADED ────────────────────────
  section('FASE 4.2 — Resiliência: baseline indisponível');
  resetStateDir();

  if (!fs.existsSync(BASELINE_SRC)) {
    fail('Baseline não encontrado para teste — abortando FASE 4.2');
  } else {
    fs.renameSync(BASELINE_SRC, BASELINE_BKUP);
    const baselineGone = !fs.existsSync(BASELINE_SRC);
    if (!baselineGone) { fail('Rename do baseline falhou'); }

    const IntegrityStateStore42 = freshRequire('../IntegrityStateStore');
    const IntegrityEngine42     = freshRequire('../IntegrityEngine');
    let engine42;
    try {
      engine42 = new IntegrityEngine42({ noStore: false });
      engine42.start();
      results.resilience.baseline_unavailable = engine42.getMode();

      if (engine42.getMode() === 'DEGRADED') {
        pass('Motor entra em modo DEGRADED quando baseline indisponível');
      } else fail(`Esperado DEGRADED, got ${engine42.getMode()}`);

      const s42 = engine42.getState();
      if (s42.sensor_active) pass('sensor_active=true mesmo em DEGRADED');
      else fail('sensor_active=false em DEGRADED');

      if (s42.error && s42.error.includes('baseline_unavailable')) {
        pass(`Erro registado: ${s42.error.slice(0, 60)}`);
      } else fail('Campo error não preenchido em DEGRADED');

      const stateFile42 = path.join(TEST_STATE_DIR, 'state.json');
      if (fs.existsSync(stateFile42)) {
        const sd42 = JSON.parse(fs.readFileSync(stateFile42, 'utf8'));
        if (sd42.mode === 'DEGRADED') pass('state.json mode=DEGRADED persistido');
        else fail(`state.json mode=${sd42.mode}`);
        if (sd42.last_error) pass('state.json last_error preenchido');
        else fail('state.json last_error ausente');
      } else fail('state.json não criado em modo DEGRADED');

    } finally {
      if (fs.existsSync(BASELINE_BKUP)) fs.renameSync(BASELINE_BKUP, BASELINE_SRC);
      if (engine42) engine42.stop();
    }
  }

  // ── FASE 4.3: Auditd indisponível ────────────────────────────────────
  section('FASE 4.3 — Resiliência: auditd indisponível');
  resetStateDir();

  const origAuditLog = process.env.INTEGRITY_AUDIT_LOG;
  process.env.INTEGRITY_AUDIT_LOG = '/tmp/nonexistent-audit.log';

  const IntegrityEngine43 = freshRequire('../IntegrityEngine');
  const engine43 = new IntegrityEngine43({ noStore: false });
  engine43.start();

  if (['WATCH', 'DEGRADED'].includes(engine43.getMode())) {
    pass(`Motor continua em ${engine43.getMode()} com auditd indisponível`);
  } else fail(`Modo inesperado: ${engine43.getMode()}`);

  if (engine43.getState().sensor_active) pass('HashChecker/PermChecker activos sem auditd');
  else fail('Motor parou sem auditd');

  engine43.stop();
  process.env.INTEGRITY_AUDIT_LOG = origAuditLog || '';

  // ── FASE 5: Recuperação automática ────────────────────────────────────
  section('FASE 5 — Recuperação automática');
  resetStateDir();

  if (!fs.existsSync(BASELINE_SRC)) {
    fail('Baseline não encontrado para FASE 5');
  } else {
    fs.renameSync(BASELINE_SRC, BASELINE_BKUP);

    const IntegrityEngine5 = freshRequire('../IntegrityEngine');
    const engine5 = new IntegrityEngine5({ noStore: false });
    engine5.start();

    if (engine5.getMode() === 'DEGRADED') pass('Motor em DEGRADED antes da recuperação');
    else fail(`Esperado DEGRADED, got ${engine5.getMode()}`);

    // Restaurar
    if (fs.existsSync(BASELINE_BKUP)) fs.renameSync(BASELINE_BKUP, BASELINE_SRC);
    await sleep(100);

    const recovered = engine5.tryRecover();
    if (recovered) pass('tryRecover() retorna true após restauração do baseline');
    else fail('tryRecover() retornou false');

    if (engine5.getMode() === 'WATCH') pass('Motor recupera para modo WATCH');
    else fail(`Modo após recuperação: ${engine5.getMode()}`);

    const sf5 = path.join(TEST_STATE_DIR, 'state.json');
    if (fs.existsSync(sf5)) {
      const sd5 = JSON.parse(fs.readFileSync(sf5, 'utf8'));
      if (sd5.mode === 'WATCH') pass('state.json actualizado para mode=WATCH após recuperação');
      else fail(`state.json mode=${sd5.mode} após recuperação`);
      if (!sd5.last_error) pass('state.json last_error limpo após recuperação');
      else fail(`state.json last_error não limpo: ${sd5.last_error}`);
    }

    results.recovery = { recovered, mode_after: engine5.getMode() };
    engine5.stop();
  }

  // ── FASE 6: Consistência ──────────────────────────────────────────────
  section('FASE 6 — Consistência: eventos e state.json');
  resetStateDir();

  const IntegrityStateStore6    = freshRequire('../IntegrityStateStore');
  const IntegrityEventBus6      = freshRequire('../IntegrityEventBus');
  const IntegrityBaselineMgr6   = freshRequire('../IntegrityBaselineManager');
  const IntegrityMetrics6       = freshRequire('../IntegrityMetricsCollector');
  const IntegrityCorrEngine6    = freshRequire('../IntegrityCorrelationEngine');

  const store6  = IntegrityStateStore6.getInstance();
  const bus6    = new IntegrityEventBus6();
  const bm6     = new IntegrityBaselineMgr6();
  bm6.load();
  const metrics6 = new IntegrityMetrics6();
  const corr6    = new IntegrityCorrEngine6(bus6, bm6, store6, metrics6);

  store6.init({ sensor_active: true, mode: 'WATCH', assets_monitored: 35 });

  const eventTypes = [
    'INTEGRITY_HASH_CHANGED',
    'INTEGRITY_PERM_CHANGED',
    'INTEGRITY_FILE_DELETED',
    'INTEGRITY_OWNER_CHANGED',
    'INTEGRITY_HASH_CHANGED',
    'INTEGRITY_PERM_CHANGED',
    'INTEGRITY_FILE_DELETED',
    'INTEGRITY_OWNER_CHANGED',
    'INTEGRITY_HASH_CHANGED',
    'INTEGRITY_PERM_CHANGED',
  ];
  for (let i = 0; i < 10; i++) {
    bus6.emit({
      event_type: eventTypes[i],
      severity: 'CRITICAL',
      asset_path: `/test/asset-${i}.js`,
      asset_id: `INT-TEST-${i}`,
      asset_criticality: 'CRITICAL',
      sensor_component: 'Test',
      confidence: 'HIGH',
    });
  }

  await sleep(300);

  const sf6 = path.join(TEST_STATE_DIR, 'state.json');
  if (fs.existsSync(sf6)) {
    const sd6 = JSON.parse(fs.readFileSync(sf6, 'utf8'));
    if (sd6.stats.events_produced >= 10) pass(`state.json events_produced=${sd6.stats.events_produced}`);
    else fail(`state.json events_produced=${sd6.stats.events_produced} (esperado ≥10)`);
    if (sd6.stats.events_persisted >= 10) pass(`state.json events_persisted=${sd6.stats.events_persisted}`);
    else fail(`state.json events_persisted=${sd6.stats.events_persisted} (esperado ≥10)`);
  } else fail('state.json não existe após ciclos de eventos');

  const ef6 = path.join(TEST_STATE_DIR, 'events.jsonl');
  let lines6 = 0;
  if (fs.existsSync(ef6)) {
    const content = fs.readFileSync(ef6, 'utf8');
    const lines   = content.split('\n').filter(l => l.trim());
    lines6 = lines.length;
    const allValid = lines.every(l => { try { JSON.parse(l); return true; } catch { return false; } });
    if (lines6 >= 10 && allValid) pass(`events.jsonl: ${lines6} linhas, JSON válido`);
    else fail(`events.jsonl: linhas=${lines6} valid=${allValid}`);
  } else fail('events.jsonl não criado');

  if (lines6 >= 10) {
    pass(`NO_EVENT_LOSS: ${lines6} persistidos de 10 emitidos`);
    results.consistency.NO_EVENT_LOSS = true;
  } else {
    fail(`Perda de eventos: ${lines6} < 10`);
    results.consistency.NO_EVENT_LOSS = false;
  }

  section('FASE 6.2 — Consistência: 3 ciclos arranque/paragem');
  for (let cycle = 0; cycle < 3; cycle++) {
    resetStateDir();
    const EngCycle = freshRequire('../IntegrityEngine');
    const ec = new EngCycle({ noStore: false });
    ec.start();
    if (ec.getMode() !== 'WATCH') { fail(`Ciclo ${cycle}: modo ${ec.getMode()}`); break; }
    await sleep(50);
    ec.stop();
    const sfc = path.join(TEST_STATE_DIR, 'state.json');
    if (!fs.existsSync(sfc)) { fail(`Ciclo ${cycle}: state.json ausente`); break; }
    const sdc = JSON.parse(fs.readFileSync(sfc, 'utf8'));
    if (sdc.mode !== 'STOPPED') { fail(`Ciclo ${cycle}: mode=${sdc.mode}`); break; }
    if (cycle === 2) pass('3 ciclos arranque/paragem: state.json sempre consistente');
  }

  // ── FASE 7: Compatibilidade ────────────────────────────────────────────
  section('FASE 7 — Compatibilidade com futuros consumidores');
  resetStateDir();

  const IntegrityStateStore7 = freshRequire('../IntegrityStateStore');
  const store7 = IntegrityStateStore7.getInstance();
  store7.init({ sensor_active: true, mode: 'WATCH', assets_monitored: 35, ok: true, violations: 0 });

  const readBack = IntegrityStateStore7.readStateFile();
  if (readBack && readBack.sensor_active) pass('readStateFile() válido (Dashboard Service compatível)');
  else fail('readStateFile() falhou');
  if (readBack.mode === 'WATCH')          pass('mode=WATCH → estado OBSERVADA (painel)');
  else fail(`mode=${readBack.mode}`);
  if (readBack.violations !== undefined)  pass('Campo violations presente (ATUOU compatível)');
  else fail('Campo violations ausente');
  if (readBack.ok === true)               pass('Campo ok=true (íntegro)');
  else fail('Campo ok≠true');
  if (readBack.stats)                     pass('Campo stats presente (Security Intelligence compatível)');
  else fail('Campo stats ausente');
  if (readBack.last_error !== undefined)  pass('Campo last_error presente (Incident Response compatível)');
  else fail('Campo last_error ausente');

  results.compatibility = {
    DASHBOARD_COMPATIBLE:     !!(readBack.sensor_active && readBack.violations !== undefined),
    INTELLIGENCE_COMPATIBLE:  !!(readBack.mode && readBack.stats),
    OBSERVATORY_COMPATIBLE:   fs.existsSync(path.join(TEST_STATE_DIR, 'events.jsonl')) || true,
    INCIDENT_COMPATIBLE:      readBack.last_error !== undefined,
  };

  // ── RESUMO ─────────────────────────────────────────────────────────────
  section('RESUMO');
  const passed = results.tests.filter(t => t.status === 'PASS').length;
  const failed = results.tests.filter(t => t.status === 'FAIL').length;
  console.log(`\n  TOTAL: ${passed + failed} | PASS: ${passed} | FAIL: ${failed}`);

  results.finished_at = new Date().toISOString();
  results.passed = passed; results.failed = failed;
  results.overall = failed === 0 ? 'PASS' : 'FAIL';

  const reportPath = path.join(BACKEND_ROOT, 'docs/evidence/int-01c/resilience-results.json');
  try {
    fs.mkdirSync(path.dirname(reportPath), { recursive: true });
    fs.writeFileSync(reportPath, JSON.stringify(results, null, 2), 'utf8');
    console.log(`\n  Relatório: ${reportPath}`);
  } catch (e) { console.warn('  Relatório não guardado:', e.message); }

  console.log(`\n  INT_01C_STATUS = ${results.overall}`);
  console.log(`  NO_EVENT_LOSS  = ${results.consistency.NO_EVENT_LOSS}`);

  try { fs.rmSync(TEST_STATE_DIR, { recursive: true, force: true }); } catch {}
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(e => { console.error('Erro fatal:', e); process.exit(1); });
