# CPL-003 — Dependency Graph

**Programa:** CPL-003  
**Fonte:** `frontend/src/platform/cognitive/governance/graph/capabilityDependencyGraph.js`  
**Tipo:** Read-only

---

## Grafo

```
Capability → Adapter → Provider → Consumer
```

Também inclui arestas `uses_contract` (Capability → Contract).

---

## Tipos de nó

| type | Exemplo |
|------|---------|
| `capability` | `cap:recommendation_engine` |
| `contract` | `contract:RecommendationProvider` |
| `adapter` | `adapter:logistics_adapter` |
| `provider` | `provider:domains/.../clRecommendationEngine.js` |
| `consumer` | `consumer:CognitiveLogisticsModule` |

---

## Relações

| relation | Significado |
|----------|-------------|
| `uses_contract` | Capability usa contrato CPL-001 |
| `exposed_via` | Capability exposta por adapter |
| `implemented_by` | Capability implementada por provider |
| `delegates_to` | Adapter delega a provider |
| `consumes` | Consumer depende da capability |

---

## API

```javascript
buildCapabilityDependencyGraph(capabilityId?)
getDependencyGraph(capabilityId?)
```

Estrutura congelada (`Object.freeze`) — somente leitura.
