# INC-037 — Plano Arquitetural do Runtime Cognitivo de Logística / Almoxarifado

**Data:** 2026-07-16  
**Tipo:** plano arquitetural read-only (sem implementação)  
**Pré-requisito:** INC-036 aprovada · BASELINE-SYSTEM v1.0 (LOCKED)  
**Companion spec:** [LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md](LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md)

---

## Gate de validação

| Campo | Valor |
|-------|-------|
| **INC-036_APPROVED** | **YES** (aprovação humana 2026-07-16) |
| **ARCHITECTURE_CANONICAL_DEFINED** | **YES** |
| **RUNTIME_ID_DECIDED** | **`logistics_native`** (único) |
| **Z_CHAIN_DESIGNED** | **YES** (Z.19→Z.23) |
| **SIGNAL_LOADER_DESIGNED** | **YES** (`LogisticsTenantSignalLoader`) |
| **PILOT_PACK_DESIGNED** | **YES** (13 blocos) |
| **PROMOTION_DESIGNED** | **YES** (`LogisticsNativeCockpitPromotion`) |
| **HUBS_DESIGNED** | **YES** (7 hubs) |
| **API_MATRIX_COMPLETE** | **YES** |
| **ROADMAP_LOCKED** | **YES** (INC-038→044) |
| **READY_FOR_IMPLEMENTATION** | **NO** — aguarda aprovação humana deste plano |

---

## Contexto — lição da INC-036

A auditoria INC-036 estabeleceu que **Logística ≠ Qualidade pré-INC-023**:

| | Qualidade (INC-023) | Logística (INC-036) |
|---|---------------------|---------------------|
| **Verbo** | Reconciliar | **Projetar → construir** |
| **Z.19–Z.23** | Existia | **Greenfield** |
| **Admin** | Parcial | **Maduro** (WMS 8 módulos + TMS 4 módulos) |
| **Intelligence** | Integrável | **Real, desalinhado** (path FE↔BE) |
| **CC** | Placeholders | **Placeholders permanentes** |
| **Workspace enterprise** | Completo | **Shell + mocks** |

**Decisão metodológica:** não improvisar promotion antes de foundation. Seguir cadeia INC-038→044.

---

## 1. Arquitectura canónica — resposta objetiva

### Pergunta: `warehouse_native` + `logistics_native` ou `logistics_native` único?

**Resposta:** **`logistics_native` único.**

| Opção | Veredicto | Motivo |
|-------|-----------|--------|
| `warehouse_native` + `logistics_native` | **REJEITADA** | Dois runtime IDs → dois consolidators → duas promotions CC → viola perfil unificado `manager_logistics` e BASELINE-SUPPLY colapsado |
| `logistics_native` único | **APROVADA** | Paridade com eixo cognitivo `logistics` já declarado em `cognitiveBlockDomains.js`; um binding ratio; uma homologação v1.0 |
| `supply_native` separado | **FORA DO ESCOPO v1.0** | GREENFIELD documentado; reavaliar só se SUPPLY descolapsar |

**Sub-contextos internos (não são runtime IDs):**

- `logistics.warehouse_*` — WMS
- `logistics.fleet_*` — TMS
- `logistics.distribution_*` — expedição/OTIF

Spec completa: LOGISTICS-RUNTIME-ARCHITECTURE v1.0 §1–2.

---

## 2. Runtime Z.19 → Z.23 — desenho por fase

### Z.19 — Composition & pilot registry

| Entregável | Descrição |
|------------|-----------|
| `logisticsCognitiveBlockPack.js` | 13 blocos + aliases |
| Registo em `cognitiveBlockRegistry.js` | Merge aditivo |
| `logisticsCockpitPilot.js` | Modos off/shadow/pilot |
| `phaseZ19LogisticsFeatureFlags.js` | Gates por perfil |

**Saída:** blocos elegíveis por `domain_owner: logistics` sem render.

### Z.20 — Signal loader & engine bridge

| Entregável | Descrição |
|------------|-----------|
| `LogisticsTenantSignalLoader` | Loader público único |
| Sub-loaders WMS/TMS/foundation/traceability | Internos |
| `logisticsShadowEnrichmentPipeline` | Enriquecimento shadow |
| `logisticsBlockBridgeInvoker` | Ponte bloco→signal |

**Gate:** `binding_ratio ≥ 0.35` (produção) · `≥ 0.875` (homologação).

**Fontes:** ver §3 deste documento e ARCHITECTURE §4.

### Z.21 — Operational metrics & KPI adapters

| Entregável | Descrição |
|------------|-----------|
| `logisticsNativeKpiAdapter.js` (BE) | OTIF, below_min, fleet_util |
| `logisticsOperationalMetrics.js` | Métricas cockpit_operational_metrics |
| `logisticsCommandCenterKpiAdapter.js` (FE) | Fallback widgets quando native off |
| Cards perfil `manager_logistics` | Deep-link hubs |

### Z.22 — Render promotion

| Entregável | Descrição |
|------------|-----------|
| Extensão `controlledRenderPromotion` | Widget set logistics |
| `widgets_promoted`: `logistica`, `estoque` | Suprimíveis no FE |
| Pilot profiles: `manager_logistics` | Paridade quality INC-024 |

**Reutiliza** motor Z.22 global — **não duplicar** promotion engine.

### Z.23 — Cockpit consolidation

| Entregável | Descrição |
|------------|-----------|
| `logisticsCockpitConsolidator.js` | 8 centers |
| Payload `logistics_cognitive_centers` | Raiz `/dashboard/me` |
| `cockpit_mode: 'logistics_native'` | consolidation_applied true |
| Extensão `specializedCockpitResolver` | Ler centers logistics |

**Lição Quality INC-029/030:** nunca `shadow_only` resetando payload consumidor em produção.

---

## 3. Signal Loader — especificação

### Loader canónico

```
LogisticsTenantSignalLoader.loadLogisticsTenantSignals(user, ctx)
```

**Não criar** `WarehouseSignalLoader` como loader público separado — apenas módulo interno `_loadWarehouseSignals`.

### Fontes

| Sub-loader | Tabelas | Serviços legacy |
|------------|---------|-----------------|
| WMS | warehouse_* (8 tabelas core) | warehouseIntelligenceService |
| TMS | logistics_vehicles, routes, drivers, expeditions, alerts, telemetry | logisticsIntelligenceService |
| Foundation | logistics_inventory, receipts, shipments, lot_tracking | logisticsFoundationService |
| Traceability | raw_material_lots, raw_material_receipts | read-only bridge quality |

### Métricas exportadas (signal bundle)

```javascript
{
  inventory: { below_min, total_materials, critical_ratio, coverage_days },
  rotation: { turnover_30d, idle_count, dead_stock_value },
  inbound: { pending_receipts, avg_receipt_lead_time },
  outbound: { pending_shipments, otif_pct, delayed_count },
  fleet: { utilization_pct, vehicles_in_use, idle_alerts },
  routes: { avg_duration_min, bottleneck_count },
  dock: { occupation_pct, staging_queue },
  suppliers: { late_delivery_count, avg_delivery_days },
  traceability: { active_lots, expiring_7d },
  predictions: { reorder_suggestions, forecast_demand }
}
```

### Binding

Cada bloco `LOGISTICS_PILOT_BLOCK_IDS` declara `data_binding` → chave do bundle.  
Validator semantic composition reutiliza padrão Quality.

---

## 4. Pilot Pack — `LOGISTICS_PILOT_BLOCK_IDS`

| # | block_id | Categoria | Prioridade | Hub alvo |
|---|----------|-----------|------------|----------|
| 1 | `logistics.inventory_health` | WMS | P0 | WarehouseGovernance |
| 2 | `logistics.stock_rotation` | WMS | P0 | InventoryCognitive |
| 3 | `logistics.warehouse_capacity` | WMS | P1 | WarehouseGovernance |
| 4 | `logistics.receiving_flow` | WMS inbound | P0 | SupplierDelivery |
| 5 | `logistics.picking_efficiency` | WMS | P1 | Distribution (até módulo picking real) |
| 6 | `logistics.dock_flow` | WMS/TMS | P1 | WarehouseTelemetry |
| 7 | `logistics.shipment_otif` | TMS outbound | P0 | Distribution |
| 8 | `logistics.fleet_efficiency` | TMS | P0 | FleetIntelligence |
| 9 | `logistics.route_performance` | TMS | P1 | FleetIntelligence |
| 10 | `logistics.supplier_delivery` | Supply bridge | P1 | SupplierDelivery |
| 11 | `logistics.traceability_bridge` | Cross-quality | P1 | SupplierDelivery |
| 12 | `logistics.contextual_logistics_ai` | IA | P2 | CognitiveLogistics |
| 13 | `logistics.logistics_narrative` | Narrativa | P2 | CognitiveLogistics |

**Blocos solicitados na INC — mapeamento:**

| Exemplo INC-037 | block_id canónico |
|-----------------|-------------------|
| inventory_health | `logistics.inventory_health` |
| warehouse_capacity | `logistics.warehouse_capacity` |
| stock_rotation | `logistics.stock_rotation` |
| abc_curve | alias → `stock_rotation` até greenfield ABC |
| fleet_efficiency | `logistics.fleet_efficiency` |
| route_performance | `logistics.route_performance` |
| supplier_delivery | `logistics.supplier_delivery` |
| dock_flow | `logistics.dock_flow` |
| warehouse_ai | alias → `contextual_logistics_ai` |
| traceability | `logistics.traceability_bridge` |

---

## 5. Promotion — `LogisticsNativeCockpitPromotion`

### Desenho (sem implementação)

**Ficheiros planeados:**

- `frontend/src/features/dashboard/centroComando/LogisticsNativeCockpitPromotion.jsx`
- `frontend/src/cognitiveRuntime/cockpit/logisticsNativeCockpitRegistry.js`

### Gate de montagem

```javascript
const logisticsNativeActive =
  shouldSuppressPlaceholderWidgets(logisticsNativeCockpit?.runtime);

// runtime.consolidation_applied && cockpit_mode === 'logistics_native'
```

### Hubs montados (ordem)

1. **WarehouseGovernanceHub** — slot primário col 0 (substitui `estoque`)
2. **DistributionHub** — col 1 (substitui `logistica` expedição)
3. **FleetIntelligenceHub** — extensão frota (grid row 1)
4. **InventoryCognitiveHub** — KPIs cognitivos
5. **CognitiveLogisticsHub** — narrativa + decision support
6. **SupplierDeliveryHub** / **WarehouseTelemetryHub** — secundários por banda

### Centers → hubs (resumo)

| center_id | hub |
|-----------|-----|
| `logistics_operational_inventory` | warehouse_governance |
| `logistics_inbound_ops` | warehouse_governance / supplier |
| `logistics_outbound_ops` | distribution |
| `logistics_fleet_ops` | fleet |
| `logistics_telemetry_dock` | telemetry |
| `logistics_traceability` | supplier |
| `logistics_narrative` | cognitive |
| `logistics_decision_support` | cognitive |

### Widgets suprimidos

```javascript
LOGISTICS_PLACEHOLDER_WIDGET_IDS = [
  'logistica', 'estoque', 'kpi_cards' // parcial — avaliar rastreabilidade
]
```

**Coexistência Quality:** perfil com eixo qualidade+logística não mistura promotions — `domain_axis` resolve qual montar (fail-closed).

---

## 6. Hubs — arquitectura de componentes

| Hub | Responsabilidade | APIs consumidas | Estado actual |
|-----|------------------|-----------------|---------------|
| **WarehouseGovernanceHub** | Saldos, mínimos, movimentos, alertas | warehouse-intelligence, admin warehouse | **GREENFIELD UI** — dados REAL |
| **InventoryCognitiveHub** | Rotação, parados, previsões | predictions, idle-materials | **GREENFIELD UI** — APIs REAL |
| **WarehouseTelemetryHub** | Docas, LPN, ocupação | telemetry (nova), dock snapshots | **GREENFIELD** |
| **FleetIntelligenceHub** | Frota, utilização, manutenção | logistics-intelligence, admin logistics | **GREENFIELD UI** — APIs REAL |
| **DistributionHub** | Expedições, OTIF, shipping | expeditions, indicators | **GREENFIELD UI** — APIs REAL |
| **SupplierDeliveryHub** | Fornecedores, recebimentos, lotes | admin suppliers + traceability bridge | **GREENFIELD UI** |
| **CognitiveLogisticsHub** | IA contextual, narrativas, decision support | logistics-cognitive (nova) | **GREENFIELD** |

**Localização canónica:** `frontend/src/domains/logistics/{governance,telemetry,cognitive,fleet,distribution,supplier}/`

**Padrão visual:** DS Industrial 4.0 · ImpetusChart para séries · sem mocks pós INC-042.

---

## 7. APIs — inventário e classificação

### REUTILIZAR (sem alteração de contrato)

| Prefixo | Endpoints chave |
|---------|-----------------|
| `/api/warehouse-intelligence` | dashboard, alerts, predictions, idle, indicators, run-alerts |
| `/api/logistics-intelligence` | dashboard, alerts, expeditions CRUD, indicators, predictions |
| `/api/admin/warehouse` | categories, materials, suppliers, locations, movements, balances, links |
| `/api/admin/logistics` | vehicles, points, routes, drivers |
| `/api/logistics-navigation` | context |
| `/api/logistics-activation` | readiness, flags |
| `/api/logistics-operational-validation` | pack |

### EXPANDIR

| Alvo | Acção |
|------|-------|
| `/api/logistics` foundation | Bridge read/write legacy warehouse |
| `/api/dashboard/summary` | Campos logistics via Z.21 quando native off |
| `frontend/services/api.js` | Corrigir paths intelligence → `/warehouse-intelligence`, `/logistics-intelligence` |
| `/api/logistics-operational/*` | Implementar overview, receiving, picking (referenciados pelo workspace) |

### NOVA

| Prefixo | Função | INC sugerida |
|---------|--------|--------------|
| `/api/logistics-cognitive` | insights/run, narrativas | INC-042 |
| `/api/logistics-governance` | KPIs governance, ABC futuro | INC-042 |
| `/api/logistics-telemetry` | ingest/query telemetria | INC-042 |

### OBSOLETA

| Item | Motivo |
|------|--------|
| FE paths `/admin/warehouse/intelligence/*` | Rota BE inexistente — **corrigir para reutilizar** |
| FE paths `/admin/logistics/intelligence/*` | Idem |
| Fallback mock OTIF 93% em workspace | Remover INC-042 |
| `LogisticsPlaceholder.jsx` (null) | Substituir ou eliminar INC-041 |

---

## 8. Datasets — projeção

| Dataset | Tabelas | Uso runtime | Seed INC-043 |
|---------|---------|---------------|--------------|
| inventory | warehouse_materials, balances, logistics_inventory | inventory_health | 20 materiais |
| stock | warehouse_balances, params | governance hub | saldos variados |
| movements | warehouse_movements | rotation, receiving | 100 mov 30d |
| receipts | logistics_receipts | receiving_flow | 10 recebimentos |
| shipments | logistics_shipments | outbound | 15 envios |
| routes | logistics_routes | route_performance | 5 rotas |
| fleet | logistics_vehicles | fleet_efficiency | 4 veículos |
| drivers | logistics_drivers | fleet | 3 motoristas |
| dock | logistics_points (doca) | dock_flow | 3 docas |
| warehouse | locations, categories | capacity | 10 localizações |
| telemetry | logistics_telemetry | telemetry hub | série 7d |
| alerts | warehouse_alerts, logistics_alerts | governance | 5 alertas |
| predictions | warehouse_predictions | cognitive | snapshot |

---

## 9. Centro de Comando — plano de substituição

### Fase A (INC-041 — pré-promotion quick win)

| Widget | Acção |
|--------|-------|
| `WidgetEstoque` | Adapter → `/api/warehouse-intelligence/indicators` |
| `WidgetLogistica` | Adapter → `/api/logistics-intelligence/indicators` |

### Fase B (INC-041 — com promotion)

| Widget | Substituído por |
|--------|-----------------|
| `WidgetEstoque` | `WarehouseGovernanceHub` |
| `WidgetLogistica` | `DistributionHub` + `FleetIntelligenceHub` |
| KPI cards logísticos | `InventoryCognitiveHub` |

### Layout grid (manager_logistics)

Proposta — preservar shell CC v1.0 (6 cols):

```
Row 0: [ WarehouseGovernance (2) ] [ Distribution (2) ] [ Fleet (2) ]
Row 1: [ InventoryCognitive (2) ] [ CognitiveLogistics (2) ] [ alertas (2) ]
Row 2: [ pergunte_ia (2) ] [ insights_ia (2) ] [ telemetry/supplier (2) ]
```

---

## 10. Roadmap oficial

```
INC-036  ✅ Auditoria ecossistema          [CONCLUÍDA]
INC-037  ✅ Plano arquitetural             [ESTE DOCUMENTO]
         ↓
    Aprovação humana                        [PENDENTE]
         ↓
INC-038  Runtime Foundation
         • logisticsCognitiveBlockPack (Z.19)
         • Correcção API paths FE
         • moduleRegistry logistics_intelligence
         • Bridge legacy↔foundation
         • phaseZ19/Z20 flags scaffolding
         ↓
INC-039  Signal Loader
         • LogisticsTenantSignalLoader
         • logisticsShadowEnrichmentPipeline
         • binding tests ≥ 0.35
         ↓
INC-040  Runtime Promotion (Z.22 + Z.23)
         • logisticsCockpitConsolidator
         • Payload logistics_cognitive_centers
         • Pilot manager_logistics
         • Sem shadow_only em produção
         ↓
INC-041  Centro de Comando
         • LogisticsNativeCockpitPromotion
         • logisticsNativeCockpitRegistry
         • KPI adapters + suppress placeholders
         • specializedCockpitResolver extensão
         ↓
INC-042  Cognitive Hubs
         • 7 hubs lazy-loaded
         • /api/logistics-cognitive
         • /api/logistics-operational implementação
         • Remoção mocks workspace
         ↓
INC-043  Homologação funcional
         • Seed tenant piloto
         • binding ≥ 0.875
         • Regressão Quality/Maintenance (no contamination)
         • Perfil manager_logistics walkthrough
         ↓
INC-044  Baseline Logistics v1.1
         • LOCK logistics_native
         • Actualizar BASELINE-SYSTEM index
         • SUPERSEDE BASELINE-LOGISTICS v1.0
```

### Critérios de entrada/saída por INC

| INC | Entrada | Saída (gate) |
|-----|---------|--------------|
| **038** | Plano INC-037 aprovado | Block pack registado; API paths corrigidos; moduleRegistry entry |
| **039** | 038 complete | Loader + binding tests PASS |
| **040** | 039 + binding ≥ 0.35 | consolidation_applied em staging |
| **041** | 040 | Promotion monta hubs em staging |
| **042** | 041 | Hubs sem mock; cognitive API |
| **043** | 042 | Homologação documentada; binding ≥ 0.875 |
| **044** | 043 | BASELINE-LOGISTICS v1.1 LOCKED |

---

## 11. O que NÃO fazer (anti-patterns)

1. **Implementar promotion antes do signal loader** — repetir erro pré-INC-028 Quality.
2. **Criar `warehouse_native` runtime separado** — duplicação arquitectural.
3. **Duplicar motores Z.22/Z.23** — extensão aditiva apenas.
4. **Alterar QualityNativeCockpitPromotion** — domínios paralelos.
5. **Manter mocks OTIF/picking** após INC-042 — violação charts-real-data rule.
6. **Novo modelo de estoque** — usar bridge legacy+foundation.
7. **Auto-promoção shadow→full** — rollout manual via logistics-activation stages.

---

## 12. Dependências com baselines homologados

| Baseline | Relação |
|----------|---------|
| BASELINE-SYSTEM v1.0 | Índice mestre — adicionar logistics_native após INC-044 |
| BASELINE-LOGISTICS v1.0 | SUPERSEDED por v1.1 em INC-044 |
| BASELINE-QUALITY v1.1 | **LOCKED** — não alterar; traceability bridge read-only |
| BASELINE-SUPPLY v1.0 | Colapsado — não criar supply_native v1.0 |
| BASELINE-UI v1.0 | Shell CC preservado — hubs aditivos |
| BASELINE-DASHBOARDS v1.0 | Perfis logistics já mapeados |

---

## 13. Entregáveis INC-037

| Documento | Estado |
|-----------|--------|
| [INC-037-LOGISTICS-RUNTIME-PLAN.md](INC-037-LOGISTICS-RUNTIME-PLAN.md) | **ENTREGUE** |
| [LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md](LOGISTICS-RUNTIME-ARCHITECTURE-v1.0.md) | **ENTREGUE** |

---

## 14. Critério de encerramento

```
INC-037
LOGISTICS_ARCHITECTURE_PLANNED = YES
LOGISTICS_RUNTIME_DESIGN_COMPLETE = YES
READY_FOR_HUMAN_APPROVAL = YES
READY_FOR_INC_038 = NO (until human approval)
```

**Conclusão:** existe agora um plano arquitectural completo, consistente com BASELINE-SYSTEM v1.0, que transforma Logística/Almoxarifado de **admin legacy + greenfield cognitivo** em **`logistics_native` homologável**, sem improvisação, sem duplicação de runtime IDs, e sem quebrar componentes LOCKED de Qualidade ou do shell CC.

**Próximo passo humano:** aprovar este plano → autorizar **INC-038 Runtime Foundation**.
