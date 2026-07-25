# BASELINE — Logística v1.1

**INC:** INC-043  
**Data congelamento:** 2026-07-16  
**Estado:** `LOGISTICS_BASELINE_v1.1 = LOCKED`  
**Sucessor de:** [BASELINE-LOGISTICS-v1.0.md](BASELINE-LOGISTICS-v1.0.md) (INC-025)  
**Pré-requisitos homologados:** INC-036 → INC-042  
**Evidência:** [INC-043-LOGISTICS-HOMOLOGATION.md](INC-043-LOGISTICS-HOMOLOGATION.md)

---

## Declaração de congelamento

A partir de **2026-07-16**, o domínio **Logística / Almoxarifado (`logistics_native`)** está **homologado e congelado** como **Baseline Logistics v1.1**.

Toda evolução posterior (Picking, OTIF avançado, Fleet Intelligence, hubs enriquecidos com APIs legacy) é **funcionalidade incremental** — não correção de baseline.

---

## Regra de engenharia (LOCKED)

> **Nenhuma alteração futura poderá modificar componentes, adapters, runtimes ou resolvers já homologados do domínio Logística sem uma nova INC explícita.**  
> Novas funcionalidades devem ser aditivas, preservando Baseline Logistics v1.1 e compatibilidade retroativa.

### Superfícies congeladas (alteração proibida sem INC)

| Camada | Artefactos |
|--------|------------|
| **Registry Z.19** | `logisticsCognitiveBlockPack.js`, `logisticsCockpitPilot.js` |
| **Runtime Z.20** | `logisticsTenantSignalLoader.js`, `logisticsBlockBridge.js`, `logisticsSignalBindingRuntime.js`, `logisticsCrossDomainSignals.js` |
| **Runtime Z.22** | `logisticsControlledRenderRuntime.js`, `logisticsRenderPromotionSupervisor.js`, `logisticsWidgetPromotionResolver.js` |
| **Runtime Z.23** | `logisticsCockpitConsolidator.js`, `logisticsCockpitConsolidationRuntime.js`, `logisticsConsolidationSupervisor.js`, `logisticsCenters.js` |
| **Foundation** | `logisticsFoundationAttachment.js`, `logisticsRuntimeDescriptor.js` |
| **Facade** | `cognitiveRuntimeFacade.js` (branch LOG-Z.19→Z.23) |
| **Payload** | `dashboard.js` merge `logistics_*` |
| **Promoção CC** | `LogisticsNativeCockpitPromotion.jsx`, `logisticsNativeCockpitRegistry.js` |
| **Adapters homologados** | `logisticsRuntimeHubAdapter.js`, `LogisticsHubShell.jsx` |
| **Hubs baseline** | 7 componentes `*Hub.jsx` (apresentação runtime-only) |
| **CentroComando** | Supressão `logistica`/`estoque` + mount hubs (INC-042) |

---

## Estado global pós INC-036 → INC-043

| Gate | Valor |
|------|-------|
| `LOGISTICS_RUNTIME` | **LOCKED** |
| `LOGISTICS_SIGNAL_LOADER` | **LOCKED** |
| `LOGISTICS_PROMOTION` | **LOCKED** |
| `LOGISTICS_COMMAND_CENTER` | **LOCKED** |
| `LOGISTICS_BASELINE_v1.1` | **LOCKED** |
| `ZERO_FAKE_DATA` | **YES** |
| `ZERO_PLACEHOLDER_RUNTIME` | **YES** |
| `ZERO_SYNTHETIC_METRICS` | **YES** |
| `ZERO_RUNTIME_REGRESSION` | **YES** |

---

## Eixo e perfis

| Campo | Valor |
|-------|-------|
| **PRIMARY_AXIS** | `eixo_logistica` / `eixo_estoque` |
| **FUNCTIONAL_AREA** | `logistics`, `logistica` |
| **COCKPIT_MODE** | `logistics_native` |
| **RUNTIME_ID** | `logistics_native` |
| **BINDING_RATIO** (tenant ref.) | **0.385** (5/13) |
| **PROMOTION** | `promotion_applied` quando Z.22 elegível |
| **CONSOLIDATION** | `consolidation_applied` quando Z.23 elegível |

### Perfis homologados

| PROFILE_CODE | SURFACE | RUNTIME |
|--------------|---------|---------|
| `manager_logistics` | CentroComando | `logistics_native` |
| `coordinator_logistics` | CentroComando | `logistics_native` |
| `supervisor_logistics` | CentroComando | `logistics_native` |

---

## Cadeia arquitectural homologada

```
Cadastro Estrutural (perfil + functional_area + eixo_logistica)
  ↓
/dashboard/me  [cognitiveRuntimeFacade]
  ↓
Z.19 logisticsCockpitPilot  [INC-038/039]
  ↓
Z.20 logisticsTenantSignalLoader + logisticsBlockBridge  [INC-039/040]
  ↓
Z.21 — N/A path logistics dedicado (Z.21 global Quality inalterado)
  ↓
Z.22 logisticsControlledRenderPromotion  [INC-041]
  ↓
Z.23 logistics_cognitive_runtime + logistics_cognitive_centers  [INC-041]
  ↓
LogisticsNativeCockpitPromotion  [INC-042]
  ↓
7 Hubs (WarehouseGovernance · Inventory · Telemetry · Fleet · Distribution · Supplier · Cognitive)
  ↓
logisticsRuntimeHubAdapter (apresentação only)
```

---

## Payload canónico `/dashboard/me`

| Campo | Descrição |
|-------|-----------|
| `logistics_cognitive_runtime` | Descriptor runtime (`consolidation_applied`, `cockpit_mode`, `binding_ratio`) |
| `logistics_signal_loader` | Binding Z.20 (`block_details`, `bound_blocks`, `missing_blocks`) |
| `logistics_cognitive_centers` | 8 centers Z.23 |
| `cognitive_render_promotion` | Z.22 quando `cockpit_mode: logistics_native` |
| `logistics_runtime` | Alias de `logistics_cognitive_runtime` |

---

## Hubs homologados (estados UI)

| Hub | Componente | Rota canónica |
|-----|------------|---------------|
| Governança WMS | `WarehouseGovernanceHub` | `/app/logistics/operational?view=governance` |
| Inventário cognitivo | `InventoryCognitiveHub` | `?view=storage` |
| Telemetria docas | `WarehouseTelemetryHub` | `?view=telemetry` |
| Inteligência frota | `FleetIntelligenceHub` | `?view=governance` |
| Expedição / OTIF | `DistributionHub` | `?view=shipping` |
| Fornecedores / rastreio | `SupplierDeliveryHub` | `?view=receiving` |
| IA contextual | `CognitiveLogisticsHub` | `?view=maturity` |

Estados permitidos: **REAL_DATA** · **INSUFFICIENT_DATA** · **NOT_IMPLEMENTED**

---

## Widgets Centro de Comando

| Widget | Runtime OFF | Runtime ON (`consolidation_applied`) |
|--------|-------------|--------------------------------------|
| `WidgetLogistica` | **visível** | **suprimido** |
| `WidgetEstoque` | **visível** | **suprimido** |
| Hubs logistics_native | ausentes | **7 hubs montados** |

---

## Flags de activação (prod)

| Env | Fase | Default homologado |
|-----|------|-------------------|
| `IMPETUS_LOGISTICS_COGNITIVE_RUNTIME_ENABLED` | Z.19 | `off` |
| `IMPETUS_LOGISTICS_RENDER_PROMOTION` | Z.22 | `off` |
| `IMPETUS_LOGISTICS_NATIVE_COCKPIT` | Z.23 | `off` |
| `IMPETUS_LOGISTICS_RUNTIME_FOUNDATION` | Foundation attach | `on` (metadados) |

Activar flags em prod requer decisão operacional + massa de dados WMS/TMS (ver débitos INC-043).

---

## Débitos documentados (não bloqueiam baseline)

### Implementação futura

- Módulo picking (`picking_efficiency` → NOT_IMPLEMENTED)
- Enriquecimento hubs com APIs `warehouse-intelligence` / `logistics-intelligence`
- Z.21 enrich logistics dedicado (opcional)

### Massa de dados tenant

- WMS/TMS operacional vazio no tenant referência
- `binding_ratio` 0.385 — abaixo gate Z.22 default 0.5

---

## Trilha INC congelada

| INC | Entrega |
|-----|---------|
| INC-036 | Auditoria ecossistema |
| INC-037 | Plano arquitectural |
| INC-038 | Runtime foundation |
| INC-039 | Signal loader real |
| INC-040 | Binding reconciliation |
| INC-041 | Promotion chain |
| INC-042 | Centro de Comando visual |
| **INC-043** | **Homologação + congelamento v1.1** |

---

## Gates finais

```
LOGISTICS_PROFILE_OK         = YES
LOGISTICS_SURFACE_OK         = YES
LOGISTICS_RUNTIME_OK         = YES  (homologado v1.1)
LOGISTICS_PROMOTION_OK       = YES  (chain locked)
LOGISTICS_COMMAND_CENTER_OK  = YES
LOGISTICS_MODULES_OK         = YES
LOGISTICS_BASELINE_LOCKED    = YES  (v1.1)
```

---

## Próximo passo sistémico

**INC-044:** elevar **BASELINE-SYSTEM v1.0 → v1.1**, incorporando Logística como domínio cognitivo homologado ao lado de Quality, Maintenance, Production, etc.
