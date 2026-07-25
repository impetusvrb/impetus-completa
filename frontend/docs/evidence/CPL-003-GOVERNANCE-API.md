# CPL-003 — Governance API

**Programa:** CPL-003  
**Fonte:** `frontend/src/platform/cognitive/governance/api/cognitiveGovernanceApi.js`  
**Tipo:** Consultas apenas — **sem executar engines**

---

## Funções

| Função | Descrição |
|--------|-----------|
| `listCapabilities()` | Catálogo com status / domain / adapter |
| `listByDomain(domain)` | Filtro por domínio proprietário |
| `listByStatus(status)` | Filtro por lifecycle |
| `listByOwner(teamOrAlias)` | Filtro por equipa / alias |
| `listConsumers(capabilityId?)` | Consumidores declarados |
| `listProviders(capabilityId?)` | Providers canónicos e alternativos |
| `getCapability(capabilityId)` | Detalhe completo de governança |
| `getDependencyGraph(id?)` | Grafo de dependências |
| `getEnterpriseCatalog()` | Snapshot do catálogo |
| `validateCpl003GovernanceIntegrity()` | Validação agregada |

---

## Separação Discovery (CPL-002) vs Governance (CPL-003)

| | Discovery API | Governance API |
|---|---------------|----------------|
| Foco | Exposição / health / delegação | Ciclo de vida / ownership / dependências |
| `listCapabilities` | Paths + adapterStatus | Catalog + lifecycle + owner |
| Execução | `delegateToAdapter` (orquestração) | **Nunca** |

No barrel `platform/cognitive/index.js`, para evitar colisão de nomes:

- Discovery: `listCapabilities`, `getCapability`
- Governance: `listGovernedCapabilities`, `getGovernedCapability`

A API canónica com os nomes do spec vive em `governance/api/`.

---

## Exemplo

```javascript
import {
  listCapabilities,
  getCapability,
  listByStatus,
  getDependencyGraph
} from 'platform/cognitive/governance/api';

const active = listByStatus('active');
const detail = getCapability('recommendation_engine');
const graph = getDependencyGraph('recommendation_engine');
```
