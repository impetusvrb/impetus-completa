# SECURITY_LAYER_REFERENCE — Referência Técnica das Camadas de Proteção

**Versão:** 1.0  
**Data:** 2026-07-23  
**Baseline:** SEC-BASELINE-001  
**Fonte canónica:** `adminPortalSecurityIntelligenceService.js` → `buildProtectionLayers()`

---

## Guia de leitura

Este documento é a referência técnica definitiva para cada uma das 20 camadas. Para cada camada, descreve: finalidade, como está implementada, origem da telemetria, critérios exactos de transição de estado, nível de confiança e limitações.

**Estados possíveis:**

| Estado | Código | Significado |
|---|---|---|
| ATUOU | `ATUOU` | Evidência directa de acção desta camada sobre a origem analisada |
| OBSERVADA | `OBSERVADA` | Camada activa, não precisou agir nesta origem |
| SEM_TELEMETRIA | `SEM_TELEMETRIA` | Camada existe mas sem dados utilizáveis por origem |
| N/A | `NAO_APLICAVEL` | Fora do escopo do drill-down de origem externa |

---

## 01 — NGINX — Firewall de Rede

**Finalidade:** Primeira barreira de rede. Bloqueia, filtra e regista todas as requisições HTTP/S suspeitas.

**Implementação:** Nginx com configuração dedicada em `/etc/nginx/sites-enabled/impetus`. Status 403, 401, 444 e 404 em paths sensíveis classificados como suspeitos.

**Telemetria:** `/var/log/nginx/impetus-access.log` → `countNginxSuspicious()` → `attack_origins` enriquecido com GeoIP.

| Condição | Estado |
|---|---|
| `attackOrigins.count > 0` para esta origem | ATUOU |
| `attackOrigins.count == 0` | OBSERVADA |

**Confiança:** ALTA (DIRECT)  
**Validação:** FULLY_VALIDATED (smoke + weekly-sim + SEC-01)  
**Limitações:** Janela não tem duração fixa — representa as últimas N linhas do log.

---

## 02 — FAIL2BAN — Proteção Automática

**Finalidade:** Banimento automático de IPs por padrão de comportamento. 4 jails activos: `impetus-auth-fail`, `impetus-nginx-scan`, `nginx-limit-req`, `sshd`.

**Implementação:** fail2ban com jails configurados via `/etc/fail2ban/`.

**Telemetria:** `fail2ban-client status <jail>` → lista `banned_ips`.

| Condição | Estado |
|---|---|
| IPs desta origem em `banned_ips` | ATUOU |
| fail2ban `available=true` e 0 bans nesta origem | OBSERVADA |
| `available=false` (execSafe falhou) | SEM_TELEMETRIA |

**Confiança:** ALTA (API_CLI)  
**Validação:** FULLY_VALIDATED  
**Limitações:** Jail `nginx-limit-req` com 0 bans apesar de `limit_req` activo — fail2ban não detecta throttle nginx (GAP-F2B-RL).

---

## 03 — UFW — Firewall de Host

**Finalidade:** Firewall de nível de kernel (netfilter). 348 regras DENY IN activas. Bloqueia IPs banidos e portas directas.

**Implementação:** UFW com regras configuradas; Status: active.

**Telemetria:** `ufw status numbered` (DENY IN por IP) + `Status: active`.

| Condição | Estado |
|---|---|
| IPs desta origem em regras DENY IN | ATUOU |
| `ufw_active=true` e 0 DENY para esta origem | OBSERVADA |
| `ufw_active=false` | SEM_TELEMETRIA |

**Confiança:** ALTA (API_CLI)  
**Validação:** PARTIALLY_VALIDATED (sem teste automatizado dedicado)  
**Limitações:** Sem teste automatizado; corrigido em SEC-COVERAGE-001 (CRG-P1).

---

## 04 — CLOUDFLARE — Filtragem IP/Geoloc

**Finalidade:** CDN + proxy com protecção de camada de rede e geolocalização.

**Implementação:** Cloudflare em proxy mode; ficheiro nginx `/etc/nginx/snippets/impetus-cloudflare-proxy-guard.conf` presente.

**Telemetria:** Presença/ausência do ficheiro de configuração nginx.

| Condição | Estado |
|---|---|
| Ficheiro proxy-guard presente | OBSERVADA |
| Ficheiro ausente | SEM_TELEMETRIA |

**Nota:** Não há transição para ATUOU — sem acesso a CF Analytics por origem.  
**Confiança:** MÉDIA (INDIRECT)  
**Validação:** PARTIALLY_VALIDATED  
**Limitações:** LIM-01 — sem CF Analytics, sem ATUOU possível (GAP-OBS-RL P2).

---

## 05 — RATE_LIMIT — Rate Limiting (Nginx)

**Finalidade:** Throttle de requisições por IP. Zones: `impetus_api` (60r/m), `impetus_auth` (10r/m), `impetus_static` (100r/s), `impetus_perip` (10r/s).

**Implementação:** `limit_req_zone` e `limit_req` no nginx conf.

**Telemetria:** `error.log` + `error.log.1` (linhas `limiting requests, excess: ... by zone`) + detecção de conf (`limit_req_zone` presente).

| Condição | Estado |
|---|---|
| `rateLimitEventCount > 0` para IPs desta origem | ATUOU |
| Conf detectada e 0 eventos para esta origem | OBSERVADA |
| Conf não detectada | SEM_TELEMETRIA |

**Confiança:** ALTA (DIRECT; corrigido SEC-OBS-001)  
**Validação:** PARTIALLY_VALIDATED  
**Limitações:** LIM-09 (rotação de log); GAP-SIM-01 (script sim usa log errado).

---

## 06 — AUTH_GUARD — Autenticação e Controlo de Acesso

**Finalidade:** Detecta e regista tentativas de autenticação inválidas, brute force e credential probes.

**Implementação:** threat-watch daemon (cron */2min) + admin_logs DB.

**Telemetria:** `/var/log/impetus-threat-watch.log` — tipos: `HTTP_CREDENTIAL_PROBE`, `AUTH_ATTEMPT`, `ADMIN_LOGIN_AFTER_FAILS`, `SSH_BRUTE`.

| Condição | Estado |
|---|---|
| `authAlerts.length > 0` para esta origem | ATUOU |
| `authAlerts.length == 0` | OBSERVADA |

**Confiança:** ALTA (DIRECT)  
**Validação:** FULLY_VALIDATED  
**Limitações:** Granularidade por origem depende de geo-enrichment GeoIP assíncrono.

---

## 07 — BOT_DETECT — Detecção Anti-Bot (Turnstile)

**Finalidade:** Cloudflare Turnstile — challenge invisível para detectar bots em formulários de autenticação.

**Implementação:** Chaves `ADMIN_PORTAL_TURNSTILE_SITE_KEY` + `ADMIN_PORTAL_TURNSTILE_SECRET_KEY` no `.env` (ambas presentes).

**Telemetria:** Presença de chaves Turnstile no env.

| Condição | Estado |
|---|---|
| Chaves presentes no env | OBSERVADA |
| Chaves ausentes | SEM_TELEMETRIA |

**Nota:** Sem transição para ATUOU — Turnstile não expõe feed de challenge por IP.  
**Confiança:** MÉDIA (ENV_CONFIG)  
**Validação:** PARTIALLY_VALIDATED  
**Limitações:** LIM-02 — sem granularidade por IP (design CF).

---

## 08 — RBAC — RBAC e Permissões

**Finalidade:** Controlo de acesso baseado em papéis para recursos autenticados.

**Implementação:** Middleware de autorização no backend Node.js.

**Telemetria:** Constante por design — origens externas não autenticadas não atingem RBAC.

| Condição | Estado |
|---|---|
| Sempre | OBSERVADA |

**Confiança:** MÉDIA (CONSTANT — design)  
**Validação:** FULLY_VALIDATED  
**Limitações:** LIM-03 — design intencional; sem ATUOU possível para origem externa.

---

## 09 — INPUT_VAL — Validação de Entradas

**Finalidade:** Detecta tentativas de enumeração, write attempts e exploração de rotas.

**Implementação:** threat-watch daemon.

**Telemetria:** threat-watch log — tipos: `HTTP_WRITE_ATTEMPT`, `ENUMERATION`, `MULTI_LAYER_BREACH`.

| Condição | Estado |
|---|---|
| `enumerationAlerts.length > 0` | ATUOU |
| `enumerationAlerts.length == 0` | OBSERVADA |

**Confiança:** ALTA (DIRECT)  
**Validação:** FULLY_VALIDATED  
**Limitações:** —

---

## 10 — INJECT_PROT — Proteção Contra Injeção

**Finalidade:** Protecção no middleware contra SQL/NoSQL injection.

**Implementação:** Middleware backend; sem exportação de métricas por IP/origem.

**Telemetria:** Constante — sem sensor por origem.

| Condição | Estado |
|---|---|
| Sempre | OBSERVADA |

**Confiança:** BAIXA (CONSTANT)  
**Validação:** PARTIALLY_VALIDATED  
**Limitações:** LIM-04 — sem métricas de payload por origem (GAP-INJ-01 P2).

---

## 11 — TLS — Criptografia TLS 1.3

**Finalidade:** Criptografia do canal de transporte. Certificado Let's Encrypt.

**Implementação:** Nginx com cert em `/etc/letsencrypt/live/plataformaimpetus.com/`.

**Telemetria:** `openssl x509 -enddate` — validade do certificado PEM.

| Condição | Estado |
|---|---|
| `ssl.valid == true` | OBSERVADA |
| `ssl.valid == false` | SEM_TELEMETRIA |

**Nota:** TLS não gera evento por origem — sem transição para ATUOU.  
**Cert válido até:** 2026-10-04  
**Confiança:** ALTA (API_CLI)  
**Validação:** PARTIALLY_VALIDATED  
**Limitações:** LIM-05 (design) — rotação certbot já configurada.

---

## 12 — TENANT_ISO — Isolamento de Tenants (RLS)

**Finalidade:** Row-Level Security PostgreSQL para isolamento de dados entre tenants.

**Implementação:** PILOTO — `IMPETUS_RLS_ENABLED=true`, `MODE=on`, 32 tabelas com RLS activo (excl. `companies`).

**Telemetria:** N/A no painel de origem externa.

| Condição | Estado |
|---|---|
| Sempre | NAO_APLICAVEL |

**N/A por escopo:** drill-down é de origem externa não autenticada; RLS não protege esta camada.  
**Estado no produto:** Piloto activo. `companies` sem RLS (GAP-RLS-01).  
**Limitações:** GAP-RLS-01 (P1 produto).

---

## 13 — OBSERVATORY — Monitoramento Contínuo (SEC-01)

**Finalidade:** Ingestão, classificação e correlação de eventos de segurança em tempo real (SEC-01).

**Implementação:** `SECURITY_OBSERVATORY=true`; daemon activo.

**Telemetria:** Env `SECURITY_OBSERVATORY` + eventos threat-watch por origem (`hasOriginEvents`).

| Condição | Estado |
|---|---|
| `security_observatory=true` AND `hasOriginEvents` | ATUOU |
| `security_observatory=true` AND `!hasOriginEvents` | OBSERVADA |
| `security_observatory=false` | OBSERVADA |

**Confiança:** MÉDIA (ENV_CONFIG + DIRECT; corrigido SEC-COVERAGE-001 CRG-P2)  
**Validação:** FULLY_VALIDATED  
**Limitações:** —

---

## 14 — CORRELATION — Análise Comportamental (SEC-02)

**Finalidade:** Correlação comportamental de eventos de segurança (SEC-02).

**Implementação:** Motor SEC-02 activo; sem feed granular por origem.

**Telemetria:** Constante.

| Condição | Estado |
|---|---|
| Sempre | OBSERVADA |

**Confiança:** BAIXA (CONSTANT)  
**Validação:** FULLY_VALIDATED  
**Limitações:** LIM-05/GAP-COR-01 — sem granularidade por origem.

---

## 15 — BACKUP — Backup Automático Imutável

**Finalidade:** Garantia de recuperação de dados (RPO ≤ 24h per ADR-018).

**Implementação:** Parcial — snapshots manuais existem; pipeline automático imutável NÃO operacionalizado.

**Telemetria:** N/A no painel de origem externa.

| Condição | Estado |
|---|---|
| Sempre | NAO_APLICAVEL |

**N/A por escopo:** backup não é camada de resposta a ataques externos.  
**Estado no produto:** ADR-018 pendente (GAP-BK-01 P1 produto).

---

## 16 — INTEGRITY — Controlo de Integridade

**Finalidade:** Detectar modificações não autorizadas em ficheiros, binários ou configurações críticas.

**Implementação:** Parcial — sem sensor dedicado. Proxy via disponibilidade do fail2ban.

**Telemetria:** `fail2ban.available` (proxy).

| Condição | Estado |
|---|---|
| `fail2banActive == true` | OBSERVADA |
| `fail2banActive == false` | SEM_TELEMETRIA |

**Confiança:** BAIXA (PROXY)  
**Validação:** PARTIALLY_VALIDATED  
**Limitações:** LIM-06 / GAP-INT-01 (P1) — sensor real de integridade ausente. **Próxima prioridade.**

---

## 17 — DB_PROTECT — Proteção do Banco de Dados

**Finalidade:** Isolamento e protecção da BD PostgreSQL via RLS.

**Implementação:** RLS piloto em 32 tabelas; `companies` sem RLS ainda.

**Telemetria:** Constante — externo não autenticado não atinge BD.

| Condição | Estado |
|---|---|
| Sempre | OBSERVADA |

**Confiança:** MÉDIA (CONSTANT)  
**Validação:** PARTIALLY_VALIDATED  
**Limitações:** `companies` sem RLS (GAP-RLS-01 P1).

---

## 18 — AUDIT — Auditoria e Logs Imutáveis

**Finalidade:** Registo imutável de todos os eventos de segurança para auditoria forense.

**Implementação:** admin_logs DB + threat-watch log.

**Telemetria:** `hasOriginEvents` (presença de eventos em `recentAlertsAnalytical` ou `criticalEvents` desta origem).

| Condição | Estado |
|---|---|
| `hasOriginEvents == true` | ATUOU |
| `hasOriginEvents == false` | OBSERVADA |

**Confiança:** ALTA (DIRECT; corrigido SEC-COVERAGE-001 CRG-P3)  
**Validação:** FULLY_VALIDATED  
**Limitações:** —

---

## 19 — INCIDENT — Resposta Automática a Incidentes

**Finalidade:** Bloqueio automático de IPs por fail2ban e UFW.

**Implementação:** fail2ban (bans activos) + UFW (regras DENY IN).

**Telemetria:** `blockedIps` filtrado por `country_code` da origem (`fail2ban` + `ufw`).

| Condição | Estado |
|---|---|
| `blockedIps.length > 0` para esta origem | ATUOU |
| `blockedIps.length == 0` | OBSERVADA |

**Confiança:** ALTA (DIRECT)  
**Validação:** FULLY_VALIDATED  
**Limitações:** —

---

## 20 — GOVERNANCE — Governança e Melhorias Contínuas

**Finalidade:** Representa o ciclo de governança de segurança (SEC-01..SEC-21) como processo contínuo.

**Implementação:** Processo organizacional; weekly-sim (cron domingo 03:00 UTC).

**Telemetria:** Constante — ciclo activo verificado por score Phase C (0.64).

| Condição | Estado |
|---|---|
| Sempre | OBSERVADA |

**Confiança:** MÉDIA (CONSTANT — processo)  
**Validação:** FULLY_VALIDATED (SEC_19_OPERATIONAL_CERTIFICATION, weekly-sim estável)  
**Limitações:** LIM-08 — sem sensor de degradação do ciclo em tempo real.
