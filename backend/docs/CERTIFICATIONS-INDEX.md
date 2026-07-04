# Índice — Certificações Enterprise On-Premise v1

**Última actualização:** 2026-07-04 (SEC-20 — Enterprise Security v2 Certification)

---

## Enterprise Security v1

| Fase | Documento | Status |
|------|-----------|--------|
| SECURITY-BASELINE-01 | [`evidence/security-baseline-01/SECURITY_BASELINE_01.md`](./evidence/security-baseline-01/SECURITY_BASELINE_01.md) | ✅ Certificado |
| SEC-01 Observatory | [`SEC_01_REPORT.md`](./SEC_01_REPORT.md) | ✅ 17/17 |
| SEC-02 Correlation | [`SEC_02_REPORT.md`](./SEC_02_REPORT.md) | ✅ 18/18 |
| SEC-03 Threat Intelligence | [`SEC_03_REPORT.md`](./SEC_03_REPORT.md) | ✅ 20/20 |
| SEC-04 Runtime Integrity | [`SEC_04_REPORT.md`](./SEC_04_REPORT.md) | ✅ 20/20 |
| SEC-05 Notification Center | [`SEC_05_REPORT.md`](./SEC_05_REPORT.md) | ✅ 20/20 |
| SEC-06 Response Orchestrator | [`SEC_06_REPORT.md`](./SEC_06_REPORT.md) | ✅ 22/22 |
| SEC-07 SOC Dashboard | [`SEC_07_REPORT.md`](./SEC_07_REPORT.md) | ✅ 22/22 |
| **SEC-08 Certificação final** | [`SECURITY_CERTIFICATION_V1.md`](./SECURITY_CERTIFICATION_V1.md) | ✅ **ENTERPRISE SECURITY V1 — CERTIFIED WITH REMARKS** |
| SEC-09 Promotion | [`SEC_09_PROMOTION.md`](./SEC_09_PROMOTION.md) | ✅ Plano aprovado |
| SEC-10 Active Defense | [`SEC_10_ACTIVE_DEFENSE.md`](./SEC_10_ACTIVE_DEFENSE.md) | ✅ Fase 1 implementada (consultivo) |
| SEC-11 Adaptive Protection | [`SEC_11_ADAPTIVE_PROTECTION.md`](./SEC_11_ADAPTIVE_PROTECTION.md) | ✅ Fase 2 (planos + aprovação) |
| SEC-12 Execution Validation | [`SEC_12_EXECUTION_VALIDATION.md`](./SEC_12_EXECUTION_VALIDATION.md) | ✅ Dry-run + readiness |
| SEC-13 Controlled Execution | [`SEC_13_CONTROLLED_EXECUTION.md`](./SEC_13_CONTROLLED_EXECUTION.md) | ✅ LOW auto only |
| SEC-13A Operational Promotion | [`SEC_13A_OPERATIONAL_PROMOTION.md`](./SEC_13A_OPERATIONAL_PROMOTION.md) | ✅ Plano ONLINE READY |
| SEC-14 Adaptive Blocking | [`SEC_14_ADAPTIVE_BLOCKING.md`](./SEC_14_ADAPTIVE_BLOCKING.md) | ✅ Recomendações only |
| SEC-15 Anti-Scanner | [`SEC_15_ANTI_SCANNER.md`](./SEC_15_ANTI_SCANNER.md) | ✅ Analítico e consultivo |
| SEC-16 Threat Deception | [`SEC_16_THREAT_DECEPTION.md`](./SEC_16_THREAT_DECEPTION.md) | ✅ Planos certificados |
| SEC-17 Exfiltration Detection | [`SEC_17_EXFILTRATION_DETECTION.md`](./SEC_17_EXFILTRATION_DETECTION.md) | ✅ Consultivo |
| SEC-18 Runtime Protection | [`SEC_18_RUNTIME_PROTECTION.md`](./SEC_18_RUNTIME_PROTECTION.md) | ✅ Controlador consultivo |
| SEC-19 Operational Certification | [`SEC_19_OPERATIONAL_CERTIFICATION.md`](./SEC_19_OPERATIONAL_CERTIFICATION.md) | ✅ Simulação + stress audit-only |
| **SEC-20 Certification v2** | [`SECURITY_CERTIFICATION_V2.md`](./SECURITY_CERTIFICATION_V2.md) | ✅ **Encerramento formal v2** |

Congelamento: [`ENTERPRISE_SECURITY_V1.md`](./ENTERPRISE_SECURITY_V1.md) · Relatório: [`SECURITY_CERTIFICATION_REPORT.md`](./SECURITY_CERTIFICATION_REPORT.md) · Matriz: [`SECURITY_CERTIFICATION_MATRIX.md`](./SECURITY_CERTIFICATION_MATRIX.md) · Readiness: [`SECURITY_READINESS_REPORT.md`](./SECURITY_READINESS_REPORT.md) · Evidências: [`evidence/sec-08/`](./evidence/sec-08/)

**Sequência SEC:** ✅ **ENCERRADA** (SECURITY-BASELINE-01 → SEC-08)

| Fase | Documento | Status |
|------|-----------|--------|
| SEC-09 Promotion | [`SEC_09_PROMOTION.md`](./SEC_09_PROMOTION.md) | ✅ **PLANO APROVADO — ACTIVAÇÃO MANUAL PENDENTE** |

Promoção: [`SEC_09_RUNTIME_PROMOTION.md`](./SEC_09_RUNTIME_PROMOTION.md) · Checklist: [`SEC_09_CHECKLIST.md`](./SEC_09_CHECKLIST.md) · Rollback: [`SEC_09_ROLLBACK.md`](./SEC_09_ROLLBACK.md) · Evidências: [`evidence/sec-09/`](./evidence/sec-09/)

**Comando:** `node backend/src/tests/audit/SEC_08_ENTERPRISE_SECURITY_CERTIFICATION.test.js`  
**Endpoint certificação:** `GET /api/audit/security-certification`  
**Endpoint promoção:** `GET /api/audit/security-promotion`  
**Endpoint active defense:** `GET /api/audit/security-active-defense`  
**Comando SEC-10:** `node backend/src/tests/securityActiveDefense/SEC_10_ACTIVE_DEFENSE.test.js`  
**Comando SEC-11:** `node backend/src/tests/securityAdaptiveProtection/SEC_11_ADAPTIVE_PROTECTION.test.js`  
**Comando SEC-12:** `node backend/src/tests/securityExecutionValidation/SEC_12_EXECUTION_VALIDATION.test.js`  
**Comando SEC-13:** `node backend/src/tests/securityControlledExecution/SEC_13_CONTROLLED_EXECUTION.test.js`  
**Endpoint controlled execution:** `GET /api/audit/security-controlled-execution`  
**Comando SEC-13A:** `node backend/src/tests/securityPromotionOperational/SEC_13A_OPERATIONAL_PROMOTION.test.js`  
**Endpoint operational promotion:** `GET /api/audit/security-operational-promotion`  
**Comando SEC-14:** `node backend/src/tests/securityAdaptiveBlocking/SEC_14_ADAPTIVE_BLOCKING.test.js`  
**Endpoint adaptive blocking:** `GET /api/audit/security-adaptive-blocking`  
**Comando SEC-15:** `node backend/src/tests/securityAntiScanner/SEC_15_ANTI_SCANNER.test.js`  
**Endpoint anti-scanner:** `GET /api/audit/security-anti-scanner`  
**Comando SEC-16:** `node backend/src/tests/securityThreatDeception/SEC_16_THREAT_DECEPTION.test.js`  
**Endpoint threat deception:** `GET /api/audit/security-threat-deception`  
**Comando SEC-17:** `node backend/src/tests/securityExfiltrationDetection/SEC_17_EXFILTRATION_DETECTION.test.js`  
**Endpoint exfiltration:** `GET /api/audit/security-exfiltration`  
**Comando SEC-18:** `node backend/src/tests/securityRuntimeProtection/SEC_18_RUNTIME_PROTECTION.test.js`  
**Endpoint runtime protection:** `GET /api/audit/security-runtime-protection`  
**Comando SEC-19:** `node backend/src/tests/securityOperational/SEC_19_OPERATIONAL_CERTIFICATION.test.js`  
**Endpoint operational certification:** `GET /api/audit/security-operational-certification`  
**Comando SEC-20:** `node backend/src/tests/audit/SEC_20_ENTERPRISE_SECURITY_CERTIFICATION.test.js`  
**Endpoint certification v2:** `GET /api/audit/security-certification-v2`

**Sequência SEC v2:** ✅ **ENCERRADA** (SECURITY-BASELINE-01 → SEC-20)

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
| ECO-04 Fase 4 | [`ECO_04_CONTROLLER_CONSUMER.md`](./ECO_04_CONTROLLER_CONSUMER.md) | ✅ **CERTIFICADO COM RESSALVAS** |
| ECO-05 Fase 5 | [`ECO_05_PULSE_CONSUMER.md`](./ECO_05_PULSE_CONSUMER.md) | ✅ **CERTIFICADO COM RESSALVAS** |
| ECO-06 Fase 6 | [`ECO_06_CONTEXT_CONSUMER.md`](./ECO_06_CONTEXT_CONSUMER.md) | ✅ **CERTIFICADO COM RESSALVAS** |
| ECO-07 Fase 7 | [`ECO_07_EXECUTIVE_CONSUMER.md`](./ECO_07_EXECUTIVE_CONSUMER.md) | ✅ **CERTIFICADO COM RESSALVAS** |
| ECO-08 Fase 8 | [`ECO_08_ENTERPRISE_CERTIFICATION.md`](./ECO_08_ENTERPRISE_CERTIFICATION.md) | ✅ **ENTERPRISE ECOSYSTEM CERTIFIED WITH REMARKS** |

Inventário: [`ECO_01_PARALLEL_FLOWS_INVENTORY.md`](./ECO_01_PARALLEL_FLOWS_INVENTORY.md) · Mapa: [`ECO_01_CONVERGENCE_MAP.md`](./ECO_01_CONVERGENCE_MAP.md) · Evidências: [`evidence/eco-01/`](./evidence/eco-01/)

Contrato ECO-02: [`ECO_02_ADR_INDEX.md`](./ECO_02_ADR_INDEX.md) · Matriz: [`ECO_02_DEPENDENCY_MATRIX.md`](./ECO_02_DEPENDENCY_MATRIX.md) · Migração: [`ECO_02_MIGRATION_PLAN.md`](./ECO_02_MIGRATION_PLAN.md) · Sequência: [`ECO_02_EXECUTION_SEQUENCE.md`](./ECO_02_EXECUTION_SEQUENCE.md) · Evidências: [`evidence/eco-02/`](./evidence/eco-02/)

ECO-03 bypasses: [`ECO_03_ADAPTER_IMPLEMENTATION.md`](./ECO_03_ADAPTER_IMPLEMENTATION.md) · Rollback: [`ECO_03_ROLLBACK_PLAN.md`](./ECO_03_ROLLBACK_PLAN.md) · Observabilidade: [`ECO_03_OBSERVABILITY_REPORT.md`](./ECO_03_OBSERVABILITY_REPORT.md) · Evidências: [`evidence/eco-03/`](./evidence/eco-03/)

ECO-04 Controller: [`ECO_04_CONTROLLER_ADAPTER.md`](./ECO_04_CONTROLLER_ADAPTER.md) · Inventário: [`ECO_04_CONTROLLER_INVENTORY.md`](./ECO_04_CONTROLLER_INVENTORY.md) · Observabilidade: [`ECO_04_OBSERVABILITY.md`](./ECO_04_OBSERVABILITY.md) · Evidências: [`evidence/eco-04/`](./evidence/eco-04/)

ECO-05 Pulse: [`ECO_05_PULSE_ADAPTER.md`](./ECO_05_PULSE_ADAPTER.md) · Inventário: [`ECO_05_PULSE_INVENTORY.md`](./ECO_05_PULSE_INVENTORY.md) · Observabilidade: [`ECO_05_OBSERVABILITY.md`](./ECO_05_OBSERVABILITY.md) · Evidências: [`evidence/eco-05/`](./evidence/eco-05/)

ECO-06 Context: [`ECO_06_CONTEXT_ADAPTER.md`](./ECO_06_CONTEXT_ADAPTER.md) · Inventário: [`ECO_06_CONTEXT_INVENTORY.md`](./ECO_06_CONTEXT_INVENTORY.md) · Observabilidade: [`ECO_06_OBSERVABILITY.md`](./ECO_06_OBSERVABILITY.md) · Evidências: [`evidence/eco-06/`](./evidence/eco-06/)

ECO-07 Executive: [`ECO_07_EXECUTIVE_ADAPTER.md`](./ECO_07_EXECUTIVE_ADAPTER.md) · Inventário: [`ECO_07_EXECUTIVE_INVENTORY.md`](./ECO_07_EXECUTIVE_INVENTORY.md) · Observabilidade: [`ECO_07_OBSERVABILITY.md`](./ECO_07_OBSERVABILITY.md) · Evidências: [`evidence/eco-07/`](./evidence/eco-07/)

ECO-08 Baseline: [`ECO_08_FINAL_REPORT.md`](./ECO_08_FINAL_REPORT.md) · Arquitectura: [`ECO_08_ARCHITECTURE_BASELINE.md`](./ECO_08_ARCHITECTURE_BASELINE.md) · Consumidores: [`ECO_08_CONSUMER_MATRIX.md`](./ECO_08_CONSUMER_MATRIX.md) · NCs: [`ECO_08_NC_MATRIX.md`](./ECO_08_NC_MATRIX.md) · Evidências: [`evidence/eco-08/`](./evidence/eco-08/)

**Sequência ECO:** ✅ **ENCERRADA** (ECO-01 → ECO-08)

---

## Enterprise Baseline v1 (LOCK)

| Certificação | Documento | Status |
|--------------|-----------|--------|
| BASELINE-LOCK-01 | [`ENTERPRISE_BASELINE_V1.md`](./ENTERPRISE_BASELINE_V1.md) | ✅ **BASELINE ENCERRADA COM RESSALVAS** |

Baseline: [`BASELINE_LOCK_REPORT.md`](./BASELINE_LOCK_REPORT.md) · Checklist: [`BASELINE_LOCK_CHECKLIST.md`](./BASELINE_LOCK_CHECKLIST.md) · Matriz: [`BASELINE_LOCK_MATRIX.md`](./BASELINE_LOCK_MATRIX.md) · Evidências: [`evidence/baseline-lock-01/`](./evidence/baseline-lock-01/)

**Ponto de corte:** 2026-07-03 · Evoluções futuras → Enterprise v2 (novo ciclo)

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
