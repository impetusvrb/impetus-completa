require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
  database: process.env.DB_NAME || 'impetus_db',
  ssl: false
});

pool.on('error', (err) => {
  console.error('[DB_POOL_ERROR]', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};