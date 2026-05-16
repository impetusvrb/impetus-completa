'use strict';

/**
 * WAVE 3 — cold storage (manifestos; workers inactivos por defeito).
 */

const { v4: uuidv4 } = require('uuid');
const flags = require('./storageFlags');

async function registerManifest(partial) {
  if (!flags.isStorageV3Enabled()) {
    return { ok: false, reason: 'storage_v3_disabled' };
  }

  const p = partial && typeof partial === 'object' ? partial : {};
  const row = {
    id: uuidv4(),
    logical_name: String(p.logical_name || 'unknown').slice(0, 128),
    company_id: p.company_id || null,
    tier_code: String(p.tier_code || 'cold').slice(0, 32),
    storage_uri: String(p.storage_uri || 's3://impetus-archive/pending').slice(0, 1024),
    format: String(p.format || 'parquet').slice(0, 32),
    time_range_start: p.time_range_start || null,
    time_range_end: p.time_range_end || null,
    status: flags.isColdStorageEnabled() ? 'registered' : 'planned'
  };

  try {
    const db = require('../db');
    await db.query(
      `INSERT INTO impetus_cold_storage_manifest
       (id, logical_name, company_id, tier_code, storage_uri, format, time_range_start, time_range_end, status)
       VALUES ($1::uuid, $2, $3::uuid, $4, $5, $6, $7::timestamptz, $8::timestamptz, $9)`,
      [
        row.id,
        row.logical_name,
        row.company_id,
        row.tier_code,
        row.storage_uri,
        row.format,
        row.time_range_start,
        row.time_range_end,
        row.status
      ]
    );
    return { ok: true, manifest: row };
  } catch (err) {
    return { ok: false, error: err.message, manifest: row };
  }
}

async function listManifests(limit = 50) {
  try {
    const db = require('../db');
    const r = await db.query(
      `SELECT id, logical_name, company_id, tier_code, storage_uri, format, status, created_at
       FROM impetus_cold_storage_manifest ORDER BY created_at DESC LIMIT $1`,
      [Math.min(200, limit)]
    );
    return r.rows || [];
  } catch (_e) {
    return [];
  }
}

function getColdStorageArchitecture() {
  return {
    enabled: flags.isColdStorageEnabled(),
    formats: ['parquet', 'ndjson'],
    uri_scheme: 's3://impetus-archive/{logical_name}/{company_id}/{yyyy}/{mm}/',
    worker_active: false,
    manifest_table: 'impetus_cold_storage_manifest'
  };
}

module.exports = {
  registerManifest,
  listManifests,
  getColdStorageArchitecture
};
