# AIOI — Cognitive Boundary Specification

**Camada:** P9.2 — Cognitive Boundary Service  
**Serviço:** `backend/src/services/aioi/aioiCognitiveBoundaryService.js`  

---

## 1. Propósito

Definir limites operacionais formais — validação only, zero execução.

---

## 2. Categorias

| Categoria | Descrição |
|-----------|-----------|
| `OBSERVE_ONLY` | Apenas leitura/agregação |
| `RECOMMEND_ONLY` | Sugestões sem execução |
| `HITL_REQUIRED` | Aprovação humana obrigatória |
| `EXECUTION_FORBIDDEN` | Execução bloqueada |

---

## 3. Funções

- `getBoundaryCatalog()`
- `validateBoundary(domain, action)`

---

## 4. Token

**COGNITIVE_BOUNDARIES_CERTIFIED**
