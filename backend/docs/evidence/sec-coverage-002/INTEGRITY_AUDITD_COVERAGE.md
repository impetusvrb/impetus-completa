# INTEGRITY_AUDITD_COVERAGE.md
## SEC-COVERAGE-002 — Cobertura Auditd

**Data:** 2026-07-23  
**Status:** VALIDADO (com lacunas documentadas — pendência INT-01A confirmada)

---

## 1. Regras Live (`auditctl -l`)

Chaves activas observadas:

| Key | Cobertura |
|---|---|
| `impetus_repo_write` | `-w /var/www/impetus-completa` |
| `impetus_delete` | backend + frontend (unlink/rename) |
| `impetus_env` | `backend/.env` |
| `impetus_config` | `/etc/impetus` |
| `impetus_env_backup` | backups env |
| `impetus_exec_*` / `impetus_root_exec` | execve sensíveis |

### Directórios pendentes INT-01A (hits live = 0)

| Directório | Regras live | Mitigação actual |
|---|---|---|
| `/etc/nginx/` | ❌ 0 | HashChecker + PermChecker nos activos CRITICAL/HIGH inventariados |
| `/etc/fail2ban/` | ❌ 0 | Idem (INT-C-009) |
| `/etc/letsencrypt/` | ❌ 0 | Idem (INT-C-007/008, INT-M-004) |
| `/etc/audit/` | ❌ 0 | Idem (INT-C-010) |
| `/usr/local/bin/` | ❌ 0 | Idem (INT-H-006…009) + monitor_perm |

---

## 2. Bridge vs Regras

O `IntegrityAuditdBridge` **já mapeia** chaves preparadas:

`impetus_nginx_config`, `impetus_fail2ban_config`, `impetus_tls_config`, `impetus_audit_config`, `impetus_bin_write`, `impetus_cron_config`

Estas chaves **não estão carregadas** em `auditctl -l` nesta data.  
Conclusão: **capacidade de consumo pronta; regras de kernel ainda não deployadas** para esses paths.

---

## 3. Inventário `auditd_covered=false`

20 activos inventariados com `auditd_covered=false` (7 CRITICAL, 12 HIGH, 1 MEDIUM) — alinhado com a pendência INT-01A.

Classificação:

| Criticidade | Prioridade gap auditd | Risco residual |
|---|---|---|
| CRITICAL | P1 | Baixo em conteúdo (hash ≤30–300 s); médio em realtime |
| HIGH | P2 | Mitigado por hash/perm |
| MEDIUM | P2 | Aceitável |

---

## 4. Plano de Mitigação (sem alterar baseline)

1. Propor regras `-w` para nginx / fail2ban / letsencrypt / audit / usr/local/bin / cron (pós-CERT ou microciclo dedicado).
2. Manter HashChecker como controlo compensatório até deploy das regras.
3. Não regenerar baseline nesta fase.

**AUDITD_COVERAGE_VALIDATED = TRUE** (estado auditado e classificado; lacunas explícitas).
