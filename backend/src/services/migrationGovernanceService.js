'use strict';

/**
 * IMPETUS — Migration Governance Service (Enterprise Hardening Bloco 4)
 *
 * Responsabilidades:
 *   1. Lock distribuído: pg_advisory_lock / pg_try_advisory_lock entre runners
 *      paralelos (CI duplo, dois deploys, atomicidade entre nós).
 *   2. Classificação por SQLSTATE — substitui heurística baseada em substring
 *      ("already exists" / "duplicate key") por códigos canónicos PostgreSQL.
 *   3. Snapshot de execução: marca início / fim de cada batch para auditoria.
 *   4. Verificação leve de naming (NNN_description.sql) em modo aviso (não
 *      bloqueante, para não quebrar migrations legacy).
 *
 * NÃO altera comportamento existente do runner se não for invocado. Aditivo.
 */

const path = require('path');

/**
 * Chave determinística para advisory lock (constante em todo o cluster).
 * Postgres aceita um BIGINT (64 bits). Usamos um hash de string fixa.
 */
function migrationAdvisoryLockKey() {
  // Hash determinístico FNV-1a simplificado para 64 bits (mantemos positivo).
  const s = process.env.IMPETUS_MIGRATION_LOCK_NAMESPACE || 'impetus_migration_global';
  let h = BigInt('0xcbf29ce484222325');
  for (let i = 0; i < s.length; i += 1) {
    h ^= BigInt(s.charCodeAt(i));
    h = (h * BigInt('0x100000001b3')) & BigInt('0x7fffffffffffffff');
  }
  // Retorna inteiro (Postgres bigint aceita até 2^63-1).
  return h.toString();
}

/**
 * Tenta adquirir advisory lock global. Bloqueia até obter (com timeout).
 * @param {object} db — módulo `../db`
 * @param {{ timeoutMs?: number }} [opts]
 * @returns {Promise<boolean>}
 */
async function acquireGlobalMigrationLock(db, opts = {}) {
  const timeoutMs = Math.max(1000, Number(opts.timeoutMs) || 60000);
  const key = migrationAdvisoryLockKey();
  const start = Date.now();
  // Primeira tentativa imediata (pg_try_advisory_lock), depois polling com backoff curto.
  let attempt = 0;
  while (Date.now() - start < timeoutMs) {
    try {
      const r = await db.query('SELECT pg_try_advisory_lock($1::bigint) AS got', [key]);
      if (r.rows && r.rows[0] && r.rows[0].got === true) {
        console.info(
          '[MIGRATION_LOCK_ACQUIRED]',
          JSON.stringify({
            event: 'MIGRATION_LOCK_ACQUIRED',
            key,
            attempt,
            waited_ms: Date.now() - start
          })
        );
        return true;
      }
    } catch (e) {
      console.warn('[MIGRATION_LOCK_TRY_FAIL]', e.message);
    }
    attempt += 1;
    await new Promise((resolve) => setTimeout(resolve, Math.min(2000, 200 + attempt * 100)));
  }
  console.error(
    '[MIGRATION_LOCK_TIMEOUT]',
    JSON.stringify({ event: 'MIGRATION_LOCK_TIMEOUT', key, waited_ms: Date.now() - start })
  );
  return false;
}

async function releaseGlobalMigrationLock(db) {
  const key = migrationAdvisoryLockKey();
  try {
    await db.query('SELECT pg_advisory_unlock($1::bigint)', [key]);
    console.info('[MIGRATION_LOCK_RELEASED]', JSON.stringify({ event: 'MIGRATION_LOCK_RELEASED', key }));
  } catch (e) {
    console.warn('[MIGRATION_LOCK_RELEASE_FAIL]', e.message);
  }
}

/**
 * Classifica erro do Postgres por SQLSTATE — mais preciso que substring matching.
 * Lista mínima dos códigos esperados em migrations idempotentes:
 *   42P07 duplicate_table
 *   42710 duplicate_object   (índices, sequências, constraints, types, etc.)
 *   42701 duplicate_column
 *   42P06 duplicate_schema
 *   42P05 duplicate_prepared_statement
 *   23505 unique_violation   (data: NÃO é idempotente em geral; tratamos como erro real)
 */
const IDEMPOTENT_SQLSTATES = new Set(['42P07', '42710', '42701', '42P06', '42P05']);

function classifySqlError(err) {
  if (!err) return { type: 'unknown', idempotent: false };
  const code = err.code || (err.original && err.original.code) || null;
  if (code && IDEMPOTENT_SQLSTATES.has(code)) {
    return { type: 'idempotent_duplicate', idempotent: true, sqlstate: code };
  }
  // Fallback compatível com a heurística antiga (apenas para drivers/wrappers
  // que não preservam `err.code`). Reduzido a sinais inequívocos.
  const msg = String((err && err.message) || '');
  if (
    code == null &&
    (/(\balready exists\b|\bduplicate object\b|\bduplicate column\b)/i.test(msg))
  ) {
    return { type: 'idempotent_duplicate_legacy', idempotent: true, sqlstate: null };
  }
  return { type: 'real_error', idempotent: false, sqlstate: code || null };
}

/**
 * Verifica padrão `NNN_description.sql` (numbering enforcement).
 * Aviso apenas — não falha o runner para preservar migrations legacy.
 */
function checkNumberingPattern(name) {
  return /^\d{3,4}_[a-z0-9_]+\.sql$/i.test(name) ? 'ok' : 'legacy_naming';
}

module.exports = {
  acquireGlobalMigrationLock,
  releaseGlobalMigrationLock,
  classifySqlError,
  checkNumberingPattern,
  IDEMPOTENT_SQLSTATES,
  migrationAdvisoryLockKey
};
