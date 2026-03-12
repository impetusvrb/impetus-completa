#!/usr/bin/env node
/**
 * Executa APENAS a migration app_impetus_outbox
 * Use quando run-all-migrations falhar por permissões ou quando a tabela já existir
 * 
 * Uso: node -r dotenv/config scripts/run-app-impetus-migration.js
 * Ou: cd backend && node -r dotenv/config scripts/run-app-impetus-migration.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const MIGRATION_FILE = path.join(__dirname, '../src/models/app_impetus_outbox_migration.sql');

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Migration: app_impetus_outbox');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error('❌ Arquivo não encontrado:', MIGRATION_FILE);
    process.exit(1);
  }

  try {
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    await db.query(sql);
    console.log('✓ Tabela app_impetus_outbox criada/verificada com sucesso!\n');
    process.exit(0);
  } catch (err) {
    console.error('✗ Erro:', err.message);
    if (err.code === '42P07') {
      console.log('\n(Tabela já existe - pode ignorar se for o caso)');
    }
    process.exit(1);
  }
}

run();
