# OPM-GOV-001 — Test Report

**Data:** 2026-07-19

```bash
npm run test:opm-gov-001-lifecycle
npm run test:opm-gov-001-movements
npm run test:opm-gov-001-handoffs
npm run test:opm-gov-001-observability
npm run test:opm-gov-001-invariants
npm run test:opm-gov-001-compatibility
npm run test:opm-gov-001-certification
npm run test:opm-gov-001          # agregador
npm run test:opm-platform         # flow + governance + regressão
```

## Suites

| Suite | Testes |
|-------|--------|
| lifecycle.test | 5 |
| movementContracts.test | 5 |
| handoffContracts.test | 5 |
| observabilityContracts.test | 6 |
| invariants.test | 7 |
| compatibility.test | 6 |
| opmGov001CertificationTests | 5 |

**Total OPM-GOV-001:** 39 testes

## Regressão

Incluída em `test:opm-platform`: OPM-002A, OPM-003, OPM-004, OPM-005, OPM-E2E-001, WMS-REF-001.

**Resultado:** ✅ Aprovado
