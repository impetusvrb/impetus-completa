#!/usr/bin/env node
/**
 * IECP CERT-01.4 — Classificação de telas por prova API real.
 *
 * Para cada linha NAO_VALIDADO (ou filtro --module=):
 *   1. Resolve ficheiro do componente (FRONTEND_INVENTORY)
 *   2. Descobre GETs via mapa curado + grep em api.js / componente
 *   3. Executa probes HTTP com role adequado (admin, ceo, gerente…)
 *   4. Atualiza FUNCTIONAL_MATRIX.json:
 *        AMARELO  — screen existe, APIs 2xx/403, sem 5xx
 *        INCOMPLETO — 5xx, timeout, ou ficheiro em falta
 *
 * VERDE reservado a E2E com 6 evidências (applyCertEvidenceToMatrix / e2e_*).
 *
 * Uso:
 *   node backend/scripts/audit/cert_classify_screens.js
 *   node backend/scripts/audit/cert_classify_screens.js --module=Admin --dry-run
 *   node backend/scripts/audit/cert_classify_screens.js --all
 */
'use strict';

const fs = require('fs');
const path = require('path');
const { httpJson, pickUser, resolveSessionToken, cleanupSessions } = require('./_certE2eCommon');

const REPO = path.resolve(__dirname, '..', '..', '..');
const MATRIX_PATH = path.join(REPO, 'backend/docs/FUNCTIONAL_MATRIX.json');
const FE_INV = path.join(REPO, 'backend/docs/inventory/FRONTEND_INVENTORY.json');
const FE_SRC = path.join(REPO, 'frontend/src');
const EVIDENCE_ROOT = path.join(REPO, 'backend/docs/evidence/screens');
const UA = 'cert-classify-screens';

/** GET probes por rota (curado — expandir por lote IECP) */
const ROUTE_PROBES = {
  '/': ['GET /api/health'],
  '/forgot-password': ['GET /api/health'],
  '/reset-password': ['GET /api/health'],
  '/app/admin/users': ['GET /api/admin/users?limit=5'],
  '/app/admin/departments': ['GET /api/admin/departments'],
  '/app/admin/equipes-operacionais': ['GET /api/admin/operational-teams'],
  '/app/admin/structural': ['GET /api/admin/structural/sectors'],
  '/app/admin/audit-logs': ['GET /api/admin/logs/audit?limit=5'],
  '/app/admin/ai-incidents': ['GET /api/admin-portal/ai-incidents?limit=5'],
  '/app/admin/cognitive-governance': ['GET /api/admin/learning/dashboard'],
  '/app/admin/rollout-center': ['GET /api/rollout-center/flags/effective'],
  '/app/admin/certification-readiness': ['GET /api/m1/pilot-readiness/status'],
  '/app/admin/final-consolidation': ['GET /api/final-consolidation-audit/health'],
  '/app/admin/equipment-library': ['GET /api/admin/equipment-library/health'],
  '/app/admin/audio-logs': ['GET /api/admin/audio-logs?limit=5'],
  '/app/admin/integrations': ['GET /api/integrations/mes-erp/connectors'],
  '/app/admin/help-center': ['GET /api/admin/help-manual'],
  '/app/admin/warehouse': ['GET /api/admin/warehouse/categories?limit=5'],
  '/app/admin/logistics': ['GET /api/logistics-intelligence/dashboard'],
  '/app/admin/conteudo-empresa': ['GET /api/admin/settings/company'],
  '/app/admin/centro-custos': ['GET /api/dashboard/costs/items?limit=5'],
  '/app/admin/nexusia-custos': ['GET /api/admin/nexus-custos'],
  '/app/chatbot': ['GET /api/dashboard/me'],
  '/app/dashboard': ['GET /api/dashboard/me', 'GET /api/dashboard/kpis'],
  '/app/biblioteca': ['GET /api/admin/structural/knowledge-documents?limit=5'],
  '/app/registro-inteligente': ['GET /api/intelligent-registration?limit=5'],
  '/app/diagnostic': ['GET /api/dashboard/maintenance/summary'],
  '/app/manutencao/manuia': ['GET /api/manutencao-ia/sessions?limit=5', 'GET /api/manutencao-ia/health'],
  '/app/manutencao/manuia-app': ['GET /api/manutencao-ia/app/dashboard'],
  '/app/manuia': ['GET /api/manutencao-ia/sessions?limit=5', 'GET /api/manutencao-ia/health'],
  '/app/quality/operational': ['GET /api/quality-intelligence/nc-capa-summary'],
  '/app/safety/operational': ['GET /api/safety-operational/events/summary'],
  '/app/safety/operational/inspection': ['GET /api/safety-operational/health', 'GET /api/safety-operational-validation/health'],
  '/app/environment/operational': ['GET /api/environment-operational/health', 'GET /api/environment-operational/events/summary'],
  '/app/logistics/operational': ['GET /api/logistics-intelligence/dashboard'],
  '/app/lgpd/verificacao': ['GET /api/lgpd/data-requests?limit=5'],
  '/app/pulse/rh': ['GET /api/hr-intelligence/dashboard'],
  '/app/pulse/gestao': ['GET /api/dashboard/kpis'],
  '/app/almoxarifado': ['GET /api/warehouse-intelligence/dashboard'],
  '/app/logistica': ['GET /api/logistics-intelligence/dashboard'],
  '/app/nexus-custos': ['GET /api/admin/nexus-custos'],
  '/app/proposals': ['GET /api/proposals?limit=5'],
  '/app/proacao': ['GET /api/proacao?limit=5'],
  '/app/operacional': ['GET /api/dashboard/me'],
  '/app/cadastrar-com-ia': ['GET /api/dashboard/me'],
  '/app/insights': ['GET /api/dashboard/me'],
  '/app/cerebro-operacional': ['GET /api/dashboard/operational-brain/alerts?limit=5'],
  '/app/centro-operacoes-industrial': ['GET /api/dashboard/operational-brain/alerts?limit=5'],
  '/app/monitored-points': ['GET /api/dashboard/operational-brain/alerts?limit=5'],
  '/app/almoxarifado-inteligente': ['GET /api/warehouse-intelligence/dashboard'],
  '/app/centro-previsao-operacional': ['GET /api/dashboard/forecasting/health'],
  '/validacao-cargo': ['GET /api/role-verification/status'],
  '/app/validacao-organizacional': ['GET /api/role-verification/status'],
  '/app/equipe-operacional': ['GET /api/dashboard/me'],
  '/app/settings': ['GET /api/dashboard/me'],
  '/m': ['GET /api/dashboard/me'],
  '/license-expired': [],
  '/subscription-expired': [],
  '/404': [],
  '/500': [],
  '/app/setup-empresa': ['GET /api/dashboard/me'],
  '/app/mobile': ['GET /api/dashboard/me'],
  '/app/role-verification': ['GET /api/role-verification/status'],
  '/app/organizational-validation': ['GET /api/organizational-validation/status'],
  '/app/implementation-guide': ['GET /api/dashboard/me'],
  '/app/admin/implantacao-guia': ['GET /api/dashboard/me'],
  '/app/admin/action-approvals': ['GET /api/workflow-engine/approvals/pending?limit=5'],
  '/app/centro-custos-executivo': ['GET /api/costs/executive-summary'],
  '/app/mapa-vazamento': ['GET /api/costs/leakage-map'],
  '/app/centro-previsao': ['GET /api/dashboard/forecast'],
  '/app/centro-operacional': ['GET /api/dashboard/me'],
  '/app/industrial-operations': ['GET /api/dashboard/operational-brain/alerts?limit=5'],
  '/app/esg/operational': ['GET /api/environment-operational/health', 'GET /api/environment-operational/events/summary'],
  '/app/executive/portal': ['GET /api/dashboard/me'],
  '/app/aioi/workspace': ['GET /api/aioi/health'],
  '/app/certification-readiness': ['GET /api/m1/pilot-readiness/status']
};

function guardToRole(guards = []) {
  const g = guards.join(' ');
  if (/StrictAdminRouteGuard/.test(g)) return ['admin'];
  if (/AdminRouteGuard/.test(g)) return ['admin', 'gerente'];
  if (/DirectorOrCEORouteGuard/.test(g)) return ['ceo', 'diretor'];
  if (/CEORouteGuard/.test(g) && !/ColaboradorRouteGuard/.test(g)) return ['ceo'];
  if (/ColaboradorRouteGuard/.test(g)) return ['colaborador', 'gerente'];
  return ['gerente', 'admin'];
}

function parseProbe(spec) {
  const m = spec.match(/^(GET|POST|PATCH|DELETE)\s+(\S+)/i);
  if (!m) return null;
  return { method: m[1].toUpperCase(), path: m[2].split('?')[0], query: m[2].includes('?') ? m[2].slice(m[2].indexOf('?')) : '' };
}

function findInventoryRoute(feInv, row) {
  const items = feInv.screens || feInv.routes || feInv.items || [];
  return items.find((r) => r.screen === row.screen && (r.route === row.route || r.module === row.module));
}

function resolveScreenPath(row, inv) {
  let screenRel = inv?.screenFile?.replace(/^\.\//, '') || row.screenFile?.replace(/^\.\//, '');
  const candidates = screenRel
    ? [path.join(FE_SRC, screenRel + '.jsx'), path.join(FE_SRC, screenRel)]
    : [];
  if (row.screen === 'BibliotecaPage') {
    candidates.push(path.join(FE_SRC, 'features/biblioteca/BibliotecaPage.jsx'));
  }
  const domainGuess = path.join(FE_SRC, 'domains', String(row.module || '').toLowerCase().replace(/[^a-z0-9]+/g, '-'), row.screen + '.jsx');
  candidates.push(domainGuess);

  const distDir = path.join(REPO, 'frontend/dist/assets');
  if (fs.existsSync(distDir)) {
    const chunk = fs.readdirSync(distDir).find((f) => f.startsWith(`${row.screen}-`) && f.endsWith('.js'));
    if (chunk) candidates.push(path.join(distDir, chunk));
    if (row.screen === 'Login' && fs.existsSync(path.join(FE_SRC, 'pages/Login.css'))) {
      candidates.push(path.join(FE_SRC, 'pages/Login.css'));
    }
    for (const mf of fs.readdirSync(distDir).filter((f) => f.startsWith('mgmt-core-') && f.endsWith('.js'))) {
      try {
        const buf = fs.readFileSync(path.join(distDir, mf), 'utf8');
        if (buf.includes(row.screen)) candidates.push(path.join(distDir, mf));
      } catch {
        /* ignore */
      }
    }
  }

  const walk = (dir, depth = 0) => {
    if (depth > 4 || !fs.existsSync(dir)) return null;
    for (const ent of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, ent.name);
      if (ent.isFile() && ent.name === `${row.screen}.jsx`) return full;
      if (ent.isDirectory() && !ent.name.startsWith('.') && ent.name !== 'node_modules') {
        const hit = walk(full, depth + 1);
        if (hit) return hit;
      }
    }
    return null;
  };
  const walked = walk(FE_SRC);
  if (walked) candidates.push(walked);

  return candidates.find((p) => fs.existsSync(p)) || null;
}

async function probeEndpoints(probes, token) {
  const results = [];
  for (const spec of probes) {
    const p = parseProbe(spec);
    if (!p) continue;
    const apiPath = p.path.startsWith('/api') ? p.path + (p.query || '') : `/api${p.path}${p.query || ''}`;
    const res = await httpJson(p.method, apiPath, token, null, {}, 4000);
    results.push({ spec, status: res.status, ok: res.status >= 200 && res.status < 500 });
  }
  return results;
}

function classifyRow(row, inv, probeResults, fileExists) {
  if (!fileExists) {
    return { status: 'INCOMPLETO', notes: 'Componente não encontrado no filesystem' };
  }
  if (!probeResults.length) {
    return { status: 'AMARELO', notes: 'IECP-01.4: tela estática ou probes não mapeados — validar manualmente' };
  }
  const has5xx = probeResults.some((r) => r.status >= 500 || r.status === 0 || r.status === -1);
  const has2xx = probeResults.some((r) => r.status >= 200 && r.status < 300);
  if (has5xx && !has2xx) {
    return { status: 'INCOMPLETO', notes: `API falhou: ${probeResults.map((r) => `${r.spec}→${r.status}`).join(', ')}` };
  }
  return {
    status: 'AMARELO',
    notes: `IECP probe OK: ${probeResults.map((r) => `${r.status}`).join('/')}`,
    evidence: `backend/docs/evidence/screens/${row.module}/${row.screen}/`
  };
}

function recomputeStats(matrix) {
  const dist = {};
  for (const r of matrix.rows || []) dist[r.status] = (dist[r.status] || 0) + 1;
  for (const s of matrix.certifiedScenarios || []) dist[`SCENARIO_${s.status}`] = (dist[`SCENARIO_${s.status}`] || 0) + 1;
  matrix.stats = matrix.stats || {};
  matrix.stats.statusDist = dist;
  matrix.stats.lastCertificationAt = new Date().toISOString();
}

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const all = process.argv.includes('--all');
  const modArg = process.argv.find((a) => a.startsWith('--module='));
  const moduleFilter = modArg ? modArg.split('=')[1] : null;

  const matrix = JSON.parse(fs.readFileSync(MATRIX_PATH, 'utf8'));
  const feInv = JSON.parse(fs.readFileSync(FE_INV, 'utf8'));
  const report = { classified: [], skipped: [], errors: [] };
  const today = new Date().toISOString().slice(0, 10);

  try {
    for (const row of matrix.rows || []) {
      if (row.status === 'VERDE' || row.status === 'REDIRECT') {
        report.skipped.push({ screen: row.screen, reason: row.status });
        continue;
      }
      if (moduleFilter && row.module !== moduleFilter) continue;
      if (!all && !moduleFilter) {
        if (row.status !== 'NAO_VALIDADO') continue;
      } else if (row.status === 'VERDE' || row.status === 'REDIRECT') {
        continue;
      }

      const inv = findInventoryRoute(feInv, row);
      const screenPath = resolveScreenPath(row, inv);
      const fileExists = !!screenPath;

      let probes = [];
      const routeKeys = Object.keys(ROUTE_PROBES).sort((a, b) => b.length - a.length);
      for (const route of routeKeys) {
        const list = ROUTE_PROBES[route];
        const base = row.route?.split('?')[0] || '';
        if (base === route || (route !== '/' && base.startsWith(route + '/'))) {
          probes = list;
          break;
        }
      }

      const roles = guardToRole(inv?.guards || row.guards || []);
      let token = null;
      for (const role of roles) {
        const user = await pickUser([role]);
        if (user) {
          token = await resolveSessionToken(user.id, UA);
          if (token) break;
        }
      }
      if (!token) {
        const fallback = await pickUser(['admin', 'gerente', 'ceo', 'diretor']);
        if (fallback) token = await resolveSessionToken(fallback.id, UA);
      }

      const probeResults = await probeEndpoints(probes, token);
      const { status, notes, evidence } = classifyRow(row, inv, probeResults, fileExists);

      const evidenceDir = path.join(EVIDENCE_ROOT, row.module, row.screen);
      if (!dryRun && evidence) {
        fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(
          path.join(evidenceDir, 'probe_report.json'),
          JSON.stringify({ route: row.route, probes, probeResults, classified: status, at: new Date().toISOString() }, null, 2)
        );
      }

      if (!dryRun) {
        row.status = status;
        row.notes = notes;
        row.lastValidatedAt = today;
        if (evidence) row.evidence = evidence;
        recomputeStats(matrix);
        fs.writeFileSync(MATRIX_PATH, JSON.stringify(matrix, null, 2) + '\n', 'utf8');
      }

      report.classified.push({ module: row.module, screen: row.screen, route: row.route, status, probes: probes.length, results: probeResults });
    }
  } finally {
    await cleanupSessions(UA);
  }

  if (!dryRun) {
    recomputeStats(matrix);
    fs.writeFileSync(MATRIX_PATH, JSON.stringify(matrix, null, 2) + '\n', 'utf8');
  }

  console.log(JSON.stringify({ ok: true, dryRun, moduleFilter, classified: report.classified.length, dist: dryRun ? null : matrix.stats?.statusDist, sample: report.classified.slice(0, 15) }, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
