# REG-002 — Executive Summary

**Programa:** REG-002 — Enterprise Functional Recovery & Certification  
**Data:** 2026-07-20  
**Princípio:** RECONNECT BEFORE REBUILD

---

## Resultado

A plataforma recuperou as ligações críticas identificadas no REG-001 **sem reimplementar** services, dashboards ou engines.

| Recovery | Acção | Tipo |
|----------|-------|------|
| R1 | Mount `/financial-leakage/*` | reconnect |
| R2 | Mount `/industrial/*` | reconnect |
| R3 | Política única `industrialCoreAccess` | unify guard |
| R4 | Deep-links Insights | reconnect UX |
| R5 | Deep-links Cérebro + widgets CC | reconnect UX |
| R6 | Dead Click Matrix + nav certification | governança |
| R7 | Suíte test:reg002 | certificação |

---

## O que **não** foi feito

- ❌ Novos services / engines / dashboards  
- ❌ Alteração de lógica financeira ou industrial  
- ❌ Alteração OPM / CPL / EOX certificados  

---

## Ficheiros novos (wiring only)

- `backend/src/routes/dashboardFinancialLeakage.js`
- `backend/src/routes/dashboardIndustrial.js`
- `frontend/src/utils/industrialCoreAccess.js`
- `frontend/src/platform/audit/regression/reg002DeadClickMatrix.js`
- `frontend/src/tests/reg002/*`
- `frontend/docs/evidence/REG-002/*`

---

## Próximo passo

Com integridade funcional restaurada nos 4 casos críticos, o roadmap pode retomar **Finance** (ou outro domínio) sobre base estável — sempre com `test:reg002` na pipeline.
