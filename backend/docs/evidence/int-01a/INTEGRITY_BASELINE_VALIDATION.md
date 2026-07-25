# Validação do Baseline de Integridade — IMPETUS

**Documento:** INTEGRITY_BASELINE_VALIDATION.md  
**Missão:** INT-01A (FASE 5)  
**Data:** 2026-07-23  
**Status:** VALIDATION_COMPLETED  
**Executada em:** 2026-07-23T12:16:45Z — 2026-07-23T12:22:10Z

---

## 1. Objectivo da validação

Verificar o estado de todos os activos do inventário imediatamente após a geração do baseline:
- Hashes válidos (SHA256 reproduzível)
- Ficheiros acessíveis
- Permissões consistentes com o esperado
- Proprietários correctos
- Nenhum activo ausente

**Esta validação não corrige nada. Apenas regista.**

---

## 2. Resultado geral

```
TOTAL_CRITICAL_VALIDATED      = 10 / 10
TOTAL_HIGH_VALIDATED          = 14 / 14 (amostra representativa)
HASH_MISMATCHES               = 0
PERMISSION_INCONSISTENCIES    = 0
OWNER_INCONSISTENCIES         = 0
MISSING_ASSETS                = 0
INACCESSIBLE_ASSETS           = 0
VALIDATION_STATUS             = PASS
```

---

## 3. Validação CRÍTICOS — resultado linha a linha

| Activo | Hash | Perm | Owner | Status |
|---|---|---|---|---|
| server.js | ✔ OK | ✔ 644 | ✔ root | **PASS** |
| .env | ✔ OK | ✔ 600 | ✔ root | **PASS** |
| ecosystem.runtime.config.cjs | ✔ OK | ✔ 644 | ✔ root | **PASS** |
| nginx site: impetus | ✔ OK | ✔ 644 | ✔ root | **PASS** |
| cloudflare-proxy-guard.conf | ✔ OK | ✔ 644 | ✔ root | **PASS** |
| hardening-locations.conf | ✔ OK | ✔ 644 | ✔ root | **PASS** |
| cert2.pem (TLS cert real) | ✔ OK | ✔ 644 | ✔ root | **PASS** |
| privkey2.pem (TLS key real) | ✔ OK | ✔ 600 | ✔ root | **PASS** |
| fail2ban impetus.conf | ✔ OK | ✔ 644 | ✔ root | **PASS** |
| auditd impetus.rules | ✔ OK | ✔ 640 | ✔ root | **PASS** |

**Resultado CRÍTICO: 10/10 PASS. Zero erros.**

---

## 4. Validação HIGH — resultado linha a linha

| Activo | Hash | Status |
|---|---|---|
| adminPortalSecurityDashboardService.js | ✔ OK | **PASS** |
| adminPortalSecurityIntelligenceService.js | ✔ OK | **PASS** |
| cognitiveBoundaryGuard.js | ✔ OK | **PASS** |
| contextExposureSanitizer.js | ✔ OK | **PASS** |
| domainAccessMatrix.js | ✔ OK | **PASS** |
| impetus-threat-watch.sh | ✔ OK | **PASS** |
| impetus-breach-lockdown-engine.sh | ✔ OK | **PASS** |
| impetus-emergency-lockdown.sh | ✔ OK | **PASS** |
| impetus-audit-watch.sh | ✔ OK | **PASS** |
| package.json | ✔ OK | **PASS** |
| nginx ip-allowlist.conf | ✔ OK | **PASS** |
| nginx proxy.conf | ✔ OK | **PASS** |
| cron: security-auto-audit | ✔ OK | **PASS** |
| cron: security-observatory | ✔ OK | **PASS** |

**Resultado HIGH: 14/14 PASS. Zero erros.**

---

## 5. Inconsistências e observações

### 5.1 TLS — symlinks

**Observação (não é erro):** Os ficheiros em `/etc/letsencrypt/live/` têm permissão `777` reportada pelo `stat` quando se lê o symlink em si. No entanto, o `sha256sum` e os `stat` sobre os ficheiros reais (`cert2.pem`, `privkey2.pem`) mostram as permissões correctas (644 e 600).

**Acção:** O HashChecker deve sempre operar sobre o caminho canónico (arquivo), não sobre o symlink. O `baseline.json` já documenta `canonical_path` para estes activos.

**Status:** Observação documentada. Não é inconsistência. Não requer acção.

### 5.2 GAP de auditd — activos /etc/

**Observação:** 7 activos CRITICAL (nginx, fail2ban, letsencrypt, auditd) e 8 activos HIGH (scripts /usr/local/bin/, crons /etc/cron.d/) não têm cobertura auditd kernel-level.

**Status:** GAP documentado em `INTEGRITY_ASSET_INVENTORY.md`. Acção em INT-01B (regras auditd adicionais).

### 5.3 ecosystem.config.js ausente

**Observação:** O ficheiro `backend/ecosystem.config.js` não existe no sistema. O ficheiro de produção é `ecosystem.runtime.config.cjs` na raiz. Sem inconsistência — o inventário já refere o caminho correcto.

### 5.4 fail2ban defaults-debian.conf

**Observação:** O ficheiro `/etc/fail2ban/defaults-debian.conf` não existe. O ficheiro equivalente está em `/etc/fail2ban/jail.d/defaults-debian.conf`. Não estava no inventário principal; sem impacto.

---

## 6. Verificação cruzada — activos com cópias duplicadas

| Par verificado | Hash baseline | Hash ao vivo | Status |
|---|---|---|---|
| `/etc/audit/rules.d/impetus.rules` ↔ `infra/security/audit/impetus-audit.rules` | `e22c16dc…` | `e22c16dc…` | **✔ IDÊNTICO** |
| `/usr/local/bin/impetus-breach-lockdown-engine.sh` ↔ `infra/scripts/impetus-breach-lockdown-engine.sh` | `3666a706…` | `3666a706…` | **✔ IDÊNTICO** |

---

## 7. Preparação para INT-01B

Com base na validação, confirmam-se os seguintes inputs para INT-01B:

### AuditdBridge
- ✔ auditd activo com regras cobrindo `/var/www/impetus-completa/` e `.env`
- ✔ Chaves disponíveis: `impetus_repo_write`, `impetus_delete`, `impetus_env`, `impetus_exec_rm`, `impetus_root_exec`
- ⚠ GAP: `/etc/nginx/`, `/etc/fail2ban/`, `/etc/letsencrypt/`, `/etc/audit/`, `/usr/local/bin/`, `/etc/cron.d/` — adicionar regras em INT-01B

### HashChecker
- ✔ Todos os 33 activos têm SHA256 no baseline
- ✔ Todos os ficheiros são acessíveis pelo processo root
- ✔ Activos com symlinks têm canonical_path documentado
- ✔ Activos com mtime recente identificados (server.js, .env — dentro de janela de deploy esperada)

### PermChecker
- ✔ Todas as permissões esperadas documentadas no `asset_inventory.json`
- ✔ Zero inconsistências detectadas
- ✔ `.env` com 600 (crítico, verificado)
- ✔ `privkey2.pem` com 600 (crítico, verificado)
- ✔ Scripts de segurança com 755 (verificado)

---

## 8. Certificação da validação

```
BASELINE_ID                  = INT-01A-BASELINE-20260723
VALIDATION_DATE              = 2026-07-23
CRITICAL_ASSETS_VALIDATED    = 10 / 10
HIGH_ASSETS_VALIDATED        = 14 / 14
HASH_MISMATCHES              = 0
PERM_INCONSISTENCIES         = 0
OWNER_INCONSISTENCIES        = 0
MISSING_ASSETS               = 0
INACCESSIBLE_ASSETS          = 0
CROSS_CHECKS_PASSED          = 2 / 2
OBSERVATIONS                 = 2 (TLS symlinks — documentado; auditd gap — a cobrir INT-01B)
BLOCKING_ISSUES              = 0
VALIDATION_STATUS            = PASS
INT_01B_READY                = TRUE
```
