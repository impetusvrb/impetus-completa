'use strict';

/**
 * SEC-04 — Network / communication integrity.
 * Read-only — valida portas, listeners, localhost-only.
 */

const { execSync } = require('child_process');

function gatherListeningPorts() {
  try {
    const out = execSync('ss -tlnp 2>/dev/null || netstat -tlnp 2>/dev/null', {
      encoding: 'utf8',
      timeout: 8000
    });
    return parsePortLines(out);
  } catch (_e) {
    return null;
  }
}

function parsePortLines(raw) {
  const ports = [];
  for (const line of raw.split('\n')) {
    if (!line.includes('LISTEN')) continue;
    const addrMatch = line.match(/(\d+\.\d+\.\d+\.\d+|::|\*|\[::\]):(\d+)/);
    if (!addrMatch) continue;
    const addr = addrMatch[1];
    const port = Number(addrMatch[2]);
    ports.push({ address: addr, port, raw: line.trim() });
  }
  return ports;
}

function extractBaselinePorts(baseline) {
  const ports = new Set();
  for (const line of baseline.listeningPorts || []) {
    const m = line.match(/:(\d+)\s/);
    if (m) ports.add(Number(m[1]));
  }
  return [...ports];
}

/**
 * @param {object} baseline
 * @param {object} [ctx] — mock: { ports: [{address, port}] }
 */
function validateNetwork(baseline, ctx = {}) {
  const findings = [];
  const current = ctx.ports != null ? ctx.ports : gatherListeningPorts();

  if (!current) {
    return {
      kind: 'network',
      status: 'UNKNOWN',
      passed: false,
      findings: [{ severity: 'WARNING', code: 'PORTS_UNAVAILABLE', message: 'Não foi possível enumerar portas' }],
      summary: 'Enumeração de portas indisponível'
    };
  }

  const backendPort = baseline.expectedConfig?.backendPort || 4000;
  const frontendPort = baseline.expectedConfig?.frontendPort || 3000;

  const backendListeners = current.filter((p) => p.port === backendPort);
  const frontendListeners = current.filter((p) => p.port === frontendPort);

  for (const l of backendListeners) {
    if (l.address !== '127.0.0.1' && l.address !== '::1') {
      findings.push({
        severity: 'CRITICAL',
        code: 'BACKEND_PUBLIC_BIND',
        port: backendPort,
        address: l.address,
        message: 'Backend exposto fora de localhost'
      });
    }
  }

  for (const l of frontendListeners) {
    if (l.address !== '127.0.0.1' && l.address !== '::1') {
      findings.push({
        severity: 'CRITICAL',
        code: 'FRONTEND_PUBLIC_BIND',
        port: frontendPort,
        address: l.address,
        message: 'Frontend exposto fora de localhost'
      });
    }
  }

  const baselinePorts = extractBaselinePorts(baseline);
  const currentPortSet = new Set(current.map((p) => p.port));

  for (const port of baselinePorts) {
    if (!currentPortSet.has(port) && [80, 443, 22, 3000, 4000].includes(port)) {
      findings.push({
        severity: 'WARNING',
        code: 'EXPECTED_PORT_MISSING',
        port,
        message: `Porta ${port} presente na baseline mas não detectada agora`
      });
    }
  }

  const unexpectedPublic = current.filter(
    (p) =>
      (p.address === '0.0.0.0' || p.address === '*') &&
      ![80, 443, 22].includes(p.port) &&
      p.port !== 53
  );

  for (const l of unexpectedPublic) {
    findings.push({
      severity: 'WARNING',
      code: 'UNEXPECTED_PUBLIC_PORT',
      port: l.port,
      address: l.address,
      message: `Porta ${l.port} escutando publicamente (não estava na baseline esperada)`
    });
  }

  if (ctx.unexpectedPorts) {
    for (const port of ctx.unexpectedPorts) {
      findings.push({
        severity: 'CRITICAL',
        code: 'UNEXPECTED_PORT',
        port,
        message: `Porta inesperada ${port} detectada`
      });
    }
  }

  const apiMountCount = baseline.apiMounts?.length || 0;
  const critical = findings.filter((f) => f.severity === 'CRITICAL');
  const passed = critical.length === 0;
  const status = critical.length > 0 ? 'COMPROMISED' : findings.length > 0 ? 'DEGRADED' : 'OK';

  return {
    kind: 'network',
    status,
    passed,
    findings,
    summary: passed ? `Rede conforme (${apiMountCount} API mounts baseline)` : `${critical.length} problema(s) crítico(s) de rede`,
    apiMountBaselineCount: apiMountCount
  };
}

module.exports = { validateNetwork, gatherListeningPorts, parsePortLines, extractBaselinePorts };
