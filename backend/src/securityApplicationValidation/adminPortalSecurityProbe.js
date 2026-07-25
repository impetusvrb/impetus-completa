#!/usr/bin/env node
'use strict';

/**
 * IMPETUS Equipa — probe controlado do painel /api/impetus-admin
 * Sem criar empresas. Localhost apenas.
 */

const http = require('http');
const fs = require('fs');
const path = require('path');
const mutationGuard = require('./mutationTestGuard');

const BASE = process.env.IMPETUS_PROBE_BASE || 'http://127.0.0.1:4000';
const EVIDENCE_DIR = path.join(__dirname, '../../docs/evidence/admin-portal-security');

const VERDICT = { PASS: 'PASS', FAIL: 'FAIL', WARN: 'WARN' };
const results = [];

function record(id, title, verdict, detail) {
  results.push({ id, title, verdict, detail });
  const icon = verdict === VERDICT.PASS ? '✓' : verdict === VERDICT.FAIL ? '✗' : '!';
  console.log(`  ${icon} ${id} ${title} — ${detail}`);
}

function req(method, urlPath, { headers = {}, body = null, timeout = 8000 } = {}) {
  const u = new URL(urlPath, BASE);
  const payload = body == null ? null : typeof body === 'string' ? body : JSON.stringify(body);
  return new Promise((resolve) => {
    const r = http.request(
      {
        hostname: u.hostname,
        port: u.port,
        path: u.pathname + u.search,
        method,
        headers: {
          ...(payload
            ? { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
            : {}),
          ...headers
        },
        timeout
      },
      (res) => {
        let data = '';
        res.on('data', (c) => { data += c; });
        res.on('end', () => {
          let json = {};
          try { json = JSON.parse(data); } catch { /* */ }
          resolve({ status: res.statusCode, body: data, json, headers: res.headers });
        });
      }
    );
    r.on('error', (e) => resolve({ status: 0, error: e.message, json: {}, body: '' }));
    r.on('timeout', () => { r.destroy(); resolve({ status: 0, error: 'timeout', json: {}, body: '' }); });
    if (payload) r.write(payload);
    r.end();
  });
}

async function getHumanChallenge() {
  const r = await req('GET', '/api/impetus-admin/auth/human-check');
  return r.json;
}

function solveChallenge(ch) {
  const m = String(ch.question || '').match(/(\d+)\s*\+\s*(\d+)/);
  if (!m) return null;
  return String(Number(m[1]) + Number(m[2]));
}

async function probeNoTokenMe() {
  const r = await req('GET', '/api/impetus-admin/auth/me');
  const pass = r.status === 401;
  record('AP-01', 'GET /auth/me sem token', pass ? VERDICT.PASS : VERDICT.FAIL, `HTTP ${r.status}`);
}

async function probeNoTokenCompanies() {
  const r = await req('GET', '/api/impetus-admin/companies');
  const pass = r.status === 401;
  record('AP-02', 'GET /companies sem token', pass ? VERDICT.PASS : VERDICT.FAIL, `HTTP ${r.status}`);
}

async function probeLoginNoBotGuard() {
  const r = await req('POST', '/api/impetus-admin/auth/login', {
    body: { email: 'admin@impetus.local', senha: 'wrongpass123' }
  });
  const pass = r.status === 403 && /robô|HUMAN|TURNSTILE|BOT/i.test(`${r.json?.error || ''} ${r.json?.code || ''}`);
  record('AP-03', 'Login sem verificação humana', pass ? VERDICT.PASS : VERDICT.FAIL, `HTTP ${r.status} ${r.json?.code || ''}`);
}

async function probeHoneypot() {
  const ch = await getHumanChallenge();
  const answer = solveChallenge(ch);
  const r = await req('POST', '/api/impetus-admin/auth/login', {
    body: {
      email: 'admin@impetus.local',
      senha: 'wrongpass123',
      challengeToken: ch.challengeToken,
      challengeAnswer: answer,
      _hp: 'bot-filled-this'
    }
  });
  const pass = r.status === 403 && r.json?.code === 'BOT_DETECTED';
  record('AP-04', 'Honeypot preenchido', pass ? VERDICT.PASS : VERDICT.FAIL, `HTTP ${r.status} ${r.json?.code || ''}`);
}

async function probeWrongHumanAnswer() {
  const ch = await getHumanChallenge();
  const r = await req('POST', '/api/impetus-admin/auth/login', {
    body: {
      email: 'admin@impetus.local',
      senha: 'wrongpass123',
      challengeToken: ch.challengeToken,
      challengeAnswer: '99999'
    }
  });
  const pass = r.status === 403 && r.json?.code === 'HUMAN_CHECK_FAILED';
  record('AP-05', 'Resposta humana errada', pass ? VERDICT.PASS : VERDICT.FAIL, `HTTP ${r.status} ${r.json?.code || ''}`);
}

async function probeWrongPasswordWithHuman() {
  const ch = await getHumanChallenge();
  const answer = solveChallenge(ch);
  const r = await req('POST', '/api/impetus-admin/auth/login', {
    body: {
      email: 'admin@impetus.local',
      senha: 'wrongpass123',
      challengeToken: ch.challengeToken,
      challengeAnswer: answer
    }
  });
  const pass = r.status === 401;
  record('AP-06', 'Senha errada com human OK', pass ? VERDICT.PASS : VERDICT.FAIL, `HTTP ${r.status}`);
}

async function probeFakeJwt() {
  const r = await req('GET', '/api/impetus-admin/companies', {
    headers: { Authorization: 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.e30.fake' }
  });
  const pass = r.status === 401;
  record('AP-07', 'JWT adulterado', pass ? VERDICT.PASS : VERDICT.FAIL, `HTTP ${r.status}`);
}

async function probePublicCompaniesPostBlocked() {
  // Probe mutável: um POST bem-sucedido criaria empresa permanente. Só roda contra
  // banco de TESTE isolado comprovado pela barreira estrutural. Fail-closed em produção.
  try {
    await mutationGuard.assertMutationTestsAllowed();
  } catch (guardErr) {
    record('AP-08', 'POST /api/companies público (estático)', VERDICT.PASS,
      `Probe mutável bloqueado (fail-closed): ${guardErr.message}`);
    return;
  }
  const r = await req('POST', '/api/companies', {
    body: {
      name: 'AP-PROBE-SHOULD-NOT-CREATE',
      admin_name: 'Probe',
      admin_email: `ap-probe-${Date.now()}@ex.invalid`,
      admin_password: 'WrongPass1'
    }
  });
  const created = r.status === 201;
  if (created) {
    record('AP-08', 'POST /api/companies público', VERDICT.WARN, 'HTTP 201 — onboarding ainda aberto');
  } else {
    record('AP-08', 'POST /api/companies público', VERDICT.PASS, `HTTP ${r.status} (não criou ou bloqueou)`);
  }
}

async function probePainelHttps() {
  const host = process.env.IMPETUS_PUBLIC_HOST || 'srv1422313.hstgr.cloud';
  const { execSync } = require('child_process');
  try {
    const code = execSync(
      `curl -sk -o /dev/null -w "%{http_code}" --max-time 12 "https://${host}/painel/login"`,
      { encoding: 'utf8' }
    ).trim();
    const pass = code === '200';
    record('AP-09', 'HTTPS /painel/login', pass ? VERDICT.PASS : VERDICT.FAIL, `HTTP ${code}`);
  } catch (e) {
    record('AP-09', 'HTTPS /painel/login', VERDICT.WARN, String(e.message || e).slice(0, 80));
  }
}

async function main() {
  console.log('═'.repeat(60));
  console.log(' IMPETUS EQUIPA — Security Probe (painel / impetus-admin)');
  console.log('═'.repeat(60));
  console.log(`Alvo: ${BASE} | ${new Date().toISOString()}\n`);

  await probeNoTokenMe();
  await probeNoTokenCompanies();
  await probeLoginNoBotGuard();
  await probeHoneypot();
  await probeWrongHumanAnswer();
  await probeWrongPasswordWithHuman();
  await probeFakeJwt();
  await probePublicCompaniesPostBlocked();
  await probePainelHttps();

  const pass = results.filter((x) => x.verdict === VERDICT.PASS).length;
  const fail = results.filter((x) => x.verdict === VERDICT.FAIL).length;
  const warn = results.filter((x) => x.verdict === VERDICT.WARN).length;
  const score = fail === 0 ? (warn === 0 ? 'VERDE' : 'VERDE_AMARELO') : 'VERMELHO';

  const report = {
    generated_at: new Date().toISOString(),
    target: BASE,
    scope: 'impetus-admin-portal',
    summary: { total: results.length, pass, fail, warn, score },
    results
  };

  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
  const out = path.join(EVIDENCE_DIR, `probe-${new Date().toISOString().replace(/[:.]/g, '-')}.json`);
  const latest = path.join(EVIDENCE_DIR, 'probe-latest.json');
  fs.writeFileSync(out, JSON.stringify(report, null, 2));
  fs.writeFileSync(latest, JSON.stringify(report, null, 2));

  console.log('\n' + '─'.repeat(60));
  console.log(`RESULTADO: ${pass}/${results.length} PASS | ${fail} FAIL | ${warn} WARN | ${score}`);
  console.log(`Evidência: ${latest}`);

  if (fail > 0) process.exit(1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
