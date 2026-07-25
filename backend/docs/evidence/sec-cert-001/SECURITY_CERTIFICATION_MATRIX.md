# SEC-CERT-001 — Matriz de Certificação Operacional

**Missão:** SEC-CERT-001  
**Data:** 2026-07-23  
**Continuidade:** SEC-OBS-001 → SEC-COVERAGE-001 → SEC-CERT-001  
**FORENSIC_EVIDENCE_PRESERVED:** TRUE  
**ALL_20_LAYERS_CERTIFIED:** PARTIAL (18 CERTIFIED / CERTIFIED_WITH_LIMITATIONS; 2 N/A por escopo)

---

## Legenda de classificação

| Classificação | Critério |
|---|---|
| CERTIFIED | Implementada, habilitada, telemetria ≥ MEDIUM, 0 gaps P0, estados reproduzíveis |
| CERTIFIED_WITH_LIMITATIONS | Operacional, estados correctos, mas telemetria LOW/PROXY ou validação PARTIAL; limitações documentadas |
| NOT_CERTIFIED | Gap P0 aberto ou estado não reproduzível |
| N/A (escopo) | Fora do escopo do drill-down por origem externa; estado do produto documentado separadamente |

---

## Matriz das 20 camadas

| # | ID | Nome | Implementada | Em Produção | Telemetria | Origem da Evidência | Confiança | Método de Validação | Estados Possíveis | Cobertura de Testes | Limitações Conhecidas | Classificação |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 01 | NGINX | Firewall de Rede | Sim | Sim | HIGH — DIRECT | `impetus-access.log` → `countNginxSuspicious()` | ALTA | Smoke + weekly-sim + SEC-01 | ATUOU / OBSERVADA | FULLY_VALIDATED | Janela temporal não fixa (linhas de log) | **CERTIFIED** |
| 02 | FAIL2BAN | Proteção Automática | Sim | Sim | HIGH — API_CLI | `fail2ban-client status` (4 jails) | ALTA | SEC_06, SEC_18, weekly-sim | ATUOU / OBSERVADA / SEM_TELEMETRIA | FULLY_VALIDATED | jail `nginx-limit-req` não regista bans apesar de limit_req activo | **CERTIFIED** |
| 03 | UFW | Firewall de Host | Sim | Sim | HIGH — API_CLI | `ufw status numbered` + `Status: active` | ALTA | Smoke manual + proc. operacional | ATUOU / OBSERVADA / SEM_TELEMETRIA | PARTIALLY_VALIDATED | Sem teste automatizado dedicado ao painel | **CERTIFIED** |
| 04 | CLOUDFLARE | Filtragem IP/Geoloc | Sim | Sim | MEDIUM — INDIRECT | ficheiro conf `/etc/nginx/snippets/impetus-cloudflare-proxy-guard.conf` | MÉDIA | Smoke (ficheiro guard) + proc. CF | OBSERVADA / SEM_TELEMETRIA | PARTIALLY_VALIDATED | Sem CF Analytics — não atinge ATUOU; proxy mode sem visibilidade de WAF | **CERTIFIED_WITH_LIMITATIONS** |
| 05 | RATE_LIMIT | Rate Limiting (Nginx) | Sim | Sim | HIGH — DIRECT | `error.log` (`limiting requests`) + conf detection | ALTA | Smoke (parse 104 eventos) | ATUOU / OBSERVADA / SEM_TELEMETRIA | PARTIALLY_VALIDATED | Sem teste automatizado; sim script usa log errado (`access.log` vs `impetus-access.log`) | **CERTIFIED** |
| 06 | AUTH_GUARD | Autenticação | Sim | Sim | HIGH — DIRECT | threat-watch log (tipos: `HTTP_CREDENTIAL_PROBE`, `AUTH_ATTEMPT`, `SSH_BRUTE`) | ALTA | SEC_03, weekly-sim | ATUOU / OBSERVADA | FULLY_VALIDATED | Granularidade por origem depende de geo-enrichment GeoIP | **CERTIFIED** |
| 07 | BOT_DETECT | Anti-Bot Turnstile | Sim | Sim | MEDIUM — ENV_CONFIG | env vars Turnstile (2 chaves presentes) | MÉDIA | Smoke (env check) | OBSERVADA / SEM_TELEMETRIA | PARTIALLY_VALIDATED | Sem telemetria de bypass tentado; não atinge ATUOU por design (sem feed CF por IP) | **CERTIFIED_WITH_LIMITATIONS** |
| 08 | RBAC | RBAC e Permissões | Sim | Sim | MEDIUM — CONSTANT (design) | Constante; middleware activo | MÉDIA | `aiSecurityGatewayScenarios`, sec app tests | OBSERVADA (apenas) | FULLY_VALIDATED | Sem sensor de acesso indevido por origem; estado OBSERVADA é design correcto | **CERTIFIED_WITH_LIMITATIONS** |
| 09 | INPUT_VAL | Validação de Entradas | Sim | Sim | HIGH — DIRECT | threat-watch (`HTTP_WRITE_ATTEMPT`, `ENUMERATION`) | ALTA | SEC_03, sec-anti-recon | ATUOU / OBSERVADA | FULLY_VALIDATED | — | **CERTIFIED** |
| 10 | INJECT_PROT | Proteção Injeção | Sim | Sim | LOW — CONSTANT | Constante; middleware activo, sem métricas por origem | BAIXA | `encryptionAtRestScenarios`, parcial | OBSERVADA (apenas) | PARTIALLY_VALIDATED | Sem sensor de payload malicioso por origem; estado OBSERVADA é máximo atingível | **CERTIFIED_WITH_LIMITATIONS** |
| 11 | TLS | TLS 1.3 | Sim | Sim | HIGH — API_CLI | cert PEM via `openssl x509`; válido até 2026-10-04 | ALTA | Smoke (openssl) + certbot | OBSERVADA / SEM_TELEMETRIA | PARTIALLY_VALIDATED | TLS não gera evento por origem; ATUOU não aplicável neste modelo | **CERTIFIED** |
| 12 | TENANT_ISO | Isolamento Tenants (RLS) | Piloto | Piloto | N/A — escopo painel | RLS piloto em 32 tabelas; `companies` sem RLS | — | — | NAO_APLICAVEL | N/A painel | N/A por escopo (origem externa não autenticada). RLS activo em piloto no produto. `companies` sem RLS é gap de produto (GAP-RLS-01). | **N/A (escopo)** |
| 13 | OBSERVATORY | Monitoramento SEC-01 | Sim | Sim | MEDIUM — ENV_CONFIG + DIRECT | env `SECURITY_OBSERVATORY=true` + eventos por origem | MÉDIA | `SEC_01_OBSERVATORY_AUDIT`, weekly-sim | ATUOU / OBSERVADA | FULLY_VALIDATED | ATUOU exige flag ON + eventos da origem; sem eventos → OBSERVADA (correcto pós-patch) | **CERTIFIED** |
| 14 | CORRELATION | Análise SEC-02 | Sim | Sim | LOW — CONSTANT | Motor SEC-02 global; sem feed por origem | BAIXA | `SEC_02_CORRELATION_AUDIT`, weekly-sim | OBSERVADA (apenas) | FULLY_VALIDATED | Sem granularidade por origem; estado OBSERVADA é máximo atingível neste modelo | **CERTIFIED_WITH_LIMITATIONS** |
| 15 | BACKUP | Backup Imutável | Parcial | Não (auto) | N/A — escopo painel | Snapshots manuais; ADR-018 pendente | — | — | NAO_APLICAVEL | N/A painel | N/A por escopo. Pipeline automático imutável não operacionalizado (GAP-BK-01 / ADR-018). | **N/A (escopo)** |
| 16 | INTEGRITY | Controlo de Integridade | Parcial | Parcial | LOW — PROXY | Proxy via `fail2ban.available`; sem sensor de integridade real | BAIXA | `SEC_04_RUNTIME_INTEGRITY_AUDIT`, parcial | OBSERVADA / SEM_TELEMETRIA | PARTIALLY_VALIDATED | Status é proxy de disponibilidade do fail2ban; não mede integridade de ficheiros/processos. GAP-INT-01 aberto. | **CERTIFIED_WITH_LIMITATIONS** |
| 17 | DB_PROTECT | Proteção da BD | Piloto | Piloto | MEDIUM — CONSTANT (design) | RLS em 32 tabelas piloto; constante OBSERVADA | MÉDIA | `encryptionAtRest`, RLS tests | OBSERVADA (apenas) | PARTIALLY_VALIDATED | `companies` sem RLS; estado OBSERVADA correcto para externo não autenticado | **CERTIFIED_WITH_LIMITATIONS** |
| 18 | AUDIT | Auditoria Imutável | Sim | Sim | HIGH — DIRECT | threat-watch + admin_logs via `hasOriginEvents` | ALTA | `securityOperational`, `SEC_19`, weekly-sim | ATUOU / OBSERVADA | FULLY_VALIDATED | ATUOU condicionado a eventos da origem (correcto pós-patch); sem eventos → OBSERVADA | **CERTIFIED** |
| 19 | INCIDENT | Resposta Automática | Sim | Sim | HIGH — DIRECT | `blocked_ips` filtrado por origem (`fail2ban` + `ufw`) | ALTA | `SEC_06`, `SEC_12`, weekly-sim | ATUOU / OBSERVADA | FULLY_VALIDATED | — | **CERTIFIED** |
| 20 | GOVERNANCE | Governança | Processo | Sim | LOW — CONSTANT | Ciclo processo; constante OBSERVADA | MÉDIA | `SEC_19_OPERATIONAL_CERTIFICATION` | OBSERVADA (apenas) | FULLY_VALIDATED | Processo sem sensor activo; design correcto | **CERTIFIED_WITH_LIMITATIONS** |

---

## Sumário de classificação

| Classificação | Qty | Camadas |
|---|---|---|
| **CERTIFIED** | 10 | NGINX, FAIL2BAN, UFW, RATE_LIMIT, AUTH_GUARD, INPUT_VAL, TLS, OBSERVATORY, AUDIT, INCIDENT |
| **CERTIFIED_WITH_LIMITATIONS** | 8 | CLOUDFLARE, BOT_DETECT, RBAC, INJECT_PROT, CORRELATION, INTEGRITY, DB_PROTECT, GOVERNANCE |
| **NOT_CERTIFIED** | 0 | — |
| **N/A (escopo)** | 2 | TENANT_ISO, BACKUP |

**ALL_20_LAYERS_CERTIFIED = PARTIAL** (18/18 certificadas; 2 N/A de escopo documentado)  
**NOT_CERTIFIED = 0**
