# Inventário Oficial de Activos Críticos — IMPETUS

**Documento:** INTEGRITY_ASSET_INVENTORY.md  
**Missão:** INT-01A  
**Data:** 2026-07-23  
**Status:** ASSET_INVENTORY_CREATED  
**Gerado em:** 2026-07-23T12:16:45Z

---

## 1. Resumo executivo

| Criticidade | Activos | Auditd coberto | Sem auditd |
|---|---|---|---|
| CRITICAL | 10 | 3 | 7 |
| HIGH | 23 | 9 | 14 |
| MEDIUM (grupos) | 5 | 3 | 2 |
| **Total** | **38** | **15** | **23** |

**Nota sobre cobertura auditd:** O auditd actual cobre apenas `/var/www/impetus-completa/` e `/etc/impetus/`. Activos críticos em `/etc/nginx/`, `/etc/fail2ban/`, `/etc/letsencrypt/` e `/etc/audit/` não têm cobertura auditd directa. A INT-01B adicionará regras auditd para estes paths.

---

## 2. Activos CRÍTICOS (10)

| ID | Activo | Caminho | Serviço | Perm | Owner | Auditd |
|---|---|---|---|---|---|---|
| INT-C-001 | server.js | `/var/www/impetus-completa/backend/src/server.js` | impetus-backend | 644 | root | ✔ repo_write |
| INT-C-002 | .env | `/var/www/impetus-completa/backend/.env` | impetus-backend | 600 | root | ✔ impetus_env |
| INT-C-003 | ecosystem.runtime.config.cjs | `/var/www/impetus-completa/ecosystem.runtime.config.cjs` | pm2 | 644 | root | ✔ repo_write |
| INT-C-004 | impetus (nginx site) | `/etc/nginx/sites-enabled/impetus` | nginx | 644 | root | — |
| INT-C-005 | cloudflare-proxy-guard.conf | `/etc/nginx/snippets/impetus-cloudflare-proxy-guard.conf` | nginx | 644 | root | — |
| INT-C-006 | hardening-locations.conf | `/etc/nginx/snippets/impetus-hardening-locations.conf` | nginx | 644 | root | — |
| INT-C-007 | cert.pem (TLS) | `/etc/letsencrypt/live/…/cert.pem` → cert2.pem | nginx | 644 | root | — |
| INT-C-008 | privkey.pem (TLS) | `/etc/letsencrypt/live/…/privkey.pem` → privkey2.pem | nginx | 600 | root | — |
| INT-C-009 | impetus.conf (fail2ban) | `/etc/fail2ban/jail.d/impetus.conf` | fail2ban | 644 | root | — |
| INT-C-010 | impetus.rules (auditd) | `/etc/audit/rules.d/impetus.rules` | auditd | 640 | root | — |

### Detalhe dos activos CRÍTICOS

#### INT-C-001 — server.js
- **Por que CRÍTICO:** Ponto de entrada do servidor. Modificação permite execução de código arbitrário.
- **Superfície de ataque:** SSH root, deploy, injecção de dependência.
- **Nota de permissão:** 644 aceitável; owner root obrigatório.

#### INT-C-002 — .env
- **Por que CRÍTICO:** Contém credenciais, chaves API, JWT secrets, strings de conexão DB.
- **Superfície de ataque:** SSH root, leitura não autorizada, cópia, substituição.
- **Nota de permissão:** 600 obrigatório. Qualquer mudança para 644+ é incidente imediato.
- **Auditd:** Já coberto por `impetus_env` — write e attribute changes.

#### INT-C-003 — ecosystem.runtime.config.cjs
- **Por que CRÍTICO:** Define variáveis de ambiente injectadas pelo PM2. Modificação pode alterar `NODE_ENV`, portas, ou injectar variáveis maliciosas.
- **Superfície de ataque:** Deploy, SSH root.

#### INT-C-004 — nginx site config
- **Por que CRÍTICO:** Controla proxy reverso, rate limiting, TLS, headers de segurança. Modificação pode desactivar protecções ou redirecionar tráfego.
- **GAP:** Sem cobertura auditd → adicionar em INT-01B.

#### INT-C-005 — cloudflare-proxy-guard.conf
- **Por que CRÍTICO:** Snippet que bloqueia acesso directo sem passar por Cloudflare. Remoção expõe servidor ao mundo.
- **GAP:** Sem cobertura auditd → adicionar em INT-01B.

#### INT-C-006 — hardening-locations.conf
- **Por que CRÍTICO:** Bloqueia acesso a `.env`, `.git`, `admin/`, `api/internal/`. Remoção expõe paths sensíveis.
- **GAP:** Sem cobertura auditd → adicionar em INT-01B.

#### INT-C-007 — cert.pem (TLS)
- **Por que CRÍTICO:** Certificado TLS activo. Substituição por cert inválido derruba HTTPS. Substituição por cert de atacante = MITM.
- **Nota:** Symlink → cert2.pem. certbot renewal legítimo gera cert3.pem e actualiza symlink. Baseline deve ser regenerado após renewal.
- **Perm observada:** 777 (no symlink) / 644 (no ficheiro real). O hash é calculado sobre o ficheiro real.

#### INT-C-008 — privkey.pem (TLS)
- **Por que CRÍTICO:** Chave privada TLS. Comprometimento = decifração de tráfego passado e futuro.
- **Perm observada:** 777 (no symlink) / 600 (no ficheiro real). O HashChecker deve seguir o symlink.
- **Nota:** ALTA SENSIBILIDADE — qualquer modificação fora de certbot renewal é incidente imediato.

#### INT-C-009 — impetus.conf (fail2ban)
- **Por que CRÍTICO:** Define jails de protecção. Modificação pode desactivar banimentos ou mudar thresholds para permitir bruteforce.
- **GAP:** Sem cobertura auditd → adicionar em INT-01B.

#### INT-C-010 — impetus.rules (auditd)
- **Por que CRÍTICO:** Define o próprio escopo de monitoramento do kernel. Modificação pode cegar o sistema de auditoria.
- **Nota especial:** O auditd não monitora a si mesmo por design. Cobertura via HashChecker (INT-01B).

---

## 3. Activos HIGH (23)

| ID | Activo | Caminho abreviado | Categoria | Auditd |
|---|---|---|---|---|
| INT-H-001 | adminPortalSecurityDashboardService.js | backend/src/services/ | BACKEND_SECURITY | ✔ |
| INT-H-002 | adminPortalSecurityIntelligenceService.js | backend/src/services/ | BACKEND_SECURITY | ✔ |
| INT-H-003 | cognitiveBoundaryGuard.js | backend/src/security/ | BACKEND_SECURITY | ✔ |
| INT-H-004 | contextExposureSanitizer.js | backend/src/security/ | BACKEND_SECURITY | ✔ |
| INT-H-005 | domainAccessMatrix.js | backend/src/security/ | BACKEND_SECURITY | ✔ |
| INT-H-006 | impetus-threat-watch.sh | /usr/local/bin/ | SCRIPT_SECURITY | — |
| INT-H-007 | impetus-breach-lockdown-engine.sh | /usr/local/bin/ | SCRIPT_SECURITY | — |
| INT-H-008 | impetus-emergency-lockdown.sh | /usr/local/bin/ | SCRIPT_SECURITY | — |
| INT-H-009 | impetus-audit-watch.sh | /usr/local/bin/ | SCRIPT_SECURITY | — |
| INT-H-010 | impetus-security-observatory-ingest.sh | infra/scripts/ | SCRIPT_INFRA | ✔ |
| INT-H-011 | impetus-security-baseline-snapshot.sh | infra/scripts/ | SCRIPT_INFRA | ✔ |
| INT-H-012 | impetus-security-stack-verify.sh | infra/scripts/ | SCRIPT_INFRA | ✔ |
| INT-H-013 | deploy-fail2ban-impetus.sh | infra/scripts/ | SCRIPT_INFRA | ✔ |
| INT-H-014 | install-auditd-impetus.sh | infra/scripts/ | SCRIPT_INFRA | ✔ |
| INT-H-015 | package.json | backend/ | BACKEND_CORE | ✔ |
| INT-H-016 | impetus-ip-allowlist.conf | /etc/nginx/snippets/ | CONFIG_NGINX | — |
| INT-H-017 | impetus-ip-allowlist-wrapper.conf | /etc/nginx/snippets/ | CONFIG_NGINX | — |
| INT-H-018 | impetus-proxy.conf | /etc/nginx/snippets/ | CONFIG_NGINX | — |
| INT-H-019 | impetus-proxy-ws.conf | /etc/nginx/snippets/ | CONFIG_NGINX | — |
| INT-H-020 | cron: impetus-security-auto-audit | /etc/cron.d/ | CONFIG_SECURITY_RULE | — |
| INT-H-021 | cron: impetus-security-baseline | /etc/cron.d/ | CONFIG_SECURITY_RULE | — |
| INT-H-022 | cron: impetus-security-observatory | /etc/cron.d/ | CONFIG_SECURITY_RULE | — |
| INT-H-023 | cron: impetus-security-weekly-sim | /etc/cron.d/ | CONFIG_SECURITY_RULE | — |

---

## 4. Activos MEDIUM (grupos e individuais)

| ID | Descrição | Path | Ficheiros | Auditd |
|---|---|---|---|---|
| INT-M-001 | Routes directory | backend/src/routes/ | 147 | ✔ |
| INT-M-002 | Middleware directory | backend/src/middleware/ | 48 | ✔ |
| INT-M-003 | impetus-audit.rules (source) | infra/security/audit/ | 1 | ✔ |
| INT-M-004 | fullchain2.pem | /etc/letsencrypt/archive/ | 1 | — |
| INT-M-005 | Security config directory | backend/src/security/config/ | — | ✔ |

---

## 5. Descobertas notáveis

### 5.1 Consistência de cópias confirmada

Dois pares de ficheiros apresentam hashes idênticos, confirmando consistência entre cópias:

| Par | Hash | Status |
|---|---|---|
| `/etc/audit/rules.d/impetus.rules` = `infra/security/audit/impetus-audit.rules` | `e22c16dc...` | ✔ IDÊNTICO |
| `/usr/local/bin/impetus-breach-lockdown-engine.sh` = `infra/scripts/impetus-breach-lockdown-engine.sh` | `3666a706...` | ✔ IDÊNTICO |

### 5.2 TLS — symlinks confirmados

Os ficheiros em `/etc/letsencrypt/live/` são symlinks para `/etc/letsencrypt/archive/`:
- `cert.pem` → `cert2.pem` (renewal #2 activo)
- `privkey.pem` → `privkey2.pem`
- `fullchain.pem` → `fullchain2.pem`

O HashChecker deve seguir os symlinks e hash o ficheiro real. Após certbot renewal, o symlink apontará para cert3.pem — o sensor detectará mudança de hash e evento `INTEGRITY_CERT_CHANGED` será gerado (suprimido se certbot em curso).

### 5.3 GAP de cobertura auditd

**23 activos** (10 CRITICAL + 13 HIGH incluindo nginx/crons/scripts /usr/local/) não estão cobertos pelo auditd actual. As regras auditd cobrem apenas `/var/www/impetus-completa/` e `/etc/impetus/`.

**Acção requerida em INT-01B:** Adicionar regras auditd para:
- `/etc/nginx/` (CRÍTICO — 6 activos)
- `/etc/fail2ban/` (CRÍTICO — 1 activo)
- `/etc/letsencrypt/` (CRÍTICO — 2 activos)
- `/etc/audit/` (CRÍTICO — 1 activo)
- `/usr/local/bin/impetus-*` (HIGH — 4 activos)
- `/etc/cron.d/impetus-*` (HIGH — 4 activos)

---

## 6. Fora de escopo — justificativa

Ver `INTEGRITY_BASELINE_POLICY.md` (FASE 6) para lista completa de exclusões justificadas.

Resumo:
- `node_modules/` — 150+ MB; instável por design; npm install é operação legítima
- `*.log` — voláteis por natureza; cobertura via AuditdBridge para operações destrutivas
- `uploads/`, `data/` — dados de utilizador; mutações legítimas constantes
- Build artifacts (`dist/`, `.cache/`) — gerados por pipeline; regeneráveis
- `/tmp/`, sockets, PID files — transitórios por design
