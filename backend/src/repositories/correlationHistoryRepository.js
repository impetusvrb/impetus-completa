'use strict';

const db = require('../db');
const { isValidUUID } = require('../utils/security');

const WINDOWS = Object.freeze([7, 30, 90]);
const MAX_ROWS_FETCH = 5000;
/** Limite por omissão para análise temporal (deriveTemporalInsights); evita scans grandes. */
const DEFAULT_TEMPORAL_LIST_CAP = 1500;
/** Tecto rígido para leituras temporais (pedido: máx. 1500 registos). */
const TEMPORAL_ANALYSIS_HARD_CAP = 1500;

/**
 * @param {string} companyId
 * @param {object} pattern
 * @param {string} pattern.pattern_type
 * @param {string|null} [pattern.machine_id]
 * @param {string|null} [pattern.event_type]
 * @param {number} [pattern.occurrences]
 * @param {number} [pattern.window_days]
 * @returns {Promise<boolean>}
 */
async function insertCorrelationPattern(companyId, pattern) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid) || !pattern || typeof pattern !== 'object') {
    return false;
  }
  const pt = pattern.pattern_type != null ? String(pattern.pattern_type).trim().slice(0, 64) : '';
  if (!pt) {
    return false;
  }
  const mid = pattern.machine_id != null ? String(pattern.machine_id).trim().slice(0, 256) : null;
  const et = pattern.event_type != null ? String(pattern.event_type).trim().slice(0, 256) : null;
  const occ = Math.max(1, parseInt(String(pattern.occurrences != null ? pattern.occurrences : 1), 10) || 1);
  let wd = parseInt(String(pattern.window_days != null ? pattern.window_days : 30), 10);
  if (!Number.isFinite(wd) || !WINDOWS.includes(wd)) {
    wd = 30;
  }
  try {
    await db.query(
      `
      INSERT INTO correlation_history
        (company_id, pattern_type, machine_id, event_type, occurrences, window_days, created_at)
      VALUES ($1::uuid, $2, $3, $4, $5, $6, now())
      `,
      [cid, pt, mid, et, occ, wd]
    );
    return true;
  } catch (e) {
    if (e && e.message && String(e.message).includes('does not exist')) {
      return false;
    }
    console.warn(
      '[CORRELATION_HISTORY] insertCorrelationPattern',
      e && e.message ? String(e.message) : e
    );
    return false;
  }
}

/**
 * @param {string} companyId
 * @param {number} [lookbackDays]
 * @param {number} [maxRows] — tecto global {@link MAX_ROWS_FETCH}
 * @returns {Promise<Array<Record<string, unknown>>>}
 */
async function listHistoryForCompany(companyId, lookbackDays = 90, maxRows = MAX_ROWS_FETCH) {
  const cid = companyId != null ? String(companyId).trim() : '';
  if (!cid || !isValidUUID(cid)) {
    return [];
  }
  const days = Math.min(Math.max(parseInt(String(lookbackDays), 10) || 90, 1), 400);
  const lim = Math.min(
    Math.max(parseInt(String(maxRows), 10) || MAX_ROWS_FETCH, 1),
    MAX_ROWS_FETCH
  );
  try {
    const r = await db.query(
      `
      SELECT pattern_type, machine_id, event_type, occurrences, window_days, created_at
      FROM correlation_history
      WHERE company_id = $1::uuid
        AND created_at >= now() - ($2::int * interval '1 day')
      ORDER BY created_at ASC
      LIMIT $3
      `,
      [cid, days, lim]
    );
    return r.rows || [];
  } catch (e) {
    if (e && e.message && String(e.message).includes('does not exist')) {
      return [];
    }
    console.warn(
      '[CORRELATION_HISTORY] listHistoryForCompany',
      e && e.message ? String(e.message) : e
    );
    return [];
  }
}

module.exports = {
  insertCorrelationPattern,
  listHistoryForCompany,
  WINDOWS,
  MAX_ROWS_FETCH,
  DEFAULT_TEMPORAL_LIST_CAP,
  TEMPORAL_ANALYSIS_HARD_CAP
};
