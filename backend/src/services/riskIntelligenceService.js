'use strict';

/**
 * AI Risk Intelligence — scores dinâmicos (sem persistência obrigatória), cache TTL, isolamento multi-tenant.
 * Scores e reputação NÃO devem ser expostos a utilizadores finais; apenas admin Impetus.
 */

const db = require('../db');

const TTL_MS = Math.min(
  600000,
  Math.max(15000, parseInt(process.env.ADAPTIVE_RISK_CACHE_TTL_MS || '90000', 10))
);

/** @type {Map<string, { exp: number, value: unknown }>} */
const cache = new Map();

function cacheGet(key) {
  const row = cache.get(key);
  if (!row) return undefined;
  if (Date.now() > row.exp) {
    cache.delete(key);
    return undefined;
  }
  return row.value;
}

function cacheSet(key, value) {
  cache.set(key, { exp: Date.now() + TTL_MS, value });
}

function invalidateTenantKeys(companyId, userId = null) {
  if (!companyId) return;
  cache.delete(`co:${companyId}`);
  if (userId) cache.delete(`u:${companyId}:${userId}`);
  for (const k of cache.keys()) {
    if (k.startsWith(`u:${companyId}:`)) cache.delete(k);
  }
}

function severityNumeric(s) {
  switch (String(s || '').toUpperCase()) {
    case 'CRITICAL':
      return 4;
    case 'HIGH':
      return 3;
    case 'MEDIUM':
      return 2;
    default:
      return 1;
  }
}

function clampScore(n) {
  return Math.max(0, Math.min(100, Math.round(n * 10) / 10));
}

/**
 * @param {object} m
 * @returns {number}
 */
function computeUserRiskScoreFromMetrics(m) {
  const inc = m.incidents_30d || 0;
  const avgSev = m.avg_severity_numeric != null ? Number(m.avg_severity_numeric) : 1;
  const inv = m.invasions_30d || 0;
  const comp = m.compliance_incidents_30d || 0;
  const pol = m.policy_violations_30d || 0;
  const rej = m.hitl_rejected_30d || 0;
  const acc = m.hitl_accepted_30d || 0;
  const traces = m.traces_30d || 0;

  let score = 0;
  score += Math.min(inc * 7, 38);
  score += Math.max(0, avgSev - 1) * 9;
  score += Math.min(inv * 28, 55);
  score += Math.min(comp * 12, 30);
  score += Math.min(pol * 8, 24);
  const decided = rej + acc;
  if (decided > 0) score += (rej / decided) * 28;
  if (traces > 800) score += 12;
  else if (traces > 400) score += 7;
  else if (traces > 150) score += 3;

  return clampScore(score);
}

/**
 * @param {object} m
 * @param {number} avgUserTension 0–100 proxy médio
 */
function computeCompanyRiskScoreFromMetrics(m, avgUserTension) {
  const inc = m.incidents_30d || 0;
  const crit = m.critical_30d || 0;
  const burst = m.high_burst_24h ? 1 : 0;
  const comp = m.compliance_incidents_30d || 0;
  const pol = m.policy_violations_30d || 0;

  let score = 0;
  score += Math.min(inc * 3, 32);
  score += Math.min(crit * 14, 42);
  score += burst * 22;
  score += Math.min(comp * 6, 22);
  score += Math.min(pol * 5, 18);
  score += Math.min(avgUserTension * 0.35, 28);
  return clampScore(score);
}

function trustLevelFromScore(score) {
  const s = Number(score) || 0;
  if (s <= 30) return 'trusted';
  if (s <= 60) return 'normal';
  if (s <= 80) return 'risky';
  return 'blocked';
}

function riskBandFromScore(score) {
  const s = Number(score) || 0;
  if (s <= 30) return 'LOW';
  if (s <= 60) return 'MEDIUM';
  if (s <= 80) return 'HIGH';
  return 'CRITICAL';
}

async function fetchUserMetrics(companyId, userId) {
  const r = await db.query(
    `
    SELECT
      (SELECT count(*)::int FROM ai_incidents
        WHERE user_id = $2 AND company_id = $1
          AND created_at >= now() - interval '30 days') AS incidents_30d,
      (SELECT avg((CASE severity
        WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END))::float
        FROM ai_incidents
        WHERE user_id = $2 AND company_id = $1
          AND created_at >= now() - interval '30 days') AS avg_severity_numeric,
      (SELECT count(*)::int FROM ai_incidents
        WHERE user_id = $2 AND company_id = $1
          AND incident_type = 'TENTATIVA_DE_INVASAO'
          AND created_at >= now() - interval '30 days') AS invasions_30d,
      (SELECT count(*)::int FROM ai_incidents
        WHERE user_id = $2 AND company_id = $1
          AND incident_type = 'COMPLIANCE_RISK'
          AND created_at >= now() - interval '30 days') AS compliance_incidents_30d,
      (SELECT count(*)::int FROM ai_incidents
        WHERE user_id = $2 AND company_id = $1
          AND incident_type = 'POLICY_VIOLATION'
          AND created_at >= now() - interval '30 days') AS policy_violations_30d,
      (SELECT count(*) FILTER (WHERE human_validation_status = 'REJECTED')::int
        FROM ai_interaction_traces
        WHERE user_id = $2 AND company_id = $1
          AND created_at >= now() - interval '30 days') AS hitl_rejected_30d,
      (SELECT count(*) FILTER (WHERE human_validation_status = 'ACCEPTED')::int
        FROM ai_interaction_traces
        WHERE user_id = $2 AND company_id = $1
          AND created_at >= now() - interval '30 days') AS hitl_accepted_30d,
      (SELECT count(*)::int FROM ai_interaction_traces
        WHERE user_id = $2 AND company_id = $1
          AND created_at >= now() - interval '30 days') AS traces_30d,
      (SELECT max(created_at) FROM ai_incidents
        WHERE user_id = $2 AND company_id = $1) AS last_incident_at
    `,
    [companyId, userId]
  );
  return r.rows[0] || {};
}

/**
 * Métricas para vários pares (company_id, user_id) numa única ida ao PostgreSQL.
 * @param {{ company_id: string, user_id: string }[]} pairList — sem duplicados recomendado
 */
async function fetchUserMetricsBatch(pairList) {
  if (!pairList.length) return [];
  const valueSlots = pairList
    .map((_, i) => {
      const o = i * 2;
      return `($${o + 1}::uuid, $${o + 2}::uuid)`;
    })
    .join(', ');
  const params = pairList.flatMap((p) => [p.company_id, p.user_id]);
  const r = await db.query(
    `
    WITH pairs AS (
      SELECT * FROM (VALUES ${valueSlots}) AS v(company_id, user_id)
    ),
    inc_agg AS (
      SELECT
        i.company_id,
        i.user_id,
        count(*) FILTER (WHERE i.created_at >= now() - interval '30 days')::int AS incidents_30d,
        avg((CASE i.severity
          WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END))
          FILTER (WHERE i.created_at >= now() - interval '30 days')::float AS avg_severity_numeric,
        count(*) FILTER (
          WHERE i.created_at >= now() - interval '30 days'
            AND i.incident_type = 'TENTATIVA_DE_INVASAO')::int AS invasions_30d,
        count(*) FILTER (
          WHERE i.created_at >= now() - interval '30 days'
            AND i.incident_type = 'COMPLIANCE_RISK')::int AS compliance_incidents_30d,
        count(*) FILTER (
          WHERE i.created_at >= now() - interval '30 days'
            AND i.incident_type = 'POLICY_VIOLATION')::int AS policy_violations_30d,
        max(i.created_at) AS last_incident_at
      FROM ai_incidents i
      INNER JOIN pairs p ON i.company_id = p.company_id AND i.user_id = p.user_id
      GROUP BY i.company_id, i.user_id
    ),
    tr_agg AS (
      SELECT
        t.company_id,
        t.user_id,
        count(*) FILTER (
          WHERE t.created_at >= now() - interval '30 days'
            AND t.human_validation_status = 'REJECTED')::int AS hitl_rejected_30d,
        count(*) FILTER (
          WHERE t.created_at >= now() - interval '30 days'
            AND t.human_validation_status = 'ACCEPTED')::int AS hitl_accepted_30d,
        count(*) FILTER (WHERE t.created_at >= now() - interval '30 days')::int AS traces_30d
      FROM ai_interaction_traces t
      INNER JOIN pairs p ON t.company_id = p.company_id AND t.user_id = p.user_id
      GROUP BY t.company_id, t.user_id
    )
    SELECT
      p.company_id,
      p.user_id,
      coalesce(ia.incidents_30d, 0) AS incidents_30d,
      ia.avg_severity_numeric,
      coalesce(ia.invasions_30d, 0) AS invasions_30d,
      coalesce(ia.compliance_incidents_30d, 0) AS compliance_incidents_30d,
      coalesce(ia.policy_violations_30d, 0) AS policy_violations_30d,
      ia.last_incident_at,
      coalesce(ta.hitl_rejected_30d, 0) AS hitl_rejected_30d,
      coalesce(ta.hitl_accepted_30d, 0) AS hitl_accepted_30d,
      coalesce(ta.traces_30d, 0) AS traces_30d
    FROM pairs p
    LEFT JOIN inc_agg ia ON ia.company_id = p.company_id AND ia.user_id = p.user_id
    LEFT JOIN tr_agg ta ON ta.company_id = p.company_id AND ta.user_id = p.user_id
    `,
    params
  );
  return r.rows;
}

async function fetchCompanyMetrics(companyId) {
  const r = await db.query(
    `
    SELECT
      (SELECT count(*)::int FROM ai_incidents
        WHERE company_id = $1
          AND created_at >= now() - interval '30 days') AS incidents_30d,
      (SELECT count(*)::int FROM ai_incidents
        WHERE company_id = $1 AND severity = 'CRITICAL'
          AND created_at >= now() - interval '30 days') AS critical_30d,
      (SELECT count(*)::int FROM ai_incidents
        WHERE company_id = $1 AND severity = 'HIGH'
          AND created_at >= now() - interval '24 hours') AS high_24h,
      (SELECT count(*)::int FROM ai_incidents
        WHERE company_id = $1
          AND incident_type = 'COMPLIANCE_RISK'
          AND created_at >= now() - interval '30 days') AS compliance_incidents_30d,
      (SELECT count(*)::int FROM ai_incidents
        WHERE company_id = $1
          AND incident_type = 'POLICY_VIOLATION'
          AND created_at >= now() - interval '30 days') AS policy_violations_30d,
      (SELECT coalesce(avg(least(uc * 14, 85)), 0)::float FROM (
        SELECT count(*)::int AS uc FROM ai_incidents
        WHERE company_id = $1
          AND created_at >= now() - interval '30 days'
        GROUP BY user_id
      ) u) AS user_tension_proxy,
      (SELECT max(created_at) FROM ai_incidents WHERE company_id = $1) AS last_incident_at
    `,
    [companyId]
  );
  const row = r.rows[0] || {};
  const high24 = row.high_24h || 0;
  row.high_burst_24h = high24 >= 3;
  return row;
}

/**
 * Métricas de risco por empresa (mesma semântica que fetchCompanyMetrics) numa única consulta.
 * @param {string[]} companyIds — UUIDs; serão deduplicados pelo caller se necessário
 */
async function fetchCompanyMetricsBatch(companyIds) {
  if (!companyIds.length) return [];
  const valueSlots = companyIds.map((_, i) => `($${i + 1}::uuid)`).join(', ');
  const r = await db.query(
    `
    WITH companies AS (
      SELECT * FROM (VALUES ${valueSlots}) AS v(company_id)
    ),
    inc_agg AS (
      SELECT
        i.company_id,
        count(*) FILTER (WHERE i.created_at >= now() - interval '30 days')::int AS incidents_30d,
        count(*) FILTER (
          WHERE i.created_at >= now() - interval '30 days' AND i.severity = 'CRITICAL'
        )::int AS critical_30d,
        count(*) FILTER (
          WHERE i.created_at >= now() - interval '24 hours' AND i.severity = 'HIGH'
        )::int AS high_24h,
        count(*) FILTER (
          WHERE i.created_at >= now() - interval '30 days'
            AND i.incident_type = 'COMPLIANCE_RISK'
        )::int AS compliance_incidents_30d,
        count(*) FILTER (
          WHERE i.created_at >= now() - interval '30 days'
            AND i.incident_type = 'POLICY_VIOLATION'
        )::int AS policy_violations_30d,
        max(i.created_at) AS last_incident_at
      FROM ai_incidents i
      INNER JOIN companies c ON i.company_id = c.company_id
      GROUP BY i.company_id
    ),
    tension AS (
      SELECT
        u.company_id,
        coalesce(avg(least(u.uc * 14, 85)), 0)::float AS user_tension_proxy
      FROM (
        SELECT
          i.company_id,
          count(*)::int AS uc
        FROM ai_incidents i
        INNER JOIN companies c ON i.company_id = c.company_id
        WHERE i.created_at >= now() - interval '30 days'
        GROUP BY i.company_id, i.user_id
      ) u
      GROUP BY u.company_id
    )
    SELECT
      c.company_id,
      coalesce(ia.incidents_30d, 0) AS incidents_30d,
      coalesce(ia.critical_30d, 0) AS critical_30d,
      coalesce(ia.high_24h, 0) AS high_24h,
      coalesce(ia.compliance_incidents_30d, 0) AS compliance_incidents_30d,
      coalesce(ia.policy_violations_30d, 0) AS policy_violations_30d,
      ia.last_incident_at,
      coalesce(t.user_tension_proxy, 0)::float AS user_tension_proxy
    FROM companies c
    LEFT JOIN inc_agg ia ON ia.company_id = c.company_id
    LEFT JOIN tension t ON t.company_id = c.company_id
    `,
    companyIds
  );
  return r.rows.map((row) => {
    const high24 = row.high_24h || 0;
    return {
      ...row,
      high_burst_24h: high24 >= 3
    };
  });
}

async function getUserRiskBundle(companyId, userId) {
  if (!companyId || !userId) {
    return {
      user_risk_score: 0,
      user_reputation: {
        trust_level: 'trusted',
        history_score: 100,
        last_incident_at: null
      },
      metrics: {}
    };
  }
  const key = `u:${companyId}:${userId}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const metrics = await fetchUserMetrics(companyId, userId);
  const user_risk_score = computeUserRiskScoreFromMetrics(metrics);
  const bundle = {
    user_risk_score,
    user_reputation: {
      trust_level: trustLevelFromScore(user_risk_score),
      history_score: clampScore(100 - user_risk_score),
      last_incident_at: metrics.last_incident_at || null
    },
    metrics: {
      incidents_30d: metrics.incidents_30d,
      avg_severity_numeric: metrics.avg_severity_numeric,
      invasions_30d: metrics.invasions_30d,
      hitl_rejected_30d: metrics.hitl_rejected_30d,
      hitl_accepted_30d: metrics.hitl_accepted_30d,
      traces_30d: metrics.traces_30d
    }
  };
  cacheSet(key, bundle);
  return bundle;
}

/**
 * Vários bundles de risco por utilizador com 1 consulta agregada (+ cache TTL existente).
 * @param {{ company_id: string, user_id: string }[]} pairs
 * @returns {Promise<Map<string, object>>} chave `${company_id}:${user_id}` → mesmo formato que getUserRiskBundle
 */
async function getUserRiskBundlesBatch(pairs) {
  const out = new Map();
  if (!pairs?.length) return out;

  const dedup = new Map();
  for (const raw of pairs) {
    const companyId = raw?.company_id;
    const userId = raw?.user_id;
    if (!companyId || !userId) continue;
    const mapKey = `${companyId}:${userId}`;
    if (!dedup.has(mapKey)) dedup.set(mapKey, { company_id: companyId, user_id: userId });
  }
  const list = [...dedup.values()];
  if (!list.length) return out;

  const needFetch = [];
  for (const p of list) {
    const mapKey = `${p.company_id}:${p.user_id}`;
    const ck = `u:${p.company_id}:${p.user_id}`;
    const hit = cacheGet(ck);
    if (hit) out.set(mapKey, hit);
    else needFetch.push(p);
  }

  if (needFetch.length) {
    const rows = await fetchUserMetricsBatch(needFetch);
    for (const row of rows) {
      const metrics = {
        incidents_30d: row.incidents_30d,
        avg_severity_numeric: row.avg_severity_numeric,
        invasions_30d: row.invasions_30d,
        compliance_incidents_30d: row.compliance_incidents_30d,
        policy_violations_30d: row.policy_violations_30d,
        hitl_rejected_30d: row.hitl_rejected_30d,
        hitl_accepted_30d: row.hitl_accepted_30d,
        traces_30d: row.traces_30d,
        last_incident_at: row.last_incident_at
      };
      const user_risk_score = computeUserRiskScoreFromMetrics(metrics);
      const bundle = {
        user_risk_score,
        user_reputation: {
          trust_level: trustLevelFromScore(user_risk_score),
          history_score: clampScore(100 - user_risk_score),
          last_incident_at: metrics.last_incident_at || null
        },
        metrics: {
          incidents_30d: metrics.incidents_30d,
          avg_severity_numeric: metrics.avg_severity_numeric,
          invasions_30d: metrics.invasions_30d,
          hitl_rejected_30d: metrics.hitl_rejected_30d,
          hitl_accepted_30d: metrics.hitl_accepted_30d,
          traces_30d: metrics.traces_30d
        }
      };
      const mapKey = `${row.company_id}:${row.user_id}`;
      cacheSet(`u:${row.company_id}:${row.user_id}`, bundle);
      out.set(mapKey, bundle);
    }
  }

  return out;
}

async function getCompanyRiskBundle(companyId) {
  if (!companyId) {
    return {
      company_risk_score: 0,
      company_reputation: {
        trust_level: 'trusted',
        history_score: 100,
        last_incident_at: null
      },
      metrics: {}
    };
  }
  const key = `co:${companyId}`;
  const hit = cacheGet(key);
  if (hit) return hit;

  const metrics = await fetchCompanyMetrics(companyId);
  const avgTension = Number(metrics.user_tension_proxy) || 0;
  const company_risk_score = computeCompanyRiskScoreFromMetrics(metrics, avgTension);
  const bundle = {
    company_risk_score,
    company_reputation: {
      trust_level: trustLevelFromScore(company_risk_score),
      history_score: clampScore(100 - company_risk_score),
      last_incident_at: metrics.last_incident_at || null
    },
    metrics: {
      incidents_30d: metrics.incidents_30d,
      critical_30d: metrics.critical_30d,
      high_burst_24h: metrics.high_burst_24h,
      high_24h: metrics.high_24h
    }
  };
  cacheSet(key, bundle);
  return bundle;
}

/**
 * Vários bundles de risco por empresa com 1 consulta agregada (+ cache TTL existente).
 * @param {string[]} companyIds
 * @returns {Promise<Map<string, object>>} chave company_id (uuid) → mesmo formato que getCompanyRiskBundle
 */
async function getCompanyRiskBundlesBatch(companyIds) {
  const out = new Map();
  if (!companyIds?.length) return out;

  const dedup = [...new Set(companyIds.filter(Boolean).map((id) => String(id)))];
  if (!dedup.length) return out;

  const needFetch = [];
  for (const companyId of dedup) {
    const idKey = String(companyId);
    const ck = `co:${idKey}`;
    const hit = cacheGet(ck);
    if (hit) out.set(idKey, hit);
    else needFetch.push(idKey);
  }

  if (needFetch.length) {
    const rows = await fetchCompanyMetricsBatch(needFetch);
    for (const row of rows) {
      const cid = row.company_id;
      if (!cid) continue;
      const metrics = {
        incidents_30d: row.incidents_30d,
        critical_30d: row.critical_30d,
        high_24h: row.high_24h,
        high_burst_24h: row.high_burst_24h,
        compliance_incidents_30d: row.compliance_incidents_30d,
        policy_violations_30d: row.policy_violations_30d,
        user_tension_proxy: row.user_tension_proxy,
        last_incident_at: row.last_incident_at
      };
      const avgTension = Number(metrics.user_tension_proxy) || 0;
      const company_risk_score = computeCompanyRiskScoreFromMetrics(metrics, avgTension);
      const bundle = {
        company_risk_score,
        company_reputation: {
          trust_level: trustLevelFromScore(company_risk_score),
          history_score: clampScore(100 - company_risk_score),
          last_incident_at: metrics.last_incident_at || null
        },
        metrics: {
          incidents_30d: metrics.incidents_30d,
          critical_30d: metrics.critical_30d,
          high_burst_24h: metrics.high_burst_24h,
          high_24h: metrics.high_24h
        }
      };
      const idKey = String(cid);
      cacheSet(`co:${idKey}`, bundle);
      out.set(idKey, bundle);
    }
  }

  return out;
}

async function getTopRiskUsers(limit = 25) {
  const lim = Math.min(80, Math.max(5, parseInt(limit, 10) || 25));
  const r = await db.query(
    `
    SELECT i.user_id, i.company_id,
           count(*)::int AS incident_cnt,
           max(i.created_at) AS last_at,
           u.name AS user_name,
           u.email AS user_email
    FROM ai_incidents i
    LEFT JOIN users u ON u.id = i.user_id
    WHERE i.created_at >= now() - interval '90 days'
      AND i.user_id IS NOT NULL
    GROUP BY i.user_id, i.company_id, u.name, u.email
    ORDER BY incident_cnt DESC, last_at DESC
    LIMIT $1
    `,
    [lim * 2]
  );
  const pairList = r.rows.map((row) => ({ company_id: row.company_id, user_id: row.user_id }));
  const bundleMap = await getUserRiskBundlesBatch(pairList);
  const scored = [];
  for (const row of r.rows) {
    const b = bundleMap.get(`${row.company_id}:${row.user_id}`) || {
      user_risk_score: 0,
      user_reputation: {
        trust_level: 'trusted',
        history_score: 100,
        last_incident_at: null
      }
    };
    scored.push({
      user_id: row.user_id,
      company_id: row.company_id,
      user_name: row.user_name,
      user_email: row.user_email,
      user_risk_score: b.user_risk_score,
      user_reputation: b.user_reputation,
      incidents_90d_sample: row.incident_cnt,
      last_incident_at: row.last_at
    });
  }
  scored.sort((a, b) => b.user_risk_score - a.user_risk_score);
  return scored.slice(0, lim);
}

async function getTopRiskCompanies(limit = 25) {
  const lim = Math.min(80, Math.max(5, parseInt(limit, 10) || 25));
  const r = await db.query(
    `
    SELECT i.company_id,
           count(*)::int AS incident_cnt,
           count(*) FILTER (WHERE i.severity = 'CRITICAL')::int AS critical_cnt,
           max(i.created_at) AS last_at,
           COALESCE(c.name, c.razao_social, i.company_id::text) AS company_name
    FROM ai_incidents i
    LEFT JOIN companies c ON c.id = i.company_id
    WHERE i.created_at >= now() - interval '90 days'
    GROUP BY i.company_id, c.name, c.razao_social
    ORDER BY critical_cnt DESC, incident_cnt DESC
    LIMIT $1
    `,
    [lim * 2]
  );
  const idList = r.rows.map((row) => row.company_id);
  const bundleMap = await getCompanyRiskBundlesBatch(idList);
  const defaultCo = {
    company_risk_score: 0,
    company_reputation: {
      trust_level: 'trusted',
      history_score: 100,
      last_incident_at: null
    }
  };
  const scored = [];
  for (const row of r.rows) {
    const b = bundleMap.get(String(row.company_id)) || defaultCo;
    scored.push({
      company_id: row.company_id,
      company_name: row.company_name,
      company_risk_score: b.company_risk_score,
      company_reputation: b.company_reputation,
      incidents_90d_sample: row.incident_cnt,
      critical_90d_sample: row.critical_cnt,
      last_incident_at: row.last_at
    });
  }
  scored.sort((a, b) => b.company_risk_score - a.company_risk_score);
  return scored.slice(0, lim);
}

async function getRiskTimeseries(days = 90) {
  const d = Math.min(730, Math.max(14, parseInt(days, 10) || 90));
  const r = await db.query(
    `
    SELECT
      date_trunc('week', created_at AT TIME ZONE 'UTC')::date AS week_start,
      count(*)::int AS incidents,
      avg((CASE severity
        WHEN 'CRITICAL' THEN 4 WHEN 'HIGH' THEN 3 WHEN 'MEDIUM' THEN 2 ELSE 1 END))::float AS avg_severity_numeric
    FROM ai_incidents
    WHERE created_at >= now() - ($1::int * interval '1 day')
    GROUP BY 1
    ORDER BY 1 ASC
    `,
    [d]
  );
  return r.rows.map((row) => ({
    week_start: row.week_start,
    incidents: row.incidents,
    avg_severity_numeric: row.avg_severity_numeric,
    /** Proxy de “risco agregado” sem persistir scores históricos. */
    risk_pressure_proxy: clampScore(
      row.incidents * 2.2 + Math.max(0, (row.avg_severity_numeric || 1) - 1) * 12
    )
  }));
}

async function getRiskOverview() {
  const [topUsers, topCompanies, series] = await Promise.all([
    getTopRiskUsers(20),
    getTopRiskCompanies(20),
    getRiskTimeseries(90)
  ]);
  return {
    generated_at: new Date().toISOString(),
    cache_ttl_ms: TTL_MS,
    top_users: topUsers,
    top_companies: topCompanies,
    timeseries: series
  };
}

module.exports = {
  TTL_MS,
  cacheGet,
  cacheSet,
  invalidateTenantKeys,
  severityNumeric,
  computeUserRiskScoreFromMetrics,
  computeCompanyRiskScoreFromMetrics,
  trustLevelFromScore,
  riskBandFromScore,
  fetchUserMetrics,
  fetchCompanyMetrics,
  fetchCompanyMetricsBatch,
  getUserRiskBundle,
  getUserRiskBundlesBatch,
  getCompanyRiskBundle,
  getCompanyRiskBundlesBatch,
  getTopRiskUsers,
  getTopRiskCompanies,
  getRiskTimeseries,
  getRiskOverview
};
