'use strict';

/**
 * Prova de equivalência com dependências externas congeladas (log-derived fields).
 */
require('../src/config/loadEnv').loadImpetusEnv();

const logWindowSvc = require('../src/services/adminPortalSecurityEvidenceLogWindow');
const phaseBSvc = require('../src/services/adminPortalSecurityPhaseBService');

const ALERT_RE = /^\[(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z)\]\s+ALERT\s+(LOW|MEDIUM|HIGH|CRITICAL)\s+(\S+)\s+([0-9a-fA-F:.]+)\s+—\s+(.+)$/;
const NGINX_LINE_RE = /^(\S+)\s+-\s+-\s+\[([^\]]+)\]\s+"(\S+)\s+(\S+)\s+[^"]*"\s+(\d{3})\s/;

function parseThreat(lines) {
  const alerts = [];
  for (const line of lines) {
    const m = line.match(ALERT_RE);
    if (m) alerts.push({ at: m[1], severity: m[2], type: m[3], ip: m[4], detail: m[5] });
  }
  return alerts;
}

function countNginxSuspicious(lines) {
  const suspicious = [];
  for (const line of lines) {
    const m = line.match(NGINX_LINE_RE);
    if (!m) continue;
    const status = Number(m[5]);
    if (status === 444 || status === 403 || status === 401) suspicious.push({ ip: m[1], status, path: m[4], at: m[2] });
    else if (status === 404 && /wp-|\.env|\.git|phpmyadmin|admin\.php/i.test(m[4])) suspicious.push({ ip: m[1], status, path: m[4], at: m[2] });
  }
  return suspicious;
}

function aggregateFromLines(nginxLines, threatLines) {
  const threatAlerts = parseThreat(threatLines);
  const recentAlerts = threatAlerts.slice(-80).reverse();
  const nginxSuspicious = countNginxSuspicious(nginxLines);
  const ipCounts = new Map();
  for (const s of nginxSuspicious) ipCounts.set(s.ip, (ipCounts.get(s.ip) || 0) + 1);
  const topAttackIps = [...ipCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 15).map(([ip, count]) => ({ ip, count }));
  const blockedUnique = [];
  const worldMap = phaseBSvc.buildWorldMap(topAttackIps, blockedUnique, recentAlerts);
  return { threatAlerts, recentAlerts, topAttackIps, worldMap };
}

const NGINX = process.env.IMPETUS_NGINX_ACCESS || '/var/log/nginx/access.log';
const THREAT = process.env.IMPETUS_THREAT_WATCH_LOG || '/var/log/impetus-threat-watch.log';

(async () => {
  const [legN, legT] = await Promise.all([
    logWindowSvc.acquireLogWindowLegacy(NGINX, 4000),
    logWindowSvc.acquireLogWindowLegacy(THREAT, 3000)
  ]);
  logWindowSvc.resetLogWindowState();
  const [optN, optT] = await Promise.all([
    logWindowSvc.acquireLogWindow(NGINX, 4000, 'nginx'),
    logWindowSvc.acquireLogWindow(THREAT, 3000, 'threat')
  ]);

  const legacyAgg = aggregateFromLines(legN.lines, legT.lines);
  const optAgg = aggregateFromLines(optN.lines, optT.lines);

  const sig = (wm) => (wm?.points || []).map((p) => `${p.country_code}:${p.count}:${p.unique_ips}`).sort().join('|');
  const match = sig(legacyAgg.worldMap) === sig(optAgg.worldMap)
    && legacyAgg.recentAlerts.length === optAgg.recentAlerts.length
    && legacyAgg.topAttackIps.length === optAgg.topAttackIps.length;

  console.log('Log lines nginx:', legN.lines.length, optN.lines.length, legN.lines.length === optN.lines.length ? 'MATCH' : 'DIFF');
  console.log('Log lines threat:', legT.lines.length, optT.lines.length);
  console.log('world_map signature match:', sig(legacyAgg.worldMap) === sig(optAgg.worldMap));
  console.log('EQUIVALENCE (frozen log input):', match ? 'PASS' : 'FAIL');
  if (!match) {
    console.log('legacy:', sig(legacyAgg.worldMap));
    console.log('opt:', sig(optAgg.worldMap));
  }

  // 2nd incremental snapshot
  logWindowSvc.resetLogWindowState('nginx');
  logWindowSvc.resetLogWindowState('threat');
  await logWindowSvc.acquireLogWindow(NGINX, 4000, 'nginx');
  await logWindowSvc.acquireLogWindow(THREAT, 3000, 'threat');
  const inc = await logWindowSvc.acquireLogWindow(NGINX, 4000, 'nginx');
  console.log('2nd nginx acquire mode:', inc.metrics.mode, 'new_lines:', inc.metrics.new_lines);
})().catch((e) => { console.error(e); process.exit(1); });
