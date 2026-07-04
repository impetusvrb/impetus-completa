'use strict';

/**
 * SEC-19 — Catálogo de cenários de ataque simulados (sem tráfego real).
 */

const SCANNER_TARGETS = Object.freeze([
  { id: 'scan-env', path: '/.env', classification: 'PATH_ENUMERATION', severity: 'HIGH' },
  { id: 'scan-git', path: '/.git/config', classification: 'PATH_ENUMERATION', severity: 'HIGH' },
  { id: 'scan-docker', path: '/docker-compose.yml', classification: 'PATH_ENUMERATION', severity: 'MEDIUM' },
  { id: 'scan-backup', path: '/backup/db.sql', classification: 'PATH_ENUMERATION', severity: 'CRITICAL' },
  { id: 'scan-config', path: '/backend/.env.example', classification: 'CONFIG_PROBE', severity: 'MEDIUM' },
  { id: 'scan-credentials', path: '/api/auth/credentials', classification: 'CREDENTIAL_SCAN', severity: 'CRITICAL' }
]);

const ENUMERATION_TARGETS = Object.freeze([
  { id: 'enum-apis', path: '/api/v1', classification: 'API_ENUMERATION', severity: 'MEDIUM' },
  { id: 'enum-endpoints', path: '/api/audit/security-incidents', classification: 'API_ENUMERATION', severity: 'HIGH' },
  { id: 'enum-uploads', path: '/api/uploads', classification: 'UPLOAD_PROBE', severity: 'MEDIUM' },
  { id: 'enum-assets', path: '/frontend/dist/assets/', classification: 'ASSET_DISCOVERY', severity: 'LOW' },
  { id: 'enum-admin', path: '/api/admin', classification: 'ADMIN_PROBE', severity: 'CRITICAL' }
]);

const CRAWLING_AGENTS = Object.freeze([
  { id: 'crawl-gptbot', userAgent: 'GPTBot/1.0', classification: 'BOT_CRAWL', severity: 'MEDIUM' },
  { id: 'crawl-claudebot', userAgent: 'ClaudeBot/1.0', classification: 'BOT_CRAWL', severity: 'MEDIUM' },
  { id: 'crawl-generic', userAgent: 'python-requests/2.31.0', classification: 'GENERIC_CRAWL', severity: 'LOW' },
  { id: 'crawl-human', userAgent: 'Mozilla/5.0 Chrome/120', classification: 'HUMAN_BROWSER', severity: 'INFO' }
]);

const RECON_TECHNIQUES = Object.freeze([
  { id: 'recon-fingerprint', path: '/api/system/health/deep', classification: 'FINGERPRINT', severity: 'MEDIUM' },
  { id: 'recon-mass404', path: '/nonexistent-path-batch', classification: 'MASS_404', severity: 'HIGH', metrics: { requestCount: 5000 } },
  { id: 'recon-source', path: '/backend/src/server.js', classification: 'SOURCE_DISCOVERY', severity: 'CRITICAL' },
  { id: 'recon-robots', path: '/robots.txt', classification: 'ROBOTS_PROBE', severity: 'LOW' },
  { id: 'recon-favicon', path: '/favicon.ico', classification: 'FINGERPRINT', severity: 'INFO' },
  { id: 'recon-sourcemap', path: '/frontend/dist/assets/main.js.map', classification: 'SOURCE_MAP_PROBE', severity: 'HIGH' }
]);

const EXFILTRATION_PATTERNS = Object.freeze([
  { id: 'exfil-sequential', classification: 'DATA_EXFILTRATION', pattern: 'sequential_downloads', severity: 'HIGH' },
  { id: 'exfil-scraping', classification: 'SCRAPING', pattern: 'mass_scraping', severity: 'HIGH' },
  { id: 'exfil-chained', classification: 'CHAINED_DOWNLOAD', pattern: 'chained_downloads', severity: 'CRITICAL' },
  { id: 'exfil-mass-read', classification: 'MASS_READ', pattern: 'mass_read', severity: 'CRITICAL' },
  { id: 'exfil-critical', classification: 'SENSITIVE_ASSET_ACCESS', pattern: 'critical_assets', severity: 'CRITICAL' }
]);

const COMPOSITE_PHASES = Object.freeze([
  { phase: 'reconnaissance', classification: 'FINGERPRINT', severity: 'MEDIUM' },
  { phase: 'enumeration', classification: 'API_ENUMERATION', severity: 'HIGH' },
  { phase: 'credential_attempt', classification: 'CREDENTIAL_SCAN', severity: 'CRITICAL' },
  { phase: 'scraping', classification: 'SCRAPING', severity: 'HIGH' },
  { phase: 'movement', classification: 'DATA_EXFILTRATION', severity: 'CRITICAL' },
  { phase: 'shutdown', classification: 'SCAN_COMPLETE', severity: 'LOW', status: 'CLOSED' }
]);

const STRESS_TIERS = Object.freeze([5000, 10000, 20000, 50000]);

function getAllScenarios() {
  const scenarios = [];

  for (const t of SCANNER_TARGETS) {
    scenarios.push({ category: 'scanner', ...t, simulated: true });
  }
  for (const t of ENUMERATION_TARGETS) {
    scenarios.push({ category: 'enumeration', ...t, simulated: true });
  }
  for (const t of CRAWLING_AGENTS) {
    scenarios.push({ category: 'crawling', ...t, simulated: true });
  }
  for (const t of RECON_TECHNIQUES) {
    scenarios.push({ category: 'reconnaissance', ...t, simulated: true });
  }
  for (const t of EXFILTRATION_PATTERNS) {
    scenarios.push({ category: 'exfiltration', ...t, simulated: true, noRealDownload: true });
  }

  return scenarios;
}

module.exports = {
  SCANNER_TARGETS,
  ENUMERATION_TARGETS,
  CRAWLING_AGENTS,
  RECON_TECHNIQUES,
  EXFILTRATION_PATTERNS,
  COMPOSITE_PHASES,
  STRESS_TIERS,
  getAllScenarios
};
