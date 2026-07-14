#!/usr/bin/env node
'use strict';

/**
 * IMPETUS-SEC-ANTI-RECON-005 — validação operacional go-live.
 * Não altera scorePolicy, thresholds ou pesos.
 * node backend/scripts/sec005-go-live-validation.js [--phase=pre|post|probes]
 */

const fs = require('fs');
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');

require('../src/config/loadEnv').loadImpetusEnv();

const BASE = 'http://127.0.0.1:4000';
const EVIDENCE_DIR = path.join(__dirname, '../docs/evidence/sec-anti-recon-005');
const phase = (process.argv.find((a) => a.startsWith('--phase=')) || '--phase=full').split('=')[1];

function httpReq(method, urlPath, opts = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(urlPath, BASE);
    const headers = { ...(opts.headers || {}) };
    if (opts.body) headers['Content-Type'] = 'application/json';
    const req = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: data.slice(0, 500),
            json: (() => { try { return JSON.parse(data); } catch { return null; } })()
          });
        });
      }
    );
    req.on('error', reject);
    req.setTimeout(opts.timeout || 15000, () => req.destroy(new Error('timeout')));
    if (opts.body) req.write(JSON.stringify(opts.body));
    req.end();
  });
}

async function pm2Snapshot() {
  const { execSync } = require('child_process');
  try {
    const list = JSON.parse(execSync('pm2 jlist', { encoding: 'utf8' }));
    const be = list.find((p) => p.name === 'impetus-backend');
    return {
      name: be?.name,
      pid: be?.pid,
      status: be?.pm2_env?.status,
      restart_time: be?.pm2_env?.restart_time,
      uptime: be?.pm2_env?.pm_uptime,
      exec_mode: be?.pm2_env?.exec_mode,
      instances: be?.pm2_env?.instances,
      heapUsedMiB: be?.monit?.memory ? +(be.monit.memory / 1024 / 1024).toFixed(2) : null,
      cpu: be?.monit?.cpu
    };
  } catch (e) {
    return { error: e.message };
  }
}

async function runtimeFlags() {
  delete require.cache[require.resolve('../src/securityRecon/config/securityReconFlags')];
  const flags = require('../src/securityRecon/config/securityReconFlags');
  const sec01 = require('../src/securityObservatory');
  const db = require('../src/db');
  const pool = db.pool || db;
  return {
    SECURITY_RECON_CORRELATION: flags.isSecurityReconCorrelationEnabled(),
    SECURITY_RECON_CONTAINMENT: flags.reconContainmentEnabled(),
    SECURITY_OBSERVATORY: sec01.isEnabled?.() ?? false,
    dbPool: {
      totalCount: pool.totalCount ?? 'NOT_OBSERVABLE',
      idleCount: pool.idleCount ?? 'NOT_OBSERVABLE',
      waitingCount: pool.waitingCount ?? 'NOT_OBSERVABLE'
    },
    mem: process.memoryUsage()
  };
}

async function buildTestJwt() {
  const db = require('../src/db');
  const { JWT_SECRET, JWT_ALGORITHMS } = require('../src/middleware/auth');
  const r = await db.query(
    `SELECT id, company_id FROM users WHERE active=true AND deleted_at IS NULL ORDER BY created_at ASC LIMIT 1`
  );
  const u = r.rows[0];
  if (!u) throw new Error('no active user for smoke JWT');
  const token = jwt.sign({ id: u.id, company_id: u.company_id }, JWT_SECRET, {
    algorithm: 'HS256',
    expiresIn: '15m'
  });
  return { token, userId: u.id, companyId: u.company_id };
}

async function buildAdminJwt() {
  const { signAdminToken, loadAdminById } = require('../src/middleware/adminPortalAuth');
  const db = require('../src/db');
  const r = await db.query(
    `SELECT id FROM admin_users WHERE ativo=true AND perfil='super_admin' LIMIT 1`
  );
  const admin = await loadAdminById(r.rows[0].id);
  return signAdminToken(admin);
}

async function captureSnapshot(label) {
  const { execSync } = require('child_process');
  let commit = 'NO_GIT';
  try { commit = execSync('git -C .. rev-parse HEAD', { encoding: 'utf8' }).trim(); } catch (_e) { /* */ }
  return {
    label,
    timestamp: new Date().toISOString(),
    commit,
    pm2: await pm2Snapshot(),
    runtime: await runtimeFlags(),
    disk: (() => {
      try {
        return execSync("df -h / | tail -1", { encoding: 'utf8' }).trim();
      } catch { return 'NOT_OBSERVABLE'; }
    })()
  };
}

async function smokeTests() {
  const out = {};
  out.health = await httpReq('GET', '/api/health');

  const { token } = await buildTestJwt();
  out.loginPath = await httpReq('POST', '/api/auth/login', {
    body: { email: 'invalid@impetus-sec005.test', password: 'invalid' }
  });
  out.authMe = await httpReq('GET', '/api/companies/me', {
    headers: { Authorization: `Bearer ${token}` }
  });

  const bootPaths = [
    '/api/dashboard/me',
    '/api/dashboard/visibility',
    '/api/companies/me',
    '/api/health'
  ];
  out.bootApp = [];
  for (let i = 0; i < 22; i++) {
    const p = bootPaths[i % bootPaths.length];
    const r = await httpReq('GET', p, { headers: { Authorization: `Bearer ${token}` } });
    out.bootApp.push({ path: p, status: r.status, blocked: r.status === 404 && r.json?.error === 'Not found' });
  }

  const adminToken = await buildAdminJwt();
  out.adminSecurityDashboard = await httpReq('GET', '/api/impetus-admin/security-dashboard/', {
    headers: { Authorization: `Bearer ${adminToken}` }
  });

  const edgeId = process.env.IMPETUS_EDGE_AGENT_ID || 'impetus-lab-edge-01';
  const companyId = process.env.IMPETUS_EDGE_AGENT_COMPANY_ID || '21dd3cee-2efa-4936-908f-9ff1ba04e2a3';
  const edgeToken = process.env.IMPETUS_EDGE_AGENT_TOKEN;
  out.edgeIngestInvalid = await httpReq('POST', '/api/integrations/edge/ingest', {
    body: { edge_id: edgeId, company_id: companyId, token: 'invalid-token-sec005', readings: [] }
  });
  if (edgeToken) {
    out.edgeIngestValid = await httpReq('POST', '/api/integrations/edge/ingest', {
      body: { edge_id: edgeId, company_id: companyId, token: edgeToken, readings: [] }
    });
    if (out.edgeIngestValid.json) delete out.edgeIngestValid.json;
  } else {
    out.edgeIngestValid = { skipped: true, reason: 'IMPETUS_EDGE_AGENT_TOKEN not set' };
  }

  out.loopbackHealth = await httpReq('GET', '/api/health');

  return out;
}

async function runProbes() {
  const engine = require('../src/securityRecon/engine/securityReconCorrelationEngine');
  const postVal = require('../src/securityRecon/engine/postValidationDecision');
  const probeIp = '198.51.100.55';
  const seq = [];

  const record = (step, extra = {}) => {
    const st = engine.getStateForIp(probeIp) || { score: 0, behaviorState: 'OBSERVE' };
    seq.push({
      step,
      clientIp: probeIp,
      rawScore: st.score || 0,
      behaviorState: st.behaviorState,
      probeHits: st.probeHits,
      distinctPaths: st.distinctPaths?.size ?? 0,
      externalBanObserved: st.externalBanObserved === true,
      ...extra
    });
  };

  record('baseline');

  const tech = await httpReq('GET', '/wp-admin/install.php?step=1', {
    headers: { 'User-Agent': 'sqlmap/1.0', 'X-Forwarded-For': probeIp }
  });
  record('technology_mismatch', { httpStatus: tech.status });

  for (let i = 0; i < 8; i++) {
    const r = await httpReq('GET', `/api/nonexistent-sec005-${i}`, {
      headers: { 'User-Agent': 'curl/8.0', 'X-Forwarded-For': probeIp }
    });
    record(`enum_${i}`, { httpStatus: r.status, path: `/api/nonexistent-sec005-${i}` });
  }

  const fakeAuth = await httpReq('GET', '/api/nonexistent-fake-auth', {
    headers: {
      Authorization: 'Bearer fake',
      'X-Forwarded-For': probeIp,
      'User-Agent': 'curl/8.0'
    }
  });
  const stFake = engine.getStateForIp(probeIp);
  record('fake_authorization', {
    httpStatus: fakeAuth.status,
    note: 'score must not drop from fake auth alone'
  });

  const spoof = await httpReq('GET', '/api/health', {
    headers: { 'X-Forwarded-For': '127.0.0.1' }
  });
  record('loopback_spoof_xff', { httpStatus: spoof.status, note: 'remote peer not loopback' });

  const { token } = await buildTestJwt();
  for (let i = 0; i < 10; i++) {
    await httpReq('GET', `/api/probe-hostile-${i}`, {
      headers: { 'X-Forwarded-For': probeIp, 'User-Agent': 'scanner/1.0' }
    });
  }
  const stHigh = engine.getStateForIp(probeIp);
  const mockReq = {
    originalUrl: '/api/dashboard',
    path: '/api/dashboard',
    headers: { authorization: `Bearer ${token}` },
    user: { id: 'test', company_id: 'test' },
    impetusClientNetwork: { clientIp: probeIp, immediatePeerIp: '127.0.0.1' }
  };
  const db = require('../src/db');
  const ur = await db.query(`SELECT id, company_id FROM users WHERE active=true LIMIT 1`);
  mockReq.user = { id: ur.rows[0].id, company_id: ur.rows[0].company_id };
  const ev = postVal.evaluateValidatedIdentityDecision(mockReq, { validationSource: 'requireAuth' });
  record('authenticated_high_score_eval', {
    effectiveScore: ev.effectiveScore,
    decision: ev.decision,
    rawScore: ev.rawScore
  });

  const blocked = await httpReq('GET', '/api/dashboard', {
    headers: { Authorization: `Bearer ${token}`, 'X-Forwarded-For': probeIp }
  });
  record('authenticated_high_score_http', {
    httpStatus: blocked.status,
    handlerSuppressed: blocked.status === 404 && blocked.json?.error === 'Not found'
  });

  return { probeIp, sequence: seq, technologyMismatch: { status: tech.status } };
}

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  if (phase === 'pre' || phase === 'full') {
    const snap = await captureSnapshot('pre_activation');
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'snapshot-pre.json'), JSON.stringify(snap, null, 2));
    console.log('[SEC-005] snapshot-pre written');
  }

  if (phase === 'post' || phase === 'full') {
    const snap = await captureSnapshot('post_activation');
    const smoke = await smokeTests();
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'snapshot-post.json'), JSON.stringify(snap, null, 2));
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'smoke-tests.json'), JSON.stringify(smoke, null, 2));
    console.log('[SEC-005] snapshot-post + smoke written');
    console.log(JSON.stringify({
      health: smoke.health.status,
      authMe: smoke.authMe.status,
      bootBlocked: smoke.bootApp.filter((b) => b.blocked).length,
      admin: smoke.adminSecurityDashboard.status,
      edgeValid: smoke.edgeIngestValid.status || smoke.edgeIngestValid.skipped,
      edgeInvalid: smoke.edgeIngestInvalid.status
    }, null, 2));
  }

  if (phase === 'probes' || phase === 'full') {
    const probes = await runProbes();
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'controlled-probes.json'), JSON.stringify(probes, null, 2));
    console.log('[SEC-005] probes written');
    console.log(JSON.stringify(probes.sequence.slice(-5), null, 2));
  }
}

main().catch((e) => {
  console.error('[SEC-005] FATAL', e.message);
  process.exit(1);
});
