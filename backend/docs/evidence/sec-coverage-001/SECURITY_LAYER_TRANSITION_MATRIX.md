# SEC-COVERAGE-001 — Matriz de Transição de Estado

**Data:** 2026-07-23  
**Pós-patch:** UFW (active check), OBSERVATORY (condicionado a eventos), AUDIT (condicionado a eventos)

---

## Semântica dos estados

| Estado | Código | Significado canónico |
|--------|--------|---------------------|
| ATUOU | `ATUOU` | Evidência directa e verificável de acção desta camada sobre a origem analisada |
| OBSERVADA | `OBSERVADA` | Camada operacional, não precisou agir nesta origem / escopo |
| SEM_TELEMETRIA | `SEM_TELEMETRIA` | Camada existe mas sem dados utilizáveis para esta origem |
| N/A | `NAO_APLICAVEL` | Fora do escopo do drill-down por origem externa |
| INDETERMINADO | `INDETERMINADO` | Fallback — não deve ocorrer em produção |

---

## Tabela de transição por camada

### 01 — NGINX
```
Condição                               → Estado
attackOrigins.count > 0                → ATUOU   (hits suspeitos desta origem no access.log)
attackOrigins.count == 0               → OBSERVADA
```
**Fonte:** `countNginxSuspicious()` → `attack_origins` enriquecido com geo

---

### 02 — FAIL2BAN
```
fail2banBlocked.length > 0             → ATUOU   (IP desta origem banido)
fail2banBlocked == 0 && available      → OBSERVADA
!available (execSafe falhou)           → SEM_TELEMETRIA
```
**Fonte:** `fail2ban-client status <jail>` → lista `banned_ips`

---

### 03 — UFW  *(pós-patch SEC-COVERAGE-001)*
```
ufwBlocked.length > 0                  → ATUOU   (regra DENY IN para IP desta origem)
ufwBlocked == 0 && ufw_active          → OBSERVADA
ufw_active == false                    → SEM_TELEMETRIA
```
**Fonte:** `ufw status numbered` → DENY IN + `Status: active`

---

### 04 — CLOUDFLARE
```
cloudflare_proxy_guard file present    → OBSERVADA
file absent                            → SEM_TELEMETRIA
```
**Nota:** Sem acesso a CF Analytics — não existe transição para ATUOU por esta fonte.

---

### 05 — RATE_LIMIT  *(corrigido SEC-OBS-001)*
```
rateLimitEventCount > 0 (esta origem)  → ATUOU   (linhas "limiting requests" no error.log)
rateLimitConfigured && events == 0     → OBSERVADA
!rateLimitConfigured                   → SEM_TELEMETRIA
```
**Fonte:** `error.log` + `/etc/nginx/sites-enabled/impetus` (conf detection)

---

### 06 — AUTH_GUARD
```
authAlerts.length > 0                  → ATUOU   (CREDENTIAL_PROBE, AUTH_ATTEMPT, SSH_BRUTE)
authAlerts.length == 0                 → OBSERVADA
```
**Fonte:** threat-watch log (regex `HTTP_CREDENTIAL_PROBE|AUTH_ATTEMPT|ADMIN_LOGIN_AFTER_FAILS|SSH_BRUTE`)

---

### 07 — BOT_DETECT
```
turnstile keys present (env)           → OBSERVADA  (sem granularidade geo; não há ATUOU por origem)
keys absent                            → SEM_TELEMETRIA
```
**Nota:** Turnstile não expõe telemetria por IP/origem. Máximo atingível: OBSERVADA.

---

### 08 — RBAC
```
Sempre                                 → OBSERVADA  (externo não autenticado não atinge RBAC)
```
**Justificativa:** RBAC protege recursos autenticados; origens externas bloqueadas antes.

---

### 09 — INPUT_VAL
```
enumerationAlerts.length > 0           → ATUOU   (WRITE_ATTEMPT, ENUMERATION, MULTI_LAYER_BREACH)
enumerationAlerts.length == 0          → OBSERVADA
```
**Fonte:** threat-watch log

---

### 10 — INJECT_PROT
```
Sempre                                 → OBSERVADA  (sem sensor por origem)
```
**Gap:** Sem contadores de payload malicioso por origem. Máximo atingível: OBSERVADA.

---

### 11 — TLS
```
ssl.valid == true                      → OBSERVADA  (TLS protege canal; não gera evento por origem)
ssl.valid == false                     → SEM_TELEMETRIA
```
**Fonte:** `openssl x509 -enddate`; cert válido até 2026-10-04.

---

### 12 — TENANT_ISO
```
Sempre                                 → NAO_APLICAVEL
```
**Justificativa:** RLS multi-tenant protege dados por tenant autenticado; irrelevante para análise de origem externa não autenticada.

---

### 13 — OBSERVATORY  *(pós-patch SEC-COVERAGE-001)*
```
security_observatory=true && hasOriginEvents  → ATUOU
security_observatory=true && !hasOriginEvents → OBSERVADA
security_observatory=false                    → OBSERVADA (não activo)
```
**Fonte:** env `SECURITY_OBSERVATORY=true` + `recentAlertsAnalytical` + `criticalEvents` por origem

---

### 14 — CORRELATION
```
Sempre                                 → OBSERVADA  (sem sensor por origem)
```
**Gap:** SEC-02 processa correlações globais; sem feed por origem individual.

---

### 15 — BACKUP
```
Sempre                                 → NAO_APLICAVEL
```
**Justificativa:** Backup não é camada de resposta a ataques externos. Pipeline imutável automático não operacionalizado (ADR-018 pendente).

---

### 16 — INTEGRITY
```
fail2banActive                         → OBSERVADA  (proxy)
!fail2banActive                        → SEM_TELEMETRIA
```
**Gap:** Sem sensor dedicado. Status derivado de disponibilidade do fail2ban.

---

### 17 — DB_PROTECT
```
Sempre                                 → OBSERVADA  (tabelas piloto RLS; externo não autenticado não atinge BD)
```

---

### 18 — AUDIT  *(pós-patch SEC-COVERAGE-001)*
```
hasOriginEvents (recentAlerts + criticalEvents > 0)  → ATUOU
!hasOriginEvents                                     → OBSERVADA
```
**Fonte:** threat-watch + admin_logs; campo `hasOriginEvents` calculado no `buildProtectionLayers()`

---

### 19 — INCIDENT
```
blockedIps.length > 0 (por origem)     → ATUOU   (fail2ban ou UFW bloqueou IP desta origem)
blocked == 0                           → OBSERVADA
```

---

### 20 — GOVERNANCE
```
Sempre                                 → OBSERVADA  (ciclo processo, não sensor)
```

---

## Resumo das transições

| # | ATUOU possível | OBSERVADA possível | SEM_TELEMETRIA possível | N/A | Critério objectivo |
|---|---|---|---|---|---|
| NGINX | Sim | Sim | — | — | Sim |
| FAIL2BAN | Sim | Sim | Sim | — | Sim |
| UFW | Sim | Sim | Sim | — | Sim (pós-patch) |
| CLOUDFLARE | — | Sim | Sim | — | Parcial |
| RATE_LIMIT | Sim | Sim | Sim | — | Sim |
| AUTH_GUARD | Sim | Sim | — | — | Sim |
| BOT_DETECT | — | Sim | Sim | — | Sim |
| RBAC | — | Sim | — | — | Sim (design) |
| INPUT_VAL | Sim | Sim | — | — | Sim |
| INJECT_PROT | — | Sim | — | — | Parcial |
| TLS | — | Sim | Sim | — | Sim |
| TENANT_ISO | — | — | — | Sim | Sim |
| OBSERVATORY | Sim | Sim | — | — | Sim (pós-patch) |
| CORRELATION | — | Sim | — | — | Parcial |
| BACKUP | — | — | — | Sim | Sim |
| INTEGRITY | — | Sim | Sim | — | Parcial |
| DB_PROTECT | — | Sim | — | — | Parcial |
| AUDIT | Sim | Sim | — | — | Sim (pós-patch) |
| INCIDENT | Sim | Sim | — | — | Sim |
| GOVERNANCE | — | Sim | — | — | Sim (design) |
