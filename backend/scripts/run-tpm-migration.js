#!/usr/bin/env node
'use strict';

/**
 * Aplica migration TPM product_description (idempotente).
 * Uso: npm run tpm-migrate
 */

require('../src/config/loadEnv').loadImpetusEnv();

const fs = require('fs');
const path = require('path');
const db = require('../src/db');

const SQL_FILE = path.join(__dirname, '../src/models/tpm_product_description_migration.sql');

(async () => {
  const sql = fs.readFileSync(SQL_FILE, 'utf8');
  await db.query(sql);
  console.log('[tpm-migrate] OK — tpm_incidents.product_description');
  process.exit(0);
})().catch((e) => {
  console.error('[tpm-migrate]', e.message);
  process.exit(1);
});
