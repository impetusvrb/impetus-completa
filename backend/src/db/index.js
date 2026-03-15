/**
 * IMPETUS - Conexão PostgreSQL
 * Pool de conexões para acesso ao banco de dados
 */
require('dotenv').config({ path: require('path').join(__dirname, '../../.env') });
const { Pool } = require('pg');

const connectionString =
  process.env.DATABASE_URL ||
  (process.env.PG_HOST && process.env.PG_DATABASE
    ? `postgresql://${process.env.PG_USER || 'postgres'}:${process.env.PG_PASSWORD || ''}@${process.env.PG_HOST}:${process.env.PG_PORT || 5432}/${process.env.PG_DATABASE}`
    : null);

if (!connectionString) {
  console.warn(
    '[DB] DATABASE_URL ou PG_* não configurados. Configure no .env para conectar ao PostgreSQL.'
  );
}

const pool = connectionString
  ? new Pool({
      connectionString,
      max: parseInt(process.env.PG_POOL_MAX, 10) || 20,
      idleTimeoutMillis: 30000,
      connectionTimeoutMillis: 10000
    })
  : null;

async function query(text, params) {
  if (!pool) {
    throw new Error('Banco de dados não configurado. Verifique DATABASE_URL no .env');
  }
  return pool.query(text, params);
}

module.exports = {
  pool,
  query
};
