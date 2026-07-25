#!/usr/bin/env node
/**
 * P0 Storage Forensic Inventory — IMPETUS
 * Generates classification inventory and hashes for remediation manifest.
 * Does NOT delete anything.
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { execSync } = require('child_process');

const OUT_DIR = path.join(__dirname, '../docs/evidence/storage-remediation');
const INCIDENT_DATES = ['2026-07-02', '2026-07-03', '2026-07-05', '2026-07-06', '2026-07-07', '2026-07-13'];

function sha256File(filePath) {
  return new Promise((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (d) => hash.update(d));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', reject);
  });
}

function statEntry(p) {
  try {
    const s = fs.statSync(p);
    return {
      path: p,
      size_bytes: s.size,
      mtime_utc: s.mtime.toISOString(),
      owner: execSync(`stat -c '%U' '${p.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' }).trim(),
      group: execSync(`stat -c '%G' '${p.replace(/'/g, "'\\''")}'`, { encoding: 'utf8' }).trim(),
      permissions: (s.mode & 0o7777).toString(8),
      is_directory: s.isDirectory(),
    };
  } catch {
    return null;
  }
}

function classify(entry) {
  const p = entry.path;
  if (p === '/var/www/impetus-completa/backend/.env') return 'ACTIVE_RUNTIME';
  if (/\.env|env\.backup|env-recovery|environment-shadow|config\.env|backend\.env|frontend\.env/i.test(p)) return 'SECRET_BEARING_BACKUP';
  if (p.includes('/var/lib/postgresql')) return 'DATABASE_DATA';
  if (p.includes('/var/lib/apport/coredump')) return 'INCIDENT_EVIDENCE';
  if (p.includes('checkpoint_') && p.endsWith('.sql')) return 'DATABASE_BACKUP';
  if (p.includes('/backend/backups/')) return 'SECURE_BACKUP';
  if (p.includes('/docs/evidence/')) return 'CERTIFICATION_EVIDENCE';
  if (p.includes('/docs/evidence/security')) return 'INCIDENT_EVIDENCE';
  if (p.includes('/var/log/nginx')) return 'NGINX_LOG';
  if (p.includes('/var/log/fail2ban') || p.includes('/var/log/auth') || p.includes('/var/log/ufw')) return 'SECURITY_LOG';
  if (p.includes('/var/log/journal') || p.includes('/var/log/audit')) return 'SYSTEM_LOG';
  if (p.includes('/root/.pm2/logs')) return 'PM2_LOG';
  if (p.includes('/root/.cache') || p.includes('/var/cache')) return 'CACHE';
  if (p.includes('/root/.npm')) return 'DEPENDENCY_ARTIFACT';
  if (p.includes('/root/.cursor-server')) return 'CURSOR_ARTIFACT';
  if (p.includes('impetus_complete') && !p.includes('impetus-completa/backend')) return 'DUPLICATE';
  if (p.includes('_bk_untracked') || p.includes('RESTORE_TEST')) return 'DUPLICATE';
  if (p.includes('node_modules')) return 'DEPENDENCY_ARTIFACT';
  if (p.endsWith('/dist') || p.includes('/admin-portal/dist')) return 'BUILD_ARTIFACT';
  return 'UNKNOWN_REQUIRES_REVIEW';
}

function incidentRef(p, mtime) {
  const d = mtime.slice(0, 10);
  if (INCIDENT_DATES.includes(d)) return `INCIDENT_${d.replace(/-/g, '')}`;
  if (p.includes('P0_CLOUDFLARE') || p.includes('2026_07_13')) return 'INCIDENT_20260713';
  if (p.includes('apport/coredump')) return 'INCIDENT_20260711_20260713_OOM';
  return null;
}

async function main() {
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const diskBefore = execSync("df -h / | tail -1", { encoding: 'utf8' }).trim();

  const topPaths = [
    '/var/lib/postgresql',
    '/var/www/impetus-completa/backend/backups',
    '/var/lib/apport/coredump',
    '/var/www/impetus-completa/backend/.env',
    '/var/log/journal',
    '/var/log/nginx',
    '/root/.pm2/logs',
    '/root/.cache',
    '/root/.cursor-server',
    '/root/.npm',
    '/var/www/RESTORE_TEST',
    '/var/www/_bk_untracked_2026-03-03-0321',
    '/var/www/impetus-completa/impetus_complete',
    '/var/www/impetus-completa/backend/docs/evidence',
    '/var/www/impetus-completa/backend/docs/evidence/security',
    '/var/crash',
  ];

  const largeFiles = execSync(
    "find /var /root -xdev -type f -size +100M 2>/dev/null | head -80",
    { encoding: 'utf8', maxBuffer: 10 * 1024 * 1024 }
  ).trim().split('\n').filter(Boolean);

  const envFiles = execSync(
    "find /var/www/impetus-completa -iname '*.env*' -o -iname '*env*backup*' -o -iname '*env*bak*' 2>/dev/null | grep -v node_modules | head -60",
    { encoding: 'utf8', maxBuffer: 5 * 1024 * 1024 }
  ).trim().split('\n').filter(Boolean);

  const allPaths = [...new Set([...topPaths, ...largeFiles, ...envFiles])];
  const manifest = [];

  for (const p of allPaths) {
    const entry = statEntry(p);
    if (!entry) continue;
    const classification = classify(entry);
    const item = {
      original_path: p,
      size_bytes: entry.size_bytes,
      mtime_utc: entry.mtime_utc,
      owner: entry.owner,
      group: entry.group,
      permissions: entry.permissions,
      classification,
      incident_reference: incidentRef(p, entry.mtime_utc),
      contains_secrets: classification === 'SECRET_BEARING_BACKUP' || classification === 'ACTIVE_RUNTIME',
      secret_types: classification === 'SECRET_BEARING_BACKUP' || classification === 'ACTIVE_RUNTIME'
        ? ['REDACTED_CLASSIFICATION']
        : null,
      preservation_status: 'INVENTORY_RECORDED',
    };
    if (!entry.is_directory && entry.size_bytes < 500 * 1024 * 1024) {
      try {
        item.sha256 = await sha256File(p);
      } catch {
        item.sha256 = 'HASH_FAILED';
      }
    } else if (!entry.is_directory) {
      item.sha256 = 'DEFERRED_LARGE_FILE';
    }
    manifest.push(item);
  }

  const ranking = [
    { source: '/var/lib/postgresql', size: '49G', pct: '~51%', growth_risk: 'HIGH', classification: 'DATABASE_DATA' },
    { source: '/var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql', size: '19G', pct: '~20%', growth_risk: 'MEDIUM', classification: 'DATABASE_BACKUP' },
    { source: '/var/lib/apport/coredump', size: '11G', pct: '~11%', growth_risk: 'HIGH', classification: 'INCIDENT_EVIDENCE' },
    { source: '/var/www/impetus-completa/backend/backups (other)', size: '~3G', pct: '~3%', growth_risk: 'MEDIUM', classification: 'SECURE_BACKUP' },
    { source: '/var/log/journal', size: '809M', pct: '~0.8%', growth_risk: 'MEDIUM', classification: 'SYSTEM_LOG' },
    { source: '/root/.cache', size: '2G', pct: '~2%', growth_risk: 'LOW', classification: 'CACHE' },
    { source: '/var/www/RESTORE_TEST + duplicates', size: '~1.7G', pct: '~1.7%', growth_risk: 'NONE', classification: 'DUPLICATE' },
    { source: '/root/.cursor-server', size: '957M', pct: '~1%', growth_risk: 'MEDIUM', classification: 'CURSOR_ARTIFACT' },
    { source: '/root/.pm2/logs', size: '402M', pct: '~0.4%', growth_risk: 'MEDIUM', classification: 'PM2_LOG' },
  ];

  const output = {
    generated_at_utc: new Date().toISOString(),
    disk_before: diskBefore,
    incident_dates: INCIDENT_DATES,
    manifest_entries: manifest.length,
    entries: manifest,
    growth_ranking: ranking,
    root_cause: {
      primary: 'Accumulation of PostgreSQL data (49G) + monolithic SQL checkpoint backup (19G) + apport Node.js OOM core dumps (11G)',
      contributors: ['Repeated OOM crashes generating 2GB+ core dumps each', 'Single 19G checkpoint SQL retained on same volume as live DB', 'Cache/duplicate artefacts (~4G)'],
      aggravants: ['ENOSPC prevented log writes (nginx/rsyslog)', 'Pool exhaustion correlated with disk pressure', 'No automated alert/retention at 80-90%'],
    },
    active_env: {
      path: '/var/www/impetus-completa/backend/.env',
      classification: 'ACTIVE_RUNTIME',
      intact: fs.existsSync('/var/www/impetus-completa/backend/.env'),
      secret_present: true,
      secret_types: ['REDACTED_CLASSIFICATION'],
    },
    secret_backup_count: manifest.filter((e) => e.classification === 'SECRET_BEARING_BACKUP').length,
    awaiting_external_archive: true,
  };

  fs.writeFileSync(
    path.join(OUT_DIR, 'FORENSIC_MANIFEST_2026_07_13.json'),
    JSON.stringify(output, null, 2)
  );

  let md = `# FORENSIC MANIFEST — 2026-07-13\n\n`;
  md += `**Generated:** ${output.generated_at_utc}\n\n`;
  md += `**Disk:** ${diskBefore}\n\n`;
  md += `## Root Cause\n\n${output.root_cause.primary}\n\n`;
  md += `## Growth Ranking\n\n| SOURCE | SIZE | % | RISK | CLASS |\n|---|---|---|---|---|\n`;
  for (const r of ranking) {
    md += `| ${r.source} | ${r.size} | ${r.pct} | ${r.growth_risk} | ${r.classification} |\n`;
  }
  md += `\n## Manifest Entries (${manifest.length})\n\n`;
  md += `| PATH | SIZE | CLASS | SHA256 | INCIDENT |\n|---|---|---|---|---|\n`;
  for (const e of manifest.slice(0, 60)) {
    const sz = e.size_bytes > 1e9 ? `${(e.size_bytes / 1e9).toFixed(1)}G` : `${(e.size_bytes / 1e6).toFixed(1)}M`;
    md += `| \`${e.original_path}\` | ${sz} | ${e.classification} | ${(e.sha256 || '').slice(0, 16)}… | ${e.incident_reference || '-'} |\n`;
  }
  md += `\n**Secret-bearing backups identified:** ${output.secret_backup_count}\n`;
  md += `**Active .env intact:** ${output.active_env.intact}\n`;
  fs.writeFileSync(path.join(OUT_DIR, 'FORENSIC_MANIFEST_2026_07_13.md'), md);

  console.log('MANIFEST_WRITTEN', manifest.length, 'entries');
  console.log('SECRET_BACKUP_COUNT', output.secret_backup_count);
  console.log('ACTIVE_ENV_INTACT', output.active_env.intact);
}

main().catch((e) => {
  console.error('FATAL', e.message);
  process.exit(1);
});
