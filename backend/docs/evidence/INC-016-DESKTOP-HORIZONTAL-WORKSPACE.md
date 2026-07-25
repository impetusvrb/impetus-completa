# INC-016 — DESKTOP HORIZONTAL WORKSPACE EXPANSION

**Data:** 2026-07-15  
**Tipo:** redução conservadora de gutter lateral (desktop, Centro de Comando)

---

## Fase 0 — Auditoria de largura (pré-edição)

### Cadeia de acumulação horizontal (desktop)

| Ancestor | padding-inline | max-width | Notas |
|---|---|---|---|
| `.sidebar` | — | ~230px | **inalterado** |
| `.main-content` | 0 | 100% | flex |
| `.content` | **32px** | 100% | shell principal |
| `.cc.cc--premium` | **20px** (1.25rem) | **1680px** | centro auto |
| `.cc-cognitive-continuity-row` | 12px (0.75rem) | — | INC-015 |
| `.live-intelligent-dashboard` | **24px** (1.5rem) | **1200px** | painel vivo centrado |

**NESTED_HORIZONTAL_PADDING_FOUND = YES**

**ACCUMULATED_HORIZONTAL_INSET_BEFORE_PX ≈ 52px/lado**  
(content 32 + cc 20; continuidade +12 local; live +24 + max-width 1200)

### Reporte forense

| Campo | Valor |
|---|---|
| **PRIMARY_WIDTH_CONSTRAINT** | Acumulação `.content` + `.cc` + `max-width` em `.cc` e `.live-intelligent-dashboard` |
| **PRIMARY_GUTTER_OWNER** | `.content` (shell) + `.cc` (dashboard) |
| **SURFACES_WITH_DIFFERENT_WIDTH_CONSTRAINTS** | `.live-intelligent-dashboard` (1200px) vs `.cc` (1680px) |

---

## Implementação (mínima estrutural)

| Ficheiro | Alteração desktop ≥1024px |
|---|---|
| `Layout.css` | `.content:has(.cc--premium) { padding-inline: 10px; }` |
| `CentroComando.css` | `.cc.cc--premium { padding-inline: 0; max-width: none; }` |
| `CentroComando.css` | `.cc .live-intelligent-dashboard { max-width: none; padding-inline: 0; }` |

**Não alterado:** sidebar, cards internos, grids, INC-014/015 vertical, mobile/tablet (regras `.cc` base mantidas fora do media desktop).

---

## Métricas probe (1366×768 simulado, sidebar 230px)

| Métrica | Antes | Depois |
|---|---|---|
| Gutter efectivo (esq/dir) | ~52px | **~10px** |
| Largura Cognitive Core | 1032px | **1116px (+84px)** |
| Largura grid operacional | 1032px | **1116px (+84px)** |
| Overflow horizontal | não | **não** |

**TOTAL_HORIZONTAL_SPACE_RECOVERED_PX ≈ 84**

Script: `frontend/scripts/inc016-width-probe.mjs`  
Screenshots: `frontend/tmp/inc016-screenshots/`

---

## Relatório final

```
INC014_BASELINE_PRESERVED = YES
INC015_BASELINE_PRESERVED = YES

PRIMARY_WIDTH_CONSTRAINT = .content + .cc + live-dash max-width
PRIMARY_GUTTER_OWNER = .content (10px) — gutter estrutural único

NESTED_HORIZONTAL_PADDING_FOUND = YES (before)
EFFECTIVE_LEFT/RIGHT_GUTTER_AFTER ≈ 10px

SIDEBAR_GEOMETRY_CHANGED = NO
OMNIPRESENCE_SCROLL_BEHAVIOR_CHANGED = NO

COGNITIVE_CORE_PRESERVED = YES
CONSCIENCIA_TOTAL_PRESERVED = YES
OMNIPRESENCE_PRESERVED = YES
UPDATE_HANDLER_PRESERVED = YES
OPERATIONAL_DASHBOARD_PRESERVED = YES
BOTTOM_COGNITIVE_ECOSYSTEM_PRESERVED = YES
MOBILE_BASELINE_PRESERVED = YES
```

---

## Próxima INC (separada)

Persistência de scroll da Onipresença (mecanismo histórico whispers/fixed).
