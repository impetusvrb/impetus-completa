# CPL-002 — Capability Discovery API

**Programa:** CPL-002  
**Fonte canónica:** `frontend/src/platform/cognitive/api/cognitiveDiscoveryApi.js`  
**Fase:** CPL-002

---

## Propósito

API de **consulta** de capacidades, adapters, providers e saúde. Permite que aplicações descubram serviços cognitivos existentes sem conhecer implementações domínio.

**Consulta apenas** — não executa regras cognitivas excepto via `delegateToAdapter` (orquestração explícita).

---

## Funções

| Função | Descrição |
|--------|-----------|
| `listCapabilities()` | Lista entradas do registry corporativo |
| `getCapability(capabilityId)` | Detalhe + contrato + runtime adapter (se registado) |
| `listAdapters()` | Runtime activo + registry declarativo |
| `getProvider(capabilityId)` | Paths de implementação domínio |
| `getHealth(adapterId?)` | Monitor de saúde (um ou todos) |
| `getAdapterRegistryEntry(adapterId)` | Metadados declarativos do adapter |
| `delegateToAdapter(adapterId, operation, context)` | Orquestração — delegação thin |

---

## Exemplo de uso

```javascript
import {
  listCapabilities,
  getCapability,
  listAdapters,
  getProvider,
  getHealth,
  delegateToAdapter,
  bootstrapCognitivePlatformAdapters
} from 'platform/cognitive';

bootstrapCognitivePlatformAdapters();

const caps = listCapabilities();
const decisionTrace = getCapability('decision_trace');
const { runtime, registry } = listAdapters();
const provider = getProvider('predictive_insights');
const health = getHealth();

const result = delegateToAdapter('safety_adapter', 'pressure_analysis', {
  input: { menu_extra_count: 2, view_count: 3 }
});
```

---

## Separação discovery vs execução

| Operação | Tipo |
|----------|------|
| `listCapabilities`, `getCapability`, `listAdapters`, `getProvider`, `getHealth` | **Discovery** (read-only) |
| `delegateToAdapter` | **Orchestration** (delegação explícita ao adapter) |

A Discovery API **não** contém heurísticas. Toda inteligência é devolvida pelo adapter → domínio.

---

## Resposta `getCapability`

Inclui:

- Entrada completa do `COGNITIVE_PLATFORM_REGISTRY`
- `contract`: `{ contractId, status }` do CPL-001
- `adapterRuntime`: `{ id, domain, capabilities }` se adapter registado no runtime

---

## Resposta `listAdapters`

```javascript
{
  runtime: [{ id, domain, version, capabilities, providerPaths }],
  registry: [{ adapterId, label, targetDomain, status, cplPhase, registered }]
}
```

Campo `registered: true` quando o adapter está no runtime store.

---

## Arquitectura alvo

```
Applications
    ↓
Cognitive Platform (Discovery API)
    ↓
Shared Adapters (runtime)
    ↓
Domain Cognitive Services
    ↓
Existing Engines (OPM-008, Quality Hub, Safety Hub, …)
```

Nenhum domínio conhece outro domínio.

---

## Testes

```bash
npm run test:cpl002-adapter-discovery   # 6/6
```
