#!/usr/bin/env node
/**
 * Executa a migration TPM no banco de dados
 * Uso: node -r dotenv/config scripts/run-tpm-migration.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

async function run() {
  const sqlPath = path.join(__dirname, '../src/models/tpm_migration.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  try {
    await db.query(sql);
    console.log('✅ Migration TPM executada com sucesso. Tabelas criadas: tpm_incidents, tpm_shift_totals, tpm_form_sessions');
  } catch (err) {
    console.error('❌ Erro ao executar migration:', err.message);
    process.exit(1);
  }
  process.exit(0);
}

run();
