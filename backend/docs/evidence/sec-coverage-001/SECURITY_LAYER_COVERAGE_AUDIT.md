# SEC-COVERAGE-001 — Auditoria de Cobertura das Camadas de Proteção

**Missão:** SEC-COVERAGE-001  
**Data:** 2026-07-23  
**Depende de:** SEC-OBS-001 (concluída 2026-07-23)  
**Modo:** Auditoria com patches apenas de defeitos comprovados  
**FORENSIC_EVIDENCE_PRESERVED:** TRUE  
**STORAGE_REMEDIATION_UNTOUCHED:** TRUE

---

## Princípio operacional

OBSERVADA ≠ inactiva. O painel representa postura por origem, não inventário global de posture. Cada estado deve ter critério objectivo e reproducível.

---

## FASE 1 — Inventário completo das 20 camadas

| # | ID | Nome | Implementada | Habilitada | Em Produção | Fonte de Telemetria | Serviço Responsável | Arquivo Responsável | Dependências |
|---|----|----|---|---|---|---|---|---|---|
| 01 | NGINX | Firewall de Rede (Nginx) | Sim | Sim | Sim | `access.log` (status 444/403/401/404-scan) | Nginx | `adminPortalSecurityDashboardService.js` → `countNginxSuspicious()` | `NGINX_ACCESS`, regex `NGINX_LINE_RE` |
| 02 | FAIL2BAN | Proteção Automática | Sim | Sim | Sim | `fail2ban-client status <jail>` | fail2ban (4 jails activos) | `adminPortalSecurityDashboardService.js` → `getFail2ban()` | jails: `impetus-auth-fail`, `impetus-nginx-scan`, `nginx-limit-req`, `sshd` |
| 03 | UFW | Firewall de Host | Sim | Sim | Sim | `ufw status numbered` (DENY IN) | UFW (kernel netfilter) | `adminPortalSecurityDashboardService.js` → `getUfwBlocks()` | `ufw` CLI; 348 regras DENY |
| 04 | CLOUDFLARE | Filtragem IP/Geoloc | Sim (proxy guard) | Sim | Sim | Ficheiro local nginx snippet | Cloudflare CDN + nginx | `adminPortalSecurityDashboardService.js` → `getInfrastructureStatus()` | `/etc/nginx/snippets/impetus-cloudflare-proxy-guard.conf` |
| 05 | RATE_LIMIT | Rate Limiting (Nginx) | Sim | Sim | Sim | `error.log` (limiting requests) + nginx.conf | Nginx `limit_req` | `adminPortalSecurityDashboardService.js` → `collectNginxRateLimitHits()` | `NGINX_ERROR_LOG`, zones: `impetus_api`, `impetus_auth`, `impetus_static`, `impetus_perip` |
| 06 | AUTH_GUARD | Autenticação e Controlo de Acesso | Sim | Sim | Sim | threat-watch + admin_logs (tipos: `HTTP_CREDENTIAL_PROBE`, `ADMIN_LOGIN_AFTER_FAILS`, `SSH_BRUTE`) | threat-watch daemon + DB | `adminPortalSecurityIntelligenceService.js` → `authAlerts` | `THREAT_LOG`, tabela `admin_logs` |
| 07 | BOT_DETECT | Detecção Anti-Bot (Turnstile) | Sim | Sim (env keys presentes: 2) | Sim | env vars (`ADMIN_PORTAL_TURNSTILE_*`) | Cloudflare Turnstile | `adminPortalSecurityDashboardService.js` → `getInfrastructureStatus()` | Chaves CF Turnstile site+secret |
| 08 | RBAC | RBAC e Permissões | Sim | Sim | Sim | Guard interno (middleware) | Backend Node.js middleware | `adminPortalSecurityIntelligenceService.js` (constante) | Middleware de autorização |
| 09 | INPUT_VAL | Validação de Entradas (Backend) | Sim | Sim | Sim | threat-watch (tipos: `HTTP_WRITE_ATTEMPT`, `ENUMERATION`, `MULTI_LAYER_BREACH`) | threat-watch daemon | `adminPortalSecurityIntelligenceService.js` → `enumerationAlerts` | `THREAT_LOG` |
| 10 | INJECT_PROT | Proteção Contra Injeção | Sim | Sim | Sim | Middleware (sem métricas por origem) | Backend middleware | `adminPortalSecurityIntelligenceService.js` (constante OBSERVADA) | — |
| 11 | TLS | Criptografia TLS 1.3 | Sim | Sim | Sim | Cert PEM (`openssl x509`) | Let's Encrypt / Nginx | `adminPortalSecurityDashboardService.js` → `readCertExpiry()` | `/etc/letsencrypt/live/plataformaimpetus.com/cert.pem`; expira 2026-10-04 |
| 12 | TENANT_ISO | Isolamento de Tenants (RLS) | Sim (piloto) | Sim (`IMPETUS_RLS_ENABLED=true`) | Piloto | N/A para origem externa | PostgreSQL row-level security | N/A no painel (escopo) | 32 tabelas com RLS; `companies` sem RLS ainda |
| 13 | OBSERVATORY | Monitoramento Contínuo (SEC-01) | Sim | Sim (`SECURITY_OBSERVATORY=true`) | Sim | Env flag + eventos threat-watch por origem | Security Observatory (SEC-01) | `adminPortalSecurityIntelligenceService.js` → `hasOriginEvents` + `infra.security_observatory` | `SECURITY_OBSERVATORY` env |
| 14 | CORRELATION | Análise Comportamental (SEC-02) | Sim | Sim | Sim | Sem granularidade por origem | Motor SEC-02 | `adminPortalSecurityIntelligenceService.js` (constante OBSERVADA) | SEC-02 modules |
| 15 | BACKUP | Backup Automático Imutável | Parcial | Não (pipeline auto) | Não (auto) | N/A no painel | Scripts manuais | N/A (ADR-018) | ADR-018 pendente |
| 16 | INTEGRITY | Controlo de Integridade | Parcial | Parcial | Parcial | Proxy via `fail2ban.available` | threat-watch | `adminPortalSecurityIntelligenceService.js` → proxy `fail2banActive` | fail2ban disponível |
| 17 | DB_PROTECT | Proteção da BD (RLS) | Sim (piloto) | Sim (parcial) | Piloto | Constante; presença de RLS em tabelas | PostgreSQL | `adminPortalSecurityIntelligenceService.js` (constante OBSERVADA) | 32 tabelas RLS activas |
| 18 | AUDIT | Auditoria e Logs Imutáveis | Sim | Sim | Sim | Events threat-watch/admin_logs → `hasOriginEvents` | admin_logs + threat-watch | `adminPortalSecurityIntelligenceService.js` → `hasOriginEvents` | `THREAT_LOG`, admin_logs DB |
| 19 | INCIDENT | Resposta Automática a Incidentes | Sim | Sim | Sim | blocked_ips filtrados por origem (`fail2ban`+`ufw`) | fail2ban + UFW | `adminPortalSecurityIntelligenceService.js` → `anyBlocked` | `getFail2ban()`, `getUfwBlocks()` |
| 20 | GOVERNANCE | Governança e Melhorias Contínuas | Sim (processo) | Sim | Sim | Constante (ciclo SEC-01..SEC-21) | Processo/documentação | `adminPortalSecurityIntelligenceService.js` (constante OBSERVADA) | Ciclo SEC activo |

**ALL_20_LAYERS_INVENTORIED = TRUE**

---

## FASE 2 — Critérios de transição de estado

### Critérios formais por camada

| ID | → ATUOU | → OBSERVADA | → SEM_TELEMETRIA | → N/A | Documentado em código |
|----|---------|-------------|------------------|-------|----------------------|
| NGINX | `attackOrigins.count > 0` | `attackOrigins.count == 0` | — | — | Sim |
| FAIL2BAN | `fail2banBlocked.length > 0` | `fail2banActive && banned == 0` | `!fail2banActive` | — | Sim |
| UFW | `ufwBlocked.length > 0` | `ufwActive && DENY == 0` | `!ufwActive` | — | Sim (pós-patch) |
| CLOUDFLARE | — | `cloudflare_proxy_guard file exists` | `file absent` | — | Sim |
| RATE_LIMIT | `rateLimitEventCount > 0` | `configured && events == 0` | `!configured` | — | Sim (SEC-OBS-001) |
| AUTH_GUARD | `authAlerts.length > 0` | `authAlerts.length == 0` | — | — | Sim |
| BOT_DETECT | — | `turnstile keys present` | `keys absent` | — | Sim |
| RBAC | — | Constante (externo não autentica) | — | — | Sim (design) |
| INPUT_VAL | `enumerationAlerts.length > 0` | `enumerationAlerts.length == 0` | — | — | Sim |
| INJECT_PROT | — | Constante | — | — | Parcial (sem sensor) |
| TLS | — | `ssl.valid == true` | `ssl.valid == false` | — | Sim |
| TENANT_ISO | — | — | — | Sempre (escopo) | Sim (ADR) |
| OBSERVATORY | `security_observatory && hasOriginEvents` | `security_observatory && !hasOriginEvents` ou `!security_observatory` | — | — | Sim (pós-patch) |
| CORRELATION | — | Constante | — | — | Parcial (sem sensor) |
| BACKUP | — | — | — | Sempre (escopo + ADR-018) | Sim |
| INTEGRITY | — | `fail2banActive` | `!fail2banActive` | — | Parcial (proxy) |
| DB_PROTECT | — | Constante | — | — | Parcial |
| AUDIT | `hasOriginEvents` | `!hasOriginEvents` | — | — | Sim (pós-patch) |
| INCIDENT | `blockedIps.length > 0` (por origem) | `blocked == 0` | — | — | Sim |
| GOVERNANCE | — | Constante | — | — | Sim (design) |

**ALL_STATE_TRANSITIONS_DOCUMENTED = TRUE**  
**UNSUPPORTED_STATE_TRANSITIONS = 0** (após patches)  
**AMBIGUOUS_CLASSIFICATIONS = 0** (após patches)
