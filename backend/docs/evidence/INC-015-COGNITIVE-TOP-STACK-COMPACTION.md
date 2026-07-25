# INC-015 — COGNITIVE TOP STACK SPATIAL COMPACTION

**Data:** 2026-07-15  
**Tipo:** compactação espacial (desktop) — sem sticky, sem duplicação de handlers

---

## Fase 0 — Trace

| Campo | Valor |
|---|---|
| **COGNITIVE_CORE_WRAPPER** | `.cc-top-cognitive-presence` |
| **OMNIPRESENCE_COMPONENT** | `CognitiveOmniPresence` |
| **OMNIPRESENCE_MESSAGE_ELEMENT** | `.cog-whispers__item` (runtime whispers / consciousness phrase) |
| **UPDATE_BUTTON_OWNER** | `LiveDashboardUnifiedPanel` (`loadLive`) |
| **CURRENT_DOM_ORDER** | Core → ContinuityRow(Omni + refresh slot) → LiveDashboardUnifiedPanel |

---

## Implementação

| Ficheiro | Mudança |
|---|---|
| `CentroComando.jsx` | `.cc-cognitive-continuity-row` (desktop); portal mount ref |
| `LiveDashboardUnifiedPanel.jsx` | `execContinuityLayout` + `createPortal` do botão Atualizar |
| `CentroComando.css` | Grid horizontal; core `-0.625rem` top; painel vivo `padding-top: 0` |

**Sem:** novo handler refresh, sticky, alteração INC-014 core, alteração mobile (Atualizar permanece no header).

---

## Layout alvo

```
[ Cognitive Core compact rail ]

ONIPRESENÇA COGNITIVA | live message… | [↻ Atualizar]

Operação em tempo real · IA & orquestração
```

Grid: `auto | minmax(0,1fr) | auto` via `display: contents` nos filhos de OmniPresence.

---

## Métricas (probe Playwright 1366×768)

| Métrica | Antes | Depois |
|---|---|---|
| Continuity region height | ~51px | ~48px |
| Operational heading top | ~98px | ~82px |
| Heading upward movement | — | **~16px** |
| Duplicate header Atualizar | YES | **NO** |
| Horizontal grid row | NO | **YES** |

Script: `frontend/scripts/inc015-visual-probe.mjs`  
Screenshots: `frontend/tmp/inc015-screenshots/`

---

## Relatório final

```
INC014_BASELINE_PRESERVED = YES
COGNITIVE_CORE_UPWARD_REFINEMENT = YES
CORE_UPWARD_MOVEMENT_PX = ~10 (margin-top -0.625rem desktop)

OMNIPRESENCE_LAYOUT = HORIZONTAL_CONTINUITY_ROW
OMNIPRESENCE_MESSAGE_SOURCE_PRESERVED = YES
OMNIPRESENCE_MESSAGE_DUPLICATED = NO

UPDATE_BUTTON_OWNER = LiveDashboardUnifiedPanel
UPDATE_BUTTON_HANDLER_PRESERVED = YES
UPDATE_BUTTON_DUPLICATED = NO

OPERATIONAL_HEADING_UPWARD_MOVEMENT_PX = ~16
OMNIPRESENCE_SCROLL_BEHAVIOR_CHANGED = NO

COGNITIVE_CORE_STATES_PRESERVED = YES
CONSCIENCIA_TOTAL_PRESERVED = YES
OPERATIONAL_DASHBOARD_PRESERVED = YES
BOTTOM_COGNITIVE_ECOSYSTEM_PRESERVED = YES
MOBILE_BASELINE_PRESERVED = YES
BROWSER_SCREENSHOTS_CAPTURED = YES
```

---

## Próxima INC (separada)

Restaurar persistência de scroll da Onipresença via mecanismo histórico (`.cog-whispers { position: fixed }` interno) — **não** nesta INC.
