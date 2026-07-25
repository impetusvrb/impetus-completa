# INC-020 — Correção da interacção real do whisper

**Data:** 2026-07-15  
**Tipo:** event routing + hit testing + estados dismissed/yielding

---

## Causa raiz

| Problema | Causa |
|---|---|
| **CLICK_WHISPER_TO_HIDE = FAIL** | `pointer-events: none` no container persist — whisper não recebia eventos |
| **CLICK_CARD_TO_YIELD = FAIL** | `resolveWhisperFocusSurface` não incluía classes reais do live dashboard (`.live-dash-dynamic-card`, etc.) — `closest()` devolvia `null` |

**PROPAGATION_RACE_FOUND = YES (INC-019)** — handler `document` + `root` concorrentes; corrigido para **ONE_ARBITRATION_EVENT_PATH**.

---

## Política de eventos

```
PRIMARY_ARBITRATION_EVENT = pointerdown (capture, único handler em .cc.cc--premium)
WHISPER_POINTER_EVENTS = auto no .cog-whispers__item (foreground)
CONTAINER_POINTER_EVENTS = none (cliques passam excepto no item)
ONE_ARBITRATION_EVENT_PATH = YES
```

### Máquina de estados

| Estado | Trigger |
|---|---|
| `inline` | scroll 0% |
| `foreground` | default persist / clique neutro / card não intersectante |
| `yielding` | clique em superfície cujo rect intersecta whisper |
| `dismissed` | clique directo no whisper |

**Restauração dismissed:** clique neutro → `foreground`; nova mensagem (`messageKey`) → `foreground`; return top (unpin) → reset via `enabled=false`.

---

## Superfícies analíticas

- Selectors expandidos + walk-up ancestral
- `data-whisper-focus-surface` em: `LiveDashboardUnifiedPanel` (timebar, summary, dynamic cards, …), `CentroComando` (`cc__cell`)

---

## CSS yielding/dismissed

```
opacity: 0; visibility: hidden; pointer-events: none
```

Severity INC-018 **inalterada**.

---

## Integridade

```
INC014–019 = PRESERVED
EXTRA_FETCH/TIMER/POLLING = NO
MOBILE = unchanged
```

Probe: `frontend/scripts/inc020-interaction-probe.mjs`
