#!/usr/bin/env node
/**
 * IMPETUS — Runner FORWARD-ONLY de migrations
 *
 * - NUNCA executa rollbacks (`*_rollback.sql`, `rollback_*.sql`, ou ficheiros em pastas `_rollback/`).
 * - NUNCA executa migrations marcadas como destrutivas (DROP TABLE/COLUMN/SCHEMA/DB, TRUNCATE,
 *   DELETE sem WHERE) salvo se `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true`.
 * - Denylist permanente (`migrationSafetyPolicy.js`): certas migrations LEGACY / MANUAL_ONLY
 *   nunca são executadas nem adoptadas, **mesmo** com `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true`.
 * - NÃO reaplica migrations já registadas com sucesso em `impetus_migration_history`
 *   (verificação por (source, name) + checksum).
 * - Suporta `--dry-run` para mostrar plano sem tocar na BD.
 *
 * Uso:
 *   node scripts/run-all-migrations.js                  # forward
 *   node scripts/run-all-migrations.js --dry-run        # plano
 *   node scripts/run-all-migrations.js --status         # histórico
 *
 * Variáveis de ambiente relevantes:
 *   IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true  → permite migrations destrutivas
 *   IMPETUS_MIGRATION_ACTOR=alice              → identifica o autor para auditoria
 *
 * Compatível com `npm run migrate`. Nenhuma alteração de contrato.
 */

'use strict';

require('../src/config/loadEnv').loadImpetusEnv();

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const parser = require('./migrations/parser');
const classifier = require('./migrations/classifier');
const discover = require('./migrations/discover');
const history = require('./migrations/history');
const migrationSafetyPolicy = require('./migrations/migrationSafetyPolicy');
const governance = require('../src/services/migrationGovernanceService');

const MODELS_DIR = path.join(__dirname, '../src/models');
const EXTRA_MIGRATIONS_DIR = path.join(__dirname, '../migrations');

// Mantida do legado para preservar a ordem de execução em src/models/ que
// já correu em produção. Ficheiros não listados aqui vão para o fim alfabético.
const MIGRATIONS_ORDER = [
  'auth_middleware_schema_migration.sql',
  'structural_knowledge_documents_context_migration.sql',
  'nexus_token_billing_migration.sql',
  'nexus_credit_wallet_migration.sql',
  'nexus_billing_engine_v4_migration.sql',
  'dashboard_intelligence_migration.sql',
  'lacunas_ind4_migration.sql',
  'industrial_intelligence_extended_migration.sql',
  'machine_safety_intervention_migration.sql',
  'audio_logs_migration.sql',
  'dashboard_personalizado_migration.sql',
  'voice_preferences_migration.sql',
  'voice_preferences_restore_migration.sql',
  'performance_indexes_migration.sql',
  'admin_portal_migration.sql',
  'manuia_migration.sql',
  'manuia_extension_app_migration.sql',
  'manuia_inbox_attendance_migration.sql',
  'equipment_library_admin_migration.sql',
  'equipment_technical_3d_models_migration.sql',
  'technical_library_inteligente_migration.sql',
  'technical_library_field_analysis_migration.sql',
  'cognitive_council_migration.sql',
  'system_metrics_migration.sql'
];

const allowDestructive = String(process.env.IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS || '').trim() === 'true';

function parseArgs(argv) {
  const args = {
    dryRun: false,
    status: false,
    only: null,
    verbose: false,
    adopt: false
  };
  for (const a of argv) {
    if (a === '--dry-run' || a === '-n') args.dryRun = true;
    else if (a === '--status') args.status = true;
    else if (a === '--verbose' || a === '-v') args.verbose = true;
    else if (a === '--adopt') args.adopt = true;
    else if (a.startsWith('--only=')) args.only = a.slice('--only='.length);
  }
  return args;
}

function printPlanHeader(args) {
  console.log('\n=== IMPETUS Migration Runner (forward only) ===');
  console.log(`mode                : ${args.dryRun ? 'DRY-RUN' : 'EXECUTE'}`);
  console.log(`models dir          : ${MODELS_DIR}`);
  console.log(`migrations dir      : ${EXTRA_MIGRATIONS_DIR}`);
  console.log(`destructive allowed : ${allowDestructive}`);
  console.log(`actor               : ${history.defaultActor()}`);
  console.log('');
}

async function showStatus() {
  await history.ensureHistoryTable(db);
  const rows = await history.listHistory(db, 100);
  if (!rows.length) {
    console.log('Histórico vazio.');
    return;
  }
  console.log('id\tstatus\t\tcategory\tsource\t\tname\texecuted_at\tactor');
  for (const r of rows) {
    console.log(
      [r.id, r.status, r.category || '-', r.source, r.name, r.executed_at?.toISOString?.() || r.executed_at, r.executed_by || '-']
        .join('\t')
    );
  }
}

async function planForFile(absPath, source, name) {
  const sql = discover.readIfExists(absPath);
  if (sql == null) {
    return { source, name, status: 'missing' };
  }
  const checksum = history.checksumOf(sql);
  const cls = classifier.classifyFile(sql);
  // Detecção adicional: padrões destrutivos vetoriais (embedding/pgvector).
  const vectorCheck = migrationSafetyPolicy.detectVectorDestructivePatterns(sql);
  if (vectorCheck.isVectorDestructive) {
    cls.category = 'destructive';
    cls.destructive = [...(cls.destructive || []), ...vectorCheck.flags.map(f => ({ flag: f.flag, severity: 'critical', description: f.description }))];
  }
  let appliedRow = null;
  try {
    appliedRow = await history.findApplied(db, source, name);
  } catch (_) {
    // tabela ainda pode não existir; o caller já chamou ensureHistoryTable
  }
  const alreadyApplied = !!appliedRow;
  const checksumChanged = appliedRow && appliedRow.checksum_sha256 !== checksum;
  const permanent_manual_block = migrationSafetyPolicy.isPermanentManualBlock(source, name);
  const vector_destructive = vectorCheck.isVectorDestructive;
  const safety_summary = migrationSafetyPolicy.buildSafetySummary({
    source,
    name,
    category: cls.category,
    destructive_flags: cls.destructive,
    permanent_manual_block
  });
  return {
    source,
    name,
    abs_path: absPath,
    checksum,
    category: cls.category,
    destructive_flags: cls.destructive,
    low_flags: cls.low,
    vector_destructive,
    already_applied: alreadyApplied,
    checksum_changed: checksumChanged,
    permanent_manual_block,
    safety_summary,
    sql
  };
}

async function buildPlan() {
  const modelsPlan = discover.discoverModelsForward(MODELS_DIR, MIGRATIONS_ORDER);
  const migrationsPlan = discover.discoverMigrationsForward(EXTRA_MIGRATIONS_DIR);

  const items = [];
  for (const f of modelsPlan.forward) {
    items.push(await planForFile(path.join(MODELS_DIR, f), 'src/models', f));
  }
  for (const f of migrationsPlan.forward) {
    items.push(await planForFile(path.join(EXTRA_MIGRATIONS_DIR, f), 'migrations', f));
  }

  const ignored = [
    ...modelsPlan.ignored.map((f) => ({ source: 'src/models', name: f, reason: 'rollback_naming' })),
    ...modelsPlan.rollbackFolder.map((f) => ({ source: 'src/models/_rollback', name: f, reason: 'rollback_folder' })),
    ...migrationsPlan.ignored.map((f) => ({ source: 'migrations', name: f, reason: 'rollback_naming' })),
    ...migrationsPlan.rollbackFolder.map((f) => ({ source: 'migrations/_rollback', name: f, reason: 'rollback_folder' }))
  ];

  return { items, ignored };
}

function printPlan(plan) {
  console.log('--- IGNORED (rollbacks / non-forward) ---');
  if (!plan.ignored.length) {
    console.log('  (nenhum)');
  } else {
    for (const it of plan.ignored) {
      console.log(`  [IGNORED] ${it.source}/${it.name}  (${it.reason})`);
      console.log(`    ${JSON.stringify({ tag: 'ROLLBACK_BLOCKED', source: it.source, name: it.name, reason: it.reason })}`);
    }
  }
  console.log('\n--- FORWARD PLAN ---');
  let i = 1;
  let needsDestructiveFlag = 0;
  let alreadyApplied = 0;
  let toRun = 0;
  let permanentManualBlocked = 0;
  for (const it of plan.items) {
    const tags = [];
    if (it.already_applied) tags.push('ALREADY_APPLIED');
    if (it.checksum_changed) tags.push('CHECKSUM_CHANGED');
    if (it.category === 'destructive') tags.push('DESTRUCTIVE');
    if (it.category === 'low') tags.push('low_risk');
    if (it.permanent_manual_block) {
      tags.push('LEGACY', 'MANUAL_ONLY', 'BLOCKED_PERMANENTLY');
      permanentManualBlocked += 1;
    }
    const blockedByPolicy = !!it.permanent_manual_block;
    const willRun =
      !it.already_applied &&
      !blockedByPolicy &&
      (it.category !== 'destructive' || allowDestructive);
    if (willRun) toRun += 1;
    else if (it.already_applied) alreadyApplied += 1;
    else if (it.category === 'destructive' && !allowDestructive && !it.permanent_manual_block) needsDestructiveFlag += 1;
    console.log(
      `  ${String(i).padStart(3, '0')}. [${it.category.padEnd(11)}] ${it.source}/${it.name}` +
        (tags.length ? `  {${tags.join(',')}}` : '') +
        (willRun ? '  -> RUN' : '  -> SKIP')
    );
    if (it.destructive_flags && it.destructive_flags.length) {
      for (const f of it.destructive_flags) {
        console.log(`        flag=${f.flag} severity=${f.severity}  ${f.description}`);
      }
    }
    i += 1;
  }
  console.log('');
  console.log('--- SUMMARY ---');
  console.log(`forward total           : ${plan.items.length}`);
  console.log(`will run                : ${toRun}`);
  console.log(`already applied (skip)  : ${alreadyApplied}`);
  console.log(`destructive blocked     : ${needsDestructiveFlag}`);
  console.log(`ignored (rollback)      : ${plan.ignored.length}`);
  if (permanentManualBlocked) {
    console.log(`permanent_manual_block  : ${permanentManualBlocked}`);
  }
  if (needsDestructiveFlag) {
    console.log('');
    console.log('  → Para permitir destrutivos: IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true');
  }
}

async function executeOne(item) {
  const t0 = Date.now();
  const stmts = parser.splitStatements(item.sql);
  let okCount = 0;
  let skipCount = 0;
  for (const stmt of stmts) {
    try {
      await db.query(stmt);
      okCount += 1;
    } catch (e) {
      // Enterprise Hardening Bloco 4: classificação por SQLSTATE em vez de
      // substring. Apenas SQLSTATE explícitos de "duplicate object" (DDL
      // idempotente) caem em skip. 23505 (data) e outros caem como erro real.
      const cls = governance.classifySqlError(e);
      if (cls.idempotent) {
        skipCount += 1;
      } else {
        return {
          ok: false,
          error: String(e.message || ''),
          error_code: cls.sqlstate || null,
          duration_ms: Date.now() - t0,
          applied: okCount,
          skipped: skipCount
        };
      }
    }
  }
  return { ok: true, duration_ms: Date.now() - t0, applied: okCount, skipped: skipCount };
}

async function runForward(plan, args) {
  let executed = 0;
  let blocked = 0;
  let permanentManualBlocked = 0;
  let skippedApplied = 0;
  let failed = 0;

  for (const it of plan.items) {
    if (args.only && it.name !== args.only) continue;

    if (it.already_applied) {
      skippedApplied += 1;
      console.log(`[MIGRATION_ALREADY_APPLIED] ${JSON.stringify({ source: it.source, name: it.name, checksum: it.checksum })}`);
      continue;
    }
    if (it.permanent_manual_block) {
      permanentManualBlocked += 1;
      blocked += 1;
      const payload = {
        source: it.source,
        name: it.name,
        reason: 'permanent_manual_only_denylist',
        safety_summary: it.safety_summary,
        note: 'Bloqueado mesmo com IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true — requer intervenção manual documentada.'
      };
      console.log(`[MIGRATION_BLOCKED] ${JSON.stringify(payload)}`);
      console.log(`[MIGRATION_LEGACY] ${JSON.stringify({ source: it.source, name: it.name, action: 'skip_permanent_policy' })}`);
      console.log(
        `[MIGRATION_DESTRUCTIVE] ${JSON.stringify({
          source: it.source,
          name: it.name,
          mode: 'policy_hard_stop',
          flags: it.destructive_flags
        })}`
      );
      try {
        await history.recordAuditEvent(db, {
          source: it.source,
          name: it.name,
          action: 'forward',
          status: 'blocked',
          checksum_sha256: it.checksum,
          category: it.category,
          destructive_flags: it.destructive_flags,
          details: { reason: 'permanent_manual_only_denylist', safety_summary: it.safety_summary }
        });
      } catch (_) {
        /* never throw */
      }
      continue;
    }
    if (it.category === 'destructive' && !allowDestructive) {
      blocked += 1;
      console.log(
        `[MIGRATION_BLOCKED] ${JSON.stringify({
          source: it.source,
          name: it.name,
          reason: 'destructive_without_flag',
          flags: it.destructive_flags
        })}`
      );
      console.log(
        `[DESTRUCTIVE_MIGRATION_DETECTED] ${JSON.stringify({
          source: it.source,
          name: it.name,
          flags: it.destructive_flags
        })}`
      );
      try {
        await history.recordAuditEvent(db, {
          source: it.source,
          name: it.name,
          action: 'forward',
          status: 'blocked',
          checksum_sha256: it.checksum,
          category: it.category,
          destructive_flags: it.destructive_flags,
          details: { reason: 'destructive_without_flag' }
        });
      } catch (_) {
        // não deve impedir o resto do plano
      }
      continue;
    }

    console.log(
      `[MIGRATION_DISCOVERED] ${JSON.stringify({
        source: it.source,
        name: it.name,
        category: it.category,
        checksum: it.checksum
      })}`
    );
    const r = await executeOne(it);
    if (!r.ok) {
      failed += 1;
      console.error(
        `[MIGRATION_EXECUTED] ${JSON.stringify({
          source: it.source,
          name: it.name,
          status: 'failed',
          duration_ms: r.duration_ms,
          error: r.error?.slice(0, 240)
        })}`
      );
      try {
        await history.recordFailure(db, {
          source: it.source,
          name: it.name,
          checksum_sha256: it.checksum,
          category: it.category,
          destructive_flags: it.destructive_flags,
          duration_ms: r.duration_ms,
          error_message: r.error
        });
      } catch (_) {
        /* never throw out of audit */
      }
      // Estratégia conservadora: ABORTAR no primeiro erro real (não-idempotência).
      console.error('[MIGRATE] Abortado na primeira falha real para preservar consistência.');
      return { executed, blocked, skippedApplied, failed };
    }

    executed += 1;
    try {
      await history.recordSuccess(db, {
        source: it.source,
        name: it.name,
        checksum_sha256: it.checksum,
        category: it.category,
        destructive_flags: it.destructive_flags,
        rollback_available: rollbackExistsFor(it),
        duration_ms: r.duration_ms
      });
    } catch (e) {
      // Se o registo de história falhar (ex.: race), continuar — auditável pelo log estruturado.
      console.warn('[MIGRATION_HISTORY_RECORD_WARN]', e.message);
    }
    console.log(
      `[MIGRATION_EXECUTED] ${JSON.stringify({
        source: it.source,
        name: it.name,
        status: 'success',
        applied: r.applied,
        skipped_idempotent: r.skipped,
        duration_ms: r.duration_ms
      })}`
    );
  }

  return { executed, blocked, permanentManualBlocked, skippedApplied, failed };
}

function rollbackExistsFor(item) {
  // Heurística simples: existe ficheiro com mesmo prefixo dentro de _rollback?
  const rbDir = path.join(path.dirname(item.abs_path), '_rollback');
  if (!fs.existsSync(rbDir)) return false;
  const base = item.name.replace(/_migration\.sql$/i, '').replace(/\.sql$/i, '');
  const candidates = fs.readdirSync(rbDir).filter((f) => f.endsWith('.sql'));
  return candidates.some((f) => f.startsWith(base) || f.includes(base));
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  printPlanHeader(args);

  if (args.status) {
    await showStatus();
    process.exit(0);
  }

  // Ping BD antes de qualquer operação real.
  try {
    await db.query('SELECT 1');
  } catch (err) {
    console.error('[MIGRATE] Erro de conexão:', err.message);
    process.exit(1);
  }

  // Tabela de história — best effort, mas crítica para evitar reaplicação.
  try {
    await history.ensureHistoryTable(db);
  } catch (e) {
    console.error('[MIGRATE] Falha a garantir impetus_migration_history:', e.message);
    process.exit(1);
  }

  // Enterprise Hardening Bloco 4: advisory lock global ANTES de qualquer
  // operação que leia plano / escreva schema. Default `true`; pode ser
  // desligado em ambientes triviais via IMPETUS_MIGRATION_ADVISORY_LOCK=false.
  const useAdvisoryLock =
    String(process.env.IMPETUS_MIGRATION_ADVISORY_LOCK || 'true').toLowerCase() !== 'false';
  let lockAcquired = false;
  if (useAdvisoryLock && !args.dryRun && !args.status) {
    lockAcquired = await governance.acquireGlobalMigrationLock(db, {
      timeoutMs: parseInt(process.env.IMPETUS_MIGRATION_LOCK_TIMEOUT_MS || '60000', 10)
    });
    if (!lockAcquired) {
      console.error(
        '[MIGRATE] Não foi possível obter advisory lock — outro runner pode estar a correr.'
      );
      process.exit(1);
    }
  }

  // Hook de release para qualquer caminho de saída.
  const releaseLock = async () => {
    if (lockAcquired) {
      await governance.releaseGlobalMigrationLock(db);
      lockAcquired = false;
    }
  };
  process.once('exit', () => {
    // Best-effort no exit (event loop pode já estar a fechar — apenas tentativa).
    if (lockAcquired) {
      // Não esperamos: o lock cai com a sessão Postgres de qualquer forma.
      governance.releaseGlobalMigrationLock(db).catch(() => {});
    }
  });

  const plan = await buildPlan();
  printPlan(plan);

  // Aviso de naming (não bloqueante).
  for (const it of plan.items || []) {
    if (governance.checkNumberingPattern(it.name) === 'legacy_naming') {
      // Só lista uma vez — evita inundar o log.
      // Mantido como info; legacy migrations mantêm-se.
      // console.info('[MIGRATION_NAMING_LEGACY]', it.name);
    }
  }

  if (args.adopt) {
    // Modo de "adopção": regista todas as migrations forward como já aplicadas,
    // sem executar SQL. Útil em ambientes onde as migrations já foram aplicadas
    // em produção antes da introdução do bookkeeping. Bloqueado se houver alguma
    // migration destrutiva sem flag — para forçar revisão manual.
    let adopted = 0;
    let alreadyKnown = 0;
    let blocked = 0;
    let permanentBlocked = 0;
    for (const it of plan.items) {
      if (it.already_applied) { alreadyKnown += 1; continue; }
      if (it.permanent_manual_block) {
        permanentBlocked += 1;
        blocked += 1;
        console.log(
          `[MIGRATION_BLOCKED] ${JSON.stringify({
            source: it.source,
            name: it.name,
            reason: 'permanent_manual_only_no_adoption',
            safety_summary: it.safety_summary
          })}`
        );
        console.log(`[MIGRATION_LEGACY] ${JSON.stringify({ source: it.source, name: it.name, action: 'adopt_skipped' })}`);
        continue;
      }
      if (it.category === 'destructive' && !allowDestructive) {
        blocked += 1;
        console.log(
          `[MIGRATION_BLOCKED] ${JSON.stringify({
            source: it.source,
            name: it.name,
            reason: 'destructive_adoption_requires_flag',
            flags: it.destructive_flags
          })}`
        );
        continue;
      }
      try {
        await history.recordSuccess(db, {
          source: it.source,
          name: it.name,
          checksum_sha256: it.checksum,
          category: it.category,
          destructive_flags: it.destructive_flags,
          rollback_available: rollbackExistsFor(it),
          duration_ms: 0,
          executed_by: `${history.defaultActor()} [adopted]`
        });
        adopted += 1;
        console.log(
          `[MIGRATION_ADOPTED] ${JSON.stringify({ source: it.source, name: it.name, checksum: it.checksum })}`
        );
      } catch (e) {
        console.warn('[MIGRATION_ADOPT_WARN]', it.name, e.message);
      }
    }
    console.log('\n=== Adopção concluída ===');
    console.log(`adoptadas        : ${adopted}`);
    console.log(`já conhecidas    : ${alreadyKnown}`);
    console.log(`bloqueadas       : ${blocked}`);
    if (permanentBlocked) console.log(`bloqueio permanente: ${permanentBlocked}`);
    process.exit(0);
  }

  if (args.dryRun) {
    console.log('\n[MIGRATE] dry-run concluído. Nenhuma alteração efectuada.');
    try {
      await history.recordAuditEvent(db, {
        source: 'runner',
        name: 'plan',
        action: 'dry_run',
        status: 'success',
        details: {
          forward_total: plan.items.length,
          ignored_total: plan.ignored.length
        }
      });
    } catch (_) { /* never throw */ }
    process.exit(0);
  }

  const result = await runForward(plan, args);

  console.log('\n=== Resultado ===');
  console.log(`executadas   : ${result.executed}`);
  console.log(`já aplicadas : ${result.skippedApplied}`);
  console.log(`bloqueadas   : ${result.blocked}`);
  if (result.permanentManualBlocked != null && result.permanentManualBlocked > 0) {
    console.log(`bloqueio permanente (MANUAL_ONLY): ${result.permanentManualBlocked}`);
  }
  console.log(`falhas       : ${result.failed}`);
  await releaseLock();
  if (result.failed > 0) process.exit(2);
  process.exit(0);
}

main().catch((err) => {
  console.error('[MIGRATE] erro fatal:', err && err.stack ? err.stack : err);
  process.exit(1);
});
