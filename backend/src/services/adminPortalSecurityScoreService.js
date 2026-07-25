'use strict';

const fs = require('fs');
const fsp = require('fs/promises');
const path = require('path');
const { execFile } = require('child_process');
const { promisify } = require('util');
const db = require('../db');

const execFileAsync = promisify(execFile);

const INCIDENT_DIR = '/var/lib/impetus/incidents';
const LOCKDOWN_STATE = '/var/lib/impetus/lockdown/active.json';
const { getNginxAccessLogPath } = require('../security/config/nginxAccessLogPath');
const THREAT_LOG = process.env.IMPETUS_THREAT_WATCH_LOG || '/var/log/impetus-threat-watch.log';
const NGINX_ACCESS = getNginxAccessLogPath();

const RISK_WEIGHTS = Object.freeze({
  SCANNER_UA: 5,
  HTTP_404_FLOOD: 8,
  HTTP_WRITE_ATTEMPT: 15,
  HTTP_CREDENTIAL_PROBE: 40,
  INVASION_SENSITIVE_200: 100,
  SSH_BRUTE_FORCE: 80,
  AUTH_SUCCESS_AFTER_BREACH: 90,
  ADMIN_LOGIN_AFTER_FAILS: 70,
  MULTI_LAYER_BREACH: 95,
  login_falhou: 20
});

const RISK_LEVELS = Object.freeze([
  { level: 0, name: 'Normal', min: 0, max: 19 },
  { level: 1, name: 'Suspeito', min: 20, max: 49 },
  { level: 2, name: 'Ataque', min: 50, max: 99 },
  { level: 3, name: 'Crítico', min: 100, max: Infinity }
]);

function fileOk(p) {
  try {
    fs.accessSync(p, fs.constants.R_OK);
    return true;
  } catch {
    return false;
  }
}

async function execSafe(cmd, args, ms = 6000) {
  try {
    const { stdout } = await execFileAsync(cmd, args, { timeout: ms, maxBuffer: 1024 * 1024 });
    return String(stdout || '').trim();
  } catch {
    return '';
  }
}

async function getMfaEnrollmentStats() {
  try {
    const adminR = await db.query(
      `SELECT count(*)::int AS total,
              count(*) FILTER (WHERE totp_enabled = true)::int AS enrolled
       FROM admin_users WHERE ativo IS NOT FALSE`
    );
    const clientR = await db.query(
      `SELECT count(DISTINCT u.id)::int AS total,
              count(DISTINCT u.id) FILTER (WHERE e.totp_enabled = true)::int AS enrolled
       FROM users u
       LEFT JOIN user_mfa_enrollments e ON e.user_id = u.id
       WHERE u.deleted_at IS NULL
         AND u.email IN ('impetusvrb@yahoo.com', 'wellfreitasmachado@gmail.com')`
    );
    const a = adminR.rows[0] || { total: 0, enrolled: 0 };
    const c = clientR.rows[0] || { total: 0, enrolled: 0 };
    const total = a.total + c.total;
    const enrolled = a.enrolled + c.enrolled;
    return {
      total,
      enrolled,
      pct: total > 0 ? Math.round((enrolled / total) * 100) : 0,
      admin: a,
      client: c
    };
  } catch {
    return { total: 0, enrolled: 0, pct: 0, admin: {}, client: {} };
  }
}

async function getBackupFreshness() {
  const candidates = [
    '/var/www/impetus-completa/deploy_backups',
    '/var/backups',
    '/root/backups'
  ];
  for (const dir of candidates) {
    try {
      const files = await fsp.readdir(dir);
      const stats = await Promise.all(
        files.slice(0, 30).map(async (f) => {
          try {
            const s = await fsp.stat(path.join(dir, f));
            return s.mtimeMs;
          } catch {
            return 0;
          }
        })
      );
      const latest = Math.max(0, ...stats);
      if (latest > 0) {
        const ageH = (Date.now() - latest) / 3_600_000;
        return { ok: ageH < 168, age_hours: Math.round(ageH), path: dir };
      }
    } catch {
      /* next */
    }
  }
  return { ok: false, age_hours: null, path: null };
}

function certDaysRemaining(sslInfo) {
  if (!sslInfo?.expires_at) return 0;
  return Math.floor((new Date(sslInfo.expires_at).getTime() - Date.now()) / 86_400_000);
}

async function computeSecurityScore1000(ctx) {
  const {
    infrastructure,
    fail2ban,
    summary,
    lockdownActive
  } = ctx;

  const mfa = await getMfaEnrollmentStats();
  const backup = await getBackupFreshness();
  const certDays = certDaysRemaining(infrastructure.ssl);

  const domains = [];

  const add = (id, label, max, earned, checks) => {
    domains.push({
      id,
      label,
      max,
      earned: Math.min(max, Math.max(0, earned)),
      checks: checks || []
    });
  };

  // Cloudflare 120
  let cf = 0;
  const cfChecks = [];
  if (infrastructure.cloudflare_proxy_guard) { cf += 40; cfChecks.push({ ok: true, label: 'Proxy guard activo' }); }
  else cfChecks.push({ ok: false, label: 'Proxy guard' });
  if (infrastructure.cloudflare_real_ip) { cf += 30; cfChecks.push({ ok: true, label: 'Real IP Cloudflare' }); }
  else cfChecks.push({ ok: false, label: 'Real IP' });
  if (infrastructure.turnstile) { cf += 30; cfChecks.push({ ok: true, label: 'Turnstile painel' }); }
  else cfChecks.push({ ok: false, label: 'Turnstile' });
  const cfProbe = await execSafe('curl', ['-sSI', '-m', '8', 'https://plataformaimpetus.com/']);
  if (/server:\s*cloudflare/i.test(cfProbe)) { cf += 20; cfChecks.push({ ok: true, label: 'Tráfego via Cloudflare' }); }
  else cfChecks.push({ ok: false, label: 'Header Cloudflare' });
  add('cloudflare', 'Cloudflare', 120, cf, cfChecks);

  // Servidor 120
  let srv = 0;
  const srvChecks = [];
  if (fail2ban?.available) { srv += 40; srvChecks.push({ ok: true, label: 'fail2ban activo' }); }
  if (infrastructure.threat_watch_config) { srv += 30; srvChecks.push({ ok: true, label: 'threat-watch' }); }
  if (process.env.IMPETUS_AUTO_LOCKDOWN_ENABLED === 'true') { srv += 25; srvChecks.push({ ok: true, label: 'Lockdown auto' }); }
  if (infrastructure.ssl?.valid) { srv += 25; srvChecks.push({ ok: true, label: "SSL Let's Encrypt" }); }
  add('server', 'Servidor', 120, srv, srvChecks);

  // Banco 100
  let dbScore = 0;
  const dbChecks = [];
  try {
    await db.query('SELECT 1');
    dbScore += 50;
    dbChecks.push({ ok: true, label: 'PostgreSQL responde' });
  } catch {
    dbChecks.push({ ok: false, label: 'PostgreSQL' });
  }
  if (process.env.IMPETUS_TENANT_RLS_MODE === 'on' || process.env.IMPETUS_ENTERPRISE_SECURITY_ROLLOUT === 'true') {
    dbScore += 50;
    dbChecks.push({ ok: true, label: 'RLS / enterprise tenant' });
  } else {
    dbChecks.push({ ok: false, label: 'RLS piloto' });
  }
  add('database', 'Banco', 100, dbScore, dbChecks);

  // APIs 100
  let api = 0;
  const apiChecks = [];
  const health = await execSafe('curl', ['-sS', '-m', '6', 'http://127.0.0.1:4000/api/health']);
  if (health.includes('"ok"') || health.includes('"status":"ok"')) {
    api += 50;
    apiChecks.push({ ok: true, label: 'API health' });
  }
  if (fail2ban?.jails?.some((j) => j.jail === 'impetus-auth-fail')) {
    api += 25;
    apiChecks.push({ ok: true, label: 'Jail auth-fail' });
  }
  if (fail2ban?.jails?.some((j) => j.jail === 'nginx-limit-req')) {
    api += 25;
    apiChecks.push({ ok: true, label: 'Rate limit nginx' });
  }
  add('apis', 'APIs', 100, api, apiChecks);

  // JWT 100
  let jwt = 0;
  const jwtChecks = [];
  if ((process.env.JWT_SECRET || '').length >= 32) { jwt += 50; jwtChecks.push({ ok: true, label: 'JWT app' }); }
  if ((process.env.IMPETUS_ADMIN_JWT_SECRET || '').length >= 16) { jwt += 50; jwtChecks.push({ ok: true, label: 'JWT painel' }); }
  add('jwt', 'JWT / sessão', 100, jwt, jwtChecks);

  // 2FA 80
  let mfaScore = 0;
  const mfaChecks = [];
  if (infrastructure.admin_mfa_enabled) { mfaScore += 30; mfaChecks.push({ ok: true, label: 'MFA ligado' }); }
  mfaScore += Math.round((mfa.pct / 100) * 50);
  mfaChecks.push({ ok: mfa.pct >= 80, label: `Enrolamento piloto ${mfa.pct}% (${mfa.enrolled}/${mfa.total})` });
  add('mfa', '2FA', 80, mfaScore, mfaChecks);

  // Backups 100
  let bk = backup.ok ? 100 : 40;
  add('backups', 'Backups', 100, bk, [
    { ok: backup.ok, label: backup.path ? `Último backup ~${backup.age_hours}h` : 'Sem backup detectado' }
  ]);

  // Observabilidade 100
  let obs = 0;
  const obsChecks = [];
  if (infrastructure.security_observatory) { obs += 50; obsChecks.push({ ok: true, label: 'SEC-01 observatório' }); }
  if (fileOk('/etc/cron.d/impetus-security-observatory')) { obs += 50; obsChecks.push({ ok: true, label: 'Ingest nginx cron' }); }
  else obsChecks.push({ ok: false, label: 'Cron ingest' });
  add('observability', 'Observabilidade', 100, obs, obsChecks);

  // IA / SOC 80
  let ia = 0;
  const iaChecks = [];
  if (process.env.SECURITY_CORRELATION_ENGINE === 'true') { ia += 40; iaChecks.push({ ok: true, label: 'Correlação SEC-02' }); }
  if (process.env.SECURITY_SOC === 'true') { ia += 40; iaChecks.push({ ok: true, label: 'SOC SEC-07' }); }
  add('ia', 'IA / SOC', 80, ia, iaChecks);

  // Integridade 100
  let integ = 0;
  const intChecks = [];
  if (process.env.SECURITY_RUNTIME_INTEGRITY === 'true') { integ += 50; intChecks.push({ ok: true, label: 'SEC-04 integridade' }); }
  if (!lockdownActive) { integ += 50; intChecks.push({ ok: true, label: 'Sem lockdown activo' }); }
  else intChecks.push({ ok: false, label: 'Lockdown activo' });
  add('integrity', 'Integridade', 100, integ, intChecks);

  let total = domains.reduce((s, d) => s + d.earned, 0);
  const penalties = [];
  if (lockdownActive) {
    total -= 50;
    penalties.push({ points: -50, reason: 'Lockdown de emergência activo' });
  }
  if (certDays > 0 && certDays < 14) {
    total -= 30;
    penalties.push({ points: -30, reason: `Certificado expira em ${certDays} dias` });
  }
  if (mfa.pct === 0 && mfa.total > 0) {
    total -= 40;
    penalties.push({ points: -40, reason: '2FA piloto sem contas enroladas' });
  }
  total = Math.max(0, Math.min(1000, total));

  return {
    schema_version: 'security_score_v1',
    total: Math.round(total),
    max: 1000,
    pct: Math.round((total / 1000) * 1000) / 10,
    domains,
    penalties,
    mfa_enrollment: mfa
  };
}

function computeRiskLevel(alerts, summary, lockdownActive) {
  if (lockdownActive) {
    return {
      level: 3,
      name: 'Crítico',
      score: 100,
      reason: 'Lockdown de emergência activo',
      breakdown: [{ type: 'LOCKDOWN', points: 100 }]
    };
  }

  const windowMs = 3_600_000;
  const now = Date.now();
  const breakdown = [];
  let score = 0;

  for (const a of alerts) {
    const t = new Date(a.at).getTime();
    if (now - t > windowMs) continue;
    const pts = RISK_WEIGHTS[a.type] || (a.severity === 'CRITICAL' ? 80 : a.severity === 'HIGH' ? 35 : 5);
    score += pts;
    breakdown.push({ type: a.type, ip: a.ip, points: pts, at: a.at });
  }

  if ((summary?.failed_logins_24h || 0) >= 5) {
    score += 25;
    breakdown.push({ type: 'admin_login_fails_24h', points: 25 });
  }

  let level = 0;
  let name = 'Normal';
  for (const r of RISK_LEVELS) {
    if (score >= r.min && score <= r.max) {
      level = r.level;
      name = r.name;
      break;
    }
  }

  return {
    level,
    name,
    score: Math.round(score),
    breakdown: breakdown.slice(0, 25),
    window_minutes: 60
  };
}

function buildAttackGraph(incident) {
  const ip = incident.ip || incident.source_ip || 'unknown';
  const type = incident.type || incident.category || 'EVENT';
  const detail = incident.detail || '';
  const nodes = [
    { id: 'internet', label: 'Internet', type: 'source' },
    { id: 'ip', label: `IP ${ip}`, type: 'attacker' },
    { id: 'cloudflare', label: 'Cloudflare (proxy)', type: 'edge' },
    { id: 'nginx', label: 'Nginx', type: 'edge' }
  ];
  const edges = [
    { from: 'internet', to: 'ip' },
    { from: 'ip', to: 'cloudflare' },
    { from: 'cloudflare', to: 'nginx' }
  ];

  if (/login|auth/i.test(detail) || /AUTH|LOGIN/i.test(type)) {
    nodes.push({ id: 'api_auth', label: 'API autenticação', type: 'app' });
    edges.push({ from: 'nginx', to: 'api_auth' });
  } else {
    nodes.push({ id: 'api', label: 'API / paths', type: 'app' });
    edges.push({ from: 'nginx', to: 'api' });
  }

  nodes.push({ id: 'detect', label: `Detecção: ${type}`, type: 'detect' });
  edges.push({ from: 'nginx', to: 'detect' });

  if (/fail2ban|FAIL2BAN/i.test(detail) || incident.fail2ban) {
    nodes.push({ id: 'fail2ban', label: 'fail2ban', type: 'block' });
    edges.push({ from: 'detect', to: 'fail2ban' });
  }
  nodes.push({ id: 'ufw', label: 'UFW DENY', type: 'block' });
  edges.push({ from: 'detect', to: 'ufw' });

  if (/LOCKDOWN|INVASION|MULTI_LAYER/i.test(type)) {
    nodes.push({ id: 'lockdown', label: 'Lockdown PM2', type: 'critical' });
    edges.push({ from: 'ufw', to: 'lockdown' });
  }

  return {
    incident_id: incident.id || `${ip}-${type}`,
    ip,
    type,
    at: incident.at || incident.timestamp_utc,
    nodes,
    edges,
    narrative: buildNarrativeSteps(ip, type, detail, nodes)
  };
}

function buildNarrativeSteps(ip, type, detail, nodes) {
  return nodes
    .filter((n) => n.type !== 'source')
    .map((n, i) => ({
      step: i + 1,
      label: n.label,
      description:
        n.id === 'detect'
          ? `${type}: ${detail}`.slice(0, 200)
          : n.id === 'ufw'
            ? 'IP bloqueado no firewall do servidor'
            : n.id === 'fail2ban'
              ? 'Jail fail2ban activou banimento'
              : n.id === 'lockdown'
                ? 'Software retirado do ar automaticamente'
                : `Tráfego passou por ${n.label}`
    }));
}

async function loadRecentIncidents(limit = 15) {
  try {
    const files = await fsp.readdir(INCIDENT_DIR);
    const jsons = files.filter((f) => f.endsWith('.json') && f !== 'latest.json').slice(-limit);
    const incidents = [];
    for (const f of jsons) {
      try {
        const raw = await fsp.readFile(path.join(INCIDENT_DIR, f), 'utf8');
        const doc = JSON.parse(raw);
        incidents.push({
          id: f.replace('.json', ''),
          ip: doc.source_ip,
          type: doc.category,
          detail: doc.detail,
          at: doc.timestamp_utc,
          severity: doc.severity
        });
      } catch {
        /* skip */
      }
    }
    return incidents.sort((a, b) => String(b.at).localeCompare(String(a.at)));
  } catch {
    return [];
  }
}

async function runAutoAudit(infrastructure, fail2ban) {
  const checks = [];
  const add = (id, label, ok, detail) => checks.push({ id, label, ok, detail });

  add('ssl', 'Certificado SSL', infrastructure.ssl?.valid, infrastructure.ssl?.expires_at || 'inválido');
  const certDays = certDaysRemaining(infrastructure.ssl);
  add('ssl_expiry', 'Validade SSL (>14d)', certDays >= 14, `${certDays} dias`);

  const dns = await execSafe('getent', ['hosts', 'plataformaimpetus.com']);
  add('dns', 'DNS plataformaimpetus.com', dns.length > 0, dns.split(/\s+/)[0] || '—');

  const pm2 = await execSafe('pm2', ['jlist']);
  const pm2Ok = /impetus-backend/.test(pm2) && /"status":"online"/.test(pm2);
  add('pm2', 'PM2 backend online', pm2Ok, pm2Ok ? 'online' : 'offline ou lockdown');

  add('fail2ban', 'fail2ban', fail2ban?.available, `${fail2ban?.jails?.length || 0} jails`);

  const backup = await getBackupFreshness();
  add('backup', 'Backup recente (<7d)', backup.ok, backup.path || 'não encontrado');

  add('turnstile', 'Turnstile', infrastructure.turnstile, 'painel equipe');
  add('mfa', 'MFA servidor ligado', infrastructure.admin_mfa_enabled, process.env.IMPETUS_MFA_ENABLED);

  const openPorts = await execSafe('ss', ['-tlnp']);
  const exposes22 = /:22\s/.test(openPorts);
  add('ssh', 'SSH porta 22', true, exposes22 ? 'exposta (esperado VPS)' : '—');

  const passed = checks.filter((c) => c.ok).length;
  return {
    schema_version: 'security_auto_audit_v1',
    generated_at: new Date().toISOString(),
    passed,
    total: checks.length,
    checks
  };
}

async function explainBlockedIp(ip) {
  if (!ip || ip === 'multi') {
    return { ok: false, error: 'IP inválido' };
  }

  const lines = [];
  try {
    const raw = await fsp.readFile(THREAT_LOG, 'utf8');
    lines.push(...raw.split('\n').filter((l) => l.includes(ip)).slice(-40));
  } catch {
    /* empty */
  }

  const alerts = [];
  const alertRe =
    /ALERT\s+(LOW|MEDIUM|HIGH|CRITICAL)\s+(\S+)\s+([0-9a-fA-F:.]+)\s+—\s+(.+)$/;
  for (const line of lines) {
    const m = line.match(alertRe);
    if (m && m[3] === ip) {
      alerts.push({ severity: m[1], type: m[2], detail: m[4] });
    }
    if (line.includes('UFW DENY') && line.includes(ip)) {
      alerts.push({ severity: 'HIGH', type: 'UFW_DENY', detail: line.slice(-120) });
    }
  }

  let nginxHits = [];
  try {
    const { stdout } = await execFileAsync('grep', ['-m', '25', ip, NGINX_ACCESS], {
      timeout: 8000,
      maxBuffer: 2 * 1024 * 1024
    });
    nginxHits = String(stdout || '')
      .split('\n')
      .filter(Boolean)
      .slice(-15)
      .map((line) => {
        const path = line.match(/"(\S+)\s+(\S+)/);
        const status = line.match(/"\s+(\d{3})\s/);
        return {
          path: path?.[2] || '—',
          method: path?.[1] || '—',
          status: status?.[1] || '—'
        };
      });
  } catch {
    nginxHits = [];
  }

  const geo = await (async () => {
    try {
      const res = await fetch(`http://ip-api.com/json/${encodeURIComponent(ip)}?fields=status,country,countryCode,isp`, {
        signal: AbortSignal.timeout(3000)
      });
      return await res.json();
    } catch {
      return {};
    }
  })();

  const primary = alerts[0] || { type: 'SCAN', detail: 'Actividade suspeita detectada' };
  const graph = buildAttackGraph({
    ip,
    type: primary.type,
    detail: primary.detail,
    at: new Date().toISOString()
  });

  const summaryLines = [
    `IP ${ip} (${geo.country || '—'} / ${geo.isp || '—'})`,
    `Eventos threat-watch: ${alerts.length}`,
    `Pedidos nginx amostrados: ${nginxHits.length}`
  ];

  if (alerts.some((a) => /PROBE|SCANNER|\.env/i.test(a.type + a.detail))) {
    summaryLines.push('Motivo provável: scanner ou tentativa de acesso a ficheiros sensíveis');
  }
  if (alerts.some((a) => a.type === 'UFW_DENY')) {
    summaryLines.push('Acção: bloqueado no firewall (UFW)');
  }
  summaryLines.push('Camadas: Cloudflare → Nginx → detecção → fail2ban/UFW');

  return {
    ok: true,
    ip,
    country: geo.country,
    isp: geo.isp,
    alerts,
    nginx_samples: nginxHits,
    attack_graph: graph,
    explanation: summaryLines.join('\n'),
    narrative: graph.narrative
  };
}

function isLockdownActive() {
  return fileOk(LOCKDOWN_STATE);
}

module.exports = {
  computeSecurityScore1000,
  computeRiskLevel,
  buildAttackGraph,
  loadRecentIncidents,
  runAutoAudit,
  explainBlockedIp,
  isLockdownActive,
  RISK_LEVELS
};
