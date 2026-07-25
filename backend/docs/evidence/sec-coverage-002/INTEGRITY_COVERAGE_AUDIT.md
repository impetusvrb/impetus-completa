# INTEGRITY_COVERAGE_AUDIT.md
## SEC-COVERAGE-002 — Auditoria de Cobertura Operacional

**Fase:** SEC-COVERAGE-002  
**Data:** 2026-07-23  
**Status:** PASS  
**Restrição:** Baseline criptográfico **não** alterado

---

## 1. Comparação Inventário × Baseline × Motor

| Fonte | Contagem |
|---|---|
| Entradas no inventário | 38 |
| Activos no baseline (ficheiros) | 35 |
| Activos efectivamente monitorados pelo motor | 35 (`state.assets_monitored`) |
| Inventário sem entrada de baseline | 3 (directórios MEDIUM) |
| Baseline sem inventário | 0 |
| Divergências path/criticidade/perm | 0 |

### Activos inventariados sem baseline (ficheiros individuais)

| ID | Path | Justificação |
|---|---|---|
| INT-M-001 | `backend/src/routes/` | Directório — sem hash ficheiro-a-ficheiro |
| INT-M-002 | `backend/src/middleware/` | Directório — idem |
| INT-M-005 | `backend/src/security/config/` | Directório — idem |

Cobertura parcial destes directórios via auditd `impetus_repo_write` (`-w /var/www/impetus-completa`).

### Activos monitorados fora do inventário

**Nenhum.**

### Divergências de caminho / permissões / classificação

**Nenhuma** entre IDs comuns inventário↔baseline.

---

## 2. Respostas FASE 1

| Pergunta | Resposta |
|---|---|
| Activo inventariado sem monitoramento? | 3 directórios MEDIUM sem baseline ficheiro; cobertos parcialmente por auditd repo |
| Activo monitorado fora do inventário? | Não |
| Divergências path/perm/classificação? | Não |

---

## 3. Sensor em Produção (contexto)

| Campo | Valor |
|---|---|
| INTEGRITY_SENSOR_ENABLED | true |
| mode | WATCH |
| baseline_id | INT-01A-BASELINE-20260723 |
| violations (drift INT-01*) | 4 (verdadeiros positivos; baseline a regenerar só em SEC-BASELINE-002) |

---

## 4. Conclusão da Auditoria

Cobertura de ficheiros CRITICAL e HIGH no inventário = **100%** no baseline e no motor. Lacunas residuais documentadas (auditd realtime, directórios MEDIUM, GID) — sem pontos cegos P0.
