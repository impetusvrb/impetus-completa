# SECURITY v2 BASELINE

**Versão congelada:** Enterprise Security v2  
**Data congelamento:** SEC-20  
**Predecessor:** SECURITY-BASELINE-01 + Enterprise Security v1 (SEC-08)

---

## Baseline certificada

A baseline v2 inclui todos os módulos em `backend/src/security*/` até SEC-19, mais o colector SEC-20 (`securityCertificationV2`).

### Módulos congelados

```
securityObservatory/
securityCorrelation/
securityThreatIntelligence/
securityRuntimeIntegrity/
securityNotification/
securityResponse/
securitySOC/
securityActiveDefense/
securityAdaptiveProtection/
securityExecutionValidation/
securityControlledExecution/
securityPromotionOperational/
securityAdaptiveBlocking/
securityAntiScanner/
securityThreatDeception/
securityExfiltrationDetection/
securityRuntimeProtection/
securityOperationalCertification/
securityCertificationV2/   ← apenas leitura/consolidação
```

---

## Regras de evolução

1. Qualquer alteração funcional requer novo ciclo **Enterprise Security v3**
2. Correções críticas de segurança: patch mínimo + re-certificação parcial
3. Event Governance, ECO, Cognitive Core e Enterprise Baseline permanecem intocáveis

---

## Evidências

- `backend/docs/evidence/security-baseline-01/`
- `backend/docs/evidence/sec-01/` … `sec-20/`
- `backend/docs/ENTERPRISE_SECURITY_V2.md`

---

*Baseline v2 congelada após certificação SEC-20.*
