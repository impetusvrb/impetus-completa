'use strict';

/**
 * Verificação de prontidão: BD, tabelas centrais, cifra em repouso (quando exigida).
 * Sem serviços externos. Idempotente; seguro de invocar em /health e no arranque.
 */

const db = require('../db');
const { isDatabaseConfigured } = require('../config/configValidator');
const { isEncryptionAvailable } = require('./encryptionService');

/** Tabelas esperadas no schema public (MVP de rotas principais; falha ajustável em migração). */
const CORE_TABLES = Object.freeze(['companies', 'users', 'assets', 'operational_events']);

/**
 * Cifra em repouso é obrigatória para o sistema se considerar "pronto" (produção).
 * @returns {boolean}
 */
function isEncryptionRequiredForReadiness() {
  return /^(1|true|yes)$/i.test(
    String(process.env.REQUIRE_ENCRYPTION_AT_REST || process.env.SENSITIVE_DATA_ENCRYPTION_MANDATORY || '').trim()
  );
}

/**
 * @returns {boolean}
 */
function isProduction() {
  const n = String(process.env.NODE_ENV || '').trim().toLowerCase();
  return n === 'production';
}

/**
 * @param {string} b64
 * @returns {boolean}
 */
function isValidDataEncryptionKeyFormat(b64) {
  if (b64 == null || String(b64).trim() === '') {
    return false;
  }
  try {
    const buf = Buffer.from(String(b64).trim(), 'base64');
    return buf.length === 32;
  } catch {
    return false;
  }
}

/**
 * @param {{ ready: boolean, issues: string[], hasCritical?: boolean }} r
 * @param {'critical'|'warning'} sev
 * @param {string} code
 * @param {string} message
 */
function push(r, sev, code, message) {
  const p = sev === 'critical' ? '[crítico]' : '[aviso]';
  r.issues.push(`${p} ${code}: ${message}`);
  if (sev === 'critical') {
    r.ready = false;
    r.hasCritical = true;
  }
}

/**
 * Valida ligação PostgreSQL, existência de tabelas e política de cifra.
 * @returns {Promise<{ ready: boolean, issues: string[], hasCritical: boolean }>}
 */
async function checkSystemReadiness() {
  const result = { ready: true, issues: /** @type {string[]} */ ([]), hasCritical: false };

  if (!isDatabaseConfigured()) {
    push(
      result,
      'critical',
      'DB_CONFIG',
      'Base de dados não configurada (DATABASE_URL ou DB_HOST, DB_NAME, DB_USER).'
    );
    return result;
  }

  let dbOk = false;
  try {
    await db.query('SELECT 1 AS ok');
    dbOk = true;
  } catch (e) {
    const msg = e && e.message ? String(e.message) : String(e);
    push(result, 'critical', 'DB_CONNECT', `Falha ao conectar à base de dados: ${msg}`);
  }

  if (dbOk) {
    for (const table of CORE_TABLES) {
      try {
        const r = await db.query(
          `SELECT to_regclass('public.' || $1::text) AS reg`,
          [table]
        );
        const reg = r.rows && r.rows[0] && r.rows[0].reg;
        if (reg == null) {
          push(
            result,
            'critical',
            'DB_SCHEMA',
            `Tabela em falta ou inacessível: public.${table} (migrações pendentes?).`
          );
        }
      } catch (e) {
        const msg = e && e.message ? String(e.message) : String(e);
        push(result, 'critical', 'DB_TABLE_CHECK', `Não foi possível validar tabela ${table}: ${msg}`);
        break;
      }
    }
  }

  const dek = process.env.DATA_ENCRYPTION_KEY;
  const dekSet = dek != null && String(dek).trim() !== '';
  if (dekSet && !isValidDataEncryptionKeyFormat(dek)) {
    push(
      result,
      'critical',
      'ENCRYPTION_KEY',
      'DATA_ENCRYPTION_KEY definida mas inválida (esperado base64 de 32 bytes).'
    );
  } else if (isEncryptionRequiredForReadiness() && !isEncryptionAvailable()) {
    push(
      result,
      'critical',
      'ENCRYPTION',
      'Cifra em repouso exigida (REQUIRE_ENCRYPTION_AT_REST) mas indisponível — defina DATA_ENCRYPTION_KEY válida ou KMS.'
    );
  } else if (isProduction() && !isEncryptionAvailable() && !isEncryptionRequiredForReadiness()) {
    push(
      result,
      'warning',
      'ENCRYPTION',
      'Cifra em repouso (DATA_ENCRYPTION_KEY) não ativa; dados SENSITIVE podem ser limitados.'
    );
  }

  return result;
}

/**
 * Se em produção houver verificações críticas em falta, o processo deve terminar.
 * @param {{ hasCritical?: boolean }|null|undefined} r
 * @returns {boolean}
 */
function shouldAbortOnStartup(r) {
  if (!isProduction()) {
    return false;
  }
  return Boolean(r && r.hasCritical);
}

/**
 * @param {{ ready?: boolean, issues?: string[] }|null|undefined} r
 * @returns {{ ready: boolean, issues: string[] }}
 */
function toPublicPayload(r) {
  return { ready: Boolean(r && r.ready), issues: Array.isArray(r.issues) ? r.issues : [] };
}

module.exports = {
  checkSystemReadiness,
  shouldAbortOnStartup,
  toPublicPayload,
  CORE_TABLES
};
