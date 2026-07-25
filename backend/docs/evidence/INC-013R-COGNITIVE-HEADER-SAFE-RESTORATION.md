# INC-013R — REVERT FAILED TOP-LAYER + SAFE COGNITIVE HEADER

**Data:** 2026-07-15  
**Status:** CONCLUÍDO

---

## Fase 0 — Revert INC-013

| Item | Resultado |
|---|---|
| INC-013 no workspace | **Já ausente** (sem `CognitiveContinuityLayer`, sem `.cc-top-cognitive-layer`, sem `desktop-always-exposed`) |
| INC-012 baseline | **Preservado** — strip no topo antes de `LiveDashboardUnifiedPanel` |
| Revert adicional necessário | **NÃO** — estado pré-INC-013 já activo |

---

## Root cause INC-013 (evitar recriar)

- Wrapper sticky partilhado (`.cc-top-cognitive-layer`) agrupando Core + OmniPresence
- Novo layout `DesktopAlwaysExposedStrip` com flex/grid incompatível → texto vertical / região vazia
- Grid 50/50 vazio para componente direito UNCONFIRMED

---

## Implementação INC-013R (mínima)

### Alterações

| Ficheiro | Mudança |
|---|---|
| `CognitiveGlobalStrip.jsx` | `alwaysExposeEngines` em `DesktopSummaryStrip`; variant `desktop-top-exposed` |
| `CognitiveDesktopStripSlot.jsx` | Usa `desktop-top-exposed` |
| `CognitivePresenceShell.jsx` | `suppressOmniPresence` (CentroComando) |
| `CentroComando.jsx` | `<CognitiveOmniPresence />` como **sibling** entre core e painel vivo |
| `CentroComando.css` | Consciência Total à direita; **sem sticky** |

### Composição correcta

```
cc-top-cognitive-presence     [normal flow]
  └── CognitiveDesktopStripSlot (motores sempre visíveis, sem toggle)

CognitiveOmniPresence         [normal flow, sibling independente]

LiveDashboardUnifiedPanel
… dashboard operacional …
CognitiveCollapsibleSection   [bottom — INC-012]
```

**NÃO implementado nesta INC:** sticky/fixed scroll persistence (trace read-only abaixo).

---

## Fase 5 — Trace read-only (persistência histórica)

| Campo | Evidência (`88ccfd9e2`) |
|---|---|
| **CORE_HISTORICAL_POSITIONING** | `.cog-global-strip { position: sticky; top: 0 }` — **só o strip**, não wrapper partilhado |
| **OMNIPRESENCE_CONTAINER_POSITIONING** | `.cog-omnipresence-zone` / `.cog-whispers` — **sem sticky no container** |
| **WHISPERS_POSITIONING** | `.cog-whispers { position: fixed; top: 4.5rem; right: 1.25rem }` — elemento interno |
| **SCROLL_CONTAINER** | `.cog-presence-content` / `#page-scroll` (Layout) |
| **STICKY_CONTAINING_BLOCK** | Viewport / ancestor scroll — **não comprovado wrapper único Core+Omni** |

**RIGHT_AWARENESS_COMPONENT** = UNCONFIRMED

---

## Validação browser (Playwright)

Script: `frontend/scripts/inc013r-visual-probe.mjs`  
Screenshots: `frontend/tmp/inc013r-screenshots/`

```
stripHeight: ~107px (sem região vazia gigante)
verticalChipCount: 0
hasStickyWrapper: false
corePosition: relative
omniPosition: relative
omniBeforeLive: true
```

---

## Relatório final

```
INC013_FAILED_CHANGES_REVERTED = YES
INC012_BASELINE_PRESERVED = YES

TOP_CORE_POSITION = NORMAL_FLOW
TOP_CORE_HORIZONTAL = YES
TOP_CORE_ALWAYS_EXPOSED = YES
TOP_DETAILS_TOGGLE_VISIBLE = NO (desktop topo)
CONSCIENCIA_TOTAL_AVAILABLE = YES

OMNIPRESENCE_POSITION = NORMAL_FLOW
OMNIPRESENCE_VISUALLY_RESTORED = YES
OMNIPRESENCE_SCROLL_PERSISTENCE_IMPLEMENTED = NO

RIGHT_AWARENESS_COMPONENT = UNCONFIRMED

GIANT_EMPTY_REGION = NO
VERTICAL_TEXT_REGRESSION = NO
OPERATIONAL_DASHBOARD_PRESERVED = YES
BOTTOM_COGNITIVE_ECOSYSTEM = PRESERVED

BROWSER_SCREENSHOTS_CAPTURED = YES
```

---

## Próxima INC (separada)

Restaurar persistência de scroll **apenas** do mecanismo histórico comprovado (provavelmente `.cog-whispers { position: fixed }` interno, **não** wrapper Core+Omni).
