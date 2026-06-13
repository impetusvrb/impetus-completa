# AIOI — Enterprise Rollout Governance Contract

**Camada:** P5.6 — Rollout Governance  
**Modo:** Expansão controlada · rollback seguro · zero runtime cognitivo  

---

## 1. Regras RG-*

| ID | Regra |
|----|-------|
| RG-01 | Expansão gradual — máximo 3 tenants piloto, flags incrementais |
| RG-02 | Rollback seguro — desativar flags → worker stop → F47 fallback (Q-05) |
| RG-03 | Observabilidade obrigatória — health + metrics + telemetry activos |
| RG-04 | Isolamento obrigatório — RLS + pilot tenant scoping |
| RG-05 | SLA obrigatório — monitorização breach/at_risk |
| RG-06 | Governança obrigatória — drift detection zero antes de expandir |
| RG-07 | Sem runtime cognitivo — invariantes P0/P8 |
| RG-08 | Sem alteração soberanos — ORG-1..5, Truth, Queue, Learning intactos |

---

## 2. Sequência rollout enterprise

```
1. Validar EN-01..EN-08 (enterprise readiness)
2. Validar governance drift = 0
3. Validar compliance score ≥ 70
4. Expandir IMPETUS_AIOI_PILOT_TENANTS (≤3)
5. Monitorizar via enterprise executive report
6. Rollback se drift_detected ou health DEGRADED persistente
```

---

## 3. Proibições

- Runtime cognitivo / LLM / rerank / weight_versions
- Alteração de soberanos certificados
- Auto-expansion sem validação EN-*

---

## 4. Token

**READY_FOR_CONTROLLED_ENTERPRISE_ROLLOUT**
