# INC-019 — Arbitragem de foco entre whisper persistente e conteúdo

**Data:** 2026-07-15  
**Tipo:** convivência visual whisper × cards (sem alterar INC-017/018)

---

## Forense de stacking

| Campo | Valor |
|---|---|
| **WHISPER_STACKING_CONTEXT** | `.cc-cognitive-continuity-row` → filho de `.cc--premium > *` (`z-index: 1`) |
| **CARD_STACKING_CONTEXTS** | `.live-intelligent-dashboard`, `.cc__body` — irmãos `.cc--premium > *` também `z-index: 1` |
| **WHISPER_PERSIST_Z_INDEX** | `4` (dentro do contexto da linha) |
| **ROOT_CAUSE_OF_SUBOCCLUSION** | Irmãos posteriores no DOM com mesmo `z-index: 1` pintam por cima do contexto da linha de continuidade |
| **CORREÇÃO FOREGROUND** | `.cc-cognitive-continuity-row:has(.cog-whispers--scroll-persist) { z-index: 3 }` |

---

## Arbitragem

| Campo | Valor |
|---|---|
| **ARBITRATION_MECHANISM** | `useWhisperFocusArbitration` + classes CSS `cog-whispers--focus-yielding` |
| **INTERSECTION_CHECK** | `getBoundingClientRect()` em eventos (pointer/focus/scroll) |
| **EVENT_DELEGATION** | YES — `.cc.cc--premium` |
| **KEYBOARD_FOCUS_SUPPORTED** | YES — `focusin` capture |

### Estados

| Estado | Condição |
|---|---|
| `inline` | scroll 0% (não pinned) |
| `foreground` | pinned, sem conflito ou card distante |
| `yielding` | pinned + interacção em superfície intersectante |

---

## Pointer policy

```
WHISPER_INTERACTIVE = NO
POINTER_EVENTS_POLICY = none no container persist (INC-017) — clique atravessa
```

---

## Yielding visual

| Tier | Opacity yielding |
|---|---|
| normal / warning | ~0.14 |
| critical | ~0.38 (não totalmente invisível) |

**FOCUS_CHANGES_SEVERITY = NO**  
**SCROLL_CHANGES_SEVERITY = NO**

Transição: `opacity/filter 180ms`

---

## Integridade

```
INC014–018_BASELINES = PRESERVED
INC017_SCROLL_MECHANICS = UNCHANGED
EXTRA_FETCH = NO | POLLING = NO | TIMERS = NO
```

---

## Ficheiros

| Ficheiro | Papel |
|---|---|
| `whisperFocusUtils.js` | intersecção + selector superfícies |
| `useWhisperFocusArbitration.js` | hook foreground/yielding |
| `CognitiveOmniPresence.jsx` | integração + `data-whisper-focus-mode` |
| `CentroComando.css` | stacking fix + yielding visual |

Probe: `frontend/scripts/inc019-focus-probe.mjs`
