#!/usr/bin/env node
'use strict';

/**
 * CERT-ENTERPRISE-ENV-QUALIFICATION-01 — Qualificação do ambiente de homologação
 *
 * Não altera código, configuração nem dados de produção.
 * Apenas audita recursos e pré-requisitos para VALIDATION-01 / ROLLBACK-01.
 *
 * Uso:
 *   node scripts/enterprise/environment-qualification.js
 *   node scripts/enterprise/environment-qualification.js --json
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

require('../../src/config/loadEnv').loadImpetusEnv();

const home = require('../../src/config/impetusHome');

const BACKEND_ROOT = path.join(__dirname, '../..');
const REPO_ROOT = path.join(BACKEND_ROOT, '..');
const EVIDENCE_DIR = path.join(BACKEND_ROOT, 'docs/evidence/environment-qualification-01');
const jsonOut = process.argv.includes('--json');

const MIN_DISK_GB = 10;
const PREFERRED_DISK_GB = 20;
const MIN_RAM_MB = 4096;

const report = {
  certification: 'CERT-ENTERPRISE-ENV-QUALIFICATION-01',
  title: 'Qualificação do Ambiente de Homologação Enterprise',
  executed_at: new Date().toISOString(),
  hostname: os.hostname(),
  status: 'EM_QUALIFICACAO',
  approval: 'PENDENTE',
  qualified_for_validation: false,
  parts: {},
  inventory: {},
  resources: {},
  dr_capacity: {},
  non_conformities: [],
  summary: { passed: 0, failed: 0, skipped: 0, blocked: 0 },
};

let ncSeq = 0;

function addNC(severity, part, description, impact, evidence, relatedCert) {
  ncSeq += 1;
  report.non_conformities.push({
    id: `NC-EQ${String(ncSeq).padStart(3, '0')}`,
    severity,
    part,
    description,
    impact,
    evidence,
    related_certification: relatedCert || null,
  });
}

function record(part, name, status, detail = '', extra = {}) {
  if (!report.parts[part]) report.parts[part] = { checks: [] };
  report.parts[part].checks.push({ name, status, detail: detail || undefined, ...extra });
  if (status === 'PASS') report.summary.passed += 1;
  else if (status === 'SKIP') report.summary.skipped += 1;
  else if (status === 'BLOCKED') report.summary.blocked += 1;
  else report.summary.failed += 1;
}

function exec(cmd, opts = {}) {
  return execSync(cmd, { encoding: 'utf8', stdio: 'pipe', timeout: 120000, ...opts }).trim();
}

function execSafe(cmd, fallback = '') {
  try {
    return exec(cmd);
  } catch {
    return fallback;
  }
}

function commandExists(cmd) {
  return spawnSync('which', [cmd], { stdio: 'pipe' }).status === 0;
}

function versionOf(cmd, args = '--version') {
  const bin = cmd.split(' ')[0];
  if (!commandExists(bin)) return null;
  const argMap = {
    openssl: 'version',
    nginx: '-v',
  };
  const actualArgs = argMap[bin] || args;
  try {
    const out = exec(`${cmd} ${actualArgs} 2>&1 | head -1`);
    return out.split('\n')[0].slice(0, 200);
  } catch {
    return null;
  }
}

function parseDfKb(mount) {
  try {
    const line = exec(`df -Pk "${mount}" 2>/dev/null | tail -1`);
    const parts = line.split(/\s+/);
    const totalKb = parseInt(parts[1], 10);
    const usedKb = parseInt(parts[2], 10);
    const availKb = parseInt(parts[3], 10);
    const usePct = parts[4] || '';
    return {
      mount,
      total_gb: +(totalKb / 1024 / 1024).toFixed(2),
      used_gb: +(usedKb / 1024 / 1024).toFixed(2),
      avail_gb: +(availKb / 1024 / 1024).toFixed(2),
      use_percent: usePct,
    };
  } catch {
    return { mount, error: 'df failed' };
  }
}

function dirSizeBytes(dir) {
  if (!fs.existsSync(dir)) return 0;
  try {
    const out = execSafe(`du -sb "${dir}" 2>/dev/null | cut -f1`, '0');
    return parseInt(out, 10) || 0;
  } catch {
    return 0;
  }
}

function largestBackupBytes() {
  const backupsDir = home.backupsDir();
  if (!fs.existsSync(backupsDir)) return 0;
  let max = 0;
  for (const name of fs.readdirSync(backupsDir)) {
    const p = path.join(backupsDir, name);
    if (!fs.statSync(p).isDirectory()) continue;
    const size = dirSizeBytes(p);
    if (size > max) max = size;
  }
  return max;
}

function testPersistence(baseDir) {
  const testDir = path.join(baseDir, `.env-qual-test-${Date.now()}`);
  const testFile = path.join(testDir, 'probe.txt');
  const payload = `env-qual-${Date.now()}`;
  try {
    fs.mkdirSync(testDir, { recursive: true });
    fs.writeFileSync(testFile, payload, 'utf8');
    const read = fs.readFileSync(testFile, 'utf8');
    if (read !== payload) return { ok: false, error: 'read mismatch' };
    fs.unlinkSync(testFile);
    fs.rmdirSync(testDir);
    return { ok: true };
  } catch (e) {
    try {
      if (fs.existsSync(testFile)) fs.unlinkSync(testFile);
      if (fs.existsSync(testDir)) fs.rmdirSync(testDir);
    } catch {
      /* ignore cleanup */
    }
    return { ok: false, error: e.message };
  }
}

function isWritable(dir) {
  try {
    fs.accessSync(dir, fs.constants.W_OK);
    return true;
  } catch {
    return false;
  }
}

function envVarSet(name) {
  const v = process.env[name];
  return v != null && String(v).trim() !== '';
}

function collectInventory() {
  const inv = {
    os: {
      platform: os.platform(),
      release: os.release(),
      arch: os.arch(),
      distro: execSafe('lsb_release -ds 2>/dev/null || cat /etc/os-release 2>/dev/null | head -5', 'unknown'),
    },
    cpu: {
      cores: os.cpus().length,
      model: os.cpus()[0]?.model || 'unknown',
    },
    memory: {
      total_mb: Math.round(os.totalmem() / 1024 / 1024),
      free_mb: Math.round(os.freemem() / 1024 / 1024),
    },
    node: process.version,
    versions: {
      node: versionOf('node'),
      npm: versionOf('npm'),
      openssl: versionOf('openssl'),
      pm2: versionOf('pm2'),
      docker: versionOf('docker'),
      docker_compose: commandExists('docker')
        ? versionOf('docker compose')
        : versionOf('docker-compose'),
      psql: versionOf('psql'),
      pg_restore: versionOf('pg_restore'),
      nginx: versionOf('nginx'),
      git: versionOf('git'),
    },
    layout: home.describeLayout(),
    user: {
      uid: process.getuid?.() ?? null,
      gid: process.getgid?.() ?? null,
      username: execSafe('whoami', process.env.USER || 'unknown'),
    },
  };
  report.inventory = inv;
  return inv;
}

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  console.error('=== CERT-ENTERPRISE-ENV-QUALIFICATION-01 ===\n');

  const inv = collectInventory();
  const layout = inv.layout;
  const impetusRoot = layout.impetus_home || BACKEND_ROOT;

  // PARTE 1 — Auditoria do host
  record('PARTE_1', 'SO identificado', inv.os.platform ? 'PASS' : 'FAIL', inv.os.distro.slice(0, 120));
  record('PARTE_1', 'CPU cores', inv.cpu.cores >= 2 ? 'PASS' : 'FAIL', `${inv.cpu.cores} cores`);
  record(
    'PARTE_1',
    'Memória total',
    inv.memory.total_mb >= MIN_RAM_MB ? 'PASS' : 'FAIL',
    `${inv.memory.total_mb} MB (mín ${MIN_RAM_MB} MB)`
  );

  const diskRoot = parseDfKb('/');
  const diskHome = parseDfKb(impetusRoot);
  report.resources.disk = { root: diskRoot, impetus_root: diskHome };

  record(
    'PARTE_1',
    'Disco / (root)',
    diskRoot.avail_gb >= MIN_DISK_GB ? 'PASS' : 'FAIL',
    `${diskRoot.avail_gb ?? '?'} GB livres (${diskRoot.use_percent || '?'})`
  );
  record(
    'PARTE_1',
    'Disco IMPETUS root',
    (diskHome.avail_gb ?? 0) >= MIN_DISK_GB ? 'PASS' : 'FAIL',
    `${diskHome.avail_gb ?? '?'} GB livres em ${impetusRoot}`
  );

  for (const [label, ver] of Object.entries(inv.versions)) {
    const required = ['node', 'openssl', 'psql'].includes(label);
    record('PARTE_1', `${label} versão`, ver ? 'PASS' : required ? 'FAIL' : 'SKIP', ver || 'não encontrado');
  }

  // PARTE 2 — Requisitos mínimos
  if (diskRoot.avail_gb < MIN_DISK_GB) {
    addNC(
      'Alta',
      'PARTE_2',
      `Espaço livre em disco insuficiente (${diskRoot.avail_gb} GB < ${MIN_DISK_GB} GB)`,
      'ROLLBACK-01 e VALIDATION-01 Parte 6/8 bloqueadas (falsas reprovações)',
      `df /: ${diskRoot.avail_gb} GB avail, ${diskRoot.use_percent}`,
      'CERT-ENTERPRISE-ROLLBACK-01'
    );
  }
  if (diskRoot.avail_gb < PREFERRED_DISK_GB) {
    record(
      'PARTE_2',
      'Disco preferencial ≥20 GB',
      'FAIL',
      `${diskRoot.avail_gb} GB (preferencial ${PREFERRED_DISK_GB} GB)`
    );
  } else {
    record('PARTE_2', 'Disco preferencial ≥20 GB', 'PASS', `${diskRoot.avail_gb} GB`);
  }

  record(
    'PARTE_2',
    'RAM disponível',
    inv.memory.free_mb >= 512 ? 'PASS' : 'WARN',
    `${inv.memory.free_mb} MB livres`
  );

  const hasDocker = commandExists('docker');
  const hasPm2 = commandExists('pm2');
  if (!hasDocker) {
    addNC(
      'Alta',
      'PARTE_2',
      'Docker Engine indisponível',
      'VALIDATION-01 Partes 3–4 bloqueadas',
      'which docker → not found',
      'CERT-ONPREM-VALIDATION-01'
    );
    record('PARTE_2', 'Docker funcional', 'FAIL', 'engine ausente');
  } else {
    try {
      exec('docker info >/dev/null 2>&1');
      record('PARTE_2', 'Docker funcional', 'PASS');
    } catch (e) {
      addNC('Alta', 'PARTE_2', 'Docker engine não responde', 'Homologação container bloqueada', e.message);
      record('PARTE_2', 'Docker funcional', 'FAIL', e.message?.slice(0, 120));
    }
  }

  if (!hasPm2) {
    addNC('Alta', 'PARTE_2', 'PM2 indisponível', 'Runtime PM2 não qualificado', 'which pm2');
    record('PARTE_2', 'PM2 funcional', 'FAIL', 'pm2 ausente');
  } else {
    try {
      exec('pm2 ping 2>/dev/null');
      record('PARTE_2', 'PM2 funcional', 'PASS');
    } catch {
      record('PARTE_2', 'PM2 funcional', 'FAIL', 'pm2 ping falhou');
    }
  }

  let pgOk = false;
  try {
    const h = process.env.DB_HOST || '127.0.0.1';
    const p = process.env.DB_PORT || '5432';
    const u = process.env.DB_USER || 'postgres';
    const db = process.env.DB_NAME || 'postgres';
    const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' };
    exec(`psql -h "${h}" -p "${p}" -U "${u}" -d "${db}" -t -A -c "SELECT 1"`, { env });
    pgOk = true;
    record('PARTE_2', 'PostgreSQL operacional', 'PASS', `${h}:${p}/${db}`);
  } catch (e) {
    addNC('Alta', 'PARTE_2', 'PostgreSQL inacessível', 'Backup/restore/homologação bloqueados', e.message?.slice(0, 200));
    record('PARTE_2', 'PostgreSQL operacional', 'FAIL', e.message?.slice(0, 120));
  }

  const requiredDirs = {
    config: home.configDir(),
    uploads: home.uploadsDir(),
    logs: home.logsDir(),
    data: home.dataDir(),
    database: layout.impetus_home ? path.join(layout.impetus_home, 'database') : path.join(BACKEND_ROOT, 'database'),
    backups: home.backupsDir(),
    runtime: home.runtimeDir(),
    licenses: home.licensesDir(),
  };

  for (const [name, dir] of Object.entries(requiredDirs)) {
    const exists = fs.existsSync(dir);
    const writable = exists && isWritable(dir);
    if (!exists) {
      try {
        fs.mkdirSync(dir, { recursive: true });
      } catch {
        /* read-only parent */
      }
    }
    const existsNow = fs.existsSync(dir);
    const writableNow = existsNow && isWritable(dir);
    if (!writableNow) {
      addNC(
        'Média',
        'PARTE_2',
        `Diretório ${name}/ sem escrita`,
        `Persistência ${name} comprometida`,
        dir,
        'CERT-ONPREM-DATA-01'
      );
    }
    record(
      'PARTE_2',
      `dir ${name}/`,
      writableNow ? 'PASS' : existsNow ? 'FAIL' : 'FAIL',
      `${dir} (write=${writableNow})`
    );
  }

  // PARTE 3 — Persistência
  const persistTargets = [
    ['EVIDENCE sandbox', EVIDENCE_DIR],
    ['backups/', home.backupsDir()],
    ['temp/', home.tempDir()],
  ];
  for (const [label, dir] of persistTargets) {
    fs.mkdirSync(dir, { recursive: true });
    const r = testPersistence(dir);
    record('PARTE_3', `CRUD ${label}`, r.ok ? 'PASS' : 'FAIL', r.error || 'ok');
    if (!r.ok) {
      addNC('Alta', 'PARTE_3', `Persistência falhou em ${label}`, 'DR/backup bloqueado', r.error, null);
    }
  }

  // PARTE 4 — Capacidade DR (verificação only)
  const backupBytes = largestBackupBytes();
  const backupGb = +(backupBytes / 1024 / 1024 / 1024).toFixed(2);
  const tempGb = 1;
  const walGb = 0.5;
  const logsGb = 0.25;
  const requiredDrGb = +(backupGb * 2 + tempGb + walGb + logsGb).toFixed(2);
  const availGb = Math.min(diskRoot.avail_gb ?? 0, diskHome.avail_gb ?? diskRoot.avail_gb ?? 0);

  report.dr_capacity = {
    largest_backup_gb: backupGb,
    required_for_full_dr_gb: requiredDrGb,
    available_gb: availGb,
    breakdown: {
      backup: backupGb,
      restore_duplicate: backupGb,
      temp_gb: tempGb,
      wal_buffer_gb: walGb,
      logs_buffer_gb: logsGb,
    },
    sufficient: availGb >= requiredDrGb,
  };

  record(
    'PARTE_4',
    'Espaço DR (backup+restore+temp)',
    availGb >= requiredDrGb ? 'PASS' : 'FAIL',
    `requer ~${requiredDrGb} GB, disponível ~${availGb} GB (backup ref ${backupGb} GB)`
  );
  if (availGb < requiredDrGb) {
    addNC(
      'Alta',
      'PARTE_4',
      `Capacidade DR insuficiente (disp. ${availGb} GB < req. ${requiredDrGb} GB)`,
      'ROLLBACK-01 restore físico impossível neste host',
      JSON.stringify(report.dr_capacity),
      'CERT-ENTERPRISE-ROLLBACK-01'
    );
  }

  // PARTE 5 — Docker (sem subir app)
  if (!hasDocker) {
    record('PARTE_5', 'Docker qualification', 'BLOCKED', 'engine ausente');
  } else {
    for (const [name, cmd] of [
      ['docker info', 'docker info --format "{{.ServerVersion}}" 2>/dev/null'],
      ['docker compose', 'docker compose version 2>/dev/null || docker-compose version 2>/dev/null'],
      ['docker network ls', 'docker network ls --format "{{.Name}}" 2>/dev/null | head -5'],
      ['docker volume ls', 'docker volume ls --format "{{.Name}}" 2>/dev/null | head -5'],
      ['docker images', 'docker images --format "{{.Repository}}:{{.Tag}}" 2>/dev/null | head -5'],
    ]) {
      try {
        const out = execSafe(cmd, '');
        record('PARTE_5', name, out ? 'PASS' : 'SKIP', out.slice(0, 100) || 'vazio');
      } catch (e) {
        record('PARTE_5', name, 'FAIL', e.message?.slice(0, 80));
      }
    }
    const composeFile = path.join(REPO_ROOT, 'docker-compose.yml');
    if (fs.existsSync(composeFile)) {
      try {
        exec(`python3 -c "import yaml; yaml.safe_load(open('${composeFile}'))"`);
        record('PARTE_5', 'docker-compose.yml syntax', 'PASS');
      } catch (e) {
        record('PARTE_5', 'docker-compose.yml syntax', 'FAIL', e.message?.slice(0, 80));
      }
    } else {
      record('PARTE_5', 'docker-compose.yml', 'FAIL', 'ficheiro ausente');
    }
  }

  // PARTE 6 — PM2
  if (!hasPm2) {
    record('PARTE_6', 'PM2 qualification', 'BLOCKED', 'pm2 ausente');
  } else {
    try {
      const list = execSafe('pm2 jlist 2>/dev/null', '[]');
      const apps = JSON.parse(list || '[]');
      record('PARTE_6', 'pm2 jlist', Array.isArray(apps) ? 'PASS' : 'FAIL', `${apps.length} processo(s)`);
      const backend = apps.find((a) => a.name === 'impetus-backend');
      const frontend = apps.find((a) => a.name === 'impetus-frontend');
      record('PARTE_6', 'impetus-backend', backend ? 'PASS' : 'SKIP', backend?.pm2_env?.status || 'não listado');
      record('PARTE_6', 'impetus-frontend', frontend ? 'PASS' : 'SKIP', frontend?.pm2_env?.status || 'não listado');
      if (backend) {
        const restarts = backend.pm2_env?.restart_time ?? backend.pm2_env?.unstable_restarts;
        record('PARTE_6', 'backend restarts', restarts != null ? 'PASS' : 'SKIP', String(restarts));
      }
    } catch (e) {
      record('PARTE_6', 'pm2 jlist', 'FAIL', e.message?.slice(0, 80));
    }

    const ecoPath = path.join(REPO_ROOT, 'ecosystem.config.js');
    record(
      'PARTE_6',
      'ecosystem.config.js',
      fs.existsSync(ecoPath) ? 'PASS' : 'FAIL',
      ecoPath
    );

    const logDir = execSafe('pm2 describe impetus-backend 2>/dev/null | grep "error log path" | head -1', '');
    record('PARTE_6', 'PM2 logs configurados', logDir ? 'PASS' : 'SKIP', logDir.slice(0, 100));
  }

  // PARTE 7 — Segurança ambiente (read-only)
  const runAsRoot = inv.user.username === 'root' || inv.user.uid === 0;
  record('PARTE_7', 'Utilizador execução', 'PASS', inv.user.username);
  if (runAsRoot) {
    addNC(
      'Média',
      'PARTE_7',
      'Homologação executada como root',
      'Desvio INFRA-01 (user dedicado impetus recomendado)',
      `uid=${inv.user.uid}`,
      'CERT-ONPREM-INFRA-01'
    );
  }

  record('PARTE_7', 'DATABASE_URL definida', envVarSet('DATABASE_URL') || envVarSet('DB_HOST') ? 'PASS' : 'FAIL');
  record('PARTE_7', 'JWT_SECRET definida', envVarSet('JWT_SECRET') ? 'PASS' : 'FAIL');
  record('PARTE_7', 'IMPETUS_ADMIN_JWT_SECRET', envVarSet('IMPETUS_ADMIN_JWT_SECRET') ? 'PASS' : 'FAIL');

  const ufw = execSafe('ufw status 2>/dev/null | head -3', '');
  record('PARTE_7', 'Firewall (ufw)', ufw ? 'PASS' : 'SKIP', ufw.replace(/\n/g, ' | ').slice(0, 120));

  const ports = execSafe('ss -tlnp 2>/dev/null | grep -E ":(3000|4000|5432|443|80)\\b" || true', '');
  record('PARTE_7', 'Portas críticas', ports ? 'PASS' : 'SKIP', ports.replace(/\n/g, ' | ').slice(0, 150));

  const certDir = home.certificatesDir();
  const letsencrypt = '/etc/letsencrypt/live';
  const hasCerts =
    fs.existsSync(certDir) || fs.existsSync(letsencrypt);
  record('PARTE_7', 'Certificados TLS', hasCerts ? 'PASS' : 'SKIP', certDir);

  // PARTE 8 — Evidências (este relatório)
  record('PARTE_8', 'Inventário host', 'PASS');
  record('PARTE_8', 'Utilização disco/memória', 'PASS');
  record('PARTE_8', 'Relatório conformidade', 'PASS');

  // PARTE 10 — Critérios aprovação
  const blockers = report.non_conformities.filter((nc) => nc.severity === 'Alta');
  const approved =
    blockers.length === 0 &&
    diskRoot.avail_gb >= MIN_DISK_GB &&
    hasDocker &&
    hasPm2 &&
    pgOk &&
    report.dr_capacity.sufficient;

  report.approval = approved ? 'APROVADA' : 'REPROVADA';
  report.status = 'CONCLUIDA';
  report.qualified_for_validation = approved;

  const ts = report.executed_at.replace(/[:.]/g, '-');
  const outFile = path.join(EVIDENCE_DIR, `env-qualification-${ts}.json`);
  const summaryFile = path.join(EVIDENCE_DIR, 'ENV-QUALIFICATION-01-SUMMARY.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    summaryFile,
    JSON.stringify(
      {
        certification: report.certification,
        executed_at: report.executed_at,
        hostname: report.hostname,
        decision: report.approval,
        qualified_for_validation: report.qualified_for_validation,
        disk_avail_gb: diskRoot.avail_gb,
        dr_required_gb: requiredDrGb,
        docker: hasDocker,
        pm2: hasPm2,
        postgresql: pgOk,
        non_conformities_count: report.non_conformities.length,
        alta_blockers: blockers.map((nc) => nc.id),
        full_report: path.basename(outFile),
      },
      null,
      2
    )
  );

  console.error(`\nDecisão: ${report.approval}`);
  console.error(`Qualificado para VALIDATION-01: ${approved ? 'SIM' : 'NÃO'}`);
  console.error(`NCs: ${report.non_conformities.length} (${blockers.length} Alta)`);
  console.error(`Evidência: ${outFile}\n`);

  if (jsonOut) {
    console.log(JSON.stringify(report, null, 2));
  }

  process.exit(approved ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
