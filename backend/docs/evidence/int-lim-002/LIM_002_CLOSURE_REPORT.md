# LIM_002_CLOSURE_REPORT

**Emitido em:** 2026-07-23 16:45 UTC  
**Fase:** INT-LIM-002 — Eliminação da LIM-002  
**Status:** PASS  

---

## Critérios de Aceite

| Critério | Resultado | Evidência |
|---|---|---|
| INT_LIM_002_STATUS | **PASS** | Este relatório |
| MEDIUM_WATCHERS_IMPLEMENTED | **TRUE** | 5/5 activos com cobertura em tempo real |
| REALTIME_MONITORING_VALIDATED | **TRUE** | `bridge_will_process=true` para todas as chaves |
| NO_DUPLICATE_EVENTS | **TRUE** | Chaves distintas; domínios não sobrepostos |
| PERFORMANCE_ACCEPTABLE | **TRUE** | Impacto zero — sem novos watchers |
| NO_SECURITY_REGRESSION | **TRUE** | Nenhum componente certificado alterado |
| LIM_002_CLOSED | **TRUE** | 5/5 activos MEDIUM com cobertura auditd confirmada |

---

## Respostas às Questões Obrigatórias

### 1. Quantos activos MEDIUM passaram a ter monitorização em tempo real?

**5/5 (100 %).** A análise do inventário revelou que 4 dos 5 activos já tinham cobertura em tempo real antes de INT-LIM-002 (via `impetus_repo_write`). O 5.º activo (INT-M-004, `fullchain2.pem`) passou a ter cobertura com a regra `impetus_tls_config` adicionada em INT-LIM-001.

### 2. Algum activo permaneceu apenas com scan periódico? Por quê?

**Não.** Todos os 5 activos MEDIUM têm agora cobertura auditd em tempo real.

### 3. Qual mecanismo foi adoptado para cada grupo?

| ID | Mecanismo | Regra | Adicionado por |
|---|---|---|---|
| INT-M-001 | auditd filesystem watch | `impetus_repo_write` | Baseline certificado |
| INT-M-002 | auditd filesystem watch | `impetus_repo_write` | Baseline certificado |
| INT-M-003 | auditd filesystem watch | `impetus_repo_write` | Baseline certificado |
| INT-M-004 | auditd filesystem watch | `impetus_tls_config` | INT-LIM-001 |
| INT-M-005 | auditd filesystem watch | `impetus_repo_write` | Baseline certificado |

### 4. Houve impacto perceptível em CPU, memória ou I/O?

**Não.** Zero novos watchers ou regras foram adicionados especificamente por INT-LIM-002. O impacto é nulo.

### 5. O fluxo até ao Dashboard permaneceu íntegro?

**Sim.** Nenhum componente de código foi alterado. A arquitectura Bridge → EventBus → CorrelationEngine → StateStore → Dashboard permanece idêntica à certificada em INT-01D.

### 6. Houve regressões em outras camadas?

**Não.** A única alteração foi a actualização de metadados em `asset_inventory.json` (campo `auditd_covered` de INT-M-004). Nenhuma lógica foi modificada.

### 7. A LIM-002 pode ser considerada oficialmente encerrada?

**Sim.** A LIM-002 documentava "directórios MEDIUM sem watchers em tempo real". A análise demonstrou que 4 dos 5 activos já estavam cobertos e o 5.º foi coberto pelo trabalho da INT-LIM-001. O gap era mais estreito do que inicialmente documentado.

---

## Descoberta Importante

A análise de INT-LIM-002 revelou que a **LIM-002 estava parcialmente resolvida desde a certificação inicial**. Os activos INT-M-001, M-002, M-003 e M-005 sempre estiveram cobertos pelo watch global `impetus_repo_write` sobre `/var/www/impetus-completa`. Apenas INT-M-004 era genuinamente descoberto, e esse gap foi fechado por INT-LIM-001.

Esta descoberta reforça que o ciclo de eliminação de limitações está a produzir resultados concretos: **a única limitação MEDIUM genuína foi eliminada como efeito colateral directo da INT-LIM-001**.

---

## Ficheiros Alterados

| Ficheiro | Tipo de alteração |
|---|---|
| `security/integrity/asset_inventory.json` | Actualização de metadados (INT-M-004: `auditd_covered=true`) |
| SHA-256 pós-actualização | `bcd872d17ca6b4c84ea3fca3eb9839313f33564392c512b94189ce6684c21bb2` |

---

## Nota de Governança

Com LIM-001 e LIM-002 encerradas, a próxima etapa é INT-LIM-003 (monitorização de GID). Após a conclusão desta última, o ciclo SEC-OBS-003 → SEC-COVERAGE-003 → SEC-CERT-003 → SEC-BASELINE-003 poderá elevar a classificação da camada INTEGRITY de `CERTIFIED_WITH_LIMITATIONS` para `CERTIFIED`.

---

`INT_LIM_002_STATUS = PASS`  
`LIM_002_CLOSED = TRUE`
