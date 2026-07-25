# INC-038 — Runtime Foundation do domínio Logística

**Data:** 2026-07-16  
**Tipo:** implementação controlada (fundação only)  
**Pré-requisitos:** INC-036 · INC-037 (aprovada) · BASELINE-SYSTEM v1.0  
**Companion:** [LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md](LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| **LOGISTICS_RUNTIME_EXISTS** | **YES** |
| **LOGISTICS_RUNTIME_REGISTERED** | **YES** |
| **LOGISTICS_SIGNAL_LOADER_EXISTS** | **YES** (stub INC-039) |
| **LOGISTICS_PROMOTION_EXISTS** | **YES** (structural FE stub) |
| **LOGISTICS_CONSOLIDATOR_EXISTS** | **YES** (structure only) |
| **LOGISTICS_COGNITIVE_CENTERS_EXISTS** | **YES** (empty catalog) |
| **NO_UI_CHANGED** | **YES** |
| **NO_CSS_CHANGED** | **YES** |
| **NO_RUNTIME_REGRESSION** | **YES** |

---

## Escopo entregue

Fundação **`logistics_native`** aditiva e inactiva (default). Sem hubs, dashboards, KPIs, adapters funcionais, APIs novas ou alteração ao CentroComando.

### Runtime ID canónico

```
runtime_id   = logistics_native
runtime_name = logistics_native
cockpit_mode = logistics_native
```

---

## Arquitectura criada

### Cadeia Z.19 → Z.23 (preparada, inactiva)

| Fase | Componente | Estado INC-038 |
|------|-----------|----------------|
| Z.19 | `logisticsCockpitPilot.js` | Stub — skip quando flags OFF |
| Z.19 | `logisticsCognitiveBlockPack.js` | **13 blocos registados** |
| Z.20 | `logisticsTenantSignalLoader.js` | **Stub** (foundation_only) |
| Z.22 | `logisticsControlledRenderRuntime.js` | Stub — promotion_applied: false |
| Z.23 | `logisticsCockpitConsolidator.js` | Structure — consolidation_applied: false |
| Z.23 | `logisticsCockpitConsolidationRuntime.js` | Gate flags OFF |
| — | `logisticsFoundationAttachment.js` | **Sempre anexa descriptor inactivo** |

### Integração `/dashboard/me`

Via `cognitiveRuntimeFacade.applyCognitiveFoundationToDashboard`:

```json
{
  "logistics_cognitive_runtime": {
    "runtime_id": "logistics_native",
    "runtime_name": "logistics_native",
    "cockpit_mode": "logistics_native",
    "consolidation_applied": false,
    "promotion_applied": false,
    "inactive": true,
    "centers_count": 0,
    "binding_ratio": 0,
    "foundation_status": "registered_inactive"
  },
  "logistics_cognitive_centers": []
}
```

Report cognitivo inclui `logistics_runtime_foundation.registered: true`.

---

## Ficheiros adicionados

### Backend — cognitive runtime

| Ficheiro | Função |
|----------|--------|
| `cognitiveRuntime/config/phaseLogisticsNativeFeatureFlags.js` | Flags (default OFF) |
| `cognitiveRuntime/registry/logisticsCognitiveBlockPack.js` | LOGISTICS_PILOT_BLOCK_IDS (13) |
| `cognitiveRuntime/domains/logistics/bridge/logisticsTenantSignalLoader.js` | Loader stub |
| `cognitiveRuntime/domains/logistics/runtime/logisticsRuntimeDescriptor.js` | Descriptor + isLogisticsProfile |
| `cognitiveRuntime/domains/logistics/runtime/logisticsFoundationAttachment.js` | Anexo payload |
| `cognitiveRuntime/domains/logistics/runtime/logisticsCockpitConsolidationRuntime.js` | Z.23 runtime gate |
| `cognitiveRuntime/domains/logistics/cockpit/logisticsCenters.js` | 8 center_ids (vazios) |
| `cognitiveRuntime/domains/logistics/cockpit/logisticsCockpitConsolidator.js` | Consolidator structure |
| `cognitiveRuntime/pilot/logisticsCockpitPilot.js` | Z.19 pilot stub |
| `cognitiveRuntime/renderPromotion/logistics/logisticsControlledRenderRuntime.js` | Z.22 stub |
| `tests/cognitive-runtime/runLogisticsRuntimeFoundationTests.js` | Testes INC-038 |

### Backend — alterações aditivas

| Ficheiro | Alteração |
|----------|-----------|
| `cognitiveRuntime/registry/cognitiveBlockRegistry.js` | Merge LOGISTICS_PILOT_BLOCKS + stats |
| `cognitiveRuntime/domainFoundation/registry/cognitiveDomainRegistry.js` | Domínio `logistics` (maturity: foundation) |
| `cognitiveRuntime/facade/cognitiveRuntimeFacade.js` | Branch logistics + foundation attach |
| `package.json` | Script `test:logistics-runtime-foundation` |

### Frontend — structure only (sem mount CC)

| Ficheiro | Função |
|----------|--------|
| `cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry.js` | runtime/center/hub registries |
| `features/dashboard/centroComando/LogisticsNativeCockpitPromotion.jsx` | **return null** |
| `cognitiveRuntime/cockpit/specializedCockpitResolver.js` | + `resolveLogisticsCockpitRuntime` |
| `cognitiveRuntime/cockpit/index.js` | Export resolver logistics |

**Não alterados:** `CentroComando.jsx`, CSS, layouts homologados, `QualityNativeCockpitPromotion`.

---

## Registries

### LOGISTICS_PILOT_BLOCK_IDS (13)

```
logistics.inventory_health
logistics.stock_rotation
logistics.warehouse_capacity
logistics.receiving_flow
logistics.picking_efficiency
logistics.dock_flow
logistics.shipment_otif
logistics.fleet_efficiency
logistics.route_performance
logistics.supplier_delivery
logistics.traceability_bridge
logistics.contextual_logistics_ai
logistics.logistics_narrative
```

### Center catalog (8 — render_ready: false)

`logistics_operational_inventory`, `logistics_inbound_ops`, `logistics_outbound_ops`, `logistics_fleet_ops`, `logistics_telemetry_dock`, `logistics_traceability`, `logistics_narrative`, `logistics_decision_support`

### Hub registry (7 — ready: false)

warehouse_governance, inventory_cognitive, telemetry, fleet, distribution, supplier, cognitive

---

## Flags (default — runtime inactivo)

| Flag | Default |
|------|---------|
| `IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED` | off |
| `IMPETUS_LOGISTICS_NATIVE_COCKPIT` | off |
| `IMPETUS_LOGISTICS_ENGINE_BRIDGE_ENABLED` | off |
| `IMPETUS_LOGISTICS_RENDER_PROMOTION` | off |
| `IMPETUS_LOGISTICS_RUNTIME_FOUNDATION` | **true** (anexo descriptor) |

---

## Regressão executada

| Suite | Resultado |
|-------|-----------|
| `test:logistics-runtime-foundation` | **8/8 PASS** |
| `test:cognitive-composition` (Quality Z.19) | **22/22 PASS** |
| `test:quality-native-cockpit` / Z.23 consolidation | **16/16 PASS** |
| `test:maintenance-native-cockpit` | **29/29 PASS** |
| `test:environmental-native-cockpit` | **15/15 PASS** |

**Confirmado:** runtimes Executive, Production, Maintenance, Quality, Environment, HR, Safety **inalterados** em comportamento; apenas registo aditivo (+13 blocos no registry global).

---

## Superfície visual

```
NO_UI_CHANGED  = YES
NO_CSS_CHANGED = YES
```

- CentroComando **não importa** `LogisticsNativeCockpitPromotion`
- Widgets `logistica` / `estoque` **inalterados**
- Promotion component existe como stub (`return null`)

---

## Próxima INC

**INC-039 — Signal Loader:** implementar lógica real em `LogisticsTenantSignalLoader` (WMS/TMS/foundation/traceability), binding ratio ≥ 0.35, sem promotion CC.

---

## Baseline

```
INC-038_COMPLETE = YES
LOGISTICS_FOUNDATION_LOCKED = YES (structure)
READY_FOR_INC_039 = YES
```

Não actualiza BASELINE-LOGISTICS v1.0 — congelamento previsto em **INC-044** após homologação.
