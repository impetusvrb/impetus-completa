#!/usr/bin/env node
'use strict';

/**
 * Valida schema de communications + app_notifications (Notification Center).
 * Uso: npm run check-schema
 */

require('../src/config/loadEnv').loadImpetusEnv();

const db = require('../src/db');

const TABLE_COLUMNS = Object.freeze({
  communications: [
    'id',
    'company_id',
    'source',
    'sender_id',
    'text_content',
    'message_type',
    'status',
    'direction',
    'created_at',
  ],
  app_notifications: [
    'id',
    'company_id',
    'recipient_id',
    'communication_id',
    'text_content',
    'message_type',
    'sent_at',
    'read_at',
  ],
});

const EXPECTED_INDEXES = Object.freeze([
  'idx_app_notifications_recipient',
  'idx_app_notifications_unread',
  'idx_app_notifications_company',
]);

let failed = 0;

function check(label, ok, detail = '') {
  if (ok) {
    console.log('  OK', label, detail ? `— ${detail}` : '');
  } else {
    console.log('  FAIL', label, detail ? `— ${detail}` : '');
    failed++;
  }
}

async function tableExists(table) {
  const r = await db.query(`SELECT to_regclass($1::text) AS reg`, [`public.${table}`]);
  return r.rows[0]?.reg != null;
}

async function columnExists(table, column) {
  const r = await db.query(
    `SELECT 1 FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = $1 AND column_name = $2
     LIMIT 1`,
    [table, column]
  );
  return r.rows.length > 0;
}

async function indexExists(indexName) {
  const r = await db.query(
    `SELECT 1 FROM pg_indexes
     WHERE schemaname = 'public' AND indexname = $1
     LIMIT 1`,
    [indexName]
  );
  return r.rows.length > 0;
}

(async () => {
  console.log('=== check-communications-schema ===');

  try {
    await db.query('SELECT 1 AS ok');
    check('database connection', true);
  } catch (e) {
    check('database connection', false, e.message);
    process.exit(1);
  }

  for (const [table, columns] of Object.entries(TABLE_COLUMNS)) {
    const exists = await tableExists(table);
    check(`table public.${table}`, exists);
    if (!exists) continue;

    for (const col of columns) {
      const hasCol = await columnExists(table, col);
      check(`column ${table}.${col}`, hasCol);
    }
  }

  for (const idx of EXPECTED_INDEXES) {
    const hasIdx = await indexExists(idx);
    check(`index ${idx}`, hasIdx);
  }

  if (failed) {
    console.error(`\n${failed} verificação(ões) falharam.`);
    process.exit(1);
  }
  console.log('\nSchema de communications validado.');
  process.exit(0);
})().catch((e) => {
  console.error('[check-communications-schema] erro fatal:', e.message);
  process.exit(1);
});
