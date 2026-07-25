# OPM-001A — Component Library

**Entrega:** OPM-001A  
**Data:** 2026-07-19

---

## Biblioteca `presentation/industrial-module`

| Componente | Ficheiro | Responsabilidade |
|------------|----------|------------------|
| `IndustrialModuleLayout` | `IndustrialModuleLayout.jsx` | Composição vertical canónica (slots) |
| `IndustrialModuleHeader` | `IndustrialModuleHeader.jsx` | Título, badge, contexto, descrição |
| `IndustrialKpiPanel` | `IndustrialKpiPanel.jsx` | Grid responsivo 4/6/8 KPI cards |
| `IndustrialToolbar` | `IndustrialToolbar.jsx` | Acções configuráveis por módulo |
| `IndustrialSearchBar` | `IndustrialSearchBar.jsx` | Slot pesquisa (disabled até OPM-001+) |
| `IndustrialFilterBar` | `IndustrialFilterBar.jsx` | Slot filtros (placeholder) |
| `IndustrialDataGrid` | `IndustrialDataGrid.jsx` | Tabela com sort local + paginação |
| `IndustrialDetailsPanel` | `IndustrialDetailsPanel.jsx` | Painel lateral com tabs reservadas |
| `IndustrialTimeline` | `IndustrialTimeline.jsx` | Timeline operacional reutilizável |
| `IndustrialAlertPanel` | `IndustrialAlertPanel.jsx` | Slot alertas cognitivos (sem IA) |
| `IndustrialInsightPanel` | `IndustrialInsightPanel.jsx` | Slot insights (sem IA) |
| `IndustrialActionBar` | `IndustrialActionBar.jsx` | Barra de acções desactivável |
| `IndustrialModuleStateView` | `IndustrialModuleStates.jsx` | Banner de estado industrial |
| `IndustrialOperationalModule` | `IndustrialOperationalModule.jsx` | Adaptador listagem genérico |

---

## Tokens partilhados (`industrialModuleTokens.js`)

- `INDUSTRIAL_MODULE_PHASE` = `OPM-001A`
- `TOOLBAR_ACTIONS`: search, refresh, export, filters, columns, preferences, history, help, ai
- `MODULE_STATES`: 11 estados operacionais
- `mono`: estilo Share Tech Mono partilhado

---

## Import canónico

```javascript
import {
  IndustrialModuleLayout,
  IndustrialOperationalModule,
  MODULE_STATES,
  TOOLBAR_ACTIONS
} from '../../presentation/industrial-module';
```

---

## Regras da biblioteca

1. **Zero dependência de domínio** — nenhum componente referencia Warehouse, Inventory, etc.
2. **Design System Industrial 4.0** — tokens CSS, Rajdhani + Share Tech Mono, `border-radius` ≤ 8px.
3. **Aditivo** — componentes novos; código certificado WMS-007A adaptado, não removido.
4. **Slots desactivados** — pesquisa, filtros avançados, export, IA = placeholders até OPM-001+.

---

## CSS (`industrial-module.css`)

- Grid KPI responsivo com container queries
- Breakpoints: desktop, notebook (~768px), tablet industrial (~480px)
- Hover grid cyan sutil alinhado a `--chart-grid` / `--cyan`
