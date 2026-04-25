'use strict';
/**
 * IMPETUS - Pool de conexões PostgreSQL
 * Configuração explícita para evitar esgotamento em picos de uso.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });

const { Pool } = require('pg');

const max = parseInt(process.env.DB_POOL_MAX, 10) || 20;
const min = parseInt(process.env.DB_POOL_MIN, 10) || 2;
const idleTimeoutMillis = parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 30000;
const connectionTimeoutMillis = parseInt(process.env.DB_POOL_CONNECT_TIMEOUT, 10) || 10000;
const commonPool = {
  max,
  min,
  idleTimeoutMillis,
  connectionTimeoutMillis,
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

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  getPoolStats: () => ({ totalCount: pool.totalCount, idleCount: pool.idleCount, waitingCount: pool.waitingCount })
};
