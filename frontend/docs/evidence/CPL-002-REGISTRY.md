# CPL-002 — Cognitive Platform Registry (Update)

**Programa:** CPL-002  
**Fonte canónica:** `frontend/src/platform/cognitive/registry/cognitivePlatformRegistry.js`  
**Versão:** 2.0.0 · **Fase:** CPL-002

---

## Evolução CPL-001 → CPL-002

| Campo | CPL-001 | CPL-002 |
|-------|---------|---------|
| `CPL_REGISTRY_PHASE` | CPL-001 | CPL-002 |
| `CPL_REGISTRY_VERSION` | 1.0.0 | 2.0.0 |
| Adapters | `planned` | 4 `active` + 5 `planned` |
| Capabilities ligadas | `adapterStatus: planned` | `adapterStatus: active` (logistics) |
| Runtime path | — | `runtimePath` em adapters activos |

---

## Adapters activos (CPL-002)

| adapterId | targetDomain | runtimePath | status |
|-----------|--------------|-------------|--------|
| `logistics_adapter` | logistics_wms | `adapters/logistics/logisticsCognitiveAdapter.js` | active |
| `quality_adapter` | quality | `adapters/quality/qualityCognitiveAdapter.js` | active |
| `safety_adapter` | safety | `adapters/safety/safetyCognitiveAdapter.js` | active |
| `environment_adapter` | environment | `adapters/environment/environmentCognitiveAdapter.js` | active |

---

## Adapters planned (sem alteração de scope CPL-002)

| adapterId | cplPhase |
|-----------|----------|
| `maintenance_adapter` | CPL-002 |
| `production_adapter` | CPL-002 |
| `ppap_adapter` | CPL-003 |
| `ishikawa_adapter` | CPL-003 |
| `command_center_adapter` | CPL-003 |

---

## Modelo Capability → Provider → Adapter

```
Capability (COGNITIVE_PLATFORM_REGISTRY)
    ↓ contractId → COGNITIVE_CONTRACT_DESCRIPTORS
    ↓ canonicalImplementation → domínio existente
    ↓ adapterId → COGNITIVE_ADAPTER_REGISTRY
    ↓ runtimePath → adapter thin (CPL-002)
    ↓ health → cognitiveHealthMonitor
    ↓ version
```

---

## API registry

```javascript
import {
  COGNITIVE_PLATFORM_REGISTRY,
  COGNITIVE_ADAPTER_REGISTRY,
  getCognitiveCapability,
  getCognitiveAdapterRegistryEntry,  // metadados declarativos
  validateCpl001RegistryIntegrity,
  validateCpl002RegistryIntegrity
} from 'platform/cognitive/registry';
```

**Nota:** `getCognitiveAdapterRegistryEntry` (registry) ≠ `getCognitiveAdapter` (runtime store).

---

## Validação CPL-002

`validateCpl002RegistryIntegrity()` verifica:

- Integridade CPL-001 preservada
- Adapters activos com `runtimePath` e `version`
- Mínimo 3 capabilities com `adapterStatus: active`

---

## Invariantes

- **Zero migração** de código domínio
- **Zero alteração** a providers existentes
- WMS Enterprise Baseline permanece `complete` + `frozen`

---

## Testes

```bash
npm run test:cpl002-adapter-registry   # 4/4
npm run test:cpl001                    # 14/14 (regressão)
```
