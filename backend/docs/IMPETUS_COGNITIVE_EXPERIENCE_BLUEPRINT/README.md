# IMPETUS Cognitive Experience Blueprint
## Enterprise Edition · v1.0

**Constituição técnica e experiencial do IMPETUS** — documento de referência para desenvolvimento, auditoria (IECP/CERT), produto e evolução enterprise.

> Este blueprint **não substitui** o código. Ele **normatiza, explica e rastreia** o que existe (`AB`), o que deve existir (`N`) e o que está no roadmap (`R`).

---

## Hierarquia documental

| Prioridade | Documento | Função |
|------------|-----------|--------|
| 1 | **Este Blueprint (ICEB)** | Constituição cognitiva + UX + motores + cargos |
| 2 | `FUNCTIONAL_MATRIX.md` | Fonte única tela → API → mount (geração automática) |
| 3 | `IMPETUS_MANUAL_MASTER_…md` | Implantação, suporte, operação |
| 4 | `.cursor/rules/*` | Regras de implementação (DS, charts, freeze) |

Em caso de conflito: **código em produção** prevalece até o blueprint ser actualizado com evidência `AB` ou decisão `N` aprovada.

---

## Os 10 volumes (+ Volume 0)

| Vol. | Título | Ficheiro | Estado |
|------|--------|----------|--------|
| **0** | Carta Magna | [Volume-00-CARTA-MAGNA.md](./Volume-00-CARTA-MAGNA.md) | **v1.0 rascunho** |
| **I** | Arquitetura Cognitiva Global | [Volume-01-ARQUITETURA-COGNITIVA-GLOBAL.md](./Volume-01-ARQUITETURA-COGNITIVA-GLOBAL.md) | esqueleto + inventário T1 |
| **II** | Dashboard Vivo | [Volume-02-DASHBOARD-VIVO.md](./Volume-02-DASHBOARD-VIVO.md) | **v1.0 rascunho** |
| **III** | Arquitetura por Cargo | [Volume-03-ARQUITETURA-POR-CARGO.md](./Volume-03-ARQUITETURA-POR-CARGO.md) | esqueleto + personas |
| **IV** | Catálogo de Motores | [Volume-04-CATALOGO-MOTORES.md](./Volume-04-CATALOGO-MOTORES.md) | inventário inicial |
| **V** | Experiência do Utilizador | [Volume-05-EXPERIENCIA-USUARIO.md](./Volume-05-EXPERIENCIA-USUARIO.md) | **v1.0 rascunho** |
| **VI** | Integração entre Módulos | [Volume-06-INTEGRACAO-MODULOS.md](./Volume-06-INTEGRACAO-MODULOS.md) | **v1.0 rascunho** |
| **VII** | Todos os Dashboards | [Volume-07-TODOS-DASHBOARDS.md](./Volume-07-TODOS-DASHBOARDS.md) | **v1.0 rascunho** |
| **VIII** | Todas as Telas | [Volume-08-TODAS-TELAS.md](./Volume-08-TODAS-TELAS.md) | índice + ligação à matriz |
| **IX** | Arquitetura da IA | [Volume-09-ARQUITETURA-IA.md](./Volume-09-ARQUITETURA-IA.md) | **v1.0 rascunho** |
| **X** | Roadmap Enterprise | [Volume-10-ROADMAP-ENTERPRISE.md](./Volume-10-ROADMAP-ENTERPRISE.md) | rascunho |

---

## Classificação obrigatória (IECP)

Em **cada** secção de especificação:

| Sigla | Significado | Uso |
|-------|-------------|-----|
| **AB** | As-Built | Implementado; exige evidência (ficheiro, rota, tabela) |
| **N** | Normativo | Comportamento alvo enterprise (pode divergir do código actual) |
| **R** | Roadmap | Planeado; não documentar como existente |

**VERDE (certificação):** secção crítica só é `AB` com 6 evidências (visual, API, BD, log, tenant, operacional).

---

## Templates

| Template | Ficheiro |
|----------|----------|
| Motor / engine | [templates/TEMPLATE-MOTOR.md](./templates/TEMPLATE-MOTOR.md) |
| Módulo contextual | [templates/TEMPLATE-MODULO.md](./templates/TEMPLATE-MODULO.md) |
| Tela | [templates/TEMPLATE-TELA.md](./templates/TEMPLATE-TELA.md) |
| Cargo / persona | [templates/TEMPLATE-CARGO.md](./templates/TEMPLATE-CARGO.md) |

---

## Inventário automático

| Artefacto | Origem |
|-----------|--------|
| [INVENTORY.md](./INVENTORY.md) | `node backend/scripts/audit/buildBlueprintInventory.js` |
| Telas/endpoints | `node backend/scripts/audit/buildFunctionalMatrix.js` → `FUNCTIONAL_MATRIX.md` |
| **1060 fichas ICEB** | [ICEB_ETAPAS_INDEX.md](./ICEB_ETAPAS_INDEX.md) · `buildBlueprintEtapas.js` |

Regenerar após alterações estruturais:

```bash
cd backend
node scripts/audit/buildFunctionalMatrix.js
node scripts/audit/buildBlueprintInventory.js
node scripts/audit/buildBlueprintEtapas.js
```

---

## Metodologia de redacção

1. **Fase A — Inventário** (automático + revisão humana)
2. **Fase B — Redacção** (1 volume/semana, paralelizável)
3. **Fase C — Verificação** (scripts audit + testes domain/contextual)

**Meta de extensão:** 120–180 páginas equivalentes A4 (todos os volumes).

---

## Congelamento arquitectural

Durante CERT / freeze: permitido **documentar** (`CERT`). Alterações de código seguem `FIX` / `CERT` / `SEC` / `OPS` apenas.

---

*IMPETUS · ICEB v1.0 · Início: 2026-06-27*
