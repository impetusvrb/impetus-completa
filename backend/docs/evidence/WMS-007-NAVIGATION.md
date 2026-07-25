# WMS-007 — Modular Workspace Navigation

**Programa:** IMPETUS WMS  
**Tipo:** Workspace Evolution (Presentation + Workspace only)  
**Data:** 2026-07-18  
**Branch:** feature/wms-007-modular-navigation  
**Parecer:** READY

---

## Sidebar global (LOGÍSTICA)

Armazéns · Inventário · Recebimento · Picking · Expedição · Transferências

**Dashboard removido da sidebar.**

## Landing

Acessível via Command Center, URL directa e bookmarks — não listado no menu.

## Fontes

- `wmsModuleRegistry.js` — registo modular WMS-007
- `logisticsWmsPresentationAdapter.js` — filtra dashboard
- `WmsOperationalNav.jsx` — `getWmsSidebarModules()`
