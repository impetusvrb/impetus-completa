# APPSEC-02 — Enterprise Red Team Validation & Security Regression

**Programa:** APPSEC-02  
**Data:** 2026-07-04  
**Valida:** APPSEC-01 (não altera)  
**Baseline:** Red Team autorizado 04/07/2026

---

## Objetivo

Reexecutar **automaticamente** todo o roteiro do Red Team 04/07/2026 e comparar resultados antes/depois do APPSEC-01, emitindo **certificação formal** (modelo SEC-20).

**Read-only.** Não implementa novos mecanismos de segurança.

---

## Módulo

`backend/src/securityApplicationValidation/`

| Componente | Função |
|------------|--------|
| `redTeamScenarioRunner.js` | 32 cenários reproduzíveis |
| `vulnerabilityRegressionEngine.js` | 10 checks de regressão de código |
| `securityComparisonEngine.js` | Comparação vs baseline RT-01…RT-16 |
| `appsecCertificationEngine.js` | Decisão APPSEC_CERTIFIED* |
| `securityEvidenceBuilder.js` | Orquestração + evidências JSON |
| `baseline/redTeamBaseline20260704.js` | Baseline congelado |

---

## Execução

```bash
# Certificação completa
node backend/src/tests/securityApplicationValidation/APPSEC_02.test.js

# Evidência JSON
node -e "require('./src/securityApplicationValidation').runValidation({persist:true}).then(p=>console.log(p.decision))"

# API (admin tenant)
GET /api/audit/appsec-validation
GET /api/audit/appsec-validation?refresh=true
```

Evidências: `backend/docs/evidence/appsec-02/validation-latest.json`

---

## Decisões possíveis

| Decisão | Critério |
|---------|----------|
| `APPSEC_CERTIFIED` | P0/P1 FIXED, zero regressões |
| `APPSEC_CERTIFIED_WITH_REMARKS` | P0/P1 parciais ou P2/P3 residuais |
| `APPSEC_FAILED` | P0/P1 NOT_FIXED ou REGRESSION |

---

## Restrições

- SEC-01→SEC-21C: inalterado
- APPSEC-01: inalterado (só consumido)
- Event Governance, ECO, Cognitive Core: inalterados

---

## Documentação relacionada

- [`APPSEC_02_REPORT.md`](./APPSEC_02_REPORT.md)
- [`APPSEC_02_COMPARISON.md`](./APPSEC_02_COMPARISON.md)
- [`APPSEC_02_CERTIFICATION.md`](./APPSEC_02_CERTIFICATION.md)
- [`APPSEC_02_RESIDUAL_RISK.md`](./APPSEC_02_RESIDUAL_RISK.md)
