const { Pool } = require('pg');

/**
 * CONFIGURAÇÃO FIXA PARA TESTE
 * (Não depende de .env)
 * Depois que funcionar, voltamos para versão com variáveis de ambiente.
 */

const pool = new Pool({
  host: 'localhost',
  port: 5432,
  user: 'postgres',
  password: String('123456'), // força como string
  database: 'impetus_db',
  max: 10,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

// Log quando conectar com sucesso
pool.connect()
  .then(client => {
    console.log('✅ Conectado ao PostgreSQL com sucesso');
    client.release();
  })
  .catch(err => {
    console.error('❌ ERRO AO CONECTAR NO POSTGRESQL:', err.message);
  });

// Evita que erros do pool derrubem o processo
pool.on('error', (err) => {
  console.error('[DB_POOL_ERROR]', err.message);
});

module.exports = {
  query: async (text, params) => {
    try {
      return await pool.query(text, params);
    } catch (err) {
      console.error('[DB_QUERY_ERROR]', err.message);
      throw err;
    }
  },
  pool
};