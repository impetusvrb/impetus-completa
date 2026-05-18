'use strict';

/**
 * ENVIRONMENT — Etapa 7 Shadow Activation Deploy (controlled, rollback-safe).
 * Uso: node scripts/environment-shadow-activation-deploy.js [--dry-run]
 */

const fs = require('fs');
const path = require('path');
const { execSync, spawnSync } = require('child_process');
const http = require('http');

const ROOT = path.join(__dirname, '..');
const REPO = path.join(ROOT, '..');
const FRONTEND = path.join(REPO, 'frontend');
const DRY_RUN = process.argv.includes('--dry-run');
const STAMP = new Date().toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
const BK = path.join(ROOT, 'backups', `environment-shadow-activation-${STAMP}`);

const BACKEND_FLAGS = `
# ─── ENVIRONMENT shadow activation (Etapa 7) ───
IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true
IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=shadow
IMPETUS_ENVIRONMENT_ROLLOUT_RUNTIME_ENABLED=true
IMPETUS_ENVIRONMENT_PUBLICATION_AUDIENCE_PREVIEW=true
`.trim();

const FRONTEND_FLAGS = `
# ─── ENVIRONMENT shadow activation (Etapa 7) ───
VITE_IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_NAVIGATION_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_OPERATIONAL_VISIBILITY_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_GOVERNANCE_VISIBILITY_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_VISIBILITY_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED=true
VITE_IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED=true
`.trim();

function log(msg) {
  console.log(`[environment-shadow-deploy] ${msg}`);
}

function mkdirp(p) {
  fs.mkdirSync(p, { recursive: true });
}

function run(cmd, cwd = ROOT, outFile = null) {
  log(`$ ${cmd}`);
  if (DRY_RUN) return { status: 0, stdout: '', stderr: '' };
  const opts = { cwd, encoding: 'utf8', shell: true, maxBuffer: 20 * 1024 * 1024 };
  const r = execSync(cmd, opts);
  if (outFile) fs.writeFileSync(outFile, r);
  return { status: 0, stdout: r, stderr: '' };
}

function appendFlagsBlock(filePath, block, marker) {
  let content = fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : '';
  if (content.includes(marker)) {
    const re = new RegExp(`# ─── ${marker}[\\s\\S]*?(?=\\n# ───|$)`, 'm');
    content = content.replace(re, '').trimEnd();
  }
  content = `${content}\n\n# ─── ${marker} ───\n${block}\n`;
  if (!DRY_RUN) fs.writeFileSync(filePath, content);
}

function httpGet(url) {
  return new Promise((resolve) => {
    const req = http.get(url, { timeout: 8000 }, (res) => {
      let body = '';
      res.on('data', (c) => {
        body += c;
      });
      res.on('end', () => resolve({ status: res.statusCode, body: body.slice(0, 200) }));
    });
    req.on('error', (e) => resolve({ status: 0, error: e.message }));
    req.on('timeout', () => {
      req.destroy();
      resolve({ status: 0, error: 'timeout' });
    });
  });
}

async function smokeTests(reportPath) {
  const base = process.env.IMPETUS_API_BASE || 'http://127.0.0.1:3000';
  const paths = [
    '/',
    '/api/health',
    '/api/environment-navigation/health',
    '/api/environment-operational/health',
    '/api/environment-governance/health',
    '/api/environment-telemetry/health',
    '/api/environment-cognitive/health',
    '/api/environment-executive/health',
    '/api/environment-activation/health'
  ];
  const lines = [];
  for (const p of paths) {
    const r = await httpGet(`${base}${p}`);
    const ok = r.status === 200 || r.status === 401;
    lines.push(`${p} => ${r.status || 'ERR'} ${r.error || ''} ${ok ? 'OK' : 'FAIL'}`);
  }
  if (!DRY_RUN) fs.writeFileSync(reportPath, lines.join('\n'));
  return lines;
}

async function main() {
  log(`stamp=${STAMP} dry_run=${DRY_RUN}`);

  mkdirp(path.join(BK, 'env'));
  mkdirp(path.join(BK, 'dist'));
  mkdirp(path.join(BK, 'reports'));
  mkdirp(path.join(BK, 'pm2'));
  mkdirp(path.join(BK, 'flags'));
  mkdirp(path.join(BK, 'logs'));

  const envFiles = [
    [path.join(ROOT, '.env'), path.join(BK, 'env', 'backend.env')],
    [path.join(FRONTEND, '.env.production'), path.join(BK, 'env', 'frontend.env.production')],
    [path.join(FRONTEND, '.env'), path.join(BK, 'env', 'frontend.env')]
  ];
  for (const [src, dst] of envFiles) {
    if (fs.existsSync(src)) fs.copyFileSync(src, dst);
  }
  const distSrc = path.join(FRONTEND, 'dist');
  if (fs.existsSync(distSrc)) {
    run(`cp -a "${distSrc}" "${path.join(BK, 'dist', 'frontend-dist-snapshot')}"`, REPO);
  }
  try {
    run(`pm2 jlist > "${path.join(BK, 'pm2', 'pm2-snapshot.json')}"`, REPO);
  } catch (_e) {
    /* optional */
  }

  const grepFlags = (file) => {
    if (!fs.existsSync(file)) return '';
    return fs
      .readFileSync(file, 'utf8')
      .split('\n')
      .filter((l) => /IMPETUS_ENVIRONMENT|VITE_IMPETUS_ENVIRONMENT/.test(l))
      .join('\n');
  };
  fs.writeFileSync(path.join(BK, 'flags', 'runtime-flags-before.txt'), grepFlags(path.join(ROOT, '.env')) + '\n' + grepFlags(path.join(FRONTEND, '.env.production')));

  appendFlagsBlock(path.join(ROOT, '.env'), BACKEND_FLAGS, 'ENVIRONMENT shadow activation (Etapa 7)');
  appendFlagsBlock(path.join(FRONTEND, '.env.production'), FRONTEND_FLAGS, 'ENVIRONMENT shadow activation (Etapa 7)');
  appendFlagsBlock(path.join(FRONTEND, '.env'), FRONTEND_FLAGS, 'ENVIRONMENT shadow activation (Etapa 7)');

  fs.writeFileSync(path.join(BK, 'flags', 'runtime-flags-after.txt'), grepFlags(path.join(ROOT, '.env')) + '\n' + grepFlags(path.join(FRONTEND, '.env.production')));

  try {
    require('dotenv').config({ path: path.join(ROOT, '.env') });
  } catch (_e) {
    /* dotenv optional */
  }

  const preflight = require('../src/domains/environment/activation/environmentShadowPreflightRuntime');
  const pre = preflight.runEnvironmentShadowPreflight();
  fs.writeFileSync(path.join(BK, 'reports', 'preflight-after-flags.json'), JSON.stringify(pre, null, 2));
  log(`preflight (after flags): ${pre.decision}`);
  if (!pre.go && !DRY_RUN) {
    throw new Error(`Preflight NO_GO: ${JSON.stringify(pre.checks)}`);
  }

  const tests = [
    'npm run test:environment-publication-runtime',
    'npm run test:environment-publication-activation',
    'npm run test:environment-shadow-stabilization',
    'npm run test:environment-runtime-validation',
    'npm run test:enterprise-runtime-validation'
  ];
  for (const t of tests) {
    try {
      run(t, ROOT, path.join(BK, 'reports', t.replace(/\s+/g, '-') + '.txt'));
    } catch (e) {
      fs.writeFileSync(path.join(BK, 'reports', t.replace(/\s+/g, '-') + '.txt'), String(e.stdout || e.message));
      if (!DRY_RUN) throw e;
    }
  }

  try {
    run('npm run test:environment-publication-runtime', FRONTEND, path.join(BK, 'reports', 'frontend-publication-runtime.txt'));
  } catch (e) {
    log(`frontend publication test warning: ${e.message}`);
  }

  if (!DRY_RUN) {
    const buildLog = path.join(BK, 'reports', 'vite-build.log');
    run(`npm run build 2>&1 | tee "${buildLog}"`, FRONTEND);
    run('pm2 reload impetus-frontend --update-env', REPO);
    run('pm2 reload impetus-backend --update-env', REPO);
    await new Promise((r) => setTimeout(r, 5000));
    const smoke = await smokeTests(path.join(BK, 'reports', 'smoke-post-reload.txt'));
    fs.writeFileSync(path.join(BK, 'reports', 'smoke-post-reload.txt'), smoke.join('\n'));
    try {
      run(`pm2 jlist > "${path.join(BK, 'pm2', 'pm2-post-reload.json')}"`, REPO);
    } catch (_e) {
      /* ignore */
    }
  }

  let post = pre;
  if (!DRY_RUN) {
    try {
      require('dotenv').config({ path: path.join(ROOT, '.env') });
    } catch (_e) {
      /* ignore */
    }
    post = preflight.runEnvironmentShadowPreflight();
    fs.writeFileSync(path.join(BK, 'reports', 'preflight-after-reload.json'), JSON.stringify(post, null, 2));
  }

  const reportMeta = {
    stamp: STAMP,
    backup: BK,
    dry_run: DRY_RUN,
    decision: post.go ? 'GO — SHADOW ACTIVE' : 'NO_GO',
    preflight: post
  };
  fs.writeFileSync(path.join(BK, 'reports', 'deploy-summary.json'), JSON.stringify(reportMeta, null, 2));
  log(`backup=${BK}`);
  log(`decision=${reportMeta.decision}`);
  console.log(JSON.stringify(reportMeta, null, 2));
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
