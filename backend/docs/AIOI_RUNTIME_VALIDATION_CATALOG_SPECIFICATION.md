# AIOI — Runtime Validation Catalog Specification

**Camada:** P15.2 — Runtime Validation Catalog Service  
**Serviço:** `backend/src/services/aioi/aioiRuntimeValidationCatalogService.js`  

---

## 1. Propósito

Catalogar validações de runtime por domínio — READ ONLY.

---

## 2. Categorias

`governance` · `compliance` · `assurance` · `knowledge` · `observation` · `recommendation` · `human_review` · `authorization` · `simulation`

---

## 3. Funções

- `getRuntimeValidationCatalog()`
- `getRuntimeValidationsByCategory(category)`

---

## 4. Token

**RUNTIME_VALIDATION_CATALOG_CERTIFIED**
