# AIOI — Observation Catalog Specification

**Camada:** P10.2 — Observation Catalog Service  
**Serviço:** `backend/src/services/aioi/aioiObservationCatalogService.js`  

---

## 1. Propósito

Catalogar observações por domínio — READ ONLY.

---

## 2. Categorias

`workflow` · `decision` · `sla` · `risk` · `capacity` · `compliance` · `governance`

---

## 3. Funções

- `getObservationCatalog()`
- `getObservationsByCategory(category)`

---

## 4. Token

**OBSERVATION_CATALOG_CERTIFIED**
