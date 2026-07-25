# LOGISTICS-RUNTIME-ARCHITECTURE v1.0

**Identificador:** `LOGISTICS-RUNTIME-ARCHITECTURE-v1.0`  
**Data:** 2026-07-16  
**Modo:** especificação arquitetural (read-only — sem implementação)  
**Pré-requisitos:** INC-036 (auditoria) · BASELINE-SYSTEM v1.0 (LOCKED) · BASELINE-LOGISTICS v1.0  
**Estado:** `DRAFT — pending human approval (INC-037)`

> Este documento define a **arquitetura canónica** do runtime cognitivo Logística/Almoxarifado.  
> Não altera componentes LOCKED do SYSTEM v1.0. Evolução só via INC-038+ após aprovação humana.

---

## 1. Declaração arquitectural

### 1.1 Diferença estratégica vs Qualidade

| Dimensão | Qualidade (INC-023) | Logística (INC-036) |
|----------|---------------------|-------------------|
| Missão | **Reconciliar** runtime existente | **Projetar e construir** runtime nativo |
| Z.19–Z.23 | Construído, desconectado | **Inexistente** |
| Promotion / loaders / hubs | Existiam | **Greenfield** |
| Admin / legacy | Parcial | **Maduro** (WMS+TMS) |
| Risco principal | Integração CC | Duplicação + dual stack WMS |

### 1.2 Decisão canónica — runtime ID

```
RUNTIME_ID_OFICIAL = logistics_native
```

**Não adoptar** `warehouse_native` nem `supply_native` como runtime IDs separados no payload `/dashboard/me`.

| ID | Decisão | Justificação |
|----|---------|--------------|
| **`logistics_native`** | **CANÓNICO** | Eixo único `eixo_logistica`/`eixo_estoque`; perfil `manager_logistics`; BASELINE-SUPPLY colapsado em logística; um ciclo Z; uma promotion CC |
| `warehouse_native` | **SEMÂNTICO INTERNO** | Sub-contexto WMS dentro de `logistics_native` — prefixo blocos `logistics.warehouse_*` |
| `supply_native` | **RESERVADO FUTURO** | Fora do escopo v1.0; não promover enquanto SUPPLY baseline permanece colapsado |
| `fleet_native` | **SEMÂNTICO INTERNO** | Sub-contexto TMS — prefixo `logistics.fleet_*` |
| `distribution_native` | **SEMÂNTICO INTERNO** | Sub-contexto expedição/OTIF — prefixo `logistics.distribution_*` |

**Regra inviolável:** um tenant, um `cockpit_mode: 'logistics_native'`, um consolidator, um signal loader público, uma promotion CC.

---

## 2. Bounded contexts (preservar admin existente)

```
┌─────────────────────────────────────────────────────────────────┐
│                    logistics_native (Z.23)                       │
│  ┌──────────────────────┐    ┌──────────────────────────────┐  │
│  │  WMS (warehouse)      │    │  TMS (fleet / distribution)   │  │
│  │  warehouse_* tables   │    │  logistics_* TMS tables       │  │
│  │  AdminWarehouse       │    │  AdminLogistics               │  │
│  │  warehouse-intelligence│   │  logistics-intelligence       │  │
│  └──────────┬───────────┘    └──────────────┬───────────────┘  │
│             │                                │                   │
│             └──────── LogisticsTenantSignalLoader ──────────────┘  │
└─────────────────────────────────────────────────────────────────┘
                              │
                    logistics_* foundation layer
              (inventory, receipts, shipments, lots)
                              │
              Reconciliação planificada INC-038 (não duplicar)
```

### 2.1 Stack de dados — decisão de convergência

| Camada | Estado INC-036 | Direcção arquitectural |
|--------|----------------|------------------------|
| **Legacy WMS** | `warehouse_materials`, `warehouse_balances`, `warehouse_movements` | **Fonte primária WMS** até migração |
| **Legacy TMS** | `logistics_vehicles`, `logistics_expeditions`, … | **Fonte primária TMS** |
| **Foundation** | `logistics_inventory`, `logistics_receipts`, `logistics_shipments`, `logistics_lot_tracking` | **Canónico event-sourced** — adapter lê/escreve; INC-038 define bridge |
| **Qualidade cruzada** | `raw_material_lots`, `raw_material_receipts` | **Bridge read-only** via signal loader (eixo rastreabilidade) |

**Proibido na implementação:** terceiro modelo paralelo de estoque. Foundation absorve gradualmente; legacy permanece compatível via adapters.

---

## 3. Cadeia Z.19 → Z.23 (Logística)

Espelha BASELINE-SYSTEM § Etapa 5, **sem alterar** fases LOCKED de outros domínios.

```
Cadastro (eixo_logistica | eixo_estoque, hint logistics)
        ↓
GET /api/dashboard/me  →  cognitiveRuntimeFacade (extensão aditiva)
        ↓
┌─ Z.19 ─────────────────────────────────────────────────────────┐
│  logisticsCockpitPilotMode()                                    │
│  logisticsCognitiveBlockPack registado em cognitiveBlockRegistry│
│  Modos: off | shadow | pilot                                    │
│  Flag: IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED             │
└────────────────────────────────────────────────────────────────┘
        ↓
┌─ Z.20 ─────────────────────────────────────────────────────────┐
│  LogisticsTenantSignalLoader.loadLogisticsTenantSignals()       │
│  logisticsShadowEnrichmentPipeline                              │
│  logisticsBlockBridgeInvoker                                    │
│  binding_ratio ≥ 0.35 (gate idêntico Quality INC-028)           │
│  Flag: IMPETUS_LOGISTICS_ENGINE_BRIDGE_ENABLED                  │
└────────────────────────────────────────────────────────────────┘
        ↓
┌─ Z.21 ─────────────────────────────────────────────────────────┐
│  logisticsNativeKpiAdapter                                      │
│  logisticsOperationalMetrics                                    │
│  logisticsInsightsFacade (narrativas assistivas)                │
│  Enriquece payload + adapters CC                                │
└────────────────────────────────────────────────────────────────┘
        ↓
┌─ Z.22 ─────────────────────────────────────────────────────────┐
│  controlledRenderPromotion — logistics widget set               │
│  widgets_promoted: logistica, estoque, kpi_cards (suprimíveis)  │
│  Reutiliza motor Z.22 global (IMPETUS_COGNITIVE_RENDER_PROMOTION)│
│  Flag piloto: IMPETUS_LOGISTICS_NATIVE_COCKPIT + profile gate   │
└────────────────────────────────────────────────────────────────┘
        ↓
┌─ Z.23 ─────────────────────────────────────────────────────────┐
│  logisticsCockpitConsolidator                                   │
│  payload.specialized_cockpit_runtime.cockpit_mode=logistics_native│
│  payload.logistics_cognitive_centers[]                          │
│  consolidation_applied: true (sem shadow_only em produção)      │
│  Flag: IMPETUS_LOGISTICS_NATIVE_COCKPIT=on                      │
└────────────────────────────────────────────────────────────────┘
        ↓
dashboardContextAdapter._buildFromSpecializedCockpit (extensão)
        ↓
CentroComando → LogisticsNativeCockpitPromotion → Hubs
```

### 3.1 Ficheiros planeados (greenfield — INC-038+)

| Fase | Backend (novo) | Frontend (novo) |
|------|----------------|-----------------|
| Z.19 | `registry/logisticsCognitiveBlockPack.js` | — |
| Z.20 | `domains/logistics/bridge/logisticsTenantSignalLoader.js` | — |
| Z.20 | `domains/logistics/bridge/logisticsShadowEnrichmentPipeline.js` | — |
| Z.21 | `domains/logistics/kpi/logisticsNativeKpiAdapter.js` | `logisticsCommandCenterKpiAdapter.js` |
| Z.23 | `domains/logistics/cockpit/logisticsCockpitConsolidator.js` | — |
| Z.23 | `config/phaseZ23LogisticsFeatureFlags.js` | — |
| CC | — | `LogisticsNativeCockpitPromotion.jsx` |
| CC | — | `logisticsNativeCockpitRegistry.js` |
| Hubs | — | `domains/logistics/governance/WarehouseGovernanceHub.jsx` (+ outros) |

**Extensões aditivas a ficheiros LOCKED (INC explícita cada uma):**

- `cognitiveRuntimeFacade.js` — branch logistics pilot (não alterar quality path)
- `cognitiveBlockRegistry.js` — merge LOGISTICS_PILOT_BLOCKS
- `cognitiveCockpitConsolidator.js` — dispatch por `domain_axis === 'logistics'`
- `specializedCockpitResolver.js` — ler `logistics_cognitive_centers`
- `CentroComando.jsx` — montar promotion logistics (paralelo a quality, não substituir)

---

## 4. Signal Loader

### 4.1 Arquitectura

**Loader público único:** `LogisticsTenantSignalLoader`

**Sub-loaders internos (módulos, não runtime IDs):**

| Módulo interno | Responsabilidade |
|----------------|------------------|
| `_loadWarehouseSignals(db, companyId, scope)` | WMS: saldos, movimentos, alertas, idle, consumo |
| `_loadFleetSignals(db, companyId, scope)` | TMS: frota, expedições, OTIF, telemetria |
| `_loadFoundationSignals(db, companyId)` | Foundation: inventory, receipts, shipments, lots |
| `_loadTraceabilityBridge(db, companyId)` | `raw_material_lots` + receipts (read-only) |

### 4.2 Fontes de dados

| Signal key | Tabelas / serviços | Métricas derivadas |
|------------|-------------------|-------------------|
| `logistics.inventory_health` | `warehouse_balances`, `warehouse_materials`, `warehouse_alerts` | below_min_count, critical_ratio, coverage_days |
| `logistics.stock_rotation` | `warehouse_movements` (30/90d) | turnover_rate, dead_stock_count |
| `logistics.warehouse_capacity` | `warehouse_locations`, foundation inventory | occupation_pct, blocked_positions |
| `logistics.receiving_flow` | `warehouse_movements` entrada, `logistics_receipts` | pending_receipts, avg_receipt_time |
| `logistics.picking_efficiency` | foundation + future picking table | open_pickings, accuracy (placeholder→real INC-042) |
| `logistics.shipment_otif` | `logistics_expeditions`, `logistics_shipments` | on_time_rate, delayed_count |
| `logistics.fleet_efficiency` | `logistics_vehicles`, `logistics_telemetry` | utilization_pct, idle_hours |
| `logistics.route_performance` | `logistics_routes`, expeditions | avg_duration, bottleneck_routes |
| `logistics.supplier_delivery` | `warehouse_suppliers`, receipts | avg_delivery_days, late_suppliers |
| `logistics.dock_flow` | points tipo doca + snapshots | dock_occupation, staging_queue |
| `logistics.traceability` | `raw_material_lots`, `logistics_lot_tracking` | active_lots, expiring_soon |
| `logistics.predictions` | `warehouse_predictions`, intelligence service | reorder_suggestions |

### 4.3 Binding (Z.20)

```
binding_ratio = bound_blocks / LOGISTICS_PILOT_BLOCK_IDS.length
gate_produção = binding_ratio ≥ 0.35   (paridade Quality INC-028)
gate_pilot    = binding_ratio ≥ 0.875    (homologação INC-043)
```

Graceful degradation: loader **nunca lança**; blocos sem dados → `eligible: false`, center omitido.

---

## 5. Pilot Pack — `LOGISTICS_PILOT_BLOCK_IDS`

```javascript
// Proposta canónica — logisticsCognitiveBlockPack.js (INC-038)
LOGISTICS_PILOT_BLOCK_IDS = [
  'logistics.inventory_health',      // P0 WMS
  'logistics.stock_rotation',        // P0 WMS
  'logistics.warehouse_capacity',    // P1 WMS
  'logistics.receiving_flow',        // P0 WMS inbound
  'logistics.picking_efficiency',    // P1 WMS (UI shell → real INC-042)
  'logistics.dock_flow',             // P1 docas
  'logistics.shipment_otif',         // P0 TMS outbound
  'logistics.fleet_efficiency',      // P0 TMS
  'logistics.route_performance',     // P1 TMS
  'logistics.supplier_delivery',     // P1 supply bridge
  'logistics.traceability_bridge',   // P1 cross-quality
  'logistics.contextual_logistics_ai', // P2 IA assistiva
  'logistics.logistics_narrative'    // P2 narrativas
]
```

**Total:** 13 blocos (paridade qualidade 10 + extensão WMS/TMS).

Aliases propostos:

| Alias legacy | ID canónico |
|--------------|-------------|
| `logistics.abc_curve` | `logistics.stock_rotation` (até módulo ABC greenfield) |
| `logistics.warehouse_ai` | `logistics.contextual_logistics_ai` |

---

## 6. Z.23 Centers → Hubs

### 6.1 Centers (backend payload)

| center_id | Blocos agrupados | Banda mínima |
|-----------|------------------|--------------|
| `logistics_operational_inventory` | inventory_health, stock_rotation, warehouse_capacity | supervisor |
| `logistics_inbound_ops` | receiving_flow, dock_flow, supplier_delivery | supervisor |
| `logistics_outbound_ops` | picking_efficiency, shipment_otif | supervisor |
| `logistics_fleet_ops` | fleet_efficiency, route_performance | coordinator |
| `logistics_telemetry_dock` | dock_flow + telemetry stream | manager |
| `logistics_traceability` | traceability_bridge | coordinator |
| `logistics_narrative` | logistics_narrative, contextual_logistics_ai | manager |
| `logistics_decision_support` | agregado cross-center (OTIF + stock risk) | manager |

### 6.2 Hubs (frontend — lazy)

| Hub | center_ids mapeados | Componente planeado |
|-----|---------------------|---------------------|
| **WarehouseGovernanceHub** | inventory, inbound (parcial) | Saldos, mínimos, movimentos, alertas WMS |
| **InventoryCognitiveHub** | inventory, stock_rotation, predictions | Rotação, parados, previsões compra |
| **WarehouseTelemetryHub** | telemetry_dock, dock_flow | Ocupação docas, LPN, sensores |
| **FleetIntelligenceHub** | fleet_ops | Frota, utilização, manutenção |
| **DistributionHub** | outbound_ops | Expedições, OTIF, shipping |
| **SupplierDeliveryHub** | inbound + traceability | Fornecedores, lead time, lotes |
| **CognitiveLogisticsHub** | narrative, decision_support | IA, narrativas, decision support |

### 6.3 Registry (frontend)

```javascript
// logisticsNativeCockpitRegistry.js — proposta
CENTER_ID_TO_HUB = {
  logistics_operational_inventory: 'warehouse_governance',
  logistics_inbound_ops: 'warehouse_governance',
  logistics_outbound_ops: 'distribution',
  logistics_fleet_ops: 'fleet',
  logistics_telemetry_dock: 'telemetry',
  logistics_traceability: 'supplier',
  logistics_narrative: 'cognitive',
  logistics_decision_support: 'cognitive'
}
```

**Ordem de montagem CC (manager_logistics):**

1. `WarehouseGovernanceHub` (slot primário — substitui `estoque`)
2. `DistributionHub` + `FleetIntelligenceHub` (substitui `logistica`)
3. `InventoryCognitiveHub` (KPIs cognitivos)
4. `CognitiveLogisticsHub` (narrativa — se binding ≥ gate)
5. `SupplierDeliveryHub` / `WarehouseTelemetryHub` (secundários por banda)

Widgets genéricos suprimidos quando `consolidation_applied`:

```
logistica | estoque | kpi_cards (parcial) | rastreabilidade (se redundante)
```

Mantidos transversais: `alertas`, `pergunte_ia`, `insights_ia` (até INC-042 decidir supressão parcial).

---

## 7. Promotion — `LogisticsNativeCockpitPromotion`

### 7.1 Gate (espelho INC-024 Quality)

```javascript
logisticsNativeActive =
  specialized_cockpit_runtime.consolidation_applied === true
  && specialized_cockpit_runtime.cockpit_mode === 'logistics_native'
  && resolvePromotedLogisticsHubs(centers).length > 0
```

### 7.2 Payload `/dashboard/me` (campos novos)

```json
{
  "specialized_cockpit_runtime": {
    "phase": "Z.23",
    "cockpit_mode": "logistics_native",
    "consolidation_applied": true,
    "binding_ratio": 0.42,
    "cognitive_health": "stable"
  },
  "logistics_cognitive_centers": [ { "center_id": "...", "label": "...", "blocks": [] } ],
  "logistics_decision_support": { "summary": "...", "risk_level": "medium" },
  "widgets_promoted": ["logistica", "estoque"],
  "cockpit_operational_metrics": { "otif_pct": 94.2, "below_min_count": 3 }
}
```

### 7.3 Perfis piloto (proposta INC-040)

| profile_code | Fase |
|--------------|------|
| `manager_logistics` | P0 piloto |
| `coordinator_logistics` | P1 |
| `supervisor_logistics` | P2 |

---

## 8. APIs — classificação arquitectural

| API | Classificação | Acção planeada |
|-----|---------------|----------------|
| `/api/warehouse-intelligence/*` | **REUTILIZAR** | Corrigir FE path; hub adapters consomem directamente |
| `/api/logistics-intelligence/*` | **REUTILIZAR** | Idem |
| `/api/admin/warehouse/*` | **REUTILIZAR** | Admin inalterado; hubs read via intelligence |
| `/api/admin/logistics/*` | **REUTILIZAR** | Idem |
| `/api/logistics/*` (foundation) | **EXPANDIR** | Bridge legacy↔foundation INC-038 |
| `/api/logistics-navigation/*` | **REUTILIZAR** | Publication runtime existente |
| `/api/logistics-activation/*` | **REUTILIZAR** | Rollout stages |
| `/api/logistics-operational-validation/*` | **REUTILIZAR** | Pack validation |
| `/api/logistics-operational/*` | **NOVA** | Implementar rotas referenciadas pelo workspace |
| `/api/logistics-cognitive/*` | **NOVA** | Insights run, narrativas (espelho quality-cognitive) |
| `/api/logistics-governance/*` | **NOVA** | SPC-like logistics KPIs, ABC quando existir |
| `/api/logistics-telemetry/*` | **NOVA** | Ingest telemetria frota/doca |
| FE `/admin/*/intelligence/*` | **OBSOLETA (path)** | Remover referência; usar `/api/*-intelligence` |
| `dashboard.getSummary()` campos logistics | **EXPANDIR** | Enriquecer via Z.21 adapter quando native off |

---

## 9. Datasets planeados

| Dataset lógico | Tabelas físicas | Hub principal |
|----------------|-----------------|---------------|
| inventory | warehouse_materials, warehouse_balances, logistics_inventory | WarehouseGovernance |
| stock | warehouse_balances, warehouse_params | WarehouseGovernance |
| movements | warehouse_movements | WarehouseGovernance |
| receipts | logistics_receipts, mov. entrada | SupplierDelivery |
| shipments | logistics_shipments, logistics_expeditions | Distribution |
| routes | logistics_routes | FleetIntelligence |
| fleet | logistics_vehicles | FleetIntelligence |
| drivers | logistics_drivers | FleetIntelligence |
| dock | logistics_points (doca), snapshots | WarehouseTelemetry |
| warehouse | locations, categories | WarehouseGovernance |
| telemetry | logistics_telemetry | WarehouseTelemetry |
| predictions | warehouse_predictions, intelligence | InventoryCognitive |
| alerts | warehouse_alerts, logistics_alerts | Governance + Distribution |
| traceability | raw_material_lots, logistics_lot_tracking | SupplierDelivery |

**Seed homologação (INC-043):** tenant piloto com materiais, 2 veículos, 3 expedições, movimentos 30d — permitir binding ≥ 0.875.

---

## 10. Centro de Comando — substituição widgets

### 10.1 Estado actual (LOCKED baseline LOGISTICS v1.0)

```
WidgetLogistica  → dashboard.getSummary()  → pedidos_transporte / atrasados
WidgetEstoque    → dashboard.getSummary()  → estoque_total / critico
```

### 10.2 Estado alvo (pós INC-041)

```
LogisticsNativeCockpitPromotion
  ├─ WarehouseGovernanceHub     ← substitui WidgetEstoque
  ├─ DistributionHub            ← substitui WidgetLogistica (expedição)
  ├─ FleetIntelligenceHub       ← extensão frota (mesmo slot grid)
  └─ InventoryCognitiveHub      ← substitui KPI cards logísticos genéricos
```

### 10.3 Fallback (native off)

Manter widgets genéricos **mas** ligar a `logisticsCommandCenterKpiAdapter` → intelligence APIs (quick win INC-041 pré-promotion).

---

## 11. Flags de ambiente (proposta)

| Flag | Default | Fase |
|------|---------|------|
| `IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED` | off | Z.19 |
| `IMPETUS_LOGISTICS_ENGINE_BRIDGE_ENABLED` | off | Z.20 |
| `IMPETUS_LOGISTICS_NATIVE_COCKPIT` | off | Z.23 |
| `IMPETUS_LOGISTICS_NATIVE_COCKPIT_PILOT` | off | Z.22/Z.23 |
| `IMPETUS_LOGISTICS_PUBLICATION_SHADOW_MODE` | on | shadow-first |
| `VITE_IMPETUS_LOGISTICS_OPERATIONAL_RUNTIME_ENABLED` | off | FE workspace |
| `VITE_IMPETUS_LOGISTICS_NATIVE_COCKPIT` | off | FE promotion |

**Paridade Quality:** produção exige `consolidation_applied` no payload raiz (lição INC-029/030).

---

## 12. Compatibilidade BASELINE-SYSTEM v1.0

| Componente LOCKED | Impacto logística |
|-------------------|-------------------|
| `QualityNativeCockpitPromotion` | **Nenhum** — promotion paralela por domain_axis |
| `specializedCockpitResolver` | **Extensão aditiva** — logistics_cognitive_centers |
| `cognitiveRuntimeFacade` Z.19–Z.23 quality | **Branch paralelo** — não alterar gates quality |
| `dashboardSurfaceCapabilities` | **Sem alteração** — logistics já segregado INC-022 pattern |
| UI Shell CC v1.0 | **Aditivo** — novos slots hubs; grid layout preservado |
| DS Industrial 4.0 | **Obrigatório** — hubs usam tokens; eliminar gradientes legacy |

---

## 13. Riscos arquitecturais registados

| ID | Risco | Mitigação |
|----|-------|-----------|
| R-LOG-001 | Dual stack WMS legacy vs foundation | Adapter único no signal loader; migração incremental |
| R-LOG-002 | Duplicar QualityNative patterns | Reutilizar motores Z.22/Z.23 globais; só domain pack novo |
| R-LOG-003 | Mock workspace OTIF | INC-042 remove fallbacks; APIs operational primeiro |
| R-LOG-004 | API path mismatch | INC-038 correcção FE (pré-requisito runtime) |
| R-LOG-005 | moduleRegistry sem logistics_intelligence | INC-038 entrada MODULE com paths |
| R-LOG-006 | Dados vazios → binding 0 | Seed homologação INC-043 |
| R-LOG-007 | Cross-domain traceability | Bridge read-only; não importar quality runtime |

---

## 14. Critério de aceitação desta arquitectura

```
LOGISTICS_RUNTIME_ARCHITECTURE_v1.0 = DRAFT
READY_FOR_INC_038 = YES (após aprovação humana INC-037)
```

Documento companion: [INC-037-LOGISTICS-RUNTIME-PLAN.md](INC-037-LOGISTICS-RUNTIME-PLAN.md)
