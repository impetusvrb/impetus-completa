# OPM-GOV-001 — Operational Contract Baseline

**Fase:** OPM-GOV-001  
**Status:** frozen  
**Certificado por:** OPM-E2E-001  
**Data:** 2026-07-19

---

## Objetivo

Consolidar e congelar os contratos operacionais validados na certificação E2E antes do OPM-006 Transfer Management.

Esta baseline junta-se às referências oficiais da plataforma:

BASELINE-SYSTEM · ARC-001/002/003/003A · NAV-001/002/002A · OPM-001D · WMS-REF-001 · **OPM-GOV-001**

---

## Componentes congelados

| Artefacto | Ficheiro |
|-----------|----------|
| Registry | `opmGov001Registry.js` |
| Lifecycle | `opmGov001LifecycleContracts.js` |
| Movements | `opmGov001MovementContracts.js` |
| Handoffs | `opmGov001HandoffContracts.js` |
| Observability | `opmGov001ObservabilityContracts.js` |
| Invariants | `opmGov001OperationalInvariants.js` |
| Compatibility | `opmGov001CompatibilityMatrix.js` |

**Import oficial:** `frontend/src/governance/opm-gov-001/index.js`

---

## Gate de evolução

```
OPM-E2E-001 ✅ → OPM-GOV-001 ✅ → OPM-006 Transfer Management
```

Alterações a contratos congelados requerem **revisão arquitectural**.

---

## Execução

```bash
npm run test:opm-gov-001
npm run test:opm-platform   # flow + governance
```
