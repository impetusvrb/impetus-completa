# CPL-003 — Compatibility Matrix

**Programa:** CPL-003  
**Fonte:** `frontend/src/platform/cognitive/governance/compatibility/capabilityCompatibility.js`

---

## Matriz

```
Capability → Contract → Provider → Adapter → Consumers
```

Objectivo: saber **quem depende de quem**, sem executar regras cognitivas.

---

## Campos por linha

| Campo | Descrição |
|-------|-----------|
| `capabilityId` / `label` | Capacidade corporativa |
| `contractId` | Contrato CPL-001 |
| `provider` / `providers` | Implementação canónica + alternativas |
| `adapterId` / `adapterStatus` | Adapter CPL-002 (se existir) |
| `consumers` | Superfícies / módulos consumidores (declarativo) |
| `lifecycleStatus` / `version` | Metadados de governança |

---

## API

```javascript
getCompatibilityRow(capabilityId)
listConsumers(capabilityId)
listProviders(capabilityId?)
```

---

## Invariantes

- Matriz gerada a partir do registry — sem duplicar providers
- Consumers são declarações de governança, não imports runtime
