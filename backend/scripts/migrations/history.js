'use strict';

/**
 * Gestão da tabela `impetus_migration_history`.
 *
 * Esta tabela é o sistema central de bookkeeping do runner. Sem ela o runner
 * cai para modo legado (apenas idempotência) e emite avisos.
 *
 * Schema (criado idempotentemente na primeira chamada a `ensureHistoryTable`):
 *
 *   id                 BIGSERIAL PK
 *   source             TEXT       -- 'src/models' | 'migrations'
 *   name               TEXT       -- nome do ficheiro
 *   checksum_sha256    TEXT       -- sha256 hex do conteúdo (forma final)
 *   status             TEXT       -- 'success' | 'failed' | 'skipped' | 'rollback'
 *   destructive_flags  JSONB      -- flags detectadas
 *   category           TEXT       -- 'safe' | 'low' | 'destructive'
 *   rollback_available BOOLEAN
 *   duration_ms        INTEGER
 *   executed_by        TEXT       -- ${USER}@${HOST} ou env IMPETUS_MIGRATION_ACTOR
 *   error_message      TEXT       -- preenchido se status='failed'
 *   executed_at        TIMESTAMPTZ DEFAULT now()
 *
 *   UNIQUE (source, name) — para sucesso. Múltiplas tentativas falhadas / rollbacks
 *   são permitidas via tabela `impetus_migration_history_log` (audit append-only).
 */

const crypto = require('crypto');
const os = require('os');

const HISTORY_TABLE = 'impetus_migration_history';
const AUDIT_LOG_TABLE = 'impetus_migration_audit_log';

async function ensureHistoryTable(db) {
  // Criação 100% idempotente; sem dependências de extensões.
  await db.query(`
    CREATE TABLE IF NOT EXISTS ${HISTORY_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      name TEXT NOT NULL,
      checksum_sha256 TEXT NOT NULL,
      status TEXT NOT NULL,
      category TEXT,
      destructive_flags JSONB,
      rollback_available BOOLEAN DEFAULT false,
      duration_ms INTEGER,
      executed_by TEXT,
      error_message TEXT,
      executed_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  // Apenas garantimos sucesso único; tentativas falhadas viajam pelo audit log.
  await db.query(`
    CREATE UNIQUE INDEX IF NOT EXISTS ux_${HISTORY_TABLE}_source_name_success
      ON ${HISTORY_TABLE} (source, name)
      WHERE status = 'success'
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS ix_${HISTORY_TABLE}_executed_at
      ON ${HISTORY_TABLE} (executed_at DESC)
  `);

  await db.query(`
    CREATE TABLE IF NOT EXISTS ${AUDIT_LOG_TABLE} (
      id BIGSERIAL PRIMARY KEY,
      source TEXT NOT NULL,
      name TEXT NOT NULL,
      action TEXT NOT NULL,        -- 'forward' | 'rollback' | 'dry_run' | 'blocked'
      status TEXT NOT NULL,        -- 'success' | 'failed' | 'skipped' | 'blocked'
      checksum_sha256 TEXT,
      category TEXT,
      destructive_flags JSONB,
      duration_ms INTEGER,
      executed_by TEXT,
      details JSONB,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now()
    )
  `);
  await db.query(`
    CREATE INDEX IF NOT EXISTS ix_${AUDIT_LOG_TABLE}_created_at
      ON ${AUDIT_LOG_TABLE} (created_at DESC)
  `);
}

function checksumOf(content) {
  return crypto.createHash('sha256').update(String(content || ''), 'utf8').digest('hex');
}

function defaultActor() {
  if (process.env.IMPETUS_MIGRATION_ACTOR) return String(process.env.IMPETUS_MIGRATION_ACTOR);
  const user = process.env.SUDO_USER || process.env.USER || process.env.USERNAME || 'unknown';
  return `${user}@${os.hostname()}`;
}

async function findApplied(db, source, name) {
  const r = await db.query(
    `SELECT id, checksum_sha256, status, executed_at
     FROM ${HISTORY_TABLE}
     WHERE source = $1 AND name = $2 AND status = 'success'
     ORDER BY id DESC LIMIT 1`,
    [source, name]
  );
  return r.rows[0] || null;
}

async function recordSuccess(db, payload) {
  const {
    source,
    name,
    checksum_sha256,
    category,
    destructive_flags,
    rollback_available,
    duration_ms,
    executed_by: actorPayload
  } = payload;
  const executed_by = actorPayload || defaultActor();
  await db.query(
    `INSERT INTO ${HISTORY_TABLE}
       (source, name, checksum_sha256, status, category, destructive_flags,
        rollback_available, duration_ms, executed_by)
     VALUES ($1,$2,$3,'success',$4,$5,$6,$7,$8)`,
    [
      source,
      name,
      checksum_sha256,
      category || null,
      destructive_flags ? JSON.stringify(destructive_flags) : null,
      Boolean(rollback_available),
      Number.isFinite(duration_ms) ? duration_ms : null,
      executed_by
    ]
  );
}

async function recordFailure(db, payload) {
  const {
    source,
    name,
    checksum_sha256,
    category,
    destructive_flags,
    duration_ms,
    error_message,
    executed_by
  } = payload;
  // Apenas no audit log — não polui a tabela principal de sucesso.
  await db.query(
    `INSERT INTO ${AUDIT_LOG_TABLE}
       (source, name, action, status, checksum_sha256, category, destructive_flags,
        duration_ms, executed_by, details)
     VALUES ($1,$2,'forward','failed',$3,$4,$5,$6,$7,$8)`,
    [
      source,
      name,
      checksum_sha256 || null,
      category || null,
      destructive_flags ? JSON.stringify(destructive_flags) : null,
      Number.isFinite(duration_ms) ? duration_ms : null,
      executed_by || defaultActor(),
      JSON.stringify({ error_message: String(error_message || '').slice(0, 4000) })
    ]
  );
}

async function recordAuditEvent(db, evt) {
  const {
    source,
    name,
    action,
    status,
    checksum_sha256,
    category,
    destructive_flags,
    duration_ms,
    executed_by,
    details
  } = evt;
  await db.query(
    `INSERT INTO ${AUDIT_LOG_TABLE}
       (source, name, action, status, checksum_sha256, category, destructive_flags,
        duration_ms, executed_by, details)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)`,
    [
      source,
      name,
      action,
      status,
      checksum_sha256 || null,
      category || null,
      destructive_flags ? JSON.stringify(destructive_flags) : null,
      Number.isFinite(duration_ms) ? duration_ms : null,
      executed_by || defaultActor(),
      details ? JSON.stringify(details) : null
    ]
  );
}

async function recordRollback(db, payload) {
  const {
    source,
    name,
    checksum_sha256,
    duration_ms,
    executed_by,
    details
  } = payload;
  // Marca o registo de sucesso anterior como sobrescrito (não apaga) e regista rollback.
  await db.query(
    `INSERT INTO ${HISTORY_TABLE}
       (source, name, checksum_sha256, status, category, rollback_available,
        duration_ms, executed_by)
     VALUES ($1,$2,$3,'rollback','rollback', false, $4, $5)`,
    [source, name, checksum_sha256 || '', Number.isFinite(duration_ms) ? duration_ms : null, executed_by || defaultActor()]
  );
  await recordAuditEvent(db, {
    source,
    name,
    action: 'rollback',
    status: 'success',
    checksum_sha256,
    duration_ms,
    executed_by,
    details
  });
}

async function listHistory(db, limit = 50) {
  const r = await db.query(
    `SELECT id, source, name, status, category, destructive_flags,
            duration_ms, executed_by, executed_at
     FROM ${HISTORY_TABLE}
     ORDER BY id DESC LIMIT $1`,
    [limit]
  );
  return r.rows;
}

module.exports = {
  HISTORY_TABLE,
  AUDIT_LOG_TABLE,
  checksumOf,
  defaultActor,
  ensureHistoryTable,
  findApplied,
  recordSuccess,
  recordFailure,
  recordAuditEvent,
  recordRollback,
  listHistory
};
