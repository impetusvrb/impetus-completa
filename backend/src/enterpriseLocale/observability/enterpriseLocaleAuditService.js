'use strict';

const { v4: uuidv4 } = require('uuid');
const flags = require('../config/enterpriseLocaleFlags');

async function recordAudit(row = {}) {
  if (!flags.shouldPersistAudit()) {
    return { id: null, persisted: false };
  }
  const id = uuidv4();
  try {
    const db = require('../../db');
    await db.query(
      `INSERT INTO enterprise_locale_audit
       (id, company_id, user_id, action, mode, locale, timezone, region_code, currency, payload)
       VALUES ($1::uuid,$2::uuid,$3::uuid,$4,$5,$6,$7,$8,$9,$10::jsonb)`,
      [
        id,
        row.companyId,
        row.userId,
        row.action || 'context_resolve',
        flags.localeEngineMode(),
        row.locale,
        row.timezone,
        row.regionCode,
        row.currency,
        JSON.stringify(row.payload || {})
      ]
    );
    return { id, persisted: true };
  } catch (err) {
    if (err.code === '42P01') return { id: null, persisted: false, table_missing: true };
    throw err;
  }
}

module.exports = { recordAudit };
