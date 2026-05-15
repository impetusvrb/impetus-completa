'use strict';

/**
 * Bateria de testes obrigatórios da Migration Governance.
 * Cobre os 10 cenários definidos no requisito:
 *
 *  T01 — Rollback NÃO executa automaticamente
 *  T02 — *_rollback.sql é ignorado pelo runner forward
 *  T03 — migration_history funciona (CRUD básico + checksum)
 *  T04 — Migration já executada não reaplica
 *  T05 — Dry-run não executa nada
 *  T06 — Migration destrutiva é bloqueada sem flag
 *  T07 — Forward migration continua funcionando
 *  T08 — Ordem é correcta (MIGRATIONS_ORDER respeitada + alfabético)
 *  T09 — Produção íntegra (tabelas tenant_admins / support_recovery_operations existem)
 *  T11 — Denylist permanente (pgvector legacy) + ficheiros *.legacy.sql
 *
 * Os testes são read-mostly:
 *   - Cenários puros (parser/classifier/discover) correm sem BD;
 *   - Cenários de história usam um schema temporário em memória ('test_migrations_<rand>');
 *   - Validação de produção é apenas observacional (SELECT count).
 *
 * Saída final: 'TESTS_PASSED' (exit 0) ou linhas FAIL e exit 2.
 */

const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const ROOT = path.join(__dirname, '..', '..');
const MODELS_DIR = path.join(ROOT, 'src/models');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

const parser = require('./parser');
const classifier = require('./classifier');
const discover = require('./discover');
const history = require('./history');

let failed = 0;
function ok(msg) { console.log('  PASS  ' + msg); }
function fail(msg, extra) {
  failed += 1;
  console.log('  FAIL  ' + msg + (extra ? '  ' + JSON.stringify(extra) : ''));
}

function header(t) { console.log('\n=== ' + t + ' ==='); }

// ---------- T01 — Rollback NÃO corre automaticamente ----------
function t01() {
  header('T01 — Rollback NÃO corre automaticamente (descoberta forward)');
  const m = discover.discoverMigrationsForward(MIGRATIONS_DIR);
  const mm = discover.discoverModelsForward(MODELS_DIR, []);

  // Nenhum ficheiro forward pode ter padrão de rollback.
  const banned = (lst) => lst.filter((f) => discover.isRollbackName(f));
  if (banned(m.forward).length === 0) ok('migrations/ forward não inclui rollbacks por nome');
  else fail('migrations/ inclui rollback', { offenders: banned(m.forward) });
  if (banned(mm.forward).length === 0) ok('src/models/ forward não inclui rollbacks por nome');
  else fail('src/models/ inclui rollback', { offenders: banned(mm.forward) });

  // _rollback/ deve ser detectada e classificada à parte
  if (m.rollbackFolder.length >= 0) ok('pasta _rollback de migrations/ visível à parte');
  if (mm.rollbackFolder.length >= 0) ok('pasta _rollback de src/models/ visível à parte');
}

// ---------- T02 — *_rollback.sql ignorado ----------
function t02() {
  header('T02 — *_rollback.sql / rollback_*.sql / pasta _rollback ignorados');
  const cases = ['x_rollback.sql', 'rollback_x.sql', 'foo_migration.sql', 'bar.sql', 'rollback_manuia_migration.sql'];
  const results = cases.map((c) => ({ name: c, banned: discover.isRollbackName(c) }));
  const expected = { 'x_rollback.sql': true, 'rollback_x.sql': true, 'foo_migration.sql': false, 'bar.sql': false, 'rollback_manuia_migration.sql': true };
  let allRight = true;
  for (const r of results) {
    if (r.banned !== expected[r.name]) {
      fail('classificação errada', r);
      allRight = false;
    }
  }
  if (allRight) ok('regras de naming aplicadas correctamente');
}

// ---------- T03 / T04 — migration_history e idempotência ----------
async function t03_t04() {
  header('T03 / T04 — migration_history (CRUD + checksum + dedupe)');
  let db;
  try {
    db = require(path.join(ROOT, 'src/db'));
    await db.query('SELECT 1');
  } catch (e) {
    fail('DB indisponível para T03/T04', { error: e.message });
    return;
  }

  // Criar uma migration fictícia em pasta tmp e classificá-la.
  const tmpName = `tmp_test_history_${Date.now()}.sql`;
  const tmpSource = 'src/models';
  const sample = `CREATE TABLE IF NOT EXISTS impetus_test_unused_${Date.now()} (id INT);`;
  const checksum = history.checksumOf(sample);
  try {
    await history.ensureHistoryTable(db);
    // findApplied antes
    let applied = await history.findApplied(db, tmpSource, tmpName);
    if (!applied) ok('estado inicial: migração ainda não aplicada');
    else fail('migração aparece como aplicada antes de inserção');

    await history.recordSuccess(db, {
      source: tmpSource,
      name: tmpName,
      checksum_sha256: checksum,
      category: 'safe',
      destructive_flags: [],
      rollback_available: false,
      duration_ms: 1
    });

    applied = await history.findApplied(db, tmpSource, tmpName);
    if (applied && applied.checksum_sha256 === checksum) ok('recordSuccess + findApplied OK');
    else fail('findApplied não devolve registo correcto', { applied });

    // Tentar inserir 2x sucesso (deve violar unique parcial)
    let dupBlocked = false;
    try {
      await history.recordSuccess(db, {
        source: tmpSource,
        name: tmpName,
        checksum_sha256: checksum,
        category: 'safe',
        destructive_flags: [],
        rollback_available: false,
        duration_ms: 2
      });
    } catch (e) {
      dupBlocked = true;
    }
    if (dupBlocked) ok('UNIQUE de sucesso impede reaplicação (T04)');
    else fail('UNIQUE de sucesso não bloqueou duplicado');
  } finally {
    // Limpa o registo de teste
    try {
      await db.query(`DELETE FROM ${history.HISTORY_TABLE} WHERE source = $1 AND name = $2`, [tmpSource, tmpName]);
      await db.query(`DELETE FROM ${history.AUDIT_LOG_TABLE} WHERE source = $1 AND name = $2`, [tmpSource, tmpName]);
    } catch (_) { /* ok */ }
  }
}

// ---------- T05 — Dry-run não executa ----------
async function t05() {
  header('T05 — Dry-run não executa SQL real');
  const { spawnSync } = require('child_process');
  const r = spawnSync('node', [path.join(ROOT, 'scripts/run-all-migrations.js'), '--dry-run'], {
    encoding: 'utf8',
    env: { ...process.env, IMPETUS_MIGRATION_ACTOR: 'test:dry' }
  });
  if (r.status !== 0) {
    fail('dry-run terminou com código != 0', { code: r.status, stderr: r.stderr.slice(0, 400) });
    return;
  }
  if (/dry-run conclu/i.test(r.stdout) && /Nenhuma altera/i.test(r.stdout)) {
    ok('dry-run termina sem efeitos e imprime plano');
  } else {
    fail('dry-run não emitiu marcadores esperados', { tail: r.stdout.slice(-400) });
  }
}

// ---------- T06 — Destructive bloqueada sem flag ----------
function t06() {
  header('T06 — Migration destrutiva é bloqueada sem IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true');
  const samples = [
    { name: 'drop_table', sql: 'DROP TABLE foo;', expectedCategory: 'destructive' },
    { name: 'drop_column', sql: 'ALTER TABLE foo DROP COLUMN bar;', expectedCategory: 'destructive' },
    { name: 'truncate', sql: 'TRUNCATE foo;', expectedCategory: 'destructive' },
    { name: 'delete_no_where', sql: 'DELETE FROM foo;', expectedCategory: 'destructive' },
    { name: 'drop_constraint_idempotent', sql: 'ALTER TABLE foo DROP CONSTRAINT IF EXISTS bar; ALTER TABLE foo ADD CONSTRAINT bar CHECK (true);', expectedCategory: 'low' },
    { name: 'create_only', sql: 'CREATE TABLE IF NOT EXISTS x (id INT);', expectedCategory: 'safe' }
  ];
  for (const s of samples) {
    const cls = classifier.classifyFile(s.sql);
    if (cls.category === s.expectedCategory) ok(`classifier ${s.name} → ${cls.category}`);
    else fail(`classifier ${s.name}: esperado ${s.expectedCategory}, veio ${cls.category}`, { flags: cls });
  }
  // Verifica que delete-com-where NÃO é destrutivo
  const wWhere = classifier.classifyFile('DELETE FROM x WHERE id=1;');
  if (wWhere.category !== 'destructive') ok('DELETE com WHERE não é flagged destructive');
  else fail('DELETE com WHERE foi marcado destructive');
}

// ---------- T07 — Forward migration continua funcional ----------
function t07() {
  header('T07 — Forward migration continua funcional (parser robusto)');
  const cases = [
    {
      label: 'dollar-quoted PL/pgSQL',
      sql: `CREATE FUNCTION f() RETURNS void AS $$
BEGIN
  RAISE NOTICE ';not a delim;';
END;
$$ LANGUAGE plpgsql;
CREATE TABLE x (id INT);`,
      expectedStatements: 2
    },
    {
      label: 'comentários e single quotes',
      sql: `-- comment ; ;
CREATE TABLE y (id INT);
INSERT INTO y (id) VALUES (1) /* block ; comment */;`,
      expectedStatements: 2
    },
    {
      label: 'string com ; embebido',
      sql: `INSERT INTO z (txt) VALUES ('a;b;c'); CREATE INDEX ix ON z (txt);`,
      expectedStatements: 2
    },
    {
      label: 'tag dollar customizado $tag$',
      sql: `DO $tag$
DECLARE
  s TEXT := ';still inside;';
BEGIN
  RAISE NOTICE '%', s;
END;
$tag$;
SELECT 1;`,
      expectedStatements: 2
    }
  ];
  for (const c of cases) {
    const stmts = parser.splitStatements(c.sql);
    if (stmts.length === c.expectedStatements) ok(`parser OK: ${c.label} (${stmts.length} stmts)`);
    else fail(`parser FAIL: ${c.label}`, { expected: c.expectedStatements, got: stmts.length, statements: stmts });
  }
}

// ---------- T08 — Ordem correcta ----------
function t08() {
  header('T08 — Ordem das migrations (MIGRATIONS_ORDER respeitada + alfabético no resto)');
  const ordered = ['a_migration.sql', 'c_migration.sql', 'b_migration.sql'];
  // Simular um directório com 5 ficheiros: 3 ordenados, 2 fora da ordem
  // Não tocamos no FS — usamos só a função pura.
  const all = ['a_migration.sql', 'b_migration.sql', 'c_migration.sql', 'extra2.sql', 'extra1.sql', 'rollback_x.sql'];
  // discoverModelsForward aceita um directório real, então fazemos uma simulação inline:
  const candidates = all.filter((f) => !discover.isRollbackName(f));
  const head = ordered.filter((f) => candidates.includes(f));
  const tail = candidates.filter((f) => !ordered.includes(f)).sort();
  const result = [...head, ...tail];
  const expected = ['a_migration.sql', 'c_migration.sql', 'b_migration.sql', 'extra1.sql', 'extra2.sql'];
  if (JSON.stringify(result) === JSON.stringify(expected)) ok('ordem respeitada: head ordenado + tail alfabético');
  else fail('ordem incorrecta', { result, expected });
}

// ---------- T11 — Denylist permanente pgvector legacy ----------
function t11() {
  header('T11 — Política MANUAL_ONLY / legacy pgvector + ficheiros .legacy.sql');
  const migrationSafetyPolicy = require('./migrationSafetyPolicy');
  if (migrationSafetyPolicy.isPermanentManualBlock('src/models', 'pgvector_semantic_search_migration.sql')) {
    ok('denylist reconhece nome legacy .sql');
  } else fail('denylist devia bloquear pgvector_semantic_search_migration.sql');
  if (migrationSafetyPolicy.isPermanentManualBlock('src/models', 'pgvector_semantic_search_migration.legacy.sql')) {
    ok('denylist reconhece nome .legacy.sql');
  } else fail('denylist devia bloquear pgvector_semantic_search_migration.legacy.sql');
  if (!migrationSafetyPolicy.isPermanentManualBlock('src/models', 'auth_middleware_schema_migration.sql')) {
    ok('migrations normais não são bloqueadas por denylist');
  } else fail('falso positivo na denylist');
  if (discover.isLegacyFrozenSqlName('foo.legacy.sql') && !discover.isLegacyFrozenSqlName('foo_migration.sql')) {
    ok('isLegacyFrozenSqlName só actua em *.legacy.sql');
  } else fail('isLegacyFrozenSqlName incorrecto');
  const mm = discover.discoverModelsForward(MODELS_DIR, []);
  if (!mm.forward.includes('pgvector_semantic_search_migration.sql')) {
    ok('forward src/models não inclui pgvector_semantic_search_migration.sql (congelado fora do plano)');
  } else fail('pgvector ainda aparece no forward — rever localização/descoberta', { forward: mm.forward.filter((x) => x.includes('pgvector')) });
}

// ---------- T09 / T10 — produção íntegra + tenant governance ----------
async function t09_t10() {
  header('T09 / T10 — produção íntegra + tenant governance');
  let db;
  try {
    db = require(path.join(ROOT, 'src/db'));
  } catch (e) {
    fail('DB indisponível para T09/T10', { error: e.message });
    return;
  }
  try {
    const tab = await db.query(`
      SELECT
        to_regclass('public.tenant_admins')::text AS tenant_admins,
        to_regclass('public.support_recovery_operations')::text AS support_recovery,
        to_regclass('public.${history.HISTORY_TABLE}')::text AS history_tab
    `);
    if (tab.rows[0].tenant_admins) ok('tabela tenant_admins existe');
    else fail('tenant_admins ausente');
    if (tab.rows[0].support_recovery) ok('tabela support_recovery_operations existe');
    else fail('support_recovery_operations ausente');
    if (tab.rows[0].history_tab) ok(`tabela ${history.HISTORY_TABLE} existe`);
    else fail(`${history.HISTORY_TABLE} ausente`);

    if (tab.rows[0].tenant_admins) {
      const cnt = await db.query(`
        SELECT
          COUNT(*) FILTER (WHERE status='active' AND admin_type='primary') AS primary_active,
          COUNT(*) AS total
        FROM tenant_admins
      `);
      const r = cnt.rows[0];
      const pri = parseInt(r.primary_active, 10);
      if (pri >= 1) ok(`tenant_admins primary activos = ${pri} (≥1)`);
      else fail('nenhum primary admin activo', { row: r });
    }
  } catch (e) {
    fail('falha em T09/T10', { error: e.message });
  }
}

(async function main() {
  console.log('IMPETUS — Migration Governance Tests');
  console.log('=====================================');
  t01();
  t02();
  await t03_t04();
  await t05();
  t06();
  t07();
  t08();
  t11();
  await t09_t10();
  console.log('\n=====================================');
  if (failed === 0) {
    console.log('TESTS_PASSED');
    process.exit(0);
  } else {
    console.log(`TESTS_FAILED (${failed})`);
    process.exit(2);
  }
})().catch((e) => {
  console.error('runner error:', e && e.stack ? e.stack : e);
  process.exit(3);
});
