require('dotenv').config();

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT),
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // NÃO usar String()
  database: process.env.DB_NAME,
  ssl: false
});

pool.on('error', (err) => {
  console.error('[DB_POOL_ERROR]', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};