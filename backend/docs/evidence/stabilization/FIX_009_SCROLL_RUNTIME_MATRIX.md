# FIX-009 — Scroll Runtime Matrix

**Data:** 2026-07-13  
**Método:** Playwright + fixture DOM (CSS real Layout, CentroComando, cognitiveEcosystem, ImpetusVoiceOverlay, SmartPanel)  
**Script:** `frontend/scripts/fix009-scroll-probe.mjs`

---

## Cenários

| Cenário | Descrição |
|---------|-----------|
| **centro** | Centro de Comando com Cognitive Presence + grid + rail sticky |
| **overlay** | ImpetusVoiceOverlay + SmartPanel `voiceOnly` + conteúdo longo |

---

## Matriz por viewport

| Viewport | Cenário | Scroll owners detectados | Barras visíveis | Wheel fora painel | Wheel no painel | Wheel no rail | Nested trap | Double scroll página |
|----------|---------|--------------------------|-----------------|-------------------|-----------------|---------------|-------------|----------------------|
| **1366×768** | centro | page + rail | 2 | `page-scroll` ✅ | n/a | `rail-scroll` ✅ | 0 | 0 |
| **1366×768** | overlay | panel only | 1 | nenhum ✅ | `panel-scroll` ✅ | n/a | 0 | 0 |
| **1440×900** | centro | page + rail | 2 | `page-scroll` ✅ | n/a | `rail-scroll` ✅ | 0 | 0 |
| **1440×900** | overlay | panel only | 1 | nenhum ✅ | `panel-scroll` ✅ | n/a | 0 | 0 |
| **1920×1080** | centro | page + rail | 2 | `page-scroll` ✅ | n/a | `rail-scroll` ✅ | 0 | 0 |
| **1920×1080** | overlay | panel only | 1 | nenhum ✅ | `panel-scroll` ✅ | n/a | 0 | 0 |
| **360×800** | centro | page only | 1 | n/a* | n/a | page** | 0 | 0 |
| **360×800** | overlay | panel only | 1 | nenhum ✅ | `panel-scroll` ✅ | n/a | 0 | 0 |
| **390×844** | centro | page only | 1 | n/a* | n/a | page** | 0 | 0 |
| **390×844** | overlay | panel only | 1 | nenhum ✅ | `panel-scroll` ✅ | n/a | 0 | 0 |

\* Mobile centro: layout single-column; probe wheel em `#page-scroll` sem delta no fixture (conteúdo cabe parcialmente) — **1 único owner** detectado, sem segunda barra concorrente.  
\** Rail colapsa em fluxo mobile; scroll unificado na página.

---

## Interação teclado (1366×768 overlay)

| Tecla | Resultado |
|-------|-----------|
| PageDown | Funcional no contexto do painel |
| Home | Reposiciona scroll |
| End | Aproxima fundo do painel |

```text
SCROLL_ESCAPE_FROM_PANEL = NOT_APPLICABLE
```

No overlay modal não há page scroll por trás; `overscroll-behavior: contain` no stage impede chain para ancestrais `overflow:hidden`.

---

## Critérios

```text
BUTTON_OVERLAY_COLLISION = N/A (FIX-007 preservado, CSS não alterado)
DOUBLE_SCROLL_REGRESSION = 0
NESTED_SCROLL_TRAP = 0
FIXED_HEIGHT_CLIPPING = 0
UNREACHABLE_CONTENT = 0
WHEEL_CAPTURE_REGRESSION = 0
MOBILE_SCROLL_REGRESSION = 0
```

---

## Storage observation

```
DISK_USAGE ≈ 95%
DISK_AVAILABLE ≈ 5.4G
DISK_VARIATION_EXPLAINED = PARTIAL (oscilação 6.3G→5.4G documentada; sem cleanup)
```

---

*Probe artefacts: `FIX_009_probe_centro_*x*.html`, `FIX_009_probe_overlay_*x*.html` em `backend/docs/evidence/stabilization/`.*
