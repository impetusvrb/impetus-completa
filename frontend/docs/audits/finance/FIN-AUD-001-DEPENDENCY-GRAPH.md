# FIN-AUD-001 — Dependency Graph

**Fonte:** `frontend/src/platform/audit/finance/finAud001DependencyGraph.js`

---

## Modelo

```
Domínio → Módulo → Serviço → Contrato → Provider → Consumer
```

Somente leitura — estrutura congelada (`Object.freeze`).

---

## Tipos de nó

| type | Exemplo |
|------|---------|
| domain | `domain:platform_dashboard` |
| module | `module:financial_intelligence` |
| service | `service:industrial_cost_service` |
| contract | `contract:dashboard.costs` |
| provider | `provider:backend/src/services/...` |
| consumer | `consumer:CentroCustosExecutivo` |
| gap | `gap:missing_http_routes` |

---

## Relações

| relation | Significado |
|----------|-------------|
| contains | Domínio contém módulo |
| uses | Módulo usa serviço |
| consumes | Consumer usa módulo/contrato |
| implemented_by | Serviço implementado por provider |
| provided_by | Contrato fornecido por provider |
| broken | Contrato com gap HTTP |

---

## API

```javascript
import { buildFinanceDependencyGraph, getFinanceDependenciesForModule } from 'platform/audit/finance';

const graph = buildFinanceDependencyGraph();
const deps = getFinanceDependenciesForModule('financial_intelligence');
```

---

## Grafo crítico — financial leakage

```
consumer:MapaVazamentoFinanceiro
    → contract:dashboard.financialLeakage [broken]
    → gap:missing_http_routes
    → provider:financialLeakageDetectorService (existe)
```
