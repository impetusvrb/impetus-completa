# ENT-001 — Module Catalog

**Fase:** ENT-001  
**Gerado:** 2026-07-20  
**Fonte canónica:** `frontend/src/platform/knowledge/ent001ModuleCatalog.js`

---

## Resumo

| Origem | Entradas |
|--------|----------|
| WMS (wmsModuleRegistry) | 9 (landing + 8 módulos) |
| FIN-AUD-001 (finAud001ModuleMap) | 7 |
| EOX views / cockpits | 11 |
| REG-001 recovery (páginas UI) | 6+ |
| **Total consolidado** | **33** |

---

## WMS — módulos certificados

| moduleId | Label | API | Maturidade |
|----------|-------|-----|------------|
| dashboard | Dashboard Operacional | — | certified |
| warehouses | Armazéns | listWarehouses | certified |
| inventory | Inventário | listItems | certified |
| receiving | Recebimento | listReceiving | certified |
| picking | Picking | listPicking | certified |
| shipping | Expedição | listShipping | certified |
| transfers | Transferências | listTransfers | certified |
| warehouse_intelligence | Warehouse Intelligence | — | certified |
| cognitive_logistics | Cognitive Logistics | — | certified |

---

## Finance — módulos FIN-AUD-001

| moduleId | Tipo | Maturidade | Notas |
|----------|------|------------|-------|
| financial_intelligence | contextual_module | complete | Centro custos + mapa vazamentos |
| cost_center | contextual_module | complete | Admin + executivo |
| losses_map | contextual_module | partial | UI activa; API remontada REG-002 R1 |
| centro_previsao_operacional | contextual_module | partial | Forecasting parcial (REG-001) |
| nexus_billing_admin | admin_module | complete | Nexus IA custos |
| finance_native | planned_domain | placeholder | GREENFIELD |
| centro_comando_finance_widgets | dashboard_widgets | partial | Profile finance_management |

---

## EOX views / cockpits descobertos

- **Qualidade:** governance, telemetry, cognitive
- **Segurança:** governance, cognitive
- **Ambiente:** water, esg, cognitive
- **PPAP / MSA / Ishikawa:** native cockpits CC (desconectados EOX)

---

## Páginas platform (REG recovery matrix)

- Mapa de Vazamentos — `/app/mapa-vazamento-financeiro` (R1 REG-002)
- Mapa Industrial — `/app/centro-operacoes-industrial` (R2)
- Operational Insights — `/app/insights` (R4)
- Cérebro Operacional — `/app/cerebro-operacional` (R5)
- Centro Previsão — `/app/centro-previsao-operacional` (pendente parcial)

---

## Consulta

```javascript
import { getModuleCatalog, listModulesByDomain } from '../src/platform/knowledge/index.js';
listModulesByDomain('logistics_wms');
```
