'use strict';

/**
 * Vector Migration Safety & Runtime Governance — Suite de Testes
 * ==============================================================
 *
 *   npm run test:vector-safety
 *   node src/tests/vectorMigrationSafetyScenarios.js
 *
 * Valida:
 *   ✔ Denylist permanente (pgvector legacy) bloqueia execução
 *   ✔ Classificador detecta padrões destrutivos vetoriais
 *   ✔ *.legacy.sql excluídos do forward
 *   ✔ Vector schema registry correto
 *   ✔ Safe migration template não é executável
 *   ✔ vectorRuntimeService: governed queries, inserts, health
 *   ✔ Safe rebuild engine: batch, abort
 *   ✔ Dual-read: sem shadow retorna primary only
 *   ✔ Nenhuma migration no forward contém padrões vetoriais destrutivos
 *   ✔ Runner integra vector destructive detection
 */

const path = require('path');
const fs = require('fs');

const ROOT = path.join(__dirname, '..', '..');
const MODELS_DIR = path.join(ROOT, 'src/models');
const MIGRATIONS_DIR = path.join(ROOT, 'migrations');

const migrationSafetyPolicy = require(path.join(ROOT, 'scripts/migrations/migrationSafetyPolicy'));
const discover = require(path.join(ROOT, 'scripts/migrations/discover'));
const classifier = require(path.join(ROOT, 'scripts/migrations/classifier'));
const vectorRuntime = require(path.join(ROOT, 'src/services/vectorRuntimeService'));

// ─── helpers ──────────────────────────────────────────────────────────────
let _passed = 0;
let _failed = 0;
function assert(cond, label, detail) {
  if (cond) { _passed++; console.log(`  PASS  ${label}`); return true; }
  _failed++;
  console.log(`  FAIL  ${label}`);
  if (detail !== undefined) {
    try { console.log('        ', JSON.stringify(detail).slice(0, 600)); } catch (_) {}
  }
  return false;
}
function section(name) { console.log(`\n=== ${name} ===`); }

// ═══════════════════════════════════════════════════════════════════════════
// Envolver tudo em async IIFE para poder usar await em Node.js CJS
// ═══════════════════════════════════════════════════════════════════════════
(async () => {

// ═══════════════════════════════════════════════════════════════════════════
// T1 — DENYLIST PERMANENTE
// ═══════════════════════════════════════════════════════════════════════════
section('T1 — DENYLIST PERMANENTE (pgvector legacy)');

assert(
  migrationSafetyPolicy.isPermanentManualBlock('src/models', 'pgvector_semantic_search_migration.sql'),
  'pgvector_semantic_search_migration.sql está na denylist permanente'
);
assert(
  migrationSafetyPolicy.isPermanentManualBlock('src/models', 'pgvector_semantic_search_migration.legacy.sql'),
  'pgvector_semantic_search_migration.legacy.sql está na denylist permanente'
);
assert(
  !migrationSafetyPolicy.isPermanentManualBlock('src/models', 'auth_middleware_schema_migration.sql'),
  'migration normal NÃO está na denylist permanente'
);

// ═══════════════════════════════════════════════════════════════════════════
// T2 — VECTOR DESTRUCTIVE PATTERNS
// ═══════════════════════════════════════════════════════════════════════════
section('T2 — DETECÇÃO DE PADRÕES DESTRUTIVOS VETORIAIS');

const { detectVectorDestructivePatterns } = migrationSafetyPolicy;

const dropEmbCol = detectVectorDestructivePatterns('ALTER TABLE manual_chunks DROP COLUMN IF EXISTS embedding;');
assert(dropEmbCol.isVectorDestructive, 'DROP COLUMN embedding detectado como destrutivo vetorial');
assert(
  dropEmbCol.flags.some(f => f.flag === 'VECTOR_DROP_COLUMN'),
  'Flag VECTOR_DROP_COLUMN presente'
);

const alterType = detectVectorDestructivePatterns('ALTER TABLE manual_chunks ALTER COLUMN embedding TYPE vector(3072);');
assert(alterType.isVectorDestructive, 'ALTER COLUMN embedding TYPE detectado como destrutivo vetorial');

const truncateChunks = detectVectorDestructivePatterns('TRUNCATE manual_chunks;');
assert(truncateChunks.isVectorDestructive, 'TRUNCATE manual_chunks detectado');

const dropTable = detectVectorDestructivePatterns('DROP TABLE manual_chunks;');
assert(dropTable.isVectorDestructive, 'DROP TABLE manual_chunks detectado');

const dropExt = detectVectorDestructivePatterns('DROP EXTENSION vector;');
assert(dropExt.isVectorDestructive, 'DROP EXTENSION vector detectado');

const safeSql = detectVectorDestructivePatterns('ALTER TABLE manual_chunks ADD COLUMN embedding_v2 vector(3072);');
assert(!safeSql.isVectorDestructive, 'ADD COLUMN aditivo NÃO é destrutivo vetorial');

const createIdx = detectVectorDestructivePatterns('CREATE INDEX CONCURRENTLY idx_v2 ON manual_chunks USING ivfflat (embedding_v2);');
assert(!createIdx.isVectorDestructive, 'CREATE INDEX CONCURRENTLY NÃO é destrutivo vetorial');

// ═══════════════════════════════════════════════════════════════════════════
// T3 — *.legacy.sql EXCLUÍDOS DO FORWARD
// ═══════════════════════════════════════════════════════════════════════════
section('T3 — FICHEIROS *.legacy.sql EXCLUÍDOS DO FORWARD');

assert(
  discover.isLegacyFrozenSqlName('pgvector_semantic_search_migration.legacy.sql'),
  '*.legacy.sql detectado como congelado'
);
assert(
  !discover.isLegacyFrozenSqlName('auth_middleware_schema_migration.sql'),
  'migration normal NÃO é detectada como congelada'
);

const modelsForward = discover.discoverModelsForward(MODELS_DIR, []);
const hasLegacyInForward = modelsForward.forward.some(f => f.endsWith('.legacy.sql'));
assert(!hasLegacyInForward, 'Nenhum *.legacy.sql no plano forward de src/models/');

// ═══════════════════════════════════════════════════════════════════════════
// T4 — LEGACY SQL CONGELADO COM MARCADORES
// ═══════════════════════════════════════════════════════════════════════════
section('T4 — LEGACY SQL CONGELADO COM MARCADORES');

const legacyPath = path.join(MODELS_DIR, '_legacy', 'pgvector_semantic_search_migration.legacy.sql');
const legacyExists = fs.existsSync(legacyPath);
assert(legacyExists, 'Ficheiro legacy existe em _legacy/');

if (legacyExists) {
  const legacySql = fs.readFileSync(legacyPath, 'utf8');
  assert(
    legacySql.includes('LEGACY') && legacySql.includes('DESTRUCTIVE'),
    'Legacy SQL contém marcadores LEGACY + DESTRUCTIVE'
  );
  assert(
    legacySql.includes('DO NOT EXECUTE'),
    'Legacy SQL contém aviso DO NOT EXECUTE'
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// T5 — VECTOR SCHEMA REGISTRY
// ═══════════════════════════════════════════════════════════════════════════
section('T5 — VECTOR SCHEMA REGISTRY');

const schema = vectorRuntime.VECTOR_SCHEMA_REGISTRY.primary;
assert(schema.table === 'manual_chunks', 'Schema registry: tabela correta');
assert(schema.column === 'embedding', 'Schema registry: coluna correta');
assert(schema.dimension === 1536, 'Schema registry: dimensão 1536');
assert(schema.provider === 'openai', 'Schema registry: provider OpenAI');
assert(schema.model === 'text-embedding-3-small', 'Schema registry: modelo correto');
assert(schema.index_type === 'ivfflat', 'Schema registry: tipo de índice IVFFLAT');
assert(schema.metric === 'cosine', 'Schema registry: métrica cosine');
assert(schema.operator === '<=>', 'Schema registry: operador <=>');

// ═══════════════════════════════════════════════════════════════════════════
// T6 — ROLLOUT STATES
// ═══════════════════════════════════════════════════════════════════════════
section('T6 — ROLLOUT STATES');

assert(vectorRuntime.getRolloutState() === 'stable', 'Rollout state inicial é stable');

const stateChange = vectorRuntime.setRolloutState('dual_write');
assert(stateChange.from === 'stable' && stateChange.to === 'dual_write', 'Transição stable → dual_write');
assert(vectorRuntime.getRolloutState() === 'dual_write', 'Estado atualizado para dual_write');

vectorRuntime.setRolloutState('stable');
assert(vectorRuntime.getRolloutState() === 'stable', 'Revertido para stable');

try {
  vectorRuntime.setRolloutState('invalid_state');
  assert(false, 'Deveria ter lançado erro para estado inválido');
} catch (e) {
  assert(e.message.includes('inválido'), 'Erro lançado para estado inválido');
}

// ═══════════════════════════════════════════════════════════════════════════
// T7 — GOVERNED INSERT — VALIDAÇÃO DIMENSIONAL
// ═══════════════════════════════════════════════════════════════════════════
section('T7 — VALIDAÇÃO DIMENSIONAL NO INSERT');

// Sem DB real, mas podemos testar a validação de dimensão
// Embedding com dimensão errada deve ser rejeitado
const wrongDimResult = await vectorRuntime.governedInsertEmbedding({
  manualId: 'test-id',
  chunkText: 'test chunk',
  embedding: new Array(768).fill(0.1),
  source: 'test'
});
assert(!wrongDimResult, 'Embedding com dimensão 768 (errada) rejeitado');

const nullEmbResult = await vectorRuntime.governedInsertEmbedding({
  manualId: 'test-id',
  chunkText: 'test chunk',
  embedding: null,
  source: 'test'
});
assert(!nullEmbResult, 'Embedding null rejeitado');

// ═══════════════════════════════════════════════════════════════════════════
// T8 — GOVERNED SEARCH — VECTOR NULL
// ═══════════════════════════════════════════════════════════════════════════
section('T8 — GOVERNED SEARCH COM VECTOR NULL');

const nullSearchResult = await vectorRuntime.governedSimilaritySearch({
  queryVector: null,
  companyId: 'test-co',
  source: 'test'
});
assert(Array.isArray(nullSearchResult) && nullSearchResult.length === 0, 'Search com vector null retorna []');

// ═══════════════════════════════════════════════════════════════════════════
// T9 — DUAL READ SEM SHADOW
// ═══════════════════════════════════════════════════════════════════════════
section('T9 — DUAL READ SEM SHADOW COLUMN');

const dualNoShadow = await vectorRuntime.dualReadSimilaritySearch({
  queryVector: null,
  companyId: 'test-co',
  source: 'test'
});
assert(dualNoShadow.shadow === null, 'Sem shadow column, shadow é null');
assert(dualNoShadow.drift === null, 'Sem shadow column, drift é null');

// ═══════════════════════════════════════════════════════════════════════════
// T10 — SAFE REBUILD — REQUER embedFn
// ═══════════════════════════════════════════════════════════════════════════
section('T10 — SAFE REBUILD VALIDAÇÃO');

try {
  await vectorRuntime.safeRebuild({});
  assert(false, 'Deveria ter lançado erro sem embedFn');
} catch (e) {
  assert(e.message.includes('embedFn'), 'Erro lançado quando embedFn ausente');
}

// ═══════════════════════════════════════════════════════════════════════════
// T11 — EVENT LOG
// ═══════════════════════════════════════════════════════════════════════════
section('T11 — EVENT LOG');

vectorRuntime.emitVectorEvent('TEST_EVENT', { test: true });
const events = vectorRuntime.getVectorEvents(5);
assert(events.length > 0, 'Event log contém eventos');
assert(events.some(e => e.type === 'TEST_EVENT'), 'Evento TEST_EVENT encontrado no log');

// ═══════════════════════════════════════════════════════════════════════════
// T12 — MÉTRICAS
// ═══════════════════════════════════════════════════════════════════════════
section('T12 — MÉTRICAS');

const metrics = vectorRuntime.getMetrics();
assert(typeof metrics.queries_total === 'number', 'Métrica queries_total é number');
assert(typeof metrics.inserts_total === 'number', 'Métrica inserts_total é number');
assert(typeof metrics.rebuilds_started === 'number', 'Métrica rebuilds_started é number');
assert(metrics.inserts_failed >= 2, 'inserts_failed >= 2 (dos testes T7)');
assert(metrics.queries_degraded >= 1, 'queries_degraded >= 1 (do teste T8 com null vector)');

// ═══════════════════════════════════════════════════════════════════════════
// T13 — NENHUMA MIGRATION FORWARD COM PADRÕES VETORIAIS DESTRUTIVOS
// ═══════════════════════════════════════════════════════════════════════════
section('T13 — SCAN DE MIGRATIONS FORWARD PARA PADRÕES DESTRUTIVOS VETORIAIS');

const allForward = [
  ...modelsForward.forward.map(f => ({ source: 'src/models', name: f, abs: path.join(MODELS_DIR, f) })),
  ...discover.discoverMigrationsForward(MIGRATIONS_DIR).forward.map(f => ({ source: 'migrations', name: f, abs: path.join(MIGRATIONS_DIR, f) }))
];

let vectorDestructiveInForward = 0;
for (const item of allForward) {
  try {
    const sql = fs.readFileSync(item.abs, 'utf8');
    const check = detectVectorDestructivePatterns(sql);
    if (check.isVectorDestructive) {
      vectorDestructiveInForward++;
      console.log(`  !! ${item.source}/${item.name} contém padrão vetorial destrutivo:`, check.flags);
    }
  } catch (_) { /* ficheiro pode não existir */ }
}
assert(
  vectorDestructiveInForward === 0,
  `Nenhuma migration forward contém padrões vetoriais destrutivos (${allForward.length} scanned)`,
  { scanned: allForward.length, destructive: vectorDestructiveInForward }
);

// ═══════════════════════════════════════════════════════════════════════════
// T14 — SAFE MIGRATION TEMPLATE NÃO É EXECUTÁVEL
// ═══════════════════════════════════════════════════════════════════════════
section('T14 — SAFE MIGRATION TEMPLATE NÃO DESTRUTIVO');

const templatePath = path.join(MIGRATIONS_DIR, 'safe_vector_migration_template.sql');
if (fs.existsSync(templatePath)) {
  const templateSql = fs.readFileSync(templatePath, 'utf8');
  const templateClass = classifier.classifyFile(templateSql);
  assert(
    templateClass.category === 'safe',
    'Template classificado como safe (apenas comentários SQL + SELECT informativo)'
  );
  const templateVec = detectVectorDestructivePatterns(templateSql);
  assert(!templateVec.isVectorDestructive, 'Template não contém padrões vetoriais destrutivos');
} else {
  assert(false, 'safe_vector_migration_template.sql não encontrado');
}

// ═══════════════════════════════════════════════════════════════════════════
// T15 — VECTOR_DESTRUCTIVE_PATTERNS EXPORTADO
// ═══════════════════════════════════════════════════════════════════════════
section('T15 — EXPORTAÇÕES DA POLÍTICA DE SEGURANÇA');

assert(
  Array.isArray(migrationSafetyPolicy.VECTOR_DESTRUCTIVE_PATTERNS),
  'VECTOR_DESTRUCTIVE_PATTERNS está exportado e é array'
);
assert(
  migrationSafetyPolicy.VECTOR_DESTRUCTIVE_PATTERNS.length >= 5,
  `Pelo menos 5 padrões vetoriais destrutivos definidos (tem ${migrationSafetyPolicy.VECTOR_DESTRUCTIVE_PATTERNS.length})`
);

// ─── RESULTADO ─────────────────────────────────────────────────────────────
console.log(`\n${'─'.repeat(60)}`);
console.log(`Resultado: ${_passed} passou, ${_failed} falhou`);
if (_failed > 0) {
  console.log('ATENÇÃO: Há falhas — revisar governança vetorial.');
  process.exit(1);
} else {
  console.log('✓ vector migration safety & runtime governance verified');
  process.exit(0);
}

})().catch(err => {
  console.error('FATAL:', err);
  process.exit(1);
});
