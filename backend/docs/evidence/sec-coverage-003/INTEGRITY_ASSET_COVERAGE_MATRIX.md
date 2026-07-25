# INTEGRITY_ASSET_COVERAGE_MATRIX

**Emitido em:** 2026-07-23 20:31 UTC  
**Fase:** SEC-COVERAGE-003  
**Baseline:** IMPETUS-INTEGRITY-BASELINE-v2 v2.0

---

## Legenda

- **Hash / Perm / Owner:** flags do inventário  
- **Auditd:** cobertura em tempo real  
- **Status:** FULL = sem gaps de detecção relevantes; PARTIAL = ver nota

---

## CRITICAL (10)

| ID | Crit | Path | Hash | Perm | Owner | Auditd | Key | Status |
|---|---|---|---|---|---|---|---|---|
| INT-C-001 | CRITICAL | `/var/www/impetus-completa/backend/src/server.js` | ✓ | ✓ | ✓ | ✓ | impetus_repo_write | FULL |
| INT-C-002 | CRITICAL | `/var/www/impetus-completa/backend/.env` | ✓ | ✓ | ✓ | ✓ | impetus_env | FULL |
| INT-C-003 | CRITICAL | `/var/www/impetus-completa/ecosystem.runtime.config.cjs` | ✓ | ✓ | ✓ | ✓ | impetus_repo_write | FULL |
| INT-C-004 | CRITICAL | `/etc/nginx/sites-enabled/impetus` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-C-005 | CRITICAL | `/etc/nginx/snippets/impetus-cloudflare-proxy-guard.conf` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-C-006 | CRITICAL | `/etc/nginx/snippets/impetus-hardening-locations.conf` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-C-007 | CRITICAL | `/etc/letsencrypt/archive/plataformaimpetus.com/cert2.pem` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-C-008 | CRITICAL | `/etc/letsencrypt/archive/plataformaimpetus.com/privkey2.pem` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-C-009 | CRITICAL | `/etc/fail2ban/jail.d/impetus.conf` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-C-010 | CRITICAL | `/etc/audit/rules.d/impetus.rules` | ✓ | ✓ | ✓ | — | — | FULL |

## HIGH (23)

| ID | Crit | Path | Hash | Perm | Owner | Auditd | Key | Status |
|---|---|---|---|---|---|---|---|---|
| INT-H-001 | HIGH | `/var/www/impetus-completa/backend/src/services/adminPortalSecurityDashboardService.js` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-002 | HIGH | `/var/www/impetus-completa/backend/src/services/adminPortalSecurityIntelligenceService.js` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-003 | HIGH | `/var/www/impetus-completa/backend/src/security/cognitiveBoundaryGuard.js` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-004 | HIGH | `/var/www/impetus-completa/backend/src/security/contextExposureSanitizer.js` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-005 | HIGH | `/var/www/impetus-completa/backend/src/security/domainAccessMatrix.js` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-006 | HIGH | `/usr/local/bin/impetus-threat-watch.sh` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-H-007 | HIGH | `/usr/local/bin/impetus-breach-lockdown-engine.sh` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-H-008 | HIGH | `/usr/local/bin/impetus-emergency-lockdown.sh` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-H-009 | HIGH | `/usr/local/bin/impetus-audit-watch.sh` | ✓ | ✓ | ✓ | — | — | FULL |
| INT-H-010 | HIGH | `/var/www/impetus-completa/infra/scripts/impetus-security-observatory-ingest.sh` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-011 | HIGH | `/var/www/impetus-completa/infra/scripts/impetus-security-baseline-snapshot.sh` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-012 | HIGH | `/var/www/impetus-completa/infra/scripts/impetus-security-stack-verify.sh` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-013 | HIGH | `/var/www/impetus-completa/infra/scripts/deploy-fail2ban-impetus.sh` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-014 | HIGH | `/var/www/impetus-completa/infra/scripts/install-auditd-impetus.sh` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-015 | HIGH | `/var/www/impetus-completa/backend/package.json` | ✓ | — | ✓ | ✓ | impetus_repo_write | FULL |
| INT-H-016 | HIGH | `/etc/nginx/snippets/impetus-ip-allowlist.conf` | ✓ | — | ✓ | — | — | FULL |
| INT-H-017 | HIGH | `/etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf` | ✓ | — | ✓ | — | — | FULL |
| INT-H-018 | HIGH | `/etc/nginx/snippets/impetus-proxy.conf` | ✓ | — | ✓ | — | — | FULL |
| INT-H-019 | HIGH | `/etc/nginx/snippets/impetus-proxy-ws.conf` | ✓ | — | ✓ | — | — | FULL |
| INT-H-020 | HIGH | `/etc/cron.d/impetus-security-auto-audit` | ✓ | — | ✓ | — | — | FULL |
| INT-H-021 | HIGH | `/etc/cron.d/impetus-security-baseline` | ✓ | — | ✓ | — | — | FULL |
| INT-H-022 | HIGH | `/etc/cron.d/impetus-security-observatory` | ✓ | — | ✓ | — | — | FULL |
| INT-H-023 | HIGH | `/etc/cron.d/impetus-security-weekly-sim` | ✓ | — | ✓ | — | — | FULL |

## MEDIUM (5)

| ID | Crit | Path | Hash | Perm | Owner | Auditd | Key | Status |
|---|---|---|---|---|---|---|---|---|
| INT-M-001 | MEDIUM | `/var/www/impetus-completa/backend/src/routes/` | ✓ | — | — | ✓ | impetus_repo_write | FULL |
| INT-M-002 | MEDIUM | `/var/www/impetus-completa/backend/src/middleware/` | ✓ | — | — | ✓ | impetus_repo_write | FULL |
| INT-M-003 | MEDIUM | `/var/www/impetus-completa/infra/security/audit/impetus-audit.rules` | ✓ | — | — | ✓ | impetus_repo_write | FULL |
| INT-M-004 | MEDIUM | `/etc/letsencrypt/archive/plataformaimpetus.com/fullchain2.pem` | ✓ | — | ✓ | ✓ | impetus_tls_config | PARTIAL |
| INT-M-005 | MEDIUM | `/var/www/impetus-completa/backend/src/security/config/` | ✓ | — | — | ✓ | impetus_repo_write | FULL |

---

## Síntese

| Métrica | Valor |
|---|---|
| Inventário total | 38 |
| Runtime monitorados (baseline entries) | 35 |
| Uncovered | 0 |
| Fora do inventário | 0 |
| PARTIAL (higiene) | 1 (INT-M-004) |

### MEDIUM — modelo de cobertura

| ID | Mecanismo principal |
|---|---|
| INT-M-001, M-002, M-005 | `impetus_repo_write` (watch árvore) |
| INT-M-003 | Hash baseline + `impetus_repo_write` |
| INT-M-004 | Hash baseline + `impetus_tls_config` |
