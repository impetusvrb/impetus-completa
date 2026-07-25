# WMS-007 — Modular Workspace Navigation

**Programa:** IMPETUS WMS  
**Tipo:** Workspace Evolution (Presentation + Workspace only)  
**Data:** 2026-07-18  
**Branch:** feature/wms-007-modular-navigation  
**Parecer:** READY

---

## Objectivo

Modularizar o Workspace WMS: cada item da sidebar abre um módulo independente com hook e API dedicados. Dashboard permanece apenas como landing page em `/app/logistics-operational/workspace`.

## Escopo respeitado

- Sem alterações backend, APIs, RBAC, feature flags, runtime ou contratos canónicos
- Presentation layer + Workspace frontend apenas

## Testes

| Script | Resultado | Exit |
| --- | --- | --- |
| test:wms007-routing | PASS | 0 |
| test:wms007-workspace | PASS | 0 |
| test:wms007-navigation | PASS | 0 |
| test:wms007-modules | PASS | 0 |
| test:wms007-regression | PASS | 0 |

## Observações

- Nenhuma observação bloqueante.
