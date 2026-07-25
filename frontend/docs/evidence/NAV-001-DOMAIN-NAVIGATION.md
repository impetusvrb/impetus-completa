# NAV-001 — Context-Aware Domain Navigation

**Programa:** Presentation Navigation  
**Tipo:** Frontend Only (correcção de segregação por domínio)  
**Data:** 2026-07-19  
**Parecer:** COMPLETED

---

## Fluxo

Identity Context → Organizational Context → Functional Area Resolver → Allowed Domains → Presentation Registry → Sidebar

## Proibição

`merge(allDomains)` eliminado — cada domínio avaliado individualmente em `allowedDomainRegistry.js`.
