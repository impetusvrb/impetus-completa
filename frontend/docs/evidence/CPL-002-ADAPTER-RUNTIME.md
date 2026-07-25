# CPL-002 — Adapter Runtime

**Programa:** CPL-002 — Shared Cognitive Adapters & Service Orchestration  
**Fonte canónica:** `frontend/src/platform/cognitive/runtime/cognitiveAdapterRuntime.js`  
**Versão:** 1.0.0 · **Fase:** CPL-002

---

## Propósito

Infraestrutura comum para **adapters thin** que traduzem contratos CPL-001 em chamadas às implementações domínio existentes. O runtime **não contém** lógica de negócio, heurísticas, regras ou motores cognitivos.

Princípio: **Discover → Standardize → Register → Adapt → Orchestrate** — nunca Replace.

---

## Interface `CognitiveAdapter`

| Propriedade / método | Descrição |
|----------------------|-----------|
| `id` | Identificador canónico (`logistics_adapter`, etc.) |
| `domain` | Domínio proprietário da inteligência |
| `version` | Versão do adapter |
| `providerPaths` | Referências read-only às implementações domínio |
| `contractIds` | Contratos CPL-001 suportados |
| `capabilities()` | Lista de operações expostas |
| `execute(operation, context)` | Delegação à implementação domínio |
| `explain(operation, context)` | Trace / metadados (sem novo explainability engine) |
| `simulate(scenarioId, context)` | Delegação a simulação domínio (se suportada) |
| `health()` | Probe de disponibilidade (read-only) |

---

## API runtime

```javascript
import {
  createCognitiveAdapter,
  registerCognitiveAdapter,
  getCognitiveAdapter,        // instância runtime registada
  listRegisteredAdapters,
  orchestrate,
  clearAdapterStoreForTests
} from 'platform/cognitive/runtime/cognitiveAdapterRuntime.js';
```

| Função | Papel |
|--------|-------|
| `createCognitiveAdapter(def)` | Factory thin — encapsula handlers declarativos |
| `registerCognitiveAdapter(adapter)` | Registo in-memory para orquestração |
| `getCognitiveAdapter(id)` | Lookup runtime (store activo) |
| `orchestrate(id, operation, context)` | Entry point de delegação uniforme |
| `bootstrapCognitivePlatformAdapters()` | Regista os 4 adapters CPL-002 |

---

## Bootstrap

`cognitivePlatformBootstrap.js` regista em startup de testes/consumo:

1. `logistics_adapter`
2. `quality_adapter`
3. `safety_adapter`
4. `environment_adapter`

Sem alterar ficheiros de domínio.

---

## Separação registry vs runtime

| Conceito | Função | Export |
|----------|--------|--------|
| **Registry (declarativo)** | Metadados CPL-001/002 | `getCognitiveAdapterRegistryEntry()` |
| **Runtime (activo)** | Instância adapter registada | `getCognitiveAdapter()` |

Evita colisão de exports em `platform/cognitive/index.js`.

---

## Proibido sob `runtime/`

- Decision Engine, Recommendation Engine, Rule Engine
- Scenario / Timeline / Risk / Analytics / AI engines próprios
- Persistência de estado operacional WMS

---

## Testes

```bash
npm run test:cpl002-adapter-runtime   # 7/7
```

---

## Referências

- Bootstrap: `runtime/cognitivePlatformBootstrap.js`
- Adapters: `adapters/{logistics,quality,safety,environment}/`
- Contratos: `contracts/cognitiveContractDescriptors.js`
