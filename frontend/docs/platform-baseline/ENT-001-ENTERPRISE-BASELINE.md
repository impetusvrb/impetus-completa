# ENT-001 — Enterprise Baseline

**Fase:** ENT-001 · Enterprise Platform Knowledge Baseline  
**Versão:** 1.0.0  
**Princípio:** CONSOLIDATE BEFORE EVOLVE  
**Gerado:** 2026-07-20

---

## Definição

Baseline Oficial de Conhecimento da Plataforma IMPETUS — fonte única de verdade consolidada a partir de programas certificados e auditorias concluídas.

**Esta fase NÃO:**
- implementa funcionalidades
- altera código de negócio
- executa novas auditorias extensivas
- cria engines, runtimes ou adapters

---

## Programas fonte (23)

BASELINE-SYSTEM · ARC · NAV · EOX · WMS-REF-001 · OPM-001D→008 · OPM-E2E · OPM-GOV · CPL-001→003 · FIN-AUD-001 · REG-001 · REG-002

---

## Artefactos canónicos

| Camada | Path |
|--------|------|
| Knowledge API | `frontend/src/platform/knowledge/` |
| Documentação | `frontend/docs/platform-baseline/` |
| Testes | `npm run test:ent001` |

---

## Inventário consolidado

| Dimensão | Count | Módulo |
|----------|-------|--------|
| Domínios | 20 | ent001DomainCatalog.js |
| Módulos | 33 | ent001ModuleCatalog.js |
| Runtimes | 27 | ent001RuntimeCatalog.js |
| Capacidades cognitivas | 54 | ent001CognitiveCatalog.js |
| Integrações | 35 | ent001IntegrationCatalog.js |
| Fases OPM certificadas | 11 | ent001OperationalCatalog.js |

---

## Matriz cross-domain

Cada domínio possui entrada em `ENT_CROSS_DOMAIN_MATRIX` com contagens de módulos, runtimes, cognitive e integrações.

---

## Heatmap

Ver `ENT-001-PLATFORM-HEATMAP.md`. Resumo:

- 1 certified · 7 mature · 5 partial · 4 discovered · 3 not_started

---

## Critérios de encerramento ENT-001

| Critério | Estado |
|----------|--------|
| Catálogo único de domínios | ✓ |
| Catálogo único de módulos | ✓ |
| Catálogo cognitivo consolidado | ✓ |
| Mapa runtimes + integrações | ✓ |
| Heatmap corporativo | ✓ |
| Baseline oficial | ✓ |
| Candidatos evolução priorizados | ✓ |
| Integridade validada (`validateEnt001Integrity`) | ✓ |

---

## Fluxo obrigatório pós ENT-001

```
Discover → Audit → Recover → Consolidate → Baseline → Only Then → Evolve
```

Próximo passo recomendado: **reunião de arquitectura** com base em `ENT-001-EVOLUTION-CANDIDATES.md`.

---

## API

```javascript
import { getBaseline, validateEnt001Integrity } from '../src/platform/knowledge/index.js';

const baseline = getBaseline();
const integrity = validateEnt001Integrity(); // { valid: true, ... }
```
