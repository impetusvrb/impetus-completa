'use strict';
/**
 * IMPETUS - Pool de conexões PostgreSQL
 * Configuração explícita para evitar esgotamento em picos de uso.
 */
require('../config/loadEnv').loadImpetusEnv();

const { Pool } = require('pg');

const max = parseInt(process.env.DB_POOL_MAX, 10) || 20;
const min = parseInt(process.env.DB_POOL_MIN, 10) || 2;
const idleTimeoutMillis = parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 30000;
const connectionTimeoutMillis = parseInt(process.env.DB_POOL_CONNECT_TIMEOUT, 10) || 10000;
// Guardas do lado do servidor: impedem que uma query/transação presa segure
// uma conexão para sempre (causa raiz de esgotamento do pool). Qualquer query
// acima de `statementTimeout` é abortada; qualquer transação ociosa acima de
// `idleInTxTimeout` é encerrada, devolvendo a conexão ao pool.
const statementTimeout = parseInt(process.env.DB_STATEMENT_TIMEOUT, 10) || 60000;
const idleInTxTimeout = parseInt(process.env.DB_IDLE_IN_TX_TIMEOUT, 10) || 30000;
const commonPool = {
  max,
  min,
  idleTimeoutMillis,
  connectionTimeoutMillis,
  statement_timeout: statementTimeout,
  idle_in_transaction_session_timeout: idleInTxTimeout,
  keepAlive: true,
  allowExitOnIdle: false
};

const databaseUrl = (process.env.DATABASE_URL || '').trim();
const pool = databaseUrl
  ? new Pool({ connectionString: databaseUrl, ...commonPool })
  : new Pool({
      host: process.env.DB_HOST || '127.0.0.1',
      port: parseInt(process.env.DB_PORT, 10) || 5432,
      database: process.env.DB_NAME || 'impetus_db',
      user: process.env.DB_USER || 'postgres',
      password: process.env.DB_PASSWORD,
      ...commonPool
    });

pool.on('error', (err) => console.error('[DB] Pool error:', err.message));

const POOL_PRESSURE_LOG_INTERVAL_MS = 10000;
let lastPoolPressureLogAt = 0;
let suppressedPoolPressureLogs = 0;

function logPoolPressure(stats) {
  const now = Date.now();
  if (now - lastPoolPressureLogAt < POOL_PRESSURE_LOG_INTERVAL_MS) {
    suppressedPoolPressureLogs += 1;
    return;
  }

  console.warn('[DB][POOL_PRESSURE]', JSON.stringify({
    event: 'DATABASE_POOL_WAIT',
    ...stats,
    suppressed_since_last_log: suppressedPoolPressureLogs
  }));
  lastPoolPressureLogAt = now;
  suppressedPoolPressureLogs = 0;
}

async function query(text, params) {
  const stats = { totalCount: pool.totalCount, idleCount: pool.idleCount, waitingCount: pool.waitingCount };
  if (stats.waitingCount >= 3) {
    logPoolPressure(stats);
  }
  try {
    const flags = require('../tenant-isolation/config/tenantRlsFlags');
    const gov = require('../tenant-isolation/governance/tenantRlsGovernanceService');
    const ctx = require('../tenant-isolation/runtime/tenantDbContext');
    const rls = require('../tenant-isolation/runtime/tenantRlsRuntime');

    const store = ctx.getTenantContext();
    if (
      flags.isRlsEnabled() &&
      gov.shouldEnforceRls(flags.rlsMode()) &&
      store?.companyId &&
      gov.isActiveForTenant(store.companyId)
    ) {
      return rls.queryWithTenantContext(store.companyId, text, params);
    }
  } catch (rlsErr) {
    console.warn('[DB][RLS_WRAPPER]', rlsErr?.message);
  }
  return pool.query(text, params);
}

module.exports = {
  query,
  pool,
  getPoolStats: () => ({ totalCount: pool.totalCount, idleCount: pool.idleCount, waitingCount: pool.waitingCount })
};
