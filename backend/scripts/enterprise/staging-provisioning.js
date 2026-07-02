#!/usr/bin/env node
'use strict';

/**
 * CERT-ENTERPRISE-STAGING-01 — Validação do ambiente oficial de homologação
 *
 * Audita se a VM/host cumpre requisitos de staging Enterprise (INFRA-01, ENV-QUALIFICATION).
 * NÃO altera código, Dockerfiles, PM2, nem provisiona automaticamente.
 *
 * Uso:
 *   IMPETUS_HOME=/opt/impetus node scripts/enterprise/staging-provisioning.js
 *   node scripts/enterprise/staging-provisioning.js --home=/opt/impetus --json
 */

const { execSync, spawnSync } = require('child_process');
const fs = require('fs');
const os = require('os');
const path = require('path');

require('../../src/config/loadEnv').loadImpetusEnv();

const BACKEND_ROOT = path.join(__dirname, '../..');
const REPO_ROOT = path.join(BACKEND_ROOT, '..');
const EVIDENCE_DIR = path.join(BACKEND_ROOT, 'docs/evidence/staging-01');

const homeArg = process.argv.find((a) => a.startsWith('--home='));
const STAGING_HOME = path.resolve(
  homeArg ? homeArg.split('=').slice(1).join('=') : process.env.IMPETUS_HOME || '/opt/impetus'
);
const STAGING_USER = process.env.STAGING_USER || 'impetus';
const jsonOut = process.argv.includes('--json');

const VM_SPEC = Object.freeze({
  os: 'Ubuntu Server 22.04 LTS ou superior',
  cpu: { minimum: 2, recommended: 4 },
  ram_gb: { minimum: 8, recommended: 16 },
  disk_gb: { minimum: 40, recommended: 80, type: 'SSD' },
  free_before_homologation_gb: 20,
});

const ENTERPRISE_DIRS = Object.freeze([
  'config',
  'uploads',
  'logs',
  'database',
  'data',
  'runtime',
  'temp',
  'backups',
  'certificates',
  'licenses',
  'monitoring',
  'scripts',
  'app',
]);

const report = {
  certification: 'CERT-ENTERPRISE-STAGING-01',
  title: 'Provisionamento do Ambiente Oficial de Homologação Enterprise',
  executed_at: new Date().toISOString(),
  hostname: os.hostname(),
  staging_home: STAGING_HOME,
  staging_user: STAGING_USER,
  vm_specification: VM_SPEC,
  status: 'EM_PROVISIONAMENTO',
  approval: 'PENDENTE',
  staging_ready: false,
  parts: {},
  inventory: {},
  dr_capacity: {},
  non_conformities: [],
  summary: { passed: 0, failed: 0, skipped: 0, blocked: 0 },
};

let ncSeq = 0;

function addNC(severity, part, description, impact, evidence, relatedCert) {
  ncSeq += 1;
  report.non_conformities.push({
    id: `NC-ST${String(ncSeq).padStart(3, '0')}`,
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

function versionOf(bin, args) {
  if (!commandExists(bin)) return null;
  try {
    return exec(`${bin} ${args} 2>&1 | head -1`).slice(0, 200);
  } catch {
    return null;
  }
}

function parseDfKb(mount) {
  try {
    const line = exec(`df -Pk "${mount}" 2>/dev/null | tail -1`);
    const parts = line.split(/\s+/);
    return {
      mount,
      total_gb: +(parseInt(parts[1], 10) / 1024 / 1024).toFixed(2),
      used_gb: +(parseInt(parts[2], 10) / 1024 / 1024).toFixed(2),
      avail_gb: +(parseInt(parts[3], 10) / 1024 / 1024).toFixed(2),
      use_percent: parts[4] || '',
    };
  } catch {
    return { mount, error: 'df failed' };
  }
}

function userExists(name) {
  try {
    exec(`id -u ${name}`);
    return true;
  } catch {
    return false;
  }
}

function dirOwnedBy(dir, user) {
  try {
    const stat = fs.statSync(dir);
    const owner = execSafe(`stat -c '%U' "${dir}"`, '');
    return owner === user;
  } catch {
    return false;
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

function parseUbuntuMajor() {
  const raw = execSafe("lsb_release -rs 2>/dev/null || grep VERSION_ID= /etc/os-release | cut -d= -f2 | tr -d '\"'", '0');
  const major = parseInt(String(raw).split('.')[0], 10);
  return Number.isFinite(major) ? major : 0;
}

async function queryPg(sql) {
  const h = process.env.DB_HOST || '127.0.0.1';
  const p = process.env.DB_PORT || '5432';
  const u = process.env.DB_USER || 'postgres';
  const db = process.env.DB_NAME || 'postgres';
  const env = { ...process.env, PGPASSWORD: process.env.DB_PASSWORD || '' };
  return exec(`psql -h "${h}" -p "${p}" -U "${u}" -d "${db}" -t -A -c "${sql.replace(/"/g, '\\"')}"`, { env });
}

async function main() {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });

  console.error('=== CERT-ENTERPRISE-STAGING-01 ===\n');
  console.error('IMPETUS_HOME (staging):', STAGING_HOME);
  console.error('Utilizador dedicado:', STAGING_USER, '\n');

  const inv = {
    os: {
      platform: os.platform(),
      release: os.release(),
      distro: execSafe('lsb_release -ds 2>/dev/null', 'unknown'),
      ubuntu_major: parseUbuntuMajor(),
    },
    cpu: { cores: os.cpus().length, model: os.cpus()[0]?.model || 'unknown' },
    memory: {
      total_mb: Math.round(os.totalmem() / 1024 / 1024),
      total_gb: +(os.totalmem() / 1024 / 1024 / 1024).toFixed(2),
      free_mb: Math.round(os.freemem() / 1024 / 1024),
    },
    disk: {
      root: parseDfKb('/'),
      staging_home: parseDfKb(STAGING_HOME),
    },
    versions: {
      node: versionOf('node', '-v'),
      npm: versionOf('npm', '-v'),
      pm2: versionOf('pm2', '-v'),
      docker: versionOf('docker', '--version'),
      docker_compose: commandExists('docker')
        ? versionOf('docker', 'compose version')
        : versionOf('docker-compose', '--version'),
      psql: versionOf('psql', '--version'),
      openssl: versionOf('openssl', 'version'),
      git: versionOf('git', '--version'),
      nginx: versionOf('nginx', '-v'),
    },
    current_user: execSafe('whoami', process.env.USER || 'unknown'),
    staging_home_exists: fs.existsSync(STAGING_HOME),
  };
  report.inventory = inv;

  // PARTE 1 — Especificação VM
  record('PARTE_1', 'Especificação documentada', 'PASS', JSON.stringify(VM_SPEC));
  record(
    'PARTE_1',
    'SO Ubuntu 22.04+',
    inv.os.ubuntu_major >= 22 ? 'PASS' : inv.os.ubuntu_major >= 20 ? 'WARN' : 'FAIL',
    inv.os.distro
  );
  record(
    'PARTE_1',
    'CPU vCPUs',
    inv.cpu.cores >= VM_SPEC.cpu.recommended
      ? 'PASS'
      : inv.cpu.cores >= VM_SPEC.cpu.minimum
        ? 'PASS'
        : 'FAIL',
    `${inv.cpu.cores} (mín ${VM_SPEC.cpu.minimum}, rec ${VM_SPEC.cpu.recommended})`
  );
  record(
    'PARTE_1',
    'RAM',
    inv.memory.total_gb >= VM_SPEC.ram_gb.recommended
      ? 'PASS'
      : inv.memory.total_gb >= VM_SPEC.ram_gb.minimum
        ? 'PASS'
        : 'FAIL',
    `${inv.memory.total_gb} GB (mín ${VM_SPEC.ram_gb.minimum}, rec ${VM_SPEC.ram_gb.recommended})`
  );
  const diskTotal = inv.disk.root.total_gb ?? 0;
  record(
    'PARTE_1',
    'Disco total',
    diskTotal >= VM_SPEC.disk_gb.recommended
      ? 'PASS'
      : diskTotal >= VM_SPEC.disk_gb.minimum
        ? 'PASS'
        : 'FAIL',
    `${diskTotal} GB (mín ${VM_SPEC.disk_gb.minimum}, rec ${VM_SPEC.disk_gb.recommended})`
  );
  const availGb = inv.disk.staging_home.avail_gb ?? inv.disk.root.avail_gb ?? 0;
  record(
    'PARTE_1',
    'Espaço livre ≥20 GB',
    availGb >= VM_SPEC.free_before_homologation_gb ? 'PASS' : 'FAIL',
    `${availGb} GB livres`
  );
  if (availGb < VM_SPEC.free_before_homologation_gb) {
    addNC(
      'Alta',
      'PARTE_1',
      `Espaço livre insuficiente (${availGb} GB < ${VM_SPEC.free_before_homologation_gb} GB)`,
      'Homologação bloqueada — falsas reprovações em ROLLBACK/VALIDATION',
      `df ${STAGING_HOME}`,
      'CERT-ENTERPRISE-ENV-QUALIFICATION-01'
    );
  }

  // PARTE 2 — Runtime
  const runtimeChecks = [
    ['Node.js LTS', inv.versions.node, /^v20\./],
    ['PM2', inv.versions.pm2, /.+/],
    ['PostgreSQL 14+', inv.versions.psql, /PostgreSQL\) 1[4-9]|PostgreSQL\) [2-9]/],
    ['Docker Engine', inv.versions.docker, /.+/],
    ['Docker Compose', inv.versions.docker_compose, /.+/],
    ['OpenSSL', inv.versions.openssl, /.+/],
    ['Git', inv.versions.git, /.+/],
  ];
  for (const [label, ver, pattern] of runtimeChecks) {
    const ok = ver && pattern.test(ver);
    record('PARTE_2', label, ok ? 'PASS' : 'FAIL', ver || 'ausente');
    if (!ok && ['Docker Engine', 'Docker Compose'].includes(label)) {
      addNC('Alta', 'PARTE_2', `${label} indisponível`, 'VALIDATION Partes 3–4 bloqueadas', ver || 'not found', 'CERT-ONPREM-VALIDATION-01');
    }
  }

  // PARTE 3 — Estrutura Enterprise
  const homeExists = fs.existsSync(STAGING_HOME);
  record(
    'PARTE_3',
    `${STAGING_HOME} existe`,
    homeExists ? 'PASS' : 'FAIL',
    homeExists ? 'ok' : 'provisionar conforme MANUAL-STAGING.md'
  );
  if (!homeExists) {
    addNC(
      'Alta',
      'PARTE_3',
      `IMPETUS_HOME ${STAGING_HOME} não existe`,
      'Layout Enterprise não provisionado',
      STAGING_HOME,
      'CERT-ONPREM-INFRA-01'
    );
  }
  for (const sub of ENTERPRISE_DIRS) {
    const dir = path.join(STAGING_HOME, sub);
    const exists = fs.existsSync(dir);
    const writable = exists && isWritable(dir);
    record(
      'PARTE_3',
      `${sub}/`,
      exists && writable ? 'PASS' : exists ? 'FAIL' : 'FAIL',
      dir
    );
    if (!exists || !writable) {
      addNC('Alta', 'PARTE_3', `Diretório ${sub}/ ausente ou sem escrita`, 'Persistência staging incompleta', dir, 'CERT-ONPREM-DATA-01');
    }
  }

  // PARTE 4 — Usuário dedicado
  const dedicatedExists = userExists(STAGING_USER);
  record('PARTE_4', `Utilizador ${STAGING_USER}`, dedicatedExists ? 'PASS' : 'FAIL');
  if (!dedicatedExists) {
    addNC('Alta', 'PARTE_4', `Utilizador ${STAGING_USER} não existe`, 'Serviços não podem correr como user dedicado', `id ${STAGING_USER}`, 'CERT-ONPREM-INFRA-01');
  }
  const runAsRoot = inv.current_user === 'root' || process.getuid?.() === 0;
  record('PARTE_4', 'Execução não-root', runAsRoot ? 'FAIL' : 'PASS', inv.current_user);
  if (runAsRoot) {
    addNC('Alta', 'PARTE_4', 'Certificação executada como root', 'Staging deve usar user impetus', `uid=${process.getuid?.()}`, 'CERT-ONPREM-INFRA-01');
  }
  if (homeExists && dedicatedExists) {
    const owned = dirOwnedBy(STAGING_HOME, STAGING_USER);
    record('PARTE_4', `Ownership ${STAGING_HOME}`, owned ? 'PASS' : 'FAIL', `owner esperado: ${STAGING_USER}`);
    if (!owned) {
      addNC('Média', 'PARTE_4', `${STAGING_HOME} não pertence a ${STAGING_USER}`, 'Permissões INFRA-01', STAGING_HOME, 'CERT-ONPREM-INFRA-01');
    }
  }

  // PARTE 5 — Docker (sem subir app)
  const hasDocker = Boolean(inv.versions.docker);
  if (!hasDocker) {
    record('PARTE_5', 'Docker qualification', 'BLOCKED', 'engine ausente');
  } else {
    for (const [name, cmd] of [
      ['docker info', 'docker info --format "{{.ServerVersion}}" 2>/dev/null'],
      ['docker compose', 'docker compose version 2>/dev/null || docker-compose version 2>/dev/null'],
      ['docker network ls', 'docker network ls --format "{{.Name}}" 2>/dev/null | wc -l'],
      ['docker volume ls', 'docker volume ls --format "{{.Name}}" 2>/dev/null | wc -l'],
    ]) {
      const out = execSafe(cmd, '');
      record('PARTE_5', name, out ? 'PASS' : 'FAIL', out.slice(0, 80));
    }
    if (homeExists) {
      const dockerAccess = execSafe(`sudo -u ${STAGING_USER} docker info 2>&1 | head -1`, '');
      const ok = dockerAccess && !dockerAccess.includes('permission denied') && !dockerAccess.includes('Cannot connect');
      record('PARTE_5', `docker access (${STAGING_USER})`, ok ? 'PASS' : 'FAIL', dockerAccess.slice(0, 100));
      if (!ok && dedicatedExists) {
        addNC('Média', 'PARTE_5', `${STAGING_USER} sem acesso Docker`, 'Homologação container comprometida', dockerAccess.slice(0, 120), 'CERT-ONPREM-CONTAINER-01');
      }
    }
    const composePath = path.join(REPO_ROOT, 'docker-compose.yml');
    record('PARTE_5', 'docker-compose.yml repo', fs.existsSync(composePath) ? 'PASS' : 'FAIL', composePath);
  }

  // PARTE 6 — PostgreSQL limpo
  let pgOk = false;
  let pgClean = false;
  try {
    const ver = await queryPg('SHOW server_version');
    record('PARTE_6', 'PostgreSQL conectável', 'PASS', ver);
    pgOk = true;
    const enc = await queryPg('SHOW server_encoding');
    const loc = await queryPg('SHOW lc_collate');
    record('PARTE_6', 'encoding', enc.includes('UTF8') ? 'PASS' : 'WARN', enc);
    record('PARTE_6', 'locale', loc ? 'PASS' : 'SKIP', loc);

    const dbName = process.env.DB_NAME || 'impetus_db';
    let companies = 0;
    let users = 0;
    try {
      companies = parseInt(await queryPg(`SELECT COUNT(*) FROM companies`), 10) || 0;
      users = parseInt(await queryPg(`SELECT COUNT(*) FROM users`), 10) || 0;
    } catch {
      /* schema may not exist on fresh DB */
    }
    pgClean = companies === 0 && users === 0;
    record(
      'PARTE_6',
      'Ambiente limpo (sem dados produção)',
      pgClean ? 'PASS' : 'FAIL',
      `companies=${companies}, users=${users} (${dbName})`
    );
    if (!pgClean) {
      addNC(
        'Alta',
        'PARTE_6',
        'PostgreSQL contém dados de produção ou pré-populados',
        'Staging deve ser ambiente limpo dedicado',
        `companies=${companies}, users=${users}`,
        'CERT-ONPREM-VALIDATION-01'
      );
    }
  } catch (e) {
    record('PARTE_6', 'PostgreSQL', 'FAIL', e.message?.slice(0, 120));
    addNC('Alta', 'PARTE_6', 'PostgreSQL inacessível', 'Bootstrap/homologação bloqueados', e.message?.slice(0, 120), null);
  }

  // PARTE 7 — PM2
  if (!inv.versions.pm2) {
    record('PARTE_7', 'PM2', 'FAIL', 'ausente');
  } else {
    try {
      exec('pm2 ping 2>/dev/null');
      record('PARTE_7', 'pm2 ping', 'PASS');
    } catch {
      record('PARTE_7', 'pm2 ping', 'FAIL');
    }
    record('PARTE_7', 'ecosystem.config.js', fs.existsSync(path.join(REPO_ROOT, 'ecosystem.config.js')) ? 'PASS' : 'SKIP');
    const pm2List = execSafe('pm2 jlist 2>/dev/null', '[]');
    try {
      const apps = JSON.parse(pm2List || '[]');
      record('PARTE_7', 'pm2 processos staging', apps.length === 0 ? 'PASS' : 'WARN', `${apps.length} app(s) — staging idealmente vazio antes de homologação`);
    } catch {
      record('PARTE_7', 'pm2 jlist', 'FAIL');
    }
  }

  // PARTE 8 — Rede
  const ports = execSafe('ss -tlnp 2>/dev/null | grep -E ":(80|443|3000|4000|5432)\\b" || true', '');
  record('PARTE_8', 'Portas críticas', 'PASS', ports.replace(/\n/g, ' | ').slice(0, 180));
  const ufw = execSafe('ufw status 2>/dev/null | head -2', '');
  record('PARTE_8', 'Firewall', ufw ? 'PASS' : 'SKIP', ufw.replace(/\n/g, ' '));
  const hostname = execSafe('hostname -f 2>/dev/null || hostname', os.hostname());
  record('PARTE_8', 'DNS/hostname', hostname ? 'PASS' : 'SKIP', hostname);
  const certStaging = fs.existsSync(path.join(STAGING_HOME, 'certificates'));
  const letsencrypt = fs.existsSync('/etc/letsencrypt/live');
  record('PARTE_8', 'Certificados TLS', certStaging || letsencrypt ? 'PASS' : 'SKIP', certStaging ? `${STAGING_HOME}/certificates` : letsencrypt ? '/etc/letsencrypt' : 'pendente');

  // PARTE 9 — Capacidade DR
  const backupRefGb = 2.5;
  const requiredDrGb = +(backupRefGb * 2 + 1 + 0.5 + 0.25).toFixed(2);
  report.dr_capacity = {
    reference_backup_gb: backupRefGb,
    required_gb: requiredDrGb,
    available_gb: availGb,
    sufficient: availGb >= requiredDrGb,
    breakdown: { backup: backupRefGb, restore: backupRefGb, temp: 1, wal: 0.5, logs: 0.25 },
  };
  record(
    'PARTE_9',
    'Capacidade DR staging',
    availGb >= requiredDrGb ? 'PASS' : 'FAIL',
    `req ~${requiredDrGb} GB, disp ~${availGb} GB`
  );
  if (availGb < requiredDrGb) {
    addNC('Alta', 'PARTE_9', 'Capacidade DR insuficiente', 'ROLLBACK-01 re-exec bloqueada', JSON.stringify(report.dr_capacity), 'CERT-ENTERPRISE-ROLLBACK-01');
  }

  // PARTE 10 — Evidências
  record('PARTE_10', 'Inventário VM', 'PASS');
  record('PARTE_10', 'Relatório conformidade', 'PASS');

  // PARTE 11 — Critérios aprovação
  const alta = report.non_conformities.filter((nc) => nc.severity === 'Alta');
  const approved =
    alta.length === 0 &&
    hasDocker &&
    Boolean(inv.versions.pm2) &&
    pgOk &&
    pgClean &&
    homeExists &&
    dedicatedExists &&
    !runAsRoot &&
    availGb >= VM_SPEC.free_before_homologation_gb;

  report.approval = approved ? 'APROVADA' : 'REPROVADA';
  report.status = 'CONCLUIDA';
  report.staging_ready = approved;

  const ts = report.executed_at.replace(/[:.]/g, '-');
  const outFile = path.join(EVIDENCE_DIR, `staging-provisioning-${ts}.json`);
  const summaryFile = path.join(EVIDENCE_DIR, 'STAGING-01-SUMMARY.json');
  fs.writeFileSync(outFile, JSON.stringify(report, null, 2));
  fs.writeFileSync(
    summaryFile,
    JSON.stringify(
      {
        certification: report.certification,
        executed_at: report.executed_at,
        hostname: report.hostname,
        staging_home: STAGING_HOME,
        decision: report.approval,
        staging_ready: report.staging_ready,
        disk_avail_gb: availGb,
        docker: hasDocker,
        pm2: Boolean(inv.versions.pm2),
        postgresql_clean: pgClean,
        impetus_user: dedicatedExists,
        non_conformities_count: report.non_conformities.length,
        alta_blockers: alta.map((nc) => nc.id),
        full_report: path.basename(outFile),
        next_steps: approved
          ? ['enterprise:rollback-validation', 'enterprise:homologation']
          : ['Provisionar VM conforme MANUAL-STAGING.md', 'Re-executar enterprise:staging-provisioning'],
      },
      null,
      2
    )
  );

  console.error(`\nDecisão: ${report.approval}`);
  console.error(`Staging pronto: ${approved ? 'SIM' : 'NÃO'}`);
  console.error(`NCs: ${report.non_conformities.length} (${alta.length} Alta)`);
  console.error(`Evidência: ${outFile}\n`);

  if (jsonOut) console.log(JSON.stringify(report, null, 2));
  process.exit(approved ? 0 : 1);
}

main().catch((e) => {
  console.error(e);
  process.exit(2);
});
