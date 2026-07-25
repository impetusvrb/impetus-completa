# CPL-003 — Ownership

**Programa:** CPL-003  
**Fonte:** `frontend/src/platform/cognitive/governance/ownership/capabilityOwnership.js`

---

## Cadeia

```
Capability → Owner → Adapter → Contract → Version
```

Cada capability possui:

| Campo | Origem |
|-------|--------|
| `ownerDomain` | Registry CPL-001 |
| `team` / `contactAlias` | Mapa de equipas por domínio |
| `adapterId` | Registry |
| `contractId` | Registry |
| `version` | Versionamento CPL-003 |
| `lifecycleStatus` | Lifecycle CPL-003 |

---

## Equipas por domínio

| Domínio | Equipa |
|---------|--------|
| logistics_wms | Logistics & WMS Operations |
| quality | Quality Cognitive |
| safety | Safety / SST Cognitive |
| environment | Environment Cognitive |
| command_center | Command Center / Centro Cognitivo |
| platform | Platform Architecture |

---

## Invariantes

Ownership **não altera** o domínio proprietário da inteligência — apenas documenta responsabilidade corporativa.
