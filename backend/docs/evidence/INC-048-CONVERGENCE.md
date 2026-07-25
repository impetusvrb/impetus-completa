# INC-048 — Supply + WMS Architectural Convergence

**Programa:** Integration (INC)  
**Entrega:** INC-048  
**Categoria:** Architectural Convergence  
**Data:** 2026-07-18

---

## Objetivo

Consolidar Supply e WMS como **plataforma operacional única** — integrando componentes homologados **sem reconstruir domínios**.

---

## Operational Convergence Layer

`backend/src/integration/inc048/`

| Módulo | Função |
|--------|--------|
| `inc048IntegrationRuntime.js` | Orquestração convergência |
| `inc048Registry.js` | Registo runtimes + APIs + workspaces |
| `inc048Contracts.js` | Fluxo oficial 8 camadas |
| `inc048CompatibilityMatrix.js` | Matriz automática versões |
| `inc048Observability.js` | Telemetria convergência |

---

## Fluxo obrigatório

```
Supply Workspace → Supply Runtime → Promotion → Pilot Layer
  → Canonical Contracts → WMS Public APIs → Logistics Runtime → WMS Workspace
```

---

## Flag

`IMPETUS_INC048_ENABLED` — default **false**

---

## API convergência

`/api/integration/inc048/*` (health, matrix, validate, converge)

---

## Princípio

**Nenhum componente homologado foi alterado.**

*Ver:* [INC-048-COMPATIBILITY-MATRIX.md](./INC-048-COMPATIBILITY-MATRIX.md)
