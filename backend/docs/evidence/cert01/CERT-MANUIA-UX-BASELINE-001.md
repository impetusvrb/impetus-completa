# CERT-MANUIA-UX-BASELINE-001 — Congelamento da UX ManuIA

**Data:** 2026-07-01  
**Tipo:** Governança / documentação (sem alteração de código funcional)

---

## Entregáveis

| Artefacto | Caminho |
|---|---|
| Baseline oficial | `frontend/docs/MANUIA_UX_BASELINE.md` |
| Regra Cursor (escopo ManuIA) | `.cursor/rules/manuia-ux-baseline.mdc` |

---

## Baseline congelada

Hierarquia aprovada documentada na secção 3 de `MANUIA_UX_BASELINE.md`, correspondente ao estado pós UX-MANUIA-002B:

- Cognitive Core compacto (Layout)
- Cabeçalho → Centro de Ação → Runtime → Ferramentas (nav única) → Conteúdo → Resultados → Atalhos
- Mobile: lista vertical (`manuia-tools-stack`) — render condicional
- Desktop: tabs horizontais (`manuia-tabs`)

---

## Escopo do congelamento

- **Inclui:** rotas e componentes exclusivos ManuIA
- **Exclui:** Dashboard, Centro de Comando, Qualidade, SST, Ambiental, Logística, Administração, Chat e demais módulos

---

## Critério de aceite

Alterações estruturais na UX ManuIA passam a exigir revisão específica e atualização da baseline antes de merge.

---

## Deploy

Nenhum build necessário — apenas documentação e regra de projeto.
