# OPM-001A — Presentation Architecture

**Entrega:** OPM-001A  
**Data:** 2026-07-19

---

## Camadas

```
┌──────────────────────────────────────────────────┐
│ Module Pages (WMS-007A certificado)              │
│ WarehouseModulePage · InventoryModulePage · …    │
└────────────────────┬─────────────────────────────┘
                     │ props: rows, columns, loading…
┌────────────────────▼─────────────────────────────┐
│ WmsStandaloneModuleFrame (adapter)             │
│ · RBAC canAccessWmsModule                        │
│ · classifyWmsError → errorType                   │
│ · data-wms-standalone preservado                 │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│ IndustrialOperationalModule (OPM-001A)           │
│ · Deriva uiState de loading/error/rows           │
│ · KPIs sintéticos (count, state, domain, phase)  │
│ · Toolbar refresh → reload()                     │
└────────────────────┬─────────────────────────────┘
                     │
┌────────────────────▼─────────────────────────────┐
│ IndustrialModuleLayout + subcomponentes          │
│ · Composição pura, zero API                      │
└──────────────────────────────────────────────────┘
```

---

## Separação de responsabilidades

| Camada | Alterável OPM-001A | Responsabilidade |
|--------|-------------------|------------------|
| Hooks WMS (`use*Module`) | **Não** | 1 API list por módulo |
| `wmsV1ApiClient` | **Não** | Cliente REST certificado |
| Rotas `/app/logistics/*` | **Não** | WMS-007A |
| NAV-001 resolver | **Não** | Domínios por perfil |
| `WmsStandaloneModuleFrame` | **Adapter** | RBAC + delegação |
| `presentation/industrial-module` | **Sim** | Framework novo |

---

## Fluxo de estados

```
loading ──────────────────► IndustrialModuleStateView (syncing)
permission_denied ────────► WmsModulePermissionDenied (frame, pré-layout)
api_unavailable ──────────► integration_unavailable
error ────────────────────► error
rows.length === 0 ────────► empty
readOnly ─────────────────► read_only + grid
rows.length > 0 ──────────► data_loaded + IndustrialDataGrid
```

---

## Extensibilidade (OPM-001+)

1. **Warehouse** — activar search, CRUD actions, timeline real
2. **Inventory** — reutilizar mesmo layout, trocar columns/KPIs
3. **Supply** — `IndustrialOperationalModule` com `domain="supply"`
4. **Qualidade** — timeline partilhada PPAP/MSA/Ishikawa

---

## Ficheiros tocados (presentation only)

| Ficheiro | Tipo |
|----------|------|
| `frontend/src/presentation/industrial-module/**` | Novo |
| `frontend/src/domains/logistics-operational/components/WmsStandaloneModuleFrame.jsx` | Adapter |
| `frontend/src/tests/opm001a/opm001aIndustrialModuleTests.mjs` | Testes |
| `frontend/package.json` | Script `test:opm001a` |

**Backend:** zero alterações.
