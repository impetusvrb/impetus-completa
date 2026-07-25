# CPL-003 — Enterprise Catalog

**Programa:** CPL-003  
**Fonte:** `frontend/src/platform/cognitive/governance/catalog/cognitiveCapabilityCatalog.js`

---

## Propósito

Catálogo corporativo **gerado automaticamente** a partir do registry + lifecycle + ownership.

Vista típica:

| Capability | Domain | Adapter | Status |
|------------|--------|---------|--------|
| recommendation_engine | logistics_wms | logistics_adapter | active |
| decision_trace | logistics_wms | — | planned |
| smart_panel | command_center | command_center_adapter | experimental |

---

## Sem duplicação

O catálogo **não copia** código de providers. Cada entrada referencia:

- `capabilityId` do registry
- `provider` (path canónico)
- metadados de governança (status, owner, version)

---

## API

```javascript
COGNITIVE_CAPABILITY_CATALOG
getCatalogEntry(id)
listCatalogByDomain(domain)
listCatalogByStatus(status)
getEnterpriseCatalog()
```
