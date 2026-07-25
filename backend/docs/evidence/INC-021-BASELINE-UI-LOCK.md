# INC-021 — Baseline UI v1.0 Lock + polimento final

**Data:** 2026-07-15  
**Tipo:** congelamento documental + microanimações cosméticas

---

## Etapa 1 — Baseline congelado

```
BASELINE_LOCKED = YES
```

Documento canónico: [`BASELINE-UI-v1.0.md`](BASELINE-UI-v1.0.md)

INCs incorporadas: INC-014 → INC-020

---

## Etapa 2 — Microanimação whisper persistente

| Propriedade | Valor |
|---|---|
| opacity | 0 → 1 |
| translateY | -6px → 0 |
| duração | 160ms |
| curva | ease-out |
| scope | `.cog-whispers--persist-enter` (entrada ao pin) |

Linha inline **inalterada**.

---

## Etapa 3 — Transição entre pensamentos

| Fase | Duração |
|---|---|
| fade out | 95ms + opacity 0 |
| fade in | 120ms (`whisperPersistEnter`) |
| **total** | ~225ms |

Apenas quando `whisperPinned`; inline instantâneo.

---

## Alterações de código

| Ficheiro | Tipo |
|---|---|
| `BASELINE-UI-v1.0.md` | documentação lock |
| `CentroComando.css` | `@keyframes whisperPersistEnter`, classes msg-out/in |
| `CognitiveOmniPresence.jsx` | estado cosmético persistEnter + msgPhase |

**Não alterado:** hooks arbitragem, scroll, layout, fetch, cores INC-018.

---

## Validação

```
INC014–020_PRESERVED = YES
LAYOUT_CHANGED = NO
ARCHITECTURE_CHANGED = NO
HOOKS_ARBITRATION_UNCHANGED = YES
inc020-interaction-probe = PASS
inc017-scroll-probe = PASS
```

---

## Critérios de conclusão

```
BASELINE_LOCKED = YES
WHISPER_ANIMATION = PASS
MESSAGE_TRANSITION = PASS
MOBILE_BASELINE_PRESERVED = YES
```
