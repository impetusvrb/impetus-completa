# SEC-COVERAGE-001 — Matriz de Cobertura de Telemetria e Validação

**Data:** 2026-07-23  
**Referência:** FASE 3 (Telemetria) + FASE 4 (Validação)

---

## FASE 3 — Mapeamento de Telemetria

### Legenda de métodos de colecção

| Método | Descrição |
|--------|-----------|
| LOG_PARSE | Leitura/parsing de ficheiro de log |
| API_CLI | Chamada a CLI/API do sistema (fail2ban-client, ufw, openssl) |
| ENV_CONFIG | Verificação de variável de ambiente ou ficheiro de configuração |
| MIDDLEWARE | Middleware de aplicação (sem exportação de métricas por origem) |
| DATABASE | Query directa à base de dados |
| CONSTANT | Valor constante por design — sem colecção activa |

### Tabela de cobertura de telemetria

| ID | Fonte de Telemetria | Tipo de Evento | Método | Classificação | TELEMETRY_CONFIDENCE |
|----|---------------------|----------------|--------|---------------|----------------------|
| NGINX | `nginx/access.log` (access.log incremental) | Hits HTTP suspeitos (403/401/444/404-scan) | LOG_PARSE | DIRECT | **HIGH** |
| FAIL2BAN | `fail2ban-client status <jail>` | Bans activos por jail | API_CLI | DIRECT | **HIGH** |
| UFW | `ufw status numbered` | Regras DENY IN activas | API_CLI | DIRECT | **HIGH** |
| CLOUDFLARE | Ficheiro conf nginx (proxy-guard snippet) | Presença de configuração | ENV_CONFIG | INDIRECT | **MEDIUM** |
| RATE_LIMIT | `nginx/error.log` (limiting requests) | Throttle por IP/zone | LOG_PARSE | DIRECT | **HIGH** |
| AUTH_GUARD | threat-watch log | `CREDENTIAL_PROBE`, `AUTH_ATTEMPT`, `SSH_BRUTE` | LOG_PARSE | DIRECT | **HIGH** |
| BOT_DETECT | Env vars Turnstile | Chaves presentes | ENV_CONFIG | INDIRECT | **MEDIUM** |
| RBAC | Constante (design) | — | CONSTANT | DERIVED | **MEDIUM** |
| INPUT_VAL | threat-watch log | `WRITE_ATTEMPT`, `ENUMERATION`, `MULTI_LAYER_BREACH` | LOG_PARSE | DIRECT | **HIGH** |
| INJECT_PROT | Constante (middleware) | — | CONSTANT | PROXY | **LOW** |
| TLS | PEM cert (openssl) | Data de expiração | API_CLI | DIRECT | **HIGH** |
| TENANT_ISO | N/A (escopo) | — | — | — | N/A |
| OBSERVATORY | Env flag + events por origem | Env `SECURITY_OBSERVATORY` | ENV_CONFIG + LOG_PARSE | INDIRECT + DIRECT | **MEDIUM** |
| CORRELATION | Constante (SEC-02) | — | CONSTANT | DERIVED | **LOW** |
| BACKUP | N/A (escopo + ADR-018) | — | — | — | N/A |
| INTEGRITY | `fail2ban.available` (proxy) | — | PROXY | PROXY | **LOW** |
| DB_PROTECT | Constante (design) | — | CONSTANT | DERIVED | **MEDIUM** |
| AUDIT | Events threat-watch/admin_logs por origem | Presença de eventos | LOG_PARSE | DIRECT | **HIGH** |
| INCIDENT | blocked_ips filtrados por origem | Bans fail2ban + UFW DENY | API_CLI | DIRECT | **HIGH** |
| GOVERNANCE | Constante (processo) | — | CONSTANT | DERIVED | **LOW** |

### Contagem de confiança (excluindo N/A)

| TELEMETRY_CONFIDENCE | Camadas |
|----------------------|---------|
| HIGH | NGINX, FAIL2BAN, UFW, RATE_LIMIT, AUTH_GUARD, INPUT_VAL, TLS, AUDIT, INCIDENT (9) |
| MEDIUM | CLOUDFLARE, BOT_DETECT, RBAC, OBSERVATORY, DB_PROTECT (5) |
| LOW | INJECT_PROT, CORRELATION, INTEGRITY, GOVERNANCE (4) |

**ALL_TELEMETRY_SOURCES_MAPPED = TRUE**

---

## FASE 4 — Cobertura de Validação

### Legenda

| Nível | Descrição |
|-------|-----------|
| FULLY_VALIDATED | Teste automatizado + smoke + procedimento operacional |
| PARTIALLY_VALIDATED | Pelo menos um dos três acima |
| NOT_VALIDATED | Nenhuma validação formal documentada |

### Tabela de validação

| ID | Teste Automatizado | Smoke Test | Proc. Operacional | Simulação | Classificação |
|----|---|---|---|---|---|
| NGINX | `sec-anti-recon-*`, `impetus-threat-watch-simulate-attack.sh` | Sim (sim-attack) | SEC-01→SEC-21 | Sim (semanal cron SEC-19) | **FULLY_VALIDATED** |
| FAIL2BAN | `SEC_06_RESPONSE_AUDIT.test.js`, `SEC_18_RUNTIME_PROTECTION.test.js` | Sim (fail2ban-client) | Sim (playbook) | Sim (weekly-sim) | **FULLY_VALIDATED** |
| UFW | Não | Sim (`ufw status`) | Sim (regras documentadas) | Não | **PARTIALLY_VALIDATED** |
| CLOUDFLARE | Não | Sim (ficheiro guard) | Sim (CF docs) | Não | **PARTIALLY_VALIDATED** |
| RATE_LIMIT | Não (novo pós-OBS-001) | Sim (error.log parse) | Nginx conf | Não | **PARTIALLY_VALIDATED** |
| AUTH_GUARD | `SEC_03_THREAT_INTELLIGENCE_AUDIT.test.js` | Sim | Sim | Sim | **FULLY_VALIDATED** |
| BOT_DETECT | Não | Sim (env check) | Não formal | Não | **PARTIALLY_VALIDATED** |
| RBAC | `aiSecurityGatewayScenarios.js`, `securityApplicationValidation` | Sim | Sim | Sim | **FULLY_VALIDATED** |
| INPUT_VAL | `SEC_03`, `securityApplication`, `sec-anti-recon` | Sim | Sim | Sim | **FULLY_VALIDATED** |
| INJECT_PROT | `encryptionAtRestScenarios.js`, `securityApplication` | Parcial | Sim | Não | **PARTIALLY_VALIDATED** |
| TLS | Não (cert check) | Sim (openssl) | Sim (certbot) | Não | **PARTIALLY_VALIDATED** |
| TENANT_ISO | N/A painel | N/A | N/A | N/A | N/A |
| OBSERVATORY | `SEC_01_OBSERVATORY_AUDIT.test.js` | Sim | Sim | Sim (weekly) | **FULLY_VALIDATED** |
| CORRELATION | `SEC_02_CORRELATION_AUDIT.test.js` | Sim | Sim | Sim (weekly) | **FULLY_VALIDATED** |
| BACKUP | N/A painel | N/A | ADR-018 | N/A | N/A |
| INTEGRITY | `SEC_04_RUNTIME_INTEGRITY_AUDIT.test.js` | Parcial | Parcial | Não | **PARTIALLY_VALIDATED** |
| DB_PROTECT | `encryptionAtRestScenarios.js`, RLS tests | Sim | Sim | Não | **PARTIALLY_VALIDATED** |
| AUDIT | `securityOperational`, `SEC_19` | Sim | Sim | Sim | **FULLY_VALIDATED** |
| INCIDENT | `SEC_06_RESPONSE_AUDIT.test.js`, `SEC_12_EXECUTION_VALIDATION.test.js` | Sim | Sim | Sim | **FULLY_VALIDATED** |
| GOVERNANCE | `SEC_19_OPERATIONAL_CERTIFICATION.test.js` | Sim (weekly-sim score 0.62) | Sim | Sim | **FULLY_VALIDATED** |

### Contagem de validação (18 camadas com escopo no painel)

| Classificação | Camadas | % |
|---------------|---------|---|
| FULLY_VALIDATED | NGINX, FAIL2BAN, AUTH_GUARD, RBAC, INPUT_VAL, OBSERVATORY, CORRELATION, AUDIT, INCIDENT, GOVERNANCE (10) | 56% |
| PARTIALLY_VALIDATED | UFW, CLOUDFLARE, RATE_LIMIT, BOT_DETECT, INJECT_PROT, TLS, INTEGRITY, DB_PROTECT (8) | 44% |
| NOT_VALIDATED | — (0) | 0% |

**Cobertura geral: 100% com algum nível de validação (56% plena).**

**ALL_VALIDATION_PROCEDURES_MAPPED = TRUE**
