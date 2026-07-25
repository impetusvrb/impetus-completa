# INC-042 — Promoção do Runtime Cognitivo de Logística no Centro de Comando

**Data:** 2026-07-16  
**Tipo:** implementação controlada (camada de apresentação)  
**Pré-requisitos:** BASELINE-SYSTEM v1.0 · BASELINE-DASHBOARDS v1.0 · BASELINE-UI v1.0 · INC-036–INC-041  
**Referência:** INC-024 (Quality native promotion)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| **LOGISTICS_RUNTIME_VISIBLE** | **YES** |
| **GENERIC_WIDGETS_REPLACED** | **YES** (`logistica`, `estoque` suprimidos quando native) |
| **REAL_RUNTIME_CONSUMED** | **YES** |
| **NO_PLACEHOLDERS_INTRODUCED** | **YES** |
| **NO_FAKE_DATA** | **YES** |
| **NO_UI_REGRESSION** | **YES** |
| **BASELINE_UI_v1.0** | **PRESERVED** |
| **BASELINE_SYSTEM_v1.0** | **PRESERVED** |

---

## Objetivo

Activar a experiência visual `logistics_native` no Centro de Comando quando `logistics_cognitive_runtime.consolidation_applied === true` e `cockpit_mode === logistics_native`, substituindo widgets genéricos por hubs alimentados exclusivamente pelo runtime — **sem KPIs inventados, sem IA fictícia, sem módulos novos de negócio**.

---

## Integração Centro de Comando

**Antes (runtime inactivo ou não consolidado):**

```
CentroComando → LayoutPorCargo → WidgetLogistica + WidgetEstoque (dashboard.getSummary genérico)
```

**Depois (`logistics_native` consolidado):**

```
/dashboard/me → logistics_cognitive_runtime + logistics_cognitive_centers + logistics_signal_loader
CentroComando → resolveLogisticsCockpitRuntime → LogisticsNativeCockpitPromotion
  → 7 hubs lazy (mount points com estados honestos)
Widgets suprimidos: logistica, estoque
Fallback: widgets genéricos quando consolidation_applied !== true
```

---

## Hubs montados (INC-041 registry)

| Hub | Componente | Blocos runtime | Rota canónica |
|-----|------------|----------------|---------------|
| Governança WMS | `WarehouseGovernanceHub` | inventory_health, warehouse_capacity | `/app/logistics/operational?view=governance` |
| Inventário cognitivo | `InventoryCognitiveHub` | stock_rotation | `?view=storage` |
| Telemetria docas | `WarehouseTelemetryHub` | dock_flow | `?view=telemetry` |
| Inteligência frota | `FleetIntelligenceHub` | fleet_efficiency, route_performance | `?view=governance` |
| Expedição / OTIF | `DistributionHub` | shipment_otif, picking_efficiency | `?view=shipping` |
| Fornecedores / rastreio | `SupplierDeliveryHub` | receiving_flow, supplier_delivery, traceability_bridge | `?view=receiving` |
| IA contextual | `CognitiveLogisticsHub` | contextual_logistics_ai, logistics_narrative | `?view=maturity` |

Todos os hubs renderizam via `LogisticsHubShell` + `logisticsRuntimeHubAdapter.js`.

---

## Política de dados (UI)

| Estado | Quando | Copy UI |
|--------|--------|---------|
| **REAL_DATA** | `bound_blocks` intersectam blocos do hub | Métricas/summary do `block_details` |
| **INSUFFICIENT_DATA** | Blocos existem mas sem bind (`NO_RECORDS`, etc.) | "Aguardando sinais operacionais…" |
| **NOT_IMPLEMENTED** | `NOT_IMPLEMENTED` / `NO_DATASET` (ex.: picking) | "Módulo em preparação" |

**Proibido:** métricas fabricadas, séries sintéticas, placeholders enganosos.

---

## Componentes reutilizados vs novos

| Reutilizado | Origem |
|-------------|--------|
| Padrão lazy hub + Suspense | `QualityNativeCockpitPromotion` |
| `LogisticsHubShell` / cards | Padrão `CognitiveQualityHub` / `impetus-card` |
| Supressão placeholders | `shouldSuppressPlaceholderWidgets` (Quality) |
| Rotas | `LOGISTICS_NAVIGATION_MANIFEST` |

| Novo (apresentação only) | Papel |
|--------------------------|-------|
| `logisticsRuntimeHubAdapter.js` | Mapeia runtime → estado hub |
| `LogisticsHubShell.jsx` | Shell partilhado |
| 7 hubs `*Hub.jsx` | Wrappers finos (~10 linhas cada) |
| `LogisticsNativeCockpitPromotion.jsx` | Orquestração CC |

**Não alterado:** Promotion Engine · Signal Loader · Binding · thresholds · CSS global · Cognitive Core · Onipresença · Whisper · grid CC.

---

## Widgets substituídos

| Widget | Comportamento |
|--------|---------------|
| `WidgetLogistica` | Suprimido quando `logistics_native` activo |
| `WidgetEstoque` | Suprimido quando `logistics_native` activo |
| Demais widgets CC | **Inalterados** |

---

## Tenant piloto (`511f4819…`, binding 0.385)

Estados esperados com dados actuais (pós INC-040):

| Hub | Estado UI |
|-----|-----------|
| SupplierDeliveryHub | **REAL_DATA** (receiving + traceability) |
| CognitiveLogisticsHub | **REAL_DATA** (narrative + contextual) |
| WarehouseGovernanceHub | **REAL_DATA** (inventory MP) |
| DistributionHub | **NOT_IMPLEMENTED** (picking) + OTIF vazio |
| Fleet, Telemetry, Inventory | **INSUFFICIENT_DATA** |

---

## Ficheiros alterados

| Path | Alteração |
|------|-----------|
| `frontend/.../logisticsNativeCockpitRegistry.js` | Lazy hubs + `resolveAllLogisticsHubsForPromotion` |
| `frontend/.../LogisticsNativeCockpitPromotion.jsx` | Promoção visual real |
| `frontend/.../CentroComando.jsx` | Supressão `logistica`/`estoque` + mount hubs |
| `frontend/domains/logistics/cockpit/*` | Adapter + shell + 7 hubs |
| `frontend/tests/logistics-native-cockpit-promotion/*` | **NOVO** |

**Backend:** inalterado nesta INC (consumo apenas do payload existente).

---

## Testes executados (2026-07-16)

| Suite | Resultado |
|-------|-----------|
| `npm run test:logistics-native-cockpit-promotion` (FE) | **12/12 PASS** |
| `npm run test:quality-native-cockpit-promotion` (FE) | **PASS** |
| `npm run test:logistics-promotion-chain` (BE) | **5/5 PASS** |
| `npm run test:logistics-runtime-foundation` | **8/8 PASS** |
| Quality Z.19 composition | **22/22 PASS** |
| Quality Z.23 consolidation | **PASS** |
| Maintenance / Production / Executive | **PASS** |

---

## Validação visual

Screenshots: *pendentes de captura manual no perfil `manager_logistics` com flags logistics ON + runtime consolidado.*

Checklist manual:

1. Login `manager_logistics`
2. Confirmar `/dashboard/me` → `logistics_cognitive_runtime.consolidation_applied: true`
3. Centro de Comando mostra 7 hubs (não `WidgetLogistica`/`WidgetEstoque`)
4. Hubs com dados reais exibem summaries do runtime; restantes estados honestos

---

## Critério de encerramento

| Critério | Estado |
|----------|--------|
| CC logístico especializado visível quando runtime consolidado | **YES** |
| Widgets genéricos substituídos com fallback | **YES** |
| Baseline UI / System preservados | **YES** |
| Pronto para INC-043 (hubs funcionais / APIs legacy) | **YES** |

---

## Próximo passo

**INC-043+:** enriquecer hubs individuais com módulos operacionais existentes (`/app/logistics/operational`, intelligence legacy) — sempre via runtime, nunca mock.
