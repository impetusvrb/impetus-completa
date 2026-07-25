# INTEGRITY_OPERATIONAL_CERTIFICATION.md
## SEC-CERT-002 — Conformidade Operacional

**Data:** 2026-07-23  
**Fonte:** SEC-OBS-002 + estado live (leitura) + SEC-COVERAGE-002

---

## 1. Estado Operacional Certificado

| Item | Evidência | Status |
|---|---|---|
| Motor activo | `INTEGRITY_SENSOR_ENABLED=true`, mode=WATCH | ✅ |
| Baseline carregado | baseline_id INT-01A-BASELINE-20260723, 35 assets | ✅ |
| Event Bus | Eventos persistidos, dedup, 0 IDs duplicados | ✅ |
| Correlation Engine | severity_final, shadow log, events.jsonl | ✅ |
| Dashboard consistente | state.json ↔ getIntegrityState() | ✅ |
| Fallback | state corrompido / flag off → available=false | ✅ |
| Modo degradado | baseline ausente → DEGRADED, health 200 | ✅ |
| Recuperação | restore baseline → WATCH | ✅ |

---

## 2. Cobertura Operacional Certificada

| Critério COVERAGE | Valor |
|---|---|
| FULL_CRITICAL_COVERAGE | TRUE |
| FULL_HIGH_COVERAGE | TRUE |
| MEDIUM_COVERAGE_VALIDATED | TRUE |
| NO_CRITICAL_BLIND_SPOTS (P0) | TRUE |
| FP rate | 0% |
| FN rate | 0% |

---

## 3. Observabilidade

Camada INTEGRITY no Centro de Comando consome eventos **reais** do motor (ATUOU com violações de drift INT-01* — verdadeiros positivos pendentes de SEC-BASELINE-002).

**OPERATIONALLY_CERTIFIED = TRUE**
