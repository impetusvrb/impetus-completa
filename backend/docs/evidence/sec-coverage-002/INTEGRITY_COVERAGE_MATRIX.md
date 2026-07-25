# INTEGRITY_COVERAGE_MATRIX.md
## SEC-COVERAGE-002 — Matriz de Cobertura

**Data:** 2026-07-23

---

## 1. Cobertura por Criticidade

| Criticidade | Inventário (ficheiros) | No baseline | Hash monitorado | Perm monitorado | Owner monitorado | % inventário no baseline |
|---|---|---|---|---|---|---|
| CRITICAL | 10 | 10 | 10 (100%) | 10 (100%) | 10 (100%) | **100%** |
| HIGH | 23 | 23 | 23 (100%) | 4 (17%)* | 23 (100%) | **100%** |
| MEDIUM | 5† | 2 | 2 (100% dos ficheiros) | 0 | 1 | **40%** inventário / **100%** ficheiros com baseline |

\* Política do inventário: `monitor_perm=true` apenas em binários `/usr/local/bin` (INT-H-006…009). Restantes HIGH cobertos por hash.  
† Inclui 3 directórios (INT-M-001/002/005) sem entrada de baseline por desenho.

### Excepções justificadas

| ID | Tipo | Justificação |
|---|---|---|
| INT-M-001/002/005 | Directório | Monitorização ficheiro-a-ficheiro não aplicável nesta versão; auditd repo + futuro watcher |
| HIGH sem monitor_perm | Política | Hash cobre alteração de conteúdo; perm só em scripts operacionais |

---

## 2. Cobertura Funcional (testes controlados)

| Cenário | Evento esperado | Observado | Latência típica |
|---|---|---|---|
| Alteração de conteúdo | HASH_CHANGED | ✅ | ≤ intervalo hash (30 s na janela OBS) |
| Alteração de permissões | PERM_CHANGED | ✅ | ≤ intervalo perm (20 s) |
| Alteração de proprietário (UID) | OWNER_CHANGED | ✅ | ≤ intervalo perm |
| Exclusão | FILE_DELETED | ✅ | ≤ intervalo hash |
| Renomeação | FILE_DELETED | ✅ | (tratada como ausência) |
| Criação fora do inventário | N/A | N/A | Fora de escopo por desenho |
| Corrupção state.json | available=false | ✅ | Imediato |
| Baseline indisponível | DEGRADED | ✅ | No arranque do motor |

**Suite funcional:** 8/8 passed_or_justified · FN rate controlada = **0%**

---

## 3. Critérios de Cobertura

| Critério | Valor |
|---|---|
| FULL_CRITICAL_COVERAGE | TRUE |
| FULL_HIGH_COVERAGE | TRUE |
| MEDIUM_COVERAGE_VALIDATED | TRUE |
| NO_CRITICAL_BLIND_SPOTS (P0) | TRUE |
