# CPL-003 — Capability Lifecycle

**Programa:** CPL-003 — Enterprise Cognitive Capability Governance  
**Fonte:** `frontend/src/platform/cognitive/governance/lifecycle/capabilityLifecycle.js`  
**Tipo:** Metadata only — **não altera implementações**

---

## Estados

| Estado | Significado |
|--------|-------------|
| `planned` | Catalogada; adapter ainda não activo |
| `experimental` | Adapter planned / em preparação |
| `active` | Exposta via adapter CPL-002 activo |
| `deprecated` | Em descontinuação (reservado) |
| `retired` | Retirada do catálogo activo (reservado) |

---

## Derivação

Por defeito, o lifecycle deriva de `adapterStatus` do registry CPL-001/002:

- `adapterStatus: active` → `active`
- `adapterStatus: planned` → `experimental`
- `adapterStatus: not_started` → `planned`

Overrides explícitos podem ser adicionados sem tocar providers.

---

## API

```javascript
import {
  CAPABILITY_LIFECYCLE_STATES,
  getCapabilityLifecycle,
  listCapabilitiesByLifecycleStatus,
  validateLifecycleIntegrity
} from 'platform/cognitive/governance/lifecycle';
```

---

## Invariantes

- Nenhum provider é movido ou modificado
- Lifecycle é consultável — não executa engines
