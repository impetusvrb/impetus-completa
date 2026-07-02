# Índice — Certificações Enterprise On-Premise v1

**Última actualização:** 2026-07-02 (ECO-02)

---

## Event Governance v1

| Certificação | Documento | Status |
|--------------|-----------|--------|
| EVENT-GOVERNANCE-20 | [`EVENT_GOVERNANCE_CERTIFICATION_V1.md`](./EVENT_GOVERNANCE_CERTIFICATION_V1.md) | ✅ **CERTIFICADO COM RESSALVAS** |
| INTEG-01 | [`EVENT_GOVERNANCE_INTEGRATION_REPORT.md`](./EVENT_GOVERNANCE_INTEGRATION_REPORT.md) | ✅ **CERTIFICADO COM RESSALVAS** |
| PROMOTION-01 | [`ENTERPRISE_RUNTIME_PROMOTION.md`](./ENTERPRISE_RUNTIME_PROMOTION.md) | ✅ **READY COM RESSALVAS** |
| PROMOTION-02 | [`PROMOTION_02_ACTIVATION_REPORT.md`](./PROMOTION_02_ACTIVATION_REPORT.md) | ✅ **PROMOTION SUCCESSFUL** (staging) |

Evidências: [`evidence/event-governance-20/`](./evidence/event-governance-20/) · [`evidence/integ-01/`](./evidence/integ-01/) · [`evidence/promotion-01/`](./evidence/promotion-01/) · [`evidence/promotion-02/`](./evidence/promotion-02/)

---

## Cognitive Ecosystem Convergence (ECO)

| Fase | Documento | Status |
|------|-----------|--------|
| ECO-01 Fase 1 | [`ECO_01_CONVERGENCE_AUDIT.md`](./ECO_01_CONVERGENCE_AUDIT.md) | ✅ **AUDITORIA CONCLUÍDA** |
| ECO-02 Fase 2 | [`ECO_02_CONVERGENCE_ARCHITECTURE.md`](./ECO_02_CONVERGENCE_ARCHITECTURE.md) | ✅ **CONTRATO CERTIFICADO** |
| ECO-03 Fase 3 | [`ECO_03_BYPASS_MIGRATION.md`](./ECO_03_BYPASS_MIGRATION.md) | ✅ **CERTIFICADO COM RESSALVAS** |

Inventário: [`ECO_01_PARALLEL_FLOWS_INVENTORY.md`](./ECO_01_PARALLEL_FLOWS_INVENTORY.md) · Mapa: [`ECO_01_CONVERGENCE_MAP.md`](./ECO_01_CONVERGENCE_MAP.md) · Evidências: [`evidence/eco-01/`](./evidence/eco-01/)

Contrato ECO-02: [`ECO_02_ADR_INDEX.md`](./ECO_02_ADR_INDEX.md) · Matriz: [`ECO_02_DEPENDENCY_MATRIX.md`](./ECO_02_DEPENDENCY_MATRIX.md) · Migração: [`ECO_02_MIGRATION_PLAN.md`](./ECO_02_MIGRATION_PLAN.md) · Sequência: [`ECO_02_EXECUTION_SEQUENCE.md`](./ECO_02_EXECUTION_SEQUENCE.md) · Evidências: [`evidence/eco-02/`](./evidence/eco-02/)

ECO-03 bypasses: [`ECO_03_ADAPTER_IMPLEMENTATION.md`](./ECO_03_ADAPTER_IMPLEMENTATION.md) · Rollback: [`ECO_03_ROLLBACK_PLAN.md`](./ECO_03_ROLLBACK_PLAN.md) · Observabilidade: [`ECO_03_OBSERVABILITY_REPORT.md`](./ECO_03_OBSERVABILITY_REPORT.md) · Evidências: [`evidence/eco-03/`](./evidence/eco-03/)

**Sequência congelada:** ECO-03 → ECO-04 → ECO-05 → ECO-06 → ECO-07 → ECO-08

---

## Certificações de produto (engenharia)

| Certificação | Documento | Status |
|--------------|-----------|--------|
| FORENSICS-01 | [`CERT-ONPREM-FORENSICS-01.md`](./CERT-ONPREM-FORENSICS-01.md) | ✅ CERTIFICADO |
| ARCHITECTURE-01 | [`CERT-ONPREM-ARCHITECTURE-01.md`](./CERT-ONPREM-ARCHITECTURE-01.md) | ✅ CERTIFICADO |
| INFRA-01 | [`CERT-ONPREM-INFRA-01.md`](./CERT-ONPREM-INFRA-01.md) | ✅ CERTIFICADO |
| DATA-01 | [`CERT-ONPREM-DATA-01.md`](./CERT-ONPREM-DATA-01.md) | ✅ CERTIFICADO |
| LICENSE-01 | [`CERT-LICENSE-01.md`](./CERT-LICENSE-01.md) | ✅ CERTIFICADO |
| CONTAINER-01 | [`CERT-ONPREM-CONTAINER-01.md`](./CERT-ONPREM-CONTAINER-01.md) | ✅ CERTIFICADO |
| BACKUP-01 | [`CERT-ENTERPRISE-BACKUP-01.md`](./CERT-ENTERPRISE-BACKUP-01.md) | ✅ CERTIFICADO |

---

## Certificações operacionais / homologação

| Certificação | Documento | Status |
|--------------|-----------|--------|
| ENV-QUALIFICATION-01 | [`CERT-ENTERPRISE-ENV-QUALIFICATION-01.md`](./CERT-ENTERPRISE-ENV-QUALIFICATION-01.md) | ⚠️ REPROVADA (host prod) |
| PROVISIONING-01 | [`CERT-ENTERPRISE-PROVISIONING-01.md`](./CERT-ENTERPRISE-PROVISIONING-01.md) | ✅ CERTIFICADO (doc) |
| STAGING-01 | [`CERT-ENTERPRISE-STAGING-01.md`](./CERT-ENTERPRISE-STAGING-01.md) | ⏳ VM pendente |
| ROLLBACK-01 | [`CERT-ENTERPRISE-ROLLBACK-01.md`](./CERT-ENTERPRISE-ROLLBACK-01.md) | ⚠️ REPROVADA (re-exec) |
| VALIDATION-01 | [`CERT-ONPREM-VALIDATION-01.md`](./CERT-ONPREM-VALIDATION-01.md) | ⏳ NÃO HOMOLOGADA |
| GOLIVE-01 | [`CERT-ENTERPRISE-GOLIVE-01.md`](./CERT-ENTERPRISE-GOLIVE-01.md) | 📋 PREPARADA |

---

## Housekeeping / encerramento

| Certificação | Documento | Status |
|--------------|-----------|--------|
| CLOSURE-01 | Relatório auditoria (sessão) | ✅ Decisão A |
| HOUSEKEEPING-01 | [`CERT-ENTERPRISE-HOUSEKEEPING-01.md`](./CERT-ENTERPRISE-HOUSEKEEPING-01.md) | ✅ CERTIFICADO |

---

## Sequência operacional restante

```
STAGING (exec) → ROLLBACK (re-exec) → VALIDATION (re-exec) → GOLIVE (decisão)
```

---

## Matrizes e índices relacionados

- [`FUNCTIONAL_MATRIX.md`](./FUNCTIONAL_MATRIX.md) — secção Homologação Enterprise
- [`MATRIZ-CONFORMIDADE-VALIDATION.md`](./MATRIZ-CONFORMIDADE-VALIDATION.md)
- [`adrs/INDEX.md`](./adrs/INDEX.md)
