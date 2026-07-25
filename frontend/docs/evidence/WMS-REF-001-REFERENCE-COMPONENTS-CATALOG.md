# WMS-REF-001 — Reference Components Catalog

**Gate:** WMS-REF-001  
**Pré-requisito:** OPM-002A ✅  
**Import oficial:** `presentation/wms-reference-components`

---

## Catálogo corporativo certificado

| ID Contrato | Componente | Slot | Ficheiro | Certificado |
|-------------|------------|------|----------|-------------|
| WMS-REF-DASHBOARD | `InventoryDashboard` | dashboard | `components/InventoryDashboard.jsx` | ✅ |
| WMS-REF-METRICS | `InventoryMetrics` | metrics | `components/InventoryMetrics.jsx` | ✅ |
| WMS-REF-SEARCH | `InventorySearch` | search | `components/InventorySearch.jsx` | ✅ |
| WMS-REF-FILTERS | `InventoryFilters` | filters | `components/InventoryFilters.jsx` | ✅ |
| WMS-REF-GRID | `InventoryGrid` | grid | `components/InventoryGrid.jsx` | ✅ |
| WMS-REF-TIMELINE | `InventoryTimeline` | timeline | `components/InventoryTimeline.jsx` | ✅ |
| WMS-REF-EXPORT | `InventoryExport` | export | `components/InventoryExport.jsx` | ✅ |

**Registo canónico:** `src/presentation/wms-reference-components/wmsRef001Registry.js`  
**Contratos:** `src/presentation/wms-reference-components/wmsRef001ComponentContracts.js`

---

## Import recomendado (OPM-003+)

```javascript
import {
  InventoryDashboard,
  InventoryGrid,
  InventoryExport,
  WMS_REF001_CATALOG,
  isWmsRef001Certified
} from '../../presentation/wms-reference-components/index.js';
```

---

## Política de reutilização

- **Obrigatório** para Receiving, Picking, Shipping, Transfers, Warehouse Intelligence.
- Componentes equivalentes **proibidos** sem justificativa arquitectural documentada.
- Adaptações permitidas via **pontos de extensão** definidos em cada contrato (colunas, filtros, intelligence).

---

## Compatibilidade certificada

| Camada | Status |
|--------|--------|
| EOX (EoxActionBar) | ✅ |
| Industrial Data Grid | ✅ |
| WMS-003 APIs | ✅ |
| Observabilidade | ✅ |
| RBAC | ✅ |
| Feature Flags | ✅ |

---

## Testes

```bash
npm run test:wms-ref001
```

Inclui certificação WMS-REF-001 + regressão OPM-002A.
