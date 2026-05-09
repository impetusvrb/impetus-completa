'use strict';

/**
 * Persistência cognitiva em PostgreSQL — paralela ao JSON (cognitivePersistenceService).
 * Fail-safe: erros não interrompem o runtime; JSON/RAM mantêm-se como fonte operacional.
 */

const crypto = require('crypto');

function isCognitiveDbEnabled() {
  return String(process.env.IMPETUS_COGNITIVE_DB_ENABLED ?? '')
    .trim()
    .toLowerCase() === 'true';
}

function toUuidOrNull(v) {
  if (v == null || v === '') return null;
  const s = String(v).trim();
  if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(s)) return s;
  return null;
}

function extractCompanyId(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  return ctx.company_id ?? ctx.companyId ?? ctx.metrics?.company_id ?? null;
}

function extractDataState(ctx) {
  if (!ctx || typeof ctx !== 'object') return null;
  if (ctx.metrics?.data_state != null) return String(ctx.metrics.data_state);
  if (ctx.data_state != null) return String(ctx.data_state);
  return null;
}

function safePayload(obj) {
  try {
    return JSON.parse(JSON.stringify(obj));
  } catch (_e) {
    return { _error: 'serialization_failed', at: new Date().toISOString() };
  }
}

/**
 * @param {{ interactionId: string, timestamp: number, input?: unknown, output?: unknown, context?: unknown, confidence?: number|null }} entry
 */
async function persistInteractionToDb(entry) {
  if (!isCognitiveDbEnabled()) return;
  if (!entry || !entry.interactionId || entry.timestamp == null) return;

  try {
    const db = require('../db');
    const ctx = entry.context && typeof entry.context === 'object' ? entry.context : {};
    const companyId = toUuidOrNull(extractCompanyId(ctx));
    const module = ctx.module != null ? String(ctx.module).slice(0, 512) : null;
    const dataState = extractDataState(ctx);
    const payload = safePayload(entry);
    const createdAt = new Date(Number(entry.timestamp)).toISOString();

    await db.query(
      `INSERT INTO cognitive_interactions (id, created_at, company_id, module, confidence, data_state, payload)
       VALUES ($1::uuid, $2::timestamptz, $3::uuid, $4, $5, $6, $7::jsonb)`,
      [
        entry.interactionId,
        createdAt,
        companyId,
        module,
        entry.confidence != null ? Number(entry.confidence) : null,
        dataState,
        JSON.stringify(payload)
      ]
    );
    try {
      console.log('[COGNITIVE_DB_WRITE]', { table: 'cognitive_interactions', id: entry.interactionId });
    } catch (_e) {}
  } catch (err) {
    try {
      console.warn('[COGNITIVE_DB_ERROR]', { op: 'persistInteraction', message: err?.message || err });
    } catch (_e) {}
  }
}

/**
 * @param {object} row — linha completa da proposta (id, proposal, status, audit, …)
 */
async function persistProposalToDb(row) {
  if (!isCognitiveDbEnabled()) return;
  if (!row || !row.id || !row.createdAt || !row.status) return;

  try {
    const db = require('../db');
    const proposalType =
      row.proposal?.type != null ? String(row.proposal.type).slice(0, 256) : 'unknown';
    const payload = safePayload(row);

    await db.query(
      `INSERT INTO cognitive_proposals (id, created_at, proposal_type, status, payload)
       VALUES ($1::uuid, $2::timestamptz, $3, $4, $5::jsonb)
       ON CONFLICT (id) DO UPDATE SET
         proposal_type = EXCLUDED.proposal_type,
         status = EXCLUDED.status,
         payload = EXCLUDED.payload`,
      [row.id, row.createdAt, proposalType, String(row.status).slice(0, 64), JSON.stringify(payload)]
    );
    try {
      console.log('[COGNITIVE_DB_WRITE]', { table: 'cognitive_proposals', id: row.id });
    } catch (_e) {}
  } catch (err) {
    try {
      console.warn('[COGNITIVE_DB_ERROR]', { op: 'persistProposal', message: err?.message || err });
    } catch (_e) {}
  }
}

/**
 * @param {{ type: string, details?: object, timestamp?: number }} event
 */
async function persistAutonomousEventToDb(event) {
  if (!isCognitiveDbEnabled()) return;
  if (!event || !event.type) return;

  try {
    const db = require('../db');
    const id = crypto.randomUUID();
    const ts =
      event.timestamp != null && Number.isFinite(Number(event.timestamp))
        ? new Date(Number(event.timestamp)).toISOString()
        : new Date().toISOString();
    const payload = safePayload({
      type: event.type,
      details: event.details && typeof event.details === 'object' ? event.details : {}
    });

    await db.query(
      `INSERT INTO cognitive_autonomous_events (id, created_at, event_type, payload)
       VALUES ($1::uuid, $2::timestamptz, $3, $4::jsonb)`,
      [id, ts, String(event.type).slice(0, 128), JSON.stringify(payload)]
    );
    try {
      console.log('[COGNITIVE_DB_WRITE]', { table: 'cognitive_autonomous_events', id, event_type: event.type });
    } catch (_e) {}
  } catch (err) {
    try {
      console.warn('[COGNITIVE_DB_ERROR]', { op: 'persistAutonomousEvent', message: err?.message || err });
    } catch (_e) {}
  }
}

/**
 * @param {string} id — UUID da interacção
 * @param {string|null|undefined} companyId — se definido, restringe ao tenant
 * @returns {Promise<{ id: string, created_at: Date|string, company_id: string|null, module: string|null, confidence: number|null, data_state: string|null, payload: object }|null>}
 */
async function getInteractionById(id, companyId = null) {
  if (!isCognitiveDbEnabled()) return null;
  const uuid = toUuidOrNull(id);
  if (!uuid) return null;

  try {
    const db = require('../db');
    const params = [uuid];
    let sql = `
      SELECT id, created_at, company_id, module, confidence, data_state, payload
      FROM cognitive_interactions
      WHERE id = $1::uuid`;

    const cid = companyId != null ? toUuidOrNull(companyId) : null;
    if (cid) {
      sql += ` AND company_id = $2::uuid`;
      params.push(cid);
    }

    const r = await db.query(sql, params);
    if (!r.rows.length) return null;
    const row = r.rows[0];
    let payload = row.payload;
    if (payload != null && typeof payload === 'string') {
      try {
        payload = JSON.parse(payload);
      } catch (_e) {
        payload = { _raw: '[unparseable]' };
      }
    }
    return {
      id: String(row.id),
      created_at: row.created_at,
      company_id: row.company_id != null ? String(row.company_id) : null,
      module: row.module != null ? String(row.module) : null,
      confidence: row.confidence != null ? Number(row.confidence) : null,
      data_state: row.data_state != null ? String(row.data_state) : null,
      payload: payload && typeof payload === 'object' ? payload : {}
    };
  } catch (err) {
    try {
      console.warn('[COGNITIVE_DB_ERROR]', { op: 'getInteractionById', message: err?.message || err });
    } catch (_e) {}
    return null;
  }
}

/**
 * Contagens cumulativas até à data (inclusive).
 * @param {string} isoDateString
 */
async function getCognitiveSnapshotAt(isoDateString) {
  if (!isCognitiveDbEnabled()) {
    return {
      interactions: 0,
      proposals: 0,
      autonomousEvents: 0,
      enabled: false
    };
  }

  const d = new Date(isoDateString);
  if (Number.isNaN(d.getTime())) {
    return {
      interactions: 0,
      proposals: 0,
      autonomousEvents: 0,
      enabled: true,
      error: 'INVALID_DATE'
    };
  }

  try {
    const db = require('../db');
    const ts = d.toISOString();
    const [i, p, a] = await Promise.all([
      db.query(
        `SELECT COUNT(*)::bigint AS c FROM cognitive_interactions WHERE created_at <= $1::timestamptz`,
        [ts]
      ),
      db.query(
        `SELECT COUNT(*)::bigint AS c FROM cognitive_proposals WHERE created_at <= $1::timestamptz`,
        [ts]
      ),
      db.query(
        `SELECT COUNT(*)::bigint AS c FROM cognitive_autonomous_events WHERE created_at <= $1::timestamptz`,
        [ts]
      )
    ]);
    return {
      interactions: Number(i.rows[0].c),
      proposals: Number(p.rows[0].c),
      autonomousEvents: Number(a.rows[0].c),
      enabled: true,
      asOf: ts
    };
  } catch (err) {
    try {
      console.warn('[COGNITIVE_DB_ERROR]', { op: 'getCognitiveSnapshotAt', message: err?.message || err });
    } catch (_e) {}
    return {
      interactions: 0,
      proposals: 0,
      autonomousEvents: 0,
      enabled: true,
      error: true
    };
  }
}

async function getCognitiveDbSnapshot() {
  if (!isCognitiveDbEnabled()) {
    try {
      console.log('[COGNITIVE_DB_DISABLED]', { scope: 'snapshot' });
    } catch (_e) {}
    return {
      interactions: 0,
      proposals: 0,
      autonomousEvents: 0,
      enabled: false
    };
  }

  try {
    const db = require('../db');
    const [i, p, a] = await Promise.all([
      db.query('SELECT COUNT(*)::bigint AS c FROM cognitive_interactions'),
      db.query('SELECT COUNT(*)::bigint AS c FROM cognitive_proposals'),
      db.query('SELECT COUNT(*)::bigint AS c FROM cognitive_autonomous_events')
    ]);
    return {
      interactions: Number(i.rows[0].c),
      proposals: Number(p.rows[0].c),
      autonomousEvents: Number(a.rows[0].c),
      enabled: true
    };
  } catch (err) {
    try {
      console.warn('[COGNITIVE_DB_ERROR]', { op: 'getCognitiveDbSnapshot', message: err?.message || err });
    } catch (_e) {}
    return {
      interactions: 0,
      proposals: 0,
      autonomousEvents: 0,
      enabled: true,
      error: true
    };
  }
}

function schedulePersistInteractionToDb(entry) {
  if (!isCognitiveDbEnabled()) return;
  Promise.resolve()
    .then(() => persistInteractionToDb(entry))
    .catch((err) => {
      try {
        console.warn('[COGNITIVE_DB_ERROR]', { op: 'schedulePersistInteraction', message: err?.message || err });
      } catch (_e) {}
    });
}

function schedulePersistProposalToDb(row) {
  if (!isCognitiveDbEnabled()) return;
  Promise.resolve()
    .then(() => persistProposalToDb(row))
    .catch((err) => {
      try {
        console.warn('[COGNITIVE_DB_ERROR]', { op: 'schedulePersistProposal', message: err?.message || err });
      } catch (_e) {}
    });
}

function schedulePersistAutonomousEventToDb(event) {
  if (!isCognitiveDbEnabled()) return;
  Promise.resolve()
    .then(() => persistAutonomousEventToDb(event))
    .catch((err) => {
      try {
        console.warn('[COGNITIVE_DB_ERROR]', { op: 'schedulePersistAutonomous', message: err?.message || err });
      } catch (_e) {}
    });
}

function truncatePayloadForAdmin(payload, max = 32000) {
  if (payload == null) return null;
  try {
    const obj = typeof payload === 'object' ? payload : JSON.parse(String(payload));
    const s = JSON.stringify(obj);
    if (s.length <= max) return obj;
    return { _truncated: true, approx_bytes: s.length, preview: s.slice(0, max) };
  } catch (_e) {
    return { _error: 'payload_parse' };
  }
}

/**
 * Event store de drift cognitivo (observacional).
 * @param {{ companyId?: string|null, drift_type: string, severity: string, payload: object }} event
 */
async function persistDriftEventToDb(event) {
  if (!isCognitiveDbEnabled()) return;
  if (!event || !event.drift_type || !event.severity) return;

  try {
    const id = crypto.randomUUID();
    const db = require('../db');
    const body = safePayload(event.payload && typeof event.payload === 'object' ? event.payload : {});
    let json = JSON.stringify(body);
    if (json.length > 50000) {
      json = JSON.stringify({
        _truncated: true,
        approx_bytes: json.length,
        preview: json.slice(0, 40000)
      });
    }

    await db.query(
      `INSERT INTO cognitive_drift_events (id, created_at, company_id, drift_type, severity, payload)
       VALUES ($1::uuid, NOW(), $2::uuid, $3, $4, $5::jsonb)`,
      [
        id,
        toUuidOrNull(event.companyId),
        String(event.drift_type).slice(0, 128),
        String(event.severity).slice(0, 32),
        json
      ]
    );
    try {
      console.log('[COGNITIVE_DRIFT_EVENT]', {
        id,
        drift_type: String(event.drift_type).slice(0, 64),
        severity: String(event.severity)
      });
    } catch (_e) {}
  } catch (err) {
    try {
      console.warn('[COGNITIVE_DRIFT_ERROR]', { op: 'persistDriftEventToDb', message: err?.message || err });
    } catch (_e) {}
  }
}

/**
 * @param {string} companyId
 * @param {number|string} [limit]
 */
/**
 * Métricas agregadas para governança cognitiva (tenant + totais globais onde aplicável).
 * @param {string} companyId — UUID empresa
 * @returns {Promise<object|null>}
 */
async function getTenantGovernanceHub(companyId) {
  if (!isCognitiveDbEnabled()) return null;
  const cid = toUuidOrNull(companyId);
  if (!cid) return null;

  try {
    const db = require('../db');
    const [intRes, driftRes, autoRes] = await Promise.all([
      db.query(
        `
        SELECT
          COUNT(*)::bigint AS cnt,
          AVG(
            CASE
              WHEN confidence IS NULL THEN NULL
              WHEN confidence::numeric <= 1 THEN confidence::numeric * 100
              ELSE confidence::numeric
            END
          ) AS avg_conf_pct,
          SUM(
            CASE
              WHEN confidence IS NULL THEN 0
              WHEN confidence::numeric <= 1 AND confidence::numeric < 0.5 THEN 1
              WHEN confidence::numeric > 1 AND confidence::numeric < 50 THEN 1
              ELSE 0
            END
          )::bigint AS low_cnt
        FROM cognitive_interactions
        WHERE company_id = $1::uuid
        `,
        [cid]
      ),
      db.query(
        `
        SELECT
          COUNT(*)::bigint AS recent_cnt,
          SUM(
            CASE
              WHEN LOWER(TRIM(severity)) IN ('high', 'critical') THEN 1
              ELSE 0
            END
          )::bigint AS high_cnt,
          MAX(created_at) AS last_at
        FROM cognitive_drift_events
        WHERE company_id = $1::uuid
          AND created_at >= NOW() - INTERVAL '30 days'
        `,
        [cid]
      ),
      db.query(`SELECT COUNT(*)::bigint AS c FROM cognitive_autonomous_events`)
    ]);

    const row = intRes.rows[0];
    const total = Number(row.cnt) || 0;
    const lowCnt = Number(row.low_cnt) || 0;
    const avgRaw = row.avg_conf_pct != null ? Number(row.avg_conf_pct) : null;
    const driftRow = driftRes.rows[0];

    return {
      interaction_count: total,
      avg_confidence_pct: avgRaw != null && Number.isFinite(avgRaw) ? Math.round(avgRaw) : null,
      low_confidence_rate: total > 0 ? lowCnt / total : 0,
      drift_recent_30d: Number(driftRow.recent_cnt) || 0,
      drift_high_30d: Number(driftRow.high_cnt) || 0,
      last_drift_at: driftRow.last_at ? new Date(driftRow.last_at).toISOString() : null,
      autonomous_events_total: Number(autoRes.rows[0].c) || 0
    };
  } catch (err) {
    try {
      console.warn('[GOVERNANCE_DASHBOARD_ERROR]', {
        op: 'getTenantGovernanceHub',
        message: err?.message || err
      });
    } catch (_e) {}
    return null;
  }
}

async function listDriftEventsForCompany(companyId, limit = 50) {
  if (!isCognitiveDbEnabled()) return [];
  const cid = toUuidOrNull(companyId);
  if (!cid) return [];
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  try {
    const db = require('../db');
    const r = await db.query(
      `SELECT id, created_at, company_id, drift_type, severity, payload
       FROM cognitive_drift_events
       WHERE company_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT $2`,
      [cid, lim]
    );
    return r.rows.map((row) => ({
      id: String(row.id),
      created_at: row.created_at,
      company_id: row.company_id != null ? String(row.company_id) : null,
      drift_type: row.drift_type,
      severity: row.severity,
      payload: truncatePayloadForAdmin(row.payload, 32000)
    }));
  } catch (err) {
    try {
      console.warn('[COGNITIVE_DRIFT_ERROR]', {
        op: 'listDriftEventsForCompany',
        message: err?.message || err
      });
    } catch (_e) {}
    return [];
  }
}

/**
 * Event store de consenso / divergência (observacional).
 * @param {{ id?: string, companyId?: string|null, consensus_score: number, divergence_detected: boolean, payload: object, createdAt?: string|number }} event
 */
async function persistConsensusEventToDb(event) {
  if (!isCognitiveDbEnabled()) return;
  let consensusSvc;
  try {
    consensusSvc = require('./cognitiveConsensusService');
  } catch (err) {
    try {
      console.warn('[COGNITIVE_CONSENSUS_ERROR]', {
        op: 'persistConsensusEventToDb',
        phase: 'load_service',
        message: err?.message || err
      });
    } catch (_e) {}
    return;
  }
  if (!consensusSvc.isConsensusEngineEnabled()) return;
  if (!event || event.consensus_score == null || event.divergence_detected == null) return;
  if (!event.payload || typeof event.payload !== 'object') return;

  try {
    const db = require('../db');
    const id =
      event.id != null && toUuidOrNull(String(event.id)) ? String(event.id).trim() : crypto.randomUUID();
    const ts =
      event.createdAt != null && String(event.createdAt).length > 0
        ? new Date(Number.isFinite(Number(event.createdAt)) ? Number(event.createdAt) : Date.parse(event.createdAt))
        : new Date();
    const createdIso = Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString();
    const body = safePayload(event.payload);
    let json = JSON.stringify(body);
    if (json.length > 50000) {
      json = JSON.stringify({
        _truncated: true,
        approx_bytes: json.length,
        preview: json.slice(0, 40000)
      });
    }
    const scoreRaw = Number(event.consensus_score);
    const score = Number.isFinite(scoreRaw) ? scoreRaw : 0;
    const div = event.divergence_detected === true;

    await db.query(
      `INSERT INTO cognitive_consensus_events (id, created_at, company_id, consensus_score, divergence_detected, payload)
       VALUES ($1::uuid, $2::timestamptz, $3::uuid, $4, $5, $6::jsonb)`,
      [id, createdIso, toUuidOrNull(event.companyId), score, div, json]
    );
    try {
      console.log('[COGNITIVE_CONSENSUS]', {
        table: 'cognitive_consensus_events',
        id,
        divergence_detected: div,
        consensus_score: score
      });
    } catch (_e) {}
  } catch (err) {
    try {
      console.warn('[COGNITIVE_CONSENSUS_ERROR]', {
        op: 'persistConsensusEventToDb',
        message: err?.message || err
      });
    } catch (_e) {}
  }
}

/**
 * Métricas para o painel de governança (último score, divergências recentes).
 * @param {string} companyId
 * @returns {Promise<{ consensus_score: number|null, divergence_events: number, last_divergence_at: string|null }|null>}
 */
async function getConsensusDashboardMetrics(companyId) {
  if (!isCognitiveDbEnabled()) return null;
  const cid = toUuidOrNull(companyId);
  if (!cid) return null;

  try {
    const db = require('../db');
    const r = await db.query(
      `
      SELECT
        (SELECT consensus_score::float8
         FROM cognitive_consensus_events
         WHERE company_id = $1::uuid
         ORDER BY created_at DESC
         LIMIT 1) AS latest_score,
        (SELECT COUNT(*)::bigint
         FROM cognitive_consensus_events
         WHERE company_id = $1::uuid
           AND divergence_detected = TRUE
           AND created_at >= NOW() - INTERVAL '30 days') AS div_cnt,
        (SELECT MAX(created_at)
         FROM cognitive_consensus_events
         WHERE company_id = $1::uuid
           AND divergence_detected = TRUE) AS last_div_at
      `,
      [cid]
    );
    const row = r.rows[0];
    const latest = row.latest_score != null ? Number(row.latest_score) : null;
    return {
      consensus_score: latest != null && Number.isFinite(latest) ? Math.round(latest) : null,
      divergence_events: Number(row.div_cnt) || 0,
      last_divergence_at: row.last_div_at ? new Date(row.last_div_at).toISOString() : null
    };
  } catch (err) {
    try {
      console.warn('[COGNITIVE_CONSENSUS_ERROR]', {
        op: 'getConsensusDashboardMetrics',
        message: err?.message || err
      });
    } catch (_e) {}
    return null;
  }
}

/**
 * @param {string} companyId
 * @param {number|string} [limit]
 */
async function listConsensusEventsForCompany(companyId, limit = 50) {
  if (!isCognitiveDbEnabled()) return [];
  const cid = toUuidOrNull(companyId);
  if (!cid) return [];
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  try {
    const db = require('../db');
    const r = await db.query(
      `SELECT id, created_at, company_id, consensus_score, divergence_detected, payload
       FROM cognitive_consensus_events
       WHERE company_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT $2`,
      [cid, lim]
    );
    return r.rows.map((row) => ({
      id: String(row.id),
      created_at: row.created_at,
      company_id: row.company_id != null ? String(row.company_id) : null,
      consensus_score:
        row.consensus_score != null ? Number(row.consensus_score) : null,
      divergence_detected: row.divergence_detected === true,
      payload: truncatePayloadForAdmin(row.payload, 32000)
    }));
  } catch (err) {
    try {
      console.warn('[COGNITIVE_CONSENSUS_ERROR]', {
        op: 'listConsensusEventsForCompany',
        message: err?.message || err
      });
    } catch (_e) {}
    return [];
  }
}

/**
 * Event store de calibração de confiança (observacional).
 * @param {{ id?: string, companyId?: string|null, calibrated_confidence: number, overconfidence: boolean, underconfidence: boolean, payload: object, createdAt?: string|number }} event
 */
async function persistCalibrationEventToDb(event) {
  if (!isCognitiveDbEnabled()) return;
  let calibrationSvc;
  try {
    calibrationSvc = require('./confidenceCalibrationService');
  } catch (err) {
    try {
      console.warn('[CONFIDENCE_CALIBRATION_ERROR]', {
        op: 'persistCalibrationEventToDb',
        phase: 'load_service',
        message: err?.message || err
      });
    } catch (_e) {}
    return;
  }
  if (!calibrationSvc.isConfidenceCalibrationEnabled()) return;
  if (
    !event ||
    event.calibrated_confidence == null ||
    event.overconfidence == null ||
    event.underconfidence == null
  ) {
    return;
  }
  if (!event.payload || typeof event.payload !== 'object') return;

  try {
    const db = require('../db');
    const id =
      event.id != null && toUuidOrNull(String(event.id)) ? String(event.id).trim() : crypto.randomUUID();
    const ts =
      event.createdAt != null && String(event.createdAt).length > 0
        ? new Date(Number.isFinite(Number(event.createdAt)) ? Number(event.createdAt) : Date.parse(event.createdAt))
        : new Date();
    const createdIso = Number.isNaN(ts.getTime()) ? new Date().toISOString() : ts.toISOString();
    const body = safePayload(event.payload);
    let json = JSON.stringify(body);
    if (json.length > 50000) {
      json = JSON.stringify({
        _truncated: true,
        approx_bytes: json.length,
        preview: json.slice(0, 40000)
      });
    }
    const calRaw = Number(event.calibrated_confidence);
    const calScore = Number.isFinite(calRaw) ? calRaw : 0;
    const overc = event.overconfidence === true;
    const underc = event.underconfidence === true;

    await db.query(
      `INSERT INTO cognitive_calibration_events (id, created_at, company_id, calibrated_confidence, overconfidence, underconfidence, payload)
       VALUES ($1::uuid, $2::timestamptz, $3::uuid, $4, $5, $6, $7::jsonb)`,
      [id, createdIso, toUuidOrNull(event.companyId), calScore, overc, underc, json]
    );
    try {
      console.log('[CONFIDENCE_CALIBRATION]', {
        table: 'cognitive_calibration_events',
        id,
        calibrated_confidence: calScore,
        overconfidence: overc,
        underconfidence: underc
      });
    } catch (_e) {}
  } catch (err) {
    try {
      console.warn('[CONFIDENCE_CALIBRATION_ERROR]', {
        op: 'persistCalibrationEventToDb',
        message: err?.message || err
      });
    } catch (_e) {}
  }
}

/**
 * @param {string} companyId
 * @returns {Promise<{ average_calibrated_confidence: number|null, overconfidence_events: number, underconfidence_events: number }|null>}
 */
async function getCalibrationDashboardMetrics(companyId) {
  if (!isCognitiveDbEnabled()) return null;
  const cid = toUuidOrNull(companyId);
  if (!cid) return null;

  try {
    const db = require('../db');
    const r = await db.query(
      `
      SELECT
        AVG(calibrated_confidence)::float8 AS avg_cal,
        SUM(CASE WHEN overconfidence = TRUE THEN 1 ELSE 0 END)::bigint AS over_cnt,
        SUM(CASE WHEN underconfidence = TRUE THEN 1 ELSE 0 END)::bigint AS under_cnt
      FROM cognitive_calibration_events
      WHERE company_id = $1::uuid
        AND created_at >= NOW() - INTERVAL '30 days'
      `,
      [cid]
    );
    const row = r.rows[0];
    const avgRaw = row.avg_cal != null ? Number(row.avg_cal) : null;
    return {
      average_calibrated_confidence:
        avgRaw != null && Number.isFinite(avgRaw) ? Math.round(avgRaw) : null,
      overconfidence_events: Number(row.over_cnt) || 0,
      underconfidence_events: Number(row.under_cnt) || 0
    };
  } catch (err) {
    try {
      console.warn('[CONFIDENCE_CALIBRATION_ERROR]', {
        op: 'getCalibrationDashboardMetrics',
        message: err?.message || err
      });
    } catch (_e) {}
    return null;
  }
}

/**
 * @param {string} companyId
 * @param {number|string} [limit]
 */
async function listCalibrationEventsForCompany(companyId, limit = 50) {
  if (!isCognitiveDbEnabled()) return [];
  const cid = toUuidOrNull(companyId);
  if (!cid) return [];
  const lim = Math.min(Math.max(parseInt(limit, 10) || 50, 1), 200);

  try {
    const db = require('../db');
    const q = await db.query(
      `SELECT id, created_at, company_id, calibrated_confidence, overconfidence, underconfidence, payload
       FROM cognitive_calibration_events
       WHERE company_id = $1::uuid
       ORDER BY created_at DESC
       LIMIT $2`,
      [cid, lim]
    );
    return q.rows.map((row) => ({
      id: String(row.id),
      created_at: row.created_at,
      company_id: row.company_id != null ? String(row.company_id) : null,
      calibrated_confidence:
        row.calibrated_confidence != null ? Number(row.calibrated_confidence) : null,
      overconfidence: row.overconfidence === true,
      underconfidence: row.underconfidence === true,
      payload: truncatePayloadForAdmin(row.payload, 32000)
    }));
  } catch (err) {
    try {
      console.warn('[CONFIDENCE_CALIBRATION_ERROR]', {
        op: 'listCalibrationEventsForCompany',
        message: err?.message || err
      });
    } catch (_e) {}
    return [];
  }
}

module.exports = {
  isCognitiveDbEnabled,
  persistInteractionToDb,
  persistProposalToDb,
  persistAutonomousEventToDb,
  persistDriftEventToDb,
  persistConsensusEventToDb,
  persistCalibrationEventToDb,
  getCognitiveDbSnapshot,
  getInteractionById,
  getCognitiveSnapshotAt,
  listDriftEventsForCompany,
  listConsensusEventsForCompany,
  listCalibrationEventsForCompany,
  getConsensusDashboardMetrics,
  getCalibrationDashboardMetrics,
  getTenantGovernanceHub,
  schedulePersistInteractionToDb,
  schedulePersistProposalToDb,
  schedulePersistAutonomousEventToDb
};
