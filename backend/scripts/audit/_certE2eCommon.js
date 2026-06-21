'use strict';

const fs = require('fs');
const path = require('path');
const http = require('http');

require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const db = require('../../src/db');
const auth = require('../../src/middleware/auth');
const { resolveDashboardProfile } = require('../../src/services/dashboardProfileResolver');

const HOST = '127.0.0.1';
const PORT = parseInt(process.env.PORT, 10) || 4000;

function httpJson(method, apiPath, token, body, extraHeaders = {}) {
  return new Promise((resolve) => {
    const payload = body ? JSON.stringify(body) : null;
    const req = http.request(
      {
        host: HOST,
        port: PORT,
        path: apiPath,
        method,
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          'Content-Type': 'application/json',
          ...(payload ? { 'Content-Length': Buffer.byteLength(payload) } : {}),
          ...extraHeaders
        },
        timeout: 25000
      },
      (res) => {
        let b = '';
        res.on('data', (d) => (b += d));
        res.on('end', () => {
          let json = null;
          try {
            json = JSON.parse(b);
          } catch {
            json = { raw: b.slice(0, 800) };
          }
          resolve({ status: res.statusCode, body: json });
        });
      }
    );
    req.on('error', (e) => resolve({ status: 0, body: { error: e.message } }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: -1, body: { error: 'timeout' } });
    });
    if (payload) req.write(payload);
    req.end();
  });
}

function evidenceDir(domain, scenario) {
  return path.join(__dirname, '../../docs/evidence', domain, scenario);
}

function writeEvidence(dir, name, data) {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, name), typeof data === 'string' ? data : JSON.stringify(data, null, 2), 'utf8');
}

async function createSession(userId, userAgent) {
  return auth.createSession(userId, HOST, userAgent, 1);
}

async function cleanupSessions(userAgent) {
  try {
    await db.query('DELETE FROM sessions WHERE user_agent = $1', [userAgent]);
  } catch (_) {}
}

async function pickUser(roles, companyId = null) {
  const params = [roles];
  let sql = `
    SELECT u.id, u.name, u.role, u.company_id, u.job_title, u.functional_area, u.hierarchy_level
    FROM users u JOIN companies c ON c.id = u.company_id
    WHERE u.role = ANY($1::text[]) AND u.deleted_at IS NULL AND u.active IS NOT FALSE AND c.active = true
  `;
  if (companyId) {
    sql += ' AND u.company_id = $2';
    params.push(companyId);
  }
  sql += ' ORDER BY u.created_at DESC LIMIT 1';
  const r = await db.query(sql, params);
  return r.rows[0] || null;
}

async function pickMaintenanceUser(companyId = null) {
  const r = await db.query(
    `
    SELECT u.id, u.name, u.role, u.company_id, u.job_title, u.functional_area, u.hierarchy_level
    FROM users u JOIN companies c ON c.id = u.company_id
    WHERE u.deleted_at IS NULL AND u.active IS NOT FALSE AND c.active = true
      ${companyId ? 'AND u.company_id = $1' : ''}
    ORDER BY u.created_at DESC
    LIMIT 200
    `,
    companyId ? [companyId] : []
  );
  for (const u of r.rows) {
    const profile = resolveDashboardProfile(u);
    const p = String(profile || '');
    if (
      /maintenance|manutenc/i.test(p) ||
      /maintenance|manutenc|mecanic|pcm/i.test(String(u.job_title || '')) ||
      /maintenance|manutenc/i.test(String(u.functional_area || ''))
    ) {
      return { ...u, dashboard_profile: profile };
    }
  }
  return null;
}

async function pickOtherTenant(companyId) {
  const r = await db.query(
    `
    SELECT u.id, u.name, u.company_id FROM users u
    WHERE u.company_id <> $1 AND u.deleted_at IS NULL AND u.active IS NOT FALSE
      AND u.role IN ('gerente','admin','supervisor','diretor') LIMIT 1
    `,
    [companyId]
  );
  return r.rows[0] || null;
}

function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function tenantIsolationList(tokenOther, ids, listPath = '/api/dashboard/operational-brain/alerts?limit=50') {
  const leak = await httpJson('GET', listPath, tokenOther);
  const otherIds = (leak.body?.alerts || leak.body?.requests || []).map((a) => String(a.id));
  return {
    tested: true,
    ok: !ids.some((id) => otherIds.includes(String(id))),
    other_status: leak.status,
    leaked: ids.filter((id) => otherIds.includes(String(id)))
  };
}

module.exports = {
  HOST,
  PORT,
  db,
  httpJson,
  evidenceDir,
  writeEvidence,
  createSession,
  cleanupSessions,
  pickUser,
  pickMaintenanceUser,
  pickOtherTenant,
  sleep,
  tenantIsolationList,
  resolveDashboardProfile
};
