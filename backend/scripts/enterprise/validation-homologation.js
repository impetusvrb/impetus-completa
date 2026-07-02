#!/usr/bin/env node
'use strict';

/**
 * Orquestrador de homologação Enterprise — CERT-ONPREM-VALIDATION-01
 *
 * Apenas executa scripts/evidências existentes. NÃO altera código nem configuração.
 * NÃO corrige falhas automaticamente.
 *
 * Uso:
 *   node scripts/enterprise/validation-homologation.js
 *   node scripts/enterprise/validation-homologation.js --json
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const http = require('http');

require('../../src/config/loadEnv').loadImpetusEnv();

const BACKEND_ROOT = path.join(__dirname, '../..');
const REPO_ROOT = path.join(BACKEND_ROOT, '..');
const jsonOut = process.argv.includes('--json');

const report = {
  certification: 'CERT-ONPREM-VALIDATION-01',
  title: 'Homologação Oficial Enterprise',
  executed_at: new Date().toISOString(),
  status: 'EM_HOMOLOGACAO',
  parts: {},
  non_conformities: [],
  summary: { passed: 0, failed: 0, skipped: 0, blocked: 0 },
  approval: 'PENDENTE',
  go_live_ready: false,
};

let ncSeq = 0;

function addNC(severity, part, description, impact, evidence) {
  ncSeq += 1;
  const id = `NC-V${String(ncSeq).padStart(3, '0')}`;
  report.non_conformities.push({ id, severity, part, description, impact, evidence });
  return id;
}

function record(part, name, status, detail = '') {
  if (!report.parts[part]) report.parts[part] = { checks: [] };
  report.parts[part].checks.push({ name, status, detail: detail || undefined });
  if (status === 'PASS') report.summary.passed += 1;
  else if (status === 'SKIP') report.summary.skipped += 1;
  else if (status === 'BLOCKED') report.summary.blocked += 1;
  else report.summary.failed += 1;
}

function execOk(cmd, opts = {}) {
  execSync(cmd, { cwd: BACKEND_ROOT, stdio: 'pipe', timeout: 120000, ...opts });
}

function commandExists(cmd) {
  return spawnSync('which', [cmd], { stdio: 'pipe' }).status === 0;
}

function httpGet(url) {
  return new Promise((resolve, reject) => {
    const req = http.get(url, (res) => {
      let body = '';
      res.on('data', (c) => (body += c));
      res.on('end', () => resolve({ status: res.statusCode, body }));
    });
    req.on('error', reject);
    req.setTimeout(8000, () => {
      req.destroy();
      reject(new Error('timeout'));
    });
  });
}

async function main() {
  console.error('=== CERT-ONPREM-VALIDATION-01 — Homologação Enterprise ===\n');

  // PARTE 1
  record(
    'PARTE_1',
    'ecosystem.config.js (PM2 host)',
    fs.existsSync(path.join(REPO_ROOT, 'ecosystem.config.js')) ? 'PASS' : 'FAIL'
  );

  for (const [label, rel] of [
    ['ARCHITECTURE-01', 'backend/docs/CERT-ONPREM-ARCHITECTURE-01.md'],
    ['INFRA-01', 'backend/docs/CERT-ONPREM-INFRA-01.md'],
    ['DATA-01', 'backend/docs/CERT-ONPREM-DATA-01.md'],
    ['LICENSE-01', 'backend/docs/CERT-LICENSE-01.md'],
    ['CONTAINER-01', 'backend/docs/CERT-ONPREM-CONTAINER-01.md'],
    ['MATRIZ-CONTAINER', 'docker/MATRIZ-CONFORMIDADE-CONTAINER.md'],
  ]) {
    record('PARTE_1', `certificação ${label}`, fs.existsSync(path.join(REPO_ROOT, rel)) ? 'PASS' : 'FAIL', rel);
  }

  const adrs = fs.readdirSync(path.join(BACKEND_ROOT, 'docs/adrs')).filter((f) => f.startsWith('ADR-'));
  record('PARTE_1', `ADRs (${adrs.length}≥19)`, adrs.length >= 19 ? 'PASS' : 'FAIL');

  // PARTE 2 — PM2 ambiente actual
  try {
    execOk('node scripts/enterprise/verify-enterprise.js');
    record('PARTE_2', 'verify-enterprise.js', 'PASS');
  } catch (e) {
    record('PARTE_2', 'verify-enterprise.js', 'FAIL', e.stderr?.toString()?.slice(0, 300));
  }

  try {
    execOk('node src/tests/licenseEnterpriseScenarios.js');
    record('PARTE_2', 'license enterprise tests', 'PASS');
  } catch {
    record('PARTE_2', 'license enterprise tests', 'FAIL');
  }

  const port = process.env.PORT || 4000;
  const host = process.env.LISTEN_HOST || '127.0.0.1';
  try {
    const r = await httpGet(`http://${host}:${port}/health`);
    record(
      'PARTE_2',
      'GET /health',
      r.status === 200 && r.body.includes('ok') ? 'PASS' : 'FAIL',
      `HTTP ${r.status}`
    );
  } catch (e) {
    addNC('Alta', 'PARTE_2', 'Backend inacessível em /health', 'Smoke PM2 incompleto', e.message);
    record('PARTE_2', 'GET /health', 'FAIL', e.message);
  }

  try {
    execOk('node scripts/enterprise/update-precheck.js');
    record('PARTE_2', 'update-precheck.js', 'PASS');
  } catch (e) {
    const out = `${e.stdout || ''}${e.stderr || ''}`;
    if (out.includes('IMPETUS_ADMIN_JWT_SECRET')) {
      addNC(
        'Média',
        'PARTE_2',
        'IMPETUS_ADMIN_JWT_SECRET ausente no .env',
        'Precheck update falha; revisar configValidator vs perfil Enterprise (ADR-003)',
        'update-precheck.js'
      );
    }
    record('PARTE_2', 'update-precheck.js', 'FAIL', out.slice(0, 200));
  }

  record(
    'PARTE_2',
    'instalação limpa PM2 (VM dedicada)',
    'SKIP',
    'Executar conforme MANUAL-HOMOLOGACAO.md §2'
  );

  // PARTE 3 — Docker
  const hasDocker = commandExists('docker');
  if (!hasDocker) {
    addNC('Alta', 'PARTE_3', 'Docker engine indisponível', 'Homologação Docker bloqueada', 'which docker');
    record('PARTE_3', 'Docker engine', 'BLOCKED');
  } else {
    record('PARTE_3', 'Docker engine', 'PASS');
    try {
      execOk('bash docker/scripts/container-smoke.sh', { cwd: REPO_ROOT, timeout: 600000 });
      record('PARTE_3', 'container-smoke.sh', 'PASS');
    } catch (e) {
      record('PARTE_3', 'container-smoke.sh', 'FAIL', e.stderr?.toString()?.slice(0, 300));
    }
  }

  try {
    execOk("python3 -c \"import yaml; yaml.safe_load(open('docker-compose.yml'))\"", { cwd: REPO_ROOT });
    record('PARTE_3', 'docker-compose.yml syntax', 'PASS');
  } catch (e) {
    record('PARTE_3', 'docker-compose.yml syntax', 'FAIL', e.message);
  }

  record('PARTE_3', 'instalação limpa Docker', hasDocker ? 'SKIP' : 'BLOCKED', 'Ambiente limpo dedicado');

  // PARTES 4–11 — evidência manual obrigatória
  const manual = [
    ['PARTE_4', 'Compatibilidade PM2 × Docker', 'MANUAL-HOMOLOGACAO.md §4'],
    ['PARTE_5', 'Persistência multi-restart', 'MANUAL-HOMOLOGACAO.md §5'],
    ['PARTE_6', 'Backup + restore limpo', 'MANUAL-HOMOLOGACAO.md §6'],
    ['PARTE_7', 'Update A→B', 'MANUAL-HOMOLOGACAO.md §7'],
    ['PARTE_8', 'Rollback pós-falha', 'MANUAL-ROLLBACK.md'],
    ['PARTE_9', 'Regressão cognitiva E2E', 'MANUAL-HOMOLOGACAO.md §9'],
    ['PARTE_10', 'Segurança operacional', 'MANUAL-HOMOLOGACAO.md §10'],
    ['PARTE_11', 'Performance básica (medição)', 'MANUAL-HOMOLOGACAO.md §11'],
  ];
  for (const [part, name, ref] of manual) {
    record(part, name, 'SKIP', ref);
  }

  // Aprovação
  const hasCritical = report.non_conformities.some((n) => n.severity === 'Crítica' || n.severity === 'Alta');
  const hasFail = report.summary.failed > 0;
  const hasBlocked = report.summary.blocked > 0;
  const hasSkip = report.summary.skipped > 0;

  if (hasCritical || hasFail || hasBlocked || hasSkip) {
    report.status = hasFail || hasCritical ? 'EM_HOMOLOGACAO' : 'EM_HOMOLOGACAO';
    report.approval = 'PENDENTE';
    report.go_live_ready = false;
  } else {
    report.status = 'APROVADA';
    report.approval = 'HOMOLOGADA';
    report.go_live_ready = true;
  }

  report.verdict =
    report.go_live_ready
      ? 'Enterprise apta para distribuição a clientes'
      : 'Enterprise NÃO homologada — evidências manuais e/ou NCs pendentes';

  const out = JSON.stringify(report, null, 2);
  if (jsonOut) {
    console.log(out);
  } else {
    console.error('Resumo:', report.summary);
    console.error('Status:', report.status, '|', report.approval);
    console.error('Verdict:', report.verdict);
    if (report.non_conformities.length) {
      console.error('\nNão conformidades:');
      for (const nc of report.non_conformities) {
        console.error(`  ${nc.id} [${nc.severity}] ${nc.description}`);
      }
    }
    console.error('\nRelatório JSON: node scripts/enterprise/validation-homologation.js --json');
  }

  const evidenceDir = path.join(BACKEND_ROOT, 'docs/evidence/validation-01');
  fs.mkdirSync(evidenceDir, { recursive: true });
  const stamp = report.executed_at.replace(/[:.]/g, '-');
  fs.writeFileSync(path.join(evidenceDir, `homologation-${stamp}.json`), `${out}\n`);

  process.exit(report.go_live_ready ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
