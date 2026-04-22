'use strict';
/**
 * IMPETUS - Pool de conexões PostgreSQL
 * Configuração explícita para evitar esgotamento em picos de uso.
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env'), override: true });

const { Pool } = require('pg');

const poolConfig = {
  host: process.env.DB_HOST || '127.0.0.1',
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  database: process.env.DB_NAME || 'impetus_db',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  // Pool: evita fila de conexões e timeouts em picos
  max: parseInt(process.env.DB_POOL_MAX, 10) || 20,
  min: parseInt(process.env.DB_POOL_MIN, 10) || 2,
  idleTimeoutMillis: parseInt(process.env.DB_POOL_IDLE_TIMEOUT, 10) || 30000,
  connectionTimeoutMillis: parseInt(process.env.DB_POOL_CONNECT_TIMEOUT, 10) || 10000,
  allowExitOnIdle: false
};

const pool = new Pool(poolConfig);

pool.on('error', (err) => console.error('[DB] Pool error:', err.message));

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool,
  getPoolStats: () => ({ totalCount: pool.totalCount, idleCount: pool.idleCount, waitingCount: pool.waitingCount })
};
