#!/usr/bin/env node
/**
 * Executa APENAS a migration intelligent_dashboard
 * Use quando run-all-migrations falhar por permissões ou para aplicar só esta migration
 *
 * Uso: cd backend && node -r dotenv/config scripts/run-intelligent-dashboard-migration.js
 */
require('dotenv').config();
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const MIGRATION_FILE = path.join(__dirname, '../src/models/intelligent_dashboard_migration.sql');

async function run() {
  console.log('═══════════════════════════════════════════════════════');
  console.log('  Migration: Dashboard Inteligente');
  console.log('═══════════════════════════════════════════════════════\n');

  if (!fs.existsSync(MIGRATION_FILE)) {
    console.error('❌ Arquivo não encontrado:', MIGRATION_FILE);
    process.exit(1);
  }

  try {
    const sql = fs.readFileSync(MIGRATION_FILE, 'utf8');
    await db.query(sql);
    console.log('✓ Migration dashboard inteligente aplicada com sucesso!\n');
    process.exit(0);
  } catch (err) {
    console.error('✗ Erro:', err.message);
    if (err.code === '42P07') console.log('\n(Tabela já existe - pode ignorar)');
    process.exit(1);
  }
}

run();
