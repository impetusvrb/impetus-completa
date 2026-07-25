# INTEGRITY_RISK_REASSESSMENT

**Emitido em:** 2026-07-23 20:31 UTC  
**Fase:** SEC-COVERAGE-003  

---

## 1. Estado do Registo de Limitações

| ID | Título | Estado | Fase de encerramento |
|---|---|---|---|
| LIM-001 | Cobertura parcial auditd | **CLOSED** | INT-LIM-001 |
| LIM-002 | Watchers MEDIUM | **CLOSED** | INT-LIM-002 |
| LIM-003 | Monitorização GID | **CLOSED** | INT-LIM-003 |
| LIM-004 | Fronteira de escopo | **SCOPE_BOUNDARY** | SEC-BASELINE-002 |
| OBS-003-F1 | EventBus dedup UID/GID | **CLOSED** | INT-DEDUP-001 + SEC-OBS-003R |

**Conclusão:** o registo operacional de limitações (LIM-001…003 + OBS-003-F1) pode ser **encerrado**.  
LIM-004 permanece apenas como **fronteira formal de escopo**.

---

## 2. Registo de Risco Residual

| ID | Sev | Categoria | Título | Estado |
|---|---|---|---|---|
| RISK-ENV-001 | P2 | Environment Advisory | Kernel audit clock drift / audit.log stale em VM | ACCEPTED — fora do código IMPETUS |
| RISK-INV-001 | P2 | Inventory hygiene | INT-M-004 monitor_owner=true sem expected_owner/group | DOCUMENTED — não bloqueia CERTIFIED; higiene de inventário pós-cert |
| RISK-DRIFT-001 | P2 | Baseline drift pending | INT-C-010 e INT-M-003 divergem do baseline v2 (INT-LIM-001) | EXPECTED — pending BASELINE-003 |
| LIM-004 | N/A | Scope boundary | Domínios fora do escopo da camada INTEGRITY | SCOPE_BOUNDARY — permanente por desenho |

### Contagens

| Classe | Quantidade |
|---|---|
| P0 | **0** |
| P1 operacional | **0** |
| P2 | 3 (ambiente, higiene inventário, drift pendente BASELINE-003) |
| Scope boundary | 1 (LIM-004) |

---

## 3. Justificativas

### Sem P0 / P1 operacional

Todas as limitações operacionais identificadas no ciclo CERT-002 foram eliminadas e revalidadas (LIM-001/002/003, OBS-003-F1). Nenhum gap crítico de cobertura CRITICAL/HIGH.

### P2 aceites

1. **RISK-ENV-001** — condição da VM; não é defeito do motor.  
2. **RISK-INV-001** — um activo MEDIUM com flag owner sem expected_*; detecção hash+auditd intacta.  
3. **RISK-DRIFT-001** — drift esperado pós-INT-LIM-001; sensor a funcionar; consolidação = SEC-BASELINE-003.

### LIM-004

Não é risco operacional da implementação. É delimitação de produto.

---

## 4. Pronto para Certificação

`P0_COUNT = 0`  
`P1_OPERATIONAL_COUNT = 0`  
`NO_OPERATIONAL_LIMITATIONS = TRUE`  
`READY_FOR_CERTIFICATION = TRUE`
