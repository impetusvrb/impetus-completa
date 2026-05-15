#!/usr/bin/env node
/**
 * IMPETUS — Runner explícito de ROLLBACK.
 *
 * Este é o ÚNICO ponto de entrada autorizado para executar ficheiros em
 * `migrations/_rollback/` ou `src/models/_rollback/`.
 *
 * Não é executado por nenhum hook automático. Não é referenciado em `start.sh`.
 * Não tem script `npm` por defeito (apenas adicionado como `migrate:rollback`
 * que requer flags explícitas).
 *
 * Pré-condições obrigatórias:
 *   1. Variável de ambiente IMPETUS_ALLOW_ROLLBACK=true
 *   2. Argumento --name=<ficheiro>.sql (deve existir dentro de _rollback/)
 *   3. Argumento --yes-i-understand
 *   4. Recomendado: --dry-run primeiro
 *
 * Auditoria:
 *   - Grava em `impetus_migration_history` (status='rollback') e em
 *     `impetus_migration_audit_log` (action='rollback', detalhes).
 *
 * Logs estruturados: [ROLLBACK_REQUESTED], [ROLLBACK_BLOCKED], [ROLLBACK_EXECUTED].
 */

'use strict';

require('dotenv').config({ path: require('path').join(__dirname, '../.env') });

const fs = require('fs');
const path = require('path');
const db = require('../src/db');
const parser = require('./migrations/parser');
const history = require('./migrations/history');

const SEARCH_DIRS = [
  { source: 'migrations/_rollback', dir: path.join(__dirname, '../migrations/_rollback') },
  { source: 'src/models/_rollback', dir: path.join(__dirname, '../src/models/_rollback') }
];

function parseArgs(argv) {
  const args = { name: null, dryRun: false, confirmed: false, list: false };
  for (const a of argv) {
    if (a === '--dry-run') args.dryRun = true;
    else if (a === '--yes-i-understand') args.confirmed = true;
    else if (a === '--list') args.list = true;
    else if (a.startsWith('--name=')) args.name = a.slice('--name='.length);
  }
  return args;
}

function listRollbacks() {
  const out = [];
  for (const s of SEARCH_DIRS) {
    if (!fs.existsSync(s.dir)) continue;
    for (const f of fs.readdirSync(s.dir).filter((x) => x.endsWith('.sql'))) {
      out.push({ source: s.source, name: f, path: path.join(s.dir, f) });
    }
  }
  return out;
}

function locate(name) {
  for (const s of SEARCH_DIRS) {
    const p = path.join(s.dir, name);
    if (fs.existsSync(p)) return { source: s.source, name, path: p };
  }
  return null;
}

function logRequest(args) {
  console.log(
    `[ROLLBACK_REQUESTED] ${JSON.stringify({
      name: args.name,
      dry_run: args.dryRun,
      confirmed: args.confirmed,
      actor: history.defaultActor(),
      ts: new Date().toISOString()
    })}`
  );
}

function blockedExit(reason, extra) {
  console.log(
    `[ROLLBACK_BLOCKED] ${JSON.stringify({ reason, actor: history.defaultActor(), ...extra })}`
  );
  process.exit(2);
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (args.list) {
    const items = listRollbacks();
    if (!items.length) {
      console.log('(sem rollbacks disponíveis)');
      return;
    }
    console.log('source\tname');
    for (const it of items) console.log(`${it.source}\t${it.name}`);
    return;
  }

  logRequest(args);

  if (!args.name) {
    blockedExit('missing_name', { hint: 'use --name=<ficheiro>.sql ou --list' });
  }
  if (String(process.env.IMPETUS_ALLOW_ROLLBACK || '').trim() !== 'true') {
    blockedExit('flag_not_set', { hint: 'export IMPETUS_ALLOW_ROLLBACK=true' });
  }
  if (!args.confirmed && !args.dryRun) {
    blockedExit('not_confirmed', { hint: 'adiciona --yes-i-understand para confirmar' });
  }

  const found = locate(args.name);
  if (!found) {
    blockedExit('not_in_rollback_folder', {
      hint: 'ficheiro deve viver em migrations/_rollback/ ou src/models/_rollback/'
    });
  }

  const sql = fs.readFileSync(found.path, 'utf8');
  const checksum = history.checksumOf(sql);
  const stmts = parser.splitStatements(sql);

  console.log('\n--- ROLLBACK PLAN ---');
  console.log(`source     : ${found.source}`);
  console.log(`name       : ${found.name}`);
  console.log(`checksum   : ${checksum}`);
  console.log(`statements : ${stmts.length}`);
  for (let i = 0; i < stmts.length; i += 1) {
    const preview = stmts[i].replace(/\s+/g, ' ').slice(0, 90);
    console.log(`  ${String(i + 1).padStart(2, '0')}. ${preview}${stmts[i].length > 90 ? '…' : ''}`);
  }

  if (args.dryRun) {
    console.log('\n[ROLLBACK_DRY_RUN] nenhum efeito — termina aqui.');
    try {
      await history.ensureHistoryTable(db);
      await history.recordAuditEvent(db, {
        source: found.source,
        name: found.name,
        action: 'rollback',
        status: 'skipped',
        checksum_sha256: checksum,
        details: { reason: 'dry_run' }
      });
    } catch (_) { /* never throw */ }
    process.exit(0);
  }

  try {
    await db.query('SELECT 1');
  } catch (e) {
    console.error('[ROLLBACK] erro de conexão:', e.message);
    process.exit(1);
  }
  await history.ensureHistoryTable(db);

  const t0 = Date.now();
  let appliedCount = 0;
  let lastError = null;

  for (const stmt of stmts) {
    try {
      await db.query(stmt);
      appliedCount += 1;
    } catch (e) {
      lastError = e.message || String(e);
      console.error(`[ROLLBACK_STATEMENT_FAILED] stmt#${appliedCount + 1}: ${lastError.slice(0, 200)}`);
      break;
    }
  }
  const duration = Date.now() - t0;

  if (lastError) {
    try {
      await history.recordAuditEvent(db, {
        source: found.source,
        name: found.name,
        action: 'rollback',
        status: 'failed',
        checksum_sha256: checksum,
        duration_ms: duration,
        details: {
          applied: appliedCount,
          total_statements: stmts.length,
          error_message: lastError.slice(0, 4000)
        }
      });
    } catch (_) { /* never throw */ }
    console.error(`[ROLLBACK_EXECUTED] ${JSON.stringify({ name: found.name, status: 'failed', applied: appliedCount, duration_ms: duration })}`);
    process.exit(3);
  }

  await history.recordRollback(db, {
    source: found.source,
    name: found.name,
    checksum_sha256: checksum,
    duration_ms: duration,
    details: { statements: stmts.length, applied: appliedCount }
  });
  console.log(
    `[ROLLBACK_EXECUTED] ${JSON.stringify({
      name: found.name,
      status: 'success',
      applied: appliedCount,
      duration_ms: duration,
      actor: history.defaultActor()
    })}`
  );
  process.exit(0);
}

main().catch((e) => {
  console.error('[ROLLBACK] erro fatal:', e && e.stack ? e.stack : e);
  process.exit(1);
});
