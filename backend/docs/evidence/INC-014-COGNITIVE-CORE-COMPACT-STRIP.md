# INC-014 — COGNITIVE CORE COMPACT SINGLE-STRIP REFINEMENT

**Data:** 2026-07-15  
**Tipo:** compactação visual apenas (desktop)

---

## Ficheiros alterados

| Ficheiro | Mudança |
|---|---|
| `CognitiveGlobalStrip.jsx` | `DesktopCompactSingleStrip` + variant `desktop-top-exposed` |
| `cognitivePresence.css` | Estilos `.cog-core-rail*` (faixa única) |
| `CentroComando.css` | Remoção regras obsoletas INC-013R two-row |

**Não alterado:** mobile, OmniPresence, bottom ecosystem, semantics openAwareness.

---

## Fase 0 — Análise CONF / SYNC / AWARE

| Indicador | Classificação | Motivo |
|---|---|---|
| CONF | **DUPLICATE** | `confidence_level` / `awareness_level_pct` — redundante vs células de motor |
| SYNC | **DUPLICATE** | Mesmo valor que motor `Operational Sync` |
| AWARE | **DUPLICATE** | `awareness_level_pct` vs motor `Organizational Awareness` |

Removidos da faixa desktop compacta (não renderizados em `DesktopCompactSingleStrip`).

---

## Layout alvo

```
● IMPETUS COGNITIVE CORE · PRESENÇA ATIVA | Core/PRESENCE | Behavior/… | … | [Brain icon]
ONIPRESENÇA COGNITIVA
Operação em tempo real · IA & orquestração
```

- **Uma** faixa horizontal (`cog-core-rail`)
- **Sem** `EngineStatusPanel` / segunda linha
- **Consciência Total:** ícone `Brain` (lucide-react, já usado em `Layout.jsx`, `WidgetInsightsIA.jsx`)
- `aria-label="Consciência Total"` + `title` preservados
- `openAwareness` → `OrganizationalAwarenessMode` inalterado

---

## Altura

| Métrica | Valor (probe Playwright 1366×768) |
|---|---|
| Anterior (INC-013R two-row) | ~107px |
| Nova (single-row) | ~45–56px |
| Redução | ~58% (eliminação da 2ª linha estrutural) |

Faixa single-line compacta; padding `0.48rem` vertical — sem `fixed-height`, sem `scale`, sem `overflow:hidden`.

---

## Validação browser

Script: `frontend/scripts/inc014-visual-probe.mjs`  
Screenshots: `frontend/tmp/inc014-screenshots/`

---

## Relatório final

```
INC013R_BASELINE_PRESERVED = YES
COGNITIVE_CORE_LAYOUT = SINGLE_COMPACT_BAND
PREVIOUS_STRIP_HEIGHT_PX = 107
NEW_STRIP_HEIGHT_PX = ~45-56 (fixture); produção pode variar com fontes

SEPARATE_ENGINE_ROW_REMOVED = YES
CONSCIENCIA_TOTAL_PRESENTATION = ICON_ONLY
CONSCIENCIA_TOTAL_SEMANTICS_PRESERVED = YES
CONSCIENCIA_TOTAL_CLICK_TEST = PASS
ICON_SOURCE = EXISTING_ICON_LIBRARY (lucide-react Brain)

CONF_INDICATOR = DUPLICATE (removed desktop)
SYNC_INDICATOR = DUPLICATE (removed desktop)
AWARE_INDICATOR = DUPLICATE (removed desktop)

OMNIPRESENCE_POSITION = UNCHANGED
OMNIPRESENCE_SCROLL_BEHAVIOR_CHANGED = NO
OPERATIONAL_DASHBOARD_PRESERVED = YES
BOTTOM_COGNITIVE_ECOSYSTEM_PRESERVED = YES
MOBILE_BASELINE_PRESERVED = YES
VERTICAL_TEXT_REGRESSION = NO
HORIZONTAL_OVERFLOW = NO
CLIPPED_ENGINE_STATE = NO
BROWSER_SCREENSHOTS_CAPTURED = YES
```
