/**
 * Verifica se a tabela communications tem as colunas necessárias para Z-API/IA
 * Uso: node -r dotenv/config scripts/check-communications-schema.js
 */
require('dotenv').config();
const db = require('../src/db');

const REQUIRED_COLUMNS = ['ai_classification', 'related_task_id', 'processed_at'];

async function check() {
  try {
    const r = await db.query(`
      SELECT column_name, data_type
      FROM information_schema.columns
      WHERE table_schema = 'public' AND table_name = 'communications'
    `);

    if (r.rows.length === 0) {
      console.log('❌ Tabela communications NÃO existe.');
      console.log('   Execute: psql -f backend/src/models/complete_schema.sql');
      process.exit(1);
    }

    const cols = r.rows.map(x => x.column_name);
    const missing = REQUIRED_COLUMNS.filter(c => !cols.includes(c));

    if (missing.length > 0) {
      console.log('❌ Colunas faltando em communications:', missing.join(', '));
      console.log('   Execute as migrações ou aplique o complete_schema.sql');
      process.exit(1);
    }

    console.log('✅ Tabela communications OK. Colunas presentes:', REQUIRED_COLUMNS.join(', '));
    process.exit(0);
  } catch (err) {
    console.error('Erro ao verificar schema:', err.message);
    process.exit(1);
  }
}

check();
