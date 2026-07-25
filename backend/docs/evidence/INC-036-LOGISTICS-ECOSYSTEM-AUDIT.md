# INC-036 — Auditoria do Ecossistema Cognitivo de Logística / Almoxarifado

**Data:** 2026-07-16  
**Tipo:** auditoria read-only (sem implementação)  
**Pré-requisito:** homologação perfil `manager_logistics` · baselines `BASELINE-LOGISTICS-v1.0.md` · `BASELINE-SYSTEM-v1.0.md`  
**Referência metodológica:** INC-023 (Qualidade)

---

## Gate de validação

| Campo | Valor |
|-------|-------|
| **LOGISTICS_PROFILE** | OK (`manager_logistics`, `coordinator_logistics`, `supervisor_logistics`) |
| **LOGISTICS_SURFACE** | OK (CentroComando — widgets genéricos) |
| **LOGISTICS_MODULES_REGISTERED** | **PARTIAL** (`logistics_intelligence` ausente de `moduleRegistry.js`; rotas mapeadas em `useVisibleModules.js`) |
| **LOGISTICS_MODULES_AVAILABLE** | **PARTIAL** (legacy + admin + domínio shadow; sem runtime nativo) |
| **LOGISTICS_MODULES_VISIBLE** | **PARTIAL** (CC: widgets genéricos; menu: manifesto se flags ON) |
| **LOGISTICS_MODULES_FILTERED** | **YES** (`structuralModuleResolver`, eixos `eixo_logistica` / `eixo_estoque`) |
| **LOGISTICS_ECOSYSTEM_AUDITED** | **YES** |
| **LOGISTICS_IMPLEMENTATION_STATUS** | **DOCUMENTED** |
| **READY_FOR_LOGISTICS_MODULES** | **YES** (para INC-037 — plano pós-aprovação humana) |

---

## Respostas obrigatórias (flags binárias)

```
LOGISTICS_NATIVE_EXISTS        = NO
WAREHOUSE_NATIVE_EXISTS        = NO
supply_native                  = NO  (GREENFIELD — BASELINE-SUPPLY-v1.0)
fleet_native                   = NO
distribution_native            = NO

COGNITIVE_RUNTIME_EXISTS       = NO  (eixo declarado; sem domínio em cognitiveRuntime/domains/)
PROMOTION_EXISTS               = NO  (sem LogisticsNativeCockpitPromotion)
SIGNAL_LOADER_EXISTS           = NO  (sem logisticsTenantSignalLoader / warehouseSignalLoader)
COCKPIT_RUNTIME_EXISTS         = NO  (sem logistics_native no payload /dashboard/me)
COGNITIVE_HUBS_EXISTS          = NO
SPECIALIZED_WIDGETS_EXISTS     = NO  (WidgetLogistica / WidgetEstoque são genéricos)
CENTERS_EXISTS                 = NO  (sem logistics_cognitive_centers)
APIS_EXISTS                    = YES (legacy + admin + foundation — ver matriz)
DATABASE_SUPPORT_EXISTS        = YES (migrations + tabelas; dados operacionais vazios)
```

---

## Inventário final (readiness)

| Flag | Estado | Notas |
|------|--------|-------|
| **LOGISTICS_RUNTIME_READY** | **NO** | Domínio `logistics` status `shadow`; flags default OFF |
| **WAREHOUSE_RUNTIME_READY** | **NO** | Sem bounded context `warehouse`; serviços legacy isolados |
| **COGNITIVE_RUNTIME_READY** | **NO** | Sem pack Z, loader, consolidator, pilot |
| **PROMOTION_READY** | **NO** | Sem promoção CC nativa |
| **SIGNAL_READY** | **NO** | Sem bridge tenant → blocos cognitivos |
| **DATA_READY** | **PARTIAL** | Schema completo; contagens tenant = 0 (exc. 1 lote MP) |
| **API_READY** | **PARTIAL** | Rotas existem; desalinhamento frontend↔backend em intelligence |
| **COCKPIT_READY** | **NO** | CC usa `dashboard.getSummary()` genérico |
| **CENTERS_READY** | **NO** | — |
| **HUBS_READY** | **NO** | — |

---

## Cadeia arquitectural mapeada

| Conceito solicitado | Equivalente canónico (Logística) | Estado |
|---------------------|--------------------------------|--------|
| `qualityNativeCockpitPromotion` | — | **INEXISTENTE** |
| `qualityNativeRegistry` | — | **INEXISTENTE** |
| `qualitySignalLoader` | — | **INEXISTENTE** |
| `qualityRuntime` | `domains/logistics/*` (publication/navigation/validation) | **SHADOW ONLY** |
| `qualityAdapters` | — | **INEXISTENTE** |
| `commandCenterModules` | `LayoutPorCargo.js` L126-134 → `logistica`, `estoque` | **GENÉRICO** |
| `profileModuleResolver` | `dashboardProfileResolver.js` → `manager_logistics` | OK |
| `moduleRegistry` | `logistics_intelligence` referenciado em forbidden lists; **sem entrada MODULE** | **GAP** |
| `dashboardSurfaceCapabilities` | Baseline LOGISTICS v1.0 — surface OK, runtime none | OK documentado |

### Fluxo Centro de Comando (estado actual)

```
Cadastro (eixo_logistica / eixo_estoque, hint logistics)
  → /dashboard/me
  → dashboardContextAdapter (sem specialized_cockpit logistics)
  → LayoutPorCargo regex logística
  → WidgetLogistica + WidgetEstoque + KPI/alertas/IA transversais
  → dashboard.getSummary()  ← NÃO consome warehouse/logistics-intelligence
```

**Comparação Qualidade (pós INC-024..034):**

```
Quality:  Z.20 → Z.21 → Z.22 → Z.23 → quality_native → QualityNativeCockpitPromotion → hubs
Logistics: (cadeia Z inexistente) → widgets genéricos permanentes
```

---

## Inventário por directório

### Frontend

| Path | Ficheiros | Papel |
|------|-----------|-------|
| `frontend/src/domains/logistics/` | **19** | Navigation publication, operational workspace (shadow), analytics validation |
| `frontend/src/domains/warehouse/` | **0** | **INEXISTENTE** |
| `frontend/src/components/logistics/` | **0** | **INEXISTENTE** |
| `frontend/src/components/warehouse/` | **0** | **INEXISTENTE** |
| `frontend/src/pages/AlmoxarifadoInteligente.jsx` | 1 | Dashboard legacy almoxarifado |
| `frontend/src/pages/LogisticaInteligente.jsx` | 1 | Dashboard legacy TMS/expedição |
| `frontend/src/pages/AdminWarehouse.jsx` | 1 | CRUD admin WMS (8 módulos) |
| `frontend/src/pages/AdminLogistics.jsx` | 1 | CRUD admin TMS (4 módulos) |
| `frontend/src/domains/placeholders/LogisticsPlaceholder.jsx` | 1 | Stub vazio (`return null`) |
| `frontend/src/features/dashboard/centroComando/WidgetLogistica.jsx` | 1 | CC genérico |
| `frontend/src/features/dashboard/centroComando/WidgetEstoque.jsx` | 1 | CC genérico |

### Backend

| Path | Ficheiros | Papel |
|------|-----------|-------|
| `backend/src/domains/logistics/` | **17** | Foundation, navigation, activation, validation (status **shadow**) |
| `backend/src/warehouse/` | **0** | **INEXISTENTE** — lógica em `services/` + `routes/` |
| `backend/src/cognitiveRuntime/domains/logistics/` | **0** | **INEXISTENTE** |
| `backend/src/services/warehouseIntelligenceService.js` | 1 | Inteligência almoxarifado (legacy) |
| `backend/src/services/logisticsIntelligenceService.js` | 1 | Inteligência logística/TMS (legacy) |
| `backend/src/services/warehouseService.js` | 1 | CRUD/saldos/movimentações |
| `backend/src/routes/warehouseIntelligence.js` | 1 | API intelligence WMS |
| `backend/src/routes/logisticsIntelligence.js` | 1 | API intelligence TMS |
| `backend/src/routes/admin/warehouse.js` | 1 | Admin CRUD WMS |
| `backend/src/routes/admin/logistics.js` | 1 | Admin CRUD TMS |
| `backend/src/ecosystem-correlation/domains/environmentLogisticsCorrelationEngine.js` | 1 | Correlação ambiente↔logística (assistive) |

---

## Inventário por módulo funcional

Legenda: **E**=existe · **P**=parcial · **M**=inexistente · **R**=registado · **V**=visível Gerente Logística · **A**=API · Classificação: **REAL** · **PLACEHOLDER** · **MOCK** · **DEMO** · **GREENFIELD**

### Almoxarifado / WMS

| Módulo | Status | Registo | Visível CC | API | Classificação | Notas |
|--------|--------|---------|------------|-----|---------------|-------|
| Warehouse (bounded context) | M | — | — | — | GREENFIELD | Sem `domains/warehouse/` |
| Materiais | E | P | — | A | REAL | `AdminWarehouse` + `warehouse_materials` |
| Categorias | E | P | — | A | REAL | `warehouse_material_categories` |
| Fornecedores | E | P | — | A | REAL | `warehouse_suppliers` |
| Recebimento | P | P | P | P | PARTIAL | Foundation `POST /api/logistics/receipts` + mov. tipo `entrada`; UI receiving no workspace |
| Movimentação | E | P | — | A | REAL | `warehouse_movements` + admin |
| Inventário (contagem) | P | — | — | P | PARTIAL | Saldos via `warehouse_balances`; sem inventário rotativo |
| Lotes | P | R | — | P | PARTIAL | `logistics_lot_tracking` (foundation) + `raw_material_lots` (eixo qualidade) |
| Rastreabilidade | P | R | P | P | PARTIAL | `raw_material_lots` + widget `rastreabilidade` no eixo logística |
| Picking | P | R | — | M | PLACEHOLDER | UI `?view=picking` — KPIs `—`, filas estáticas |
| Packing | M | — | — | — | GREENFIELD | — |
| Expedição (WMS outbound) | P | P | P | P | PARTIAL | `logistics_shipments` foundation; shipping view placeholder |
| Estoque / Saldos | E | R | V | A | REAL | CC `WidgetEstoque` desacoplado da API WMS |
| Localizações | E | P | — | A | REAL | `warehouse_locations` |
| Curva ABC | M | — | — | — | GREENFIELD | — |
| Inventário rotativo | M | — | — | — | GREENFIELD | — |
| Almoxarifado Inteligente (tela) | E | R | — | A* | REAL* | *API path mismatch — ver GAPs |
| Parâmetros estoque | E | P | — | A | REAL | `warehouse_params` |
| Vínculos mat↔processo | E | P | — | A | REAL | `warehouse_material_process_links` |
| Alertas WMS | E | — | — | A | REAL | `warehouse_alerts` + detecção automática |
| Previsões compra | E | — | — | A | REAL | `warehouse_predictions` + `predictMaterialNeeds()` |
| Materiais parados | E | — | — | A | REAL | `detectIdleMaterials()` |

### Logística / TMS

| Módulo | Status | Registo | Visível CC | API | Classificação | Notas |
|--------|--------|---------|------------|-----|---------------|-------|
| Frota | E | P | — | A | REAL | `logistics_vehicles` + admin |
| Motoristas | E | P | — | A | REAL | `logistics_drivers` |
| Rotas | E | P | — | A | REAL | `logistics_routes` |
| Pontos logísticos | E | P | — | A | REAL | `logistics_points` (docas, CD, cliente) |
| Entregas / Expedição | E | P | — | A | REAL | `logistics_expeditions` + CRUD intelligence |
| Tracking | P | — | — | P | PARTIAL | `tracking_code` em shipments; `logistics_telemetry` |
| Transportadoras | M | — | — | — | GREENFIELD | Campo `carrier` apenas |
| Custos logísticos | P | — | — | P | PARTIAL | Indicadores em `calculateLogisticsIndicators()` |
| Ocupação docas | P | P | P | M | MOCK | Fallback hardcoded em `OperationsOverviewPanel` |
| Planejamento / previsão demanda | P | — | — | A | REAL | `predictLogisticsDemand()` |
| Telemetria frota | P | R | P | P | PARTIAL | Tabela + view `?view=telemetry`; sem ingest dedicada UI |
| Logística Inteligente (tela) | E | R | — | A* | REAL* | *API path mismatch |
| OTIF | P | P | P | M | MOCK/DEMO | Gauge UI; fallback 93% se API 404 |
| Governança supply chain | P | R | — | M | PLACEHOLDER | View `?view=governance` — shell |
| Rollout enterprise | P | R | — | A | REAL | `/api/logistics-activation` + validation pack |
| Workspace operacional | E | R | P | M | PLACEHOLDER | `/app/logistics/operational` — views WMS sem backend operacional |

---

## Integração cognitiva

| Capacidade | Estado | Evidência |
|------------|--------|-----------|
| Insights domain-specific | **NO** | Apenas `insights_ia` transversal no CC |
| IA / detecção alertas | **PARTIAL** | `runAlerts()` WMS/TMS — serviços legacy reais |
| Previsões | **PARTIAL** | APIs `/predictions` — dados vazios em produção |
| Alertas | **REAL** | `warehouse_alerts`, `logistics_alerts` |
| Narrativas | **NO** | Sem `logisticsNarrative*` |
| KPIs domain | **PARTIAL** | `/indicators` intelligence; CC usa summary genérico |
| Decision Support | **NO** | Sem equivalente `quality_decision_support` |
| Telemetry hub | **PLACEHOLDER** | View telemetry no workspace; sem hub cognitivo |
| Cognitive blocks Z | **NO** | `cognitiveBlockDomains.logistics` existe; **0 blocos** no registry pack |
| Correlation engine | **PARTIAL** | `environmentLogisticsCorrelationEngine` (assistive_only) |

**Conclusão:** existe **CRUD administrativo completo** + **camada intelligence legacy funcional** (serviços + rotas), mas **não** ecossistema cognitivo promovido como Qualidade. A maior parte do workspace `/app/logistics/operational` é **shell UI** com fallbacks mock.

---

## APIs — inventário e classificação

| Prefixo / rota | Estado | Notas |
|----------------|--------|-------|
| `/api/warehouse-intelligence/*` | **IMPLEMENTADA** | dashboard, alerts, predictions, idle, indicators, run-alerts |
| `/api/logistics-intelligence/*` | **IMPLEMENTADA** | dashboard, alerts, expeditions CRUD, indicators, predictions, run-alerts |
| `/api/admin/warehouse/*` | **IMPLEMENTADA** | CRUD completo WMS |
| `/api/admin/logistics/*` | **IMPLEMENTADA** | CRUD TMS (vehicles, points, routes, drivers) |
| `/api/logistics/*` (foundation) | **IMPLEMENTADA** | health, inventory, receipts, shipments, lots |
| `/api/logistics-navigation/*` | **IMPLEMENTADA** | context publication (shadow) |
| `/api/logistics-activation/*` | **IMPLEMENTADA** | readiness, flags, stages |
| `/api/logistics-operational-validation/*` | **IMPLEMENTADA** | pack validation enterprise |
| `/api/logistics-operational/*` | **NÃO IMPLEMENTADA** | Frontend chama `/operations/overview`, `/receiving/register` — **404** |
| Frontend `warehouseIntelligence.getDashboard()` | **DESALINHADA** | Chama `/admin/warehouse/intelligence/dashboard` — rota **inexistente** no backend |
| Frontend `logisticsIntelligence.getDashboard()` | **DESALINHADA** | Chama `/admin/logistics/intelligence/dashboard` — rota **inexistente** |
| `logistics_native` cockpit payload | **NÃO IMPLEMENTADA** | — |
| Cognitive insights `/logistics-cognitive/*` | **NÃO IMPLEMENTADA** | — |

---

## Datasets (banco de dados)

**Consulta read-only 2026-07-16 (tenant agregado):**

| Tabela | Registos | Classificação |
|--------|----------|---------------|
| `warehouse_materials` | 0 | REAL (schema) |
| `warehouse_balances` | 0 | REAL |
| `warehouse_movements` | 0 | REAL |
| `warehouse_alerts` | 0 | REAL |
| `warehouse_predictions` | 0 | REAL |
| `warehouse_material_categories` | 0 | REAL |
| `warehouse_suppliers` | 0 | REAL |
| `warehouse_locations` | 0 | REAL |
| `logistics_vehicles` | 0 | REAL |
| `logistics_routes` | 0 | REAL |
| `logistics_drivers` | 0 | REAL |
| `logistics_expeditions` | 0 | REAL |
| `logistics_alerts` | 0 | REAL |
| `logistics_telemetry` | 0 | REAL |
| `logistics_inventory` | 0 | REAL (foundation layer) |
| `logistics_receipts` | 0 | REAL |
| `logistics_shipments` | 0 | REAL |
| `logistics_lot_tracking` | 0 | REAL |
| `raw_material_lots` | 1 | REAL (domínio qualidade/rastreio) |
| `raw_material_receipts` | 0 | REAL |

**Migrations:** `warehouse_intelligence_migration.sql`, `warehouse_intelligence_advanced_migration.sql`, `logistics_intelligence_migration.sql`

---

## Pilot packs, loaders e Promotion Engine

| Artefacto Quality (referência) | Equivalente Logística | Estado |
|-------------------------------|----------------------|--------|
| `QUALITY_PILOT_BLOCK_IDS` | — | **INEXISTENTE** |
| `qualityCognitiveBlockPack.js` | — | **INEXISTENTE** |
| `qualityTenantSignalLoader` | — | **INEXISTENTE** |
| `qualityCockpitConsolidator` | — | **INEXISTENTE** |
| `qualityCockpitPilot` (Z.23) | — | **INEXISTENTE** |
| `QualityNativeCockpitPromotion.jsx` | — | **INEXISTENTE** |
| `qualityNativeCockpitRegistry.js` | — | **INEXISTENTE** |
| Fase Z.20 → Z.23 | — | **NUNCA PROMOVIDO** |

**Loaders verificados — todos ausentes:**

- `LogisticsTenantSignalLoader` — **NO**
- `WarehouseSignalLoader` — **NO**
- `InventorySignalLoader` — **NO**

**Flags declaradas (default OFF):**

- Backend: `IMPETUS_LOGISTICS_*` em `featureGovernanceService.js` (operational, cognitive, navigation, publication, shadow…)
- Frontend: `VITE_IMPETUS_LOGISTICS_*` em `logisticsOperationalFeatureFlags.js`

**Decisão documentada:** `backend/docs/logistics-enterprise-runtime-alignment.md` → **REMAIN_IN_SHADOW**

---

## Centro de Comando — promoção nativa

| Pergunta | Resposta |
|----------|----------|
| Existe `LogisticsNativeCockpitPromotion`? | **NO** |
| CC usa widgets genéricos? | **YES** — `WidgetLogistica`, `WidgetEstoque` |
| Fonte de dados CC | `dashboard.getSummary()` — **não** intelligence APIs |
| `specializedCockpitResolver` suporta logistics? | **NO** — lê apenas `quality_cognitive_centers` |
| `consolidation_applied` para logistics | **N/A** — nunca emitido |

Layout Gerente Logística (`LayoutPorCargo.js` L126-134):

```
logistica | estoque | kpi_cards | alertas | pergunte_ia | insights_ia
```

Equivalente Quality **antes** INC-024 — placeholders permanentes.

---

## Placeholders identificados (exactos)

| Local | Tipo | Detalhe |
|-------|------|---------|
| `WidgetLogistica.jsx` | PLACEHOLDER + MISSING_DATASET | Summary genérico; campos `pedidos_transporte` / `pedidos_atrasados` |
| `WidgetEstoque.jsx` | PLACEHOLDER + MISSING_DATASET | Summary genérico; `estoque_total` / `estoque_critico` |
| `LogisticsOperationalWorkspace.jsx` L53-55 | MOCK | Fallback OTIF 93%, pickings 47, etc. se API falha |
| `PickingView` | PLACEHOLDER | KPIs `—`, filas estáticas "0 itens" |
| `ShippingView` | PLACEHOLDER | Docas estáticas "Livre" |
| `StorageView` | PLACEHOLDER | Grid ocupação demo (12 células) |
| `LogisticsPlaceholder.jsx` | PLACEHOLDER | Componente vazio |
| `AlmoxarifadoInteligente.jsx` header | DEMO | Gradiente `#1e88e5` (fora DS Industrial 4.0) |
| `LogisticaInteligente.jsx` | REAL* | Funcional se API corrigida; hoje path mismatch |

---

## GAPs de integração (causa raiz)

1. **Sem runtime nativo** — `logistics_native` / `warehouse_native` = GREENFIELD em `BASELINE-SYSTEM-v1.0.md`.
2. **Cadeia Z inexistente** — domínio nunca passou por shadow enrichment → pilot → consolidation.
3. **CC desacoplado** — widgets não consomem `/warehouse-intelligence` nem `/logistics-intelligence`.
4. **API path mismatch crítico** — frontend `api.js` aponta `/admin/*/intelligence/*`; backend monta `/api/*-intelligence/*`.
5. **Workspace operacional sem backend** — rotas `/logistics-operational/*` referenciadas no FE **não registadas** em `server.js`.
6. **Dual stack WMS** — legacy `warehouse_*` vs foundation `logistics_inventory` / `logistics_receipts` **não reconciliados**.
7. **`moduleRegistry` incompleto** — `logistics_intelligence` sem entrada MODULE (paths vazios implícitos); menu depende de manifesto + flags.
8. **Dados vazios** — schema pronto; tenant sem seed operacional → painéis aparecem vazios mesmo com API correta.
9. **`specializedCockpitResolver` quality-only** — impede reutilização directa para logistics sem INC dedicada.

---

## Comparação arquitectural com Qualidade (INC-023)

| Dimensão | Qualidade (pós INC-034) | Logística / Almoxarifado |
|----------|-------------------------|---------------------------|
| Domínio FE enterprise | 78+ ficheiros `domains/quality/` | 19 ficheiros `domains/logistics/` (shadow) |
| Domínio warehouse FE | N/A | **0** |
| Cockpit native | `quality_native` Z.23 | **none** |
| Promotion CC | `QualityNativeCockpitPromotion` | **none** |
| Signal loader | `qualityTenantSignalLoader` | **none** |
| Pilot block pack | 10 blocos | **0** |
| Widget CC | Genérico → promovido com hubs | **Genérico permanente** |
| Telas legacy intelligence | `quality-intelligence` integrado | Telas existem; **API desalinhada** |
| Admin CRUD | Parcial + hubs | **Completo** WMS+TMS |
| Cognitive hubs | 7 centers | **0** |
| Baseline locked | QUALITY v1.1 | LOGISTICS v1.0 (runtime NO documentado) |

**Diagnóstico:** Logística está no estado **análogo a Quality pré-INC-024**, com **mais código admin/legacy** mas **menos** infra cognitiva (sem Z-chain, sem promotion, sem hubs). Parte significativa do workspace enterprise é **facade UI** aguardando runtime.

---

## Filtros activos (`LOGISTICS_MODULES_FILTERED`)

| Filtro | Efeito |
|--------|--------|
| `structuralModuleResolver` | `logistics_intelligence` exige `eixo_logistica` ou `eixo_estoque` |
| `structuralCadastroModuleResolver` | Hint `logistics` / área logística → módulo |
| `logisticsAudienceNavigation` | Bands operador → diretor no manifesto |
| Feature flags backend | `IMPETUS_LOGISTICS_*` — **default OFF** |
| Feature flags frontend | `VITE_IMPETUS_LOGISTICS_*` — **default OFF** |
| `logistics_widgets_only` | Banda no manifesto — perfis normais podem ver só contexto CC |
| Executive forbidden | `logistics_intelligence` bloqueado em `decisao_estrategica` / governança exec |

---

## Módulos ocultos vs administrativos vs greenfield

| Categoria | Itens |
|-----------|-------|
| **Ocultos (flags OFF)** | Menu publication logistics, workspace views governance/telemetry/rollout |
| **Administrativos completos** | `AdminWarehouse` (8 módulos), `AdminLogistics` (4 módulos) |
| **Legacy intelligence (real, desacoplado)** | Services + rotas `/api/*-intelligence` |
| **Foundation (shadow)** | `/api/logistics` inventory/receipts/shipments/lots |
| **Placeholder / mock** | Workspace picking/shipping/storage, CC widgets, OTIF fallback |
| **Greenfield** | `logistics_native`, `warehouse_native`, `supply_native`, packing, ABC, inventário rotativo, transportadoras, cognitive hubs, Z-chain, promotion CC |

---

## Prioridade sugerida para INC-037 (plano — não implementar nesta INC)

1. **Corrigir desalinhamento API** frontend ↔ `/api/warehouse-intelligence` e `/api/logistics-intelligence`.
2. **Decidir stack WMS canónico** — unificar `warehouse_*` legacy vs `logistics_*` foundation.
3. **Ligar widgets CC** a endpoints intelligence (padrão INC-023 item 2 para Quality).
4. **Definir escopo `logistics_native`** — WMS+TMS combinados ou split `warehouse_native` + `logistics_native`.
5. **Pilot pack + signal loader** — espelhar `qualityCognitiveBlockPack` / `qualityTenantSignalLoader`.
6. **Promotion engine** — `LogisticsNativeCockpitPromotion` + registry hubs.
7. **Implementar ou remover** rotas `/logistics-operational/*` e eliminar mocks do workspace.
8. **Entrada `moduleRegistry`** para `logistics_intelligence` com paths canónicos.
9. **Seed / reconciliação dados** para homologação funcional.
10. **Z.20→Z.23** — só após auditoria humana aprovar plano (mesma disciplina Quality).

---

## Baseline pós-auditoria

```
INC-036
LOGISTICS_ECOSYSTEM_AUDITED     = YES
LOGISTICS_IMPLEMENTATION_STATUS = DOCUMENTED
READY_FOR_LOGISTICS_MODULES     = YES (planning gate for INC-037)
WAREHOUSE_ECOSYSTEM_AUDITED     = YES (via legacy + admin — no native domain)
```

---

## Conclusão executiva

O domínio **Logística / Almoxarifado não está reconciliado** como Qualidade. Existe um **ecossistema parcialmente implementado**:

- **Camada administrativa WMS/TMS** — madura (CRUD completo, APIs, migrations).
- **Camada intelligence legacy** — serviços e rotas **reais**, porém **desconectados** do Centro de Comando e das telas Inteligentes (path mismatch).
- **Camada enterprise shadow** — navigation/activation/validation alinhados ao framework Quality/Safety, **sem promoção**.
- **Camada cognitiva** — **greenfield total** (sem native, sem Z-chain, sem hubs, sem loaders, sem pilot pack).

A homologação do perfil **Gerente de Almoxarifado, Expedição e Logística** confirma: o CC exibe **widgets genéricos** (`logistica`, `estoque`) alimentados por **summary transversal**, enquanto módulos ricos permanecem em rotas separadas — muitas **inacessíveis ou mock** até correcção de integração.

**Implementação:** bloqueada até aprovação humana desta auditoria e abertura disciplinada da **INC-037 (plano)** → **INC-038+ (implementação)**.
