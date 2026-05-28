'use strict';

/**
 * Ensures AI governance tables exist (idempotent migration runner).
 */

const fs = require('fs');
const path = require('path');
const db = require('../db');

let _bootstrapped = false;

async function _runMigrationFile(filename) {
  const sqlPath = path.join(__dirname, '../models', filename);
  const sql = fs.readFileSync(sqlPath, 'utf8');
  await db.query(sql);
}

async function ensureAiGovernanceSchema() {
  if (_bootstrapped) return { ok: true, cached: true };

  const results = { registry: null, hallucination: null };
  try {
    await _runMigrationFile('ai_model_registry_migration.sql');
    results.registry = { ok: true };
  } catch (err) {
    results.registry = { ok: false, error: err?.message };
    console.warn('[AI_SCHEMA_BOOTSTRAP] registry:', err?.message);
  }

  try {
    await _runMigrationFile('ai_hallucination_detection_migration.sql');
    results.hallucination = { ok: true };
  } catch (err) {
    results.hallucination = { ok: false, error: err?.message };
    console.warn('[AI_SCHEMA_BOOTSTRAP] hallucination:', err?.message);
  }

  const ok = results.hallucination?.ok || results.registry?.ok;
  if (ok) _bootstrapped = true;
  return { ok: !!ok, results };
}

module.exports = { ensureAiGovernanceSchema };
