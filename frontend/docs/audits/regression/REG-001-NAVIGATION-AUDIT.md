# REG-001 — Navigation Audit

**Programa:** REG-001 — Enterprise Regression Audit & Functional Recovery  
**Fonte:** `frontend/src/platform/audit/regression/reg001NavigationAudit.js`  
**Princípio:** REACTIVATE BEFORE REWRITE

---

## Objectivo

Auditar itens clicáveis da plataforma: aparecem na UI? rota registada? montada? componente carrega? HTTP 200? render OK?

---

## Matriz de navegação (suspeitos + padrões)

| Menu / Click | Aparece | Rota | Montada | Componente | HTTP | Status |
|--------------|---------|------|---------|------------|------|--------|
| Mapa de Vazamento | ✅ | `/app/mapa-vazamento-financeiro` | ✅ React | ✅ | ❌ 404 API | broken_data_layer |
| Mapa Industrial | ✅ | `/app/centro-operacoes-industrial` | ✅ React | ✅ | ❌ 404 API | broken_data_layer |
| Insights operacionais | ✅ | `/app/insights` | ✅ | ✅ | ✅ | guard_risk |
| Cérebro operacional | ✅ | `/app/cerebro-operacional` | ✅ | ✅ | ✅ | guard_risk |
| CenterWidget leak_map | ✅ | path OK | ✅ | ✅ | ❌ | navigates_then_data_fails |
| CenterWidget industrial_map | ✅ | path OK | ✅ | ✅ | ❌ | navigates_then_data_fails |
| CenterWidget id desconhecido | ✅ | `#` | ❌ | — | — | dead_click |
| KPI `/app/industrial` | via KPI | órfã | ❌ | — | — | orphan_route_reference |

---

## Guard mismatch (crítico)

| Camada | Critério |
|--------|----------|
| **Menu** (`Layout.jsx`) | `visible_modules` tem `operational` **e** `role ∈ {ceo, diretor}` |
| **Rota** (`App.jsx` `canAccessIndustrialCore`) | CEO sempre; diretor só se `director_industrial` / `director_operations` ou área industrial |

**Efeito:** diretor genérico vê Mapa Industrial / Cérebro / Insights → click → `<Navigate to="/app" />` — parece dead click.

---

## Fontes de menu

- `Layout.jsx` — CEO menu + INDUSTRIAL_CORE
- `useVisibleModules.js` — `CEO_STABLE_MENU_PATHS`
- `contextualSidebarBuilder.js` — `losses_map`, paths cerebro
- `CenterWidget.jsx` — ROUTES map
