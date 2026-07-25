# WMS-REF-001 — Guia de Herança (Reference Components)

**Audiência:** equipas OPM-003 → OPM-007  
**Pré-requisito:** WMS-REF-001 certificado ✅

---

## 1. Princípio

```
OPM-002A → Reference Module (comportamento completo)
WMS-REF-001 → Reference Components (património UI reutilizável)
OPM-003+ → Domínio + inteligência (reutilizar componentes certificados)
```

O esforço deixa de ser **construir telas** e passa a ser **construir inteligência operacional**.

---

## 2. Passos para novo módulo WMS

### 2.1 Estrutura de módulo

```
modules/receiving/
  ReceivingOperationalModule.jsx   ← composição (como InventoryOperationalModule)
  useReceivingFoundation.js        ← dados WMS-003 + KPIs domínio
  receivingColumns.jsx             ← extensão InventoryGrid
  receivingKpiUtils.js
  receivingObservability.js        ← prefixo RECEIVING_*
  receivingIntegrationContracts.js
```

### 2.2 Import dos componentes certificados

```javascript
import {
  InventoryDashboard,
  InventorySearch,
  InventoryFilters,
  InventoryGrid,
  InventoryTimeline,
  InventoryExport,
  InventoryMetrics
} from '../../../../presentation/wms-reference-components/index.js';
```

> Em OPM-003 pode manter prefixo `Inventory*` — são componentes corporativos certificados. Renomeação cosmética opcional numa fase posterior.

### 2.3 Composição canónica

Ordem de slots (herdada do Reference Module):

1. `InventoryExport` (EoxActionBar)
2. `InventoryDashboard`
3. `InventorySearch` + `InventoryFilters`
4. `InventoryMetrics`
5. `InventoryTimeline`
6. Estado vazio/erro (`IndustrialModuleStateView`)
7. `InventoryGrid`
8. Painel de detalhes (domínio)
9. Timeline render (`IndustrialModuleLayout.timelineEvents`)

### 2.4 Extensões permitidas

| Componente | Extensão típica |
|------------|-----------------|
| Dashboard | `kpis` calculados no hook de domínio |
| Metrics | Novo `computeReceivingIntelligence()` + painel adaptado |
| Search | `placeholder` contextual |
| Filters | Array `filters` com IDs de domínio |
| Grid | `columns={RECEIVING_COLUMNS}` |
| Timeline | `warehouses`, `products` do domínio |
| Export | `onAction` com exportadores de domínio |

### 2.5 Observabilidade

Replicar padrão de eventos com prefixo de módulo:

```
RECEIVING_LOADED
RECEIVING_SEARCH
RECEIVING_FILTER
RECEIVING_GRID_SORT
RECEIVING_EXPORT
RECEIVING_TIMELINE
RECEIVING_VIEW_CHANGED
```

Usar `logWmsUiEvent` + `CustomEvent('impetus:receiving')`.

---

## 3. O que NÃO fazer

- Criar grid/timeline/export próprios sem excepção documentada
- Bypass EOX ActionBar para exportação
- Mock de KPIs ou dados de gráfico
- Alterar componentes certificados para lógica de domínio específica

---

## 4. Verificação antes de merge (OPM-003+)

- [ ] Import de `presentation/wms-reference-components`
- [ ] Contratos de integração declarados
- [ ] Observabilidade com prefixo de módulo
- [ ] `npm run test:wms-ref001` + testes do módulo
- [ ] Zero regressão architecture freeze

---

## 5. Próximo gate

**OPM-003 — Receiving Operations** (autorizado após WMS-REF-001 ✅)
