const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../../.env') });
require('dotenv').config({ path: path.join(__dirname, '../../.env') });

const { Pool } = require('pg');

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
<<<<<<< HEAD
  port: parseInt(process.env.DB_PORT, 10) || 5432,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD, // NÃO usar String()
  database: process.env.DB_NAME,
=======
  port: parseInt(process.env.DB_PORT || '5432', 10),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD != null ? String(process.env.DB_PASSWORD) : '',
  database: process.env.DB_NAME || 'impetus_db',
>>>>>>> bf61ff5e943abb5f09916447f9bfbb52acf338de
  ssl: false
});

pool.on('error', (err) => {
  console.error('[DB_POOL_ERROR]', err.message);
});

module.exports = {
  query: (text, params) => pool.query(text, params),
  pool
};