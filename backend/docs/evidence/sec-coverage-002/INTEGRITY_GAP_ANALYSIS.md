# INTEGRITY_GAP_ANALYSIS.md
## SEC-COVERAGE-002 — Pontos Cegos, Residual e Dashboard

**Data:** 2026-07-23

---

## 1. Pontos Cegos Classificados

### Resumo

| Prioridade | Quantidade | Descrição |
|---|---|---|
| P0 | **0** | Sem pontos cegos críticos sem mitigação |
| P1 | 8 | Gaps auditd em paths CRITICAL + 1 directório routes |
| P2 | 16 | Gaps auditd HIGH/MEDIUM + directórios + GID |

### P1 — Mitigação

| Gap | Mitigação |
|---|---|
| Auditd ausente em `/etc/nginx`, `fail2ban`, `letsencrypt`, `audit` | HashChecker/PermChecker nos activos inventariados; propor regras `-w` pós-CERT |
| INT-M-001 `routes/` sem baseline ficheiro | `impetus_repo_write`; futuro directory watcher / expansão baseline |

### P2 — Mitigação

| Gap | Mitigação |
|---|---|
| Auditd `/usr/local/bin`, cron, snippets nginx | Hash (+perm nos binários) |
| INT-M-002/005 directórios | Idem repo_write |
| GID não monitorizado | Extensão futura do PermChecker (fora desta fase) |

**NO_CRITICAL_BLIND_SPOTS = TRUE** (P0 = 0; CRITICAL ficheiros 100% hash/perm/owner)

---

## 2. Cobertura Residual (fora de escopo)

| Item | Estado |
|---|---|
| Rootkits / malware em memória | FORA DE ESCOPO (documentado) |
| Firmware / bootloaders | FORA DE ESCOPO |
| Hardware / TPM | FORA DE ESCOPO |
| Criação ad-hoc fora do inventário | FORA POR DESENHO |
| Containers / imagens runtime | FORA DE ESCOPO |
| Tráfego de rede | Outras camadas (nginx/fail2ban/threat-watch) |

Estas limitações permanecem alinhadas com a arquitectura GAP-INT-01-ARCH.

---

## 3. Consistência do Dashboard (FASE 7)

| Verificação | Resultado |
|---|---|
| state.json ↔ getIntegrityState() | ✅ Coerente (mode, violations, assets, baseline_id) |
| Camada INTEGRITY com violations > 0 | ✅ ATUOU |
| Fallback state corrompido | ✅ SEM_TELEMETRIA / available=false |
| DEGRADED | ✅ SEM_TELEMETRIA (validado) |
| Duplicação de lógica no Dashboard | ❌ Ausente |

**DASHBOARD_CONSISTENT = TRUE**

---

## 4. Baseline

**Não alterado.** SHA256 forense preservado:  
`6cb5ac487158cdb462a4b01b2b7f25290eaa05a4b9b4425619619e4301760bf6`

Regeneração apenas em **SEC-BASELINE-002** após CERT.
