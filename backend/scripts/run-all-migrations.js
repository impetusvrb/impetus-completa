#!/usr/bin/env node
/**
 * IMPETUS - Executor de migrations
 * Executa arquivos .sql em src/models/ (CREATE TABLE IF NOT EXISTS)
 * Uso: node scripts/run-all-migrations.js
 * Ou: npm run migrate
 */
require('dotenv').config({ path: require('path').join(__dirname, '../.env') });
const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const MODELS_DIR = path.join(__dirname, '../src/models');
const MIGRATIONS_ORDER = [
  'nexus_token_billing_migration.sql',
  'nexus_credit_wallet_migration.sql',
  'dashboard_intelligence_migration.sql',
  'lacunas_ind4_migration.sql',
  'industrial_intelligence_extended_migration.sql',
  'machine_safety_intervention_migration.sql',
  'audio_logs_migration.sql',
  'dashboard_personalizado_migration.sql',
  'voice_preferences_migration.sql',
  'voice_preferences_restore_migration.sql',
  'performance_indexes_migration.sql',
  'admin_portal_migration.sql',
  'manuia_migration.sql',
  'manuia_extension_app_migration.sql',
  'manuia_inbox_attendance_migration.sql',
  'equipment_library_admin_migration.sql',
  'equipment_technical_3d_models_migration.sql',
  'technical_library_inteligente_migration.sql',
  'technical_library_field_analysis_migration.sql',
  'cognitive_council_migration.sql',
  'system_metrics_migration.sql'
];

async function runMigration(fileName) {
  const filePath = path.join(MODELS_DIR, fileName);
  if (!fs.existsSync(filePath)) {
    console.log(`[SKIP] ${fileName} não encontrado`);
    return;
  }
  const sql = fs.readFileSync(filePath, 'utf8')
    .replace(/--[^\n]*/g, '')
    .trim();
  const statements = sql.split(';').map((s) => s.trim()).filter((s) => s.length > 5);

  for (let i = 0; i < statements.length; i++) {
    const stmt = statements[i] + ';';
    try {
      await db.query(stmt);
      const preview = stmt.substring(0, 60).replace(/\s+/g, ' ');
      console.log(`[OK] ${fileName}: ${preview}...`);
    } catch (err) {
      if (err.message?.includes('already exists') || err.message?.includes('duplicate key')) {
        console.log(`[SKIP] ${fileName}: objeto já existe`);
      } else {
        console.warn(`[WARN] ${fileName}:`, err.message);
      }
    }
  }
}

async function main() {
  console.log('[MIGRATE] Iniciando em', new Date().toISOString());

  try {
    await db.query('SELECT 1');
  } catch (err) {
    console.error('[MIGRATE] Erro de conexão:', err.message);
    process.exit(1);
  }

  const allFiles = fs.readdirSync(MODELS_DIR).filter((f) => f.endsWith('.sql'));
  const toRun = MIGRATIONS_ORDER.filter((f) => allFiles.includes(f));
  const rest = allFiles.filter((f) => !MIGRATIONS_ORDER.includes(f)).sort();

  for (const f of [...toRun, ...rest]) {
    await runMigration(f);
  }

  console.log('[MIGRATE] Concluído');
  process.exit(0);
}

main().catch((err) => {
  console.error('[MIGRATE]', err);
  process.exit(1);
});
