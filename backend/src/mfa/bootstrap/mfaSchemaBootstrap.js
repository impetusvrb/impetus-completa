'use strict';

const fs = require('fs');
const path = require('path');
const db = require('../../db');

let _bootstrapped = false;

async function ensureMfaSchema() {
  if (_bootstrapped) return { ok: true, cached: true };
  try {
    const sql = fs.readFileSync(
      path.join(__dirname, '../../models/enterprise_mfa_migration.sql'),
      'utf8'
    );
    await db.query(sql);
    _bootstrapped = true;
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err?.message };
  }
}

module.exports = { ensureMfaSchema };
