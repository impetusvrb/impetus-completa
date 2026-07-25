# INC-017 — Restauração conservadora da persistência da Onipresença no scroll

**Data:** 2026-07-15  
**Tipo:** forense histórica + adaptação mínima comportamental (desktop)

---

## Fase 0 — Baseline congelada

```
INC014_BASELINE = FROZEN
INC015_BASELINE = FROZEN
INC016_BASELINE = FROZEN
```

Confirmado no código actual:

- Cognitive Core compacto (faixa única) intacto
- Linha de continuidade: `ONIPRESENÇA | mensagem | Atualizar`
- Gutter desktop ~10px (INC-016)
- Sem wrapper sticky Core + Omni
- Sem overflow horizontal (probe INC-016)

---

## Fase 1 — Forense histórica

### Commits investigados

| Commit | Data | Relevância |
|---|---|---|
| `88ccfd9e2` | Z22–Z29 cockpits | **Introdução** `.cog-whispers { position: fixed }` |
| `d6b6f5b59` | CERT-01.6 | Viewport tiers; desktop summary static |
| `daf338657` | CERT-03/enterprise | **Remoção desktop fixed** → `position: static` (UI-DESKTOP-005) |
| FIX-007 docs | 2026-07-13 | Evidência colisão Atualizar × whispers fixed |

### Tabela forense

| Questão | Evidência | Resultado |
|---|---|---|
| `.cog-whispers` existiu | `88ccfd9e2` L319–326 `cognitivePresence.css` | **YES** |
| elemento exacto | `.cog-whispers` → `.cog-whispers__item` (texto mensagem) | **mensagem/pensamento** |
| `position: fixed` confirmado | CSS histórico + FIX_007 doc | **YES** |
| posição histórica | `top: 4.5rem; right: 1.25rem` (`.cog-whispers--multi`: `top: 3.25rem`) | **confirmado** |
| z-index histórico | `3` | **confirmado** |
| largura histórica | `max-width: 320px` | **confirmado** |
| pointer-events | `none` | **confirmado** |
| mensagem persistia | fixed = visível durante scroll | **YES** |
| título persistia | `.cog-omnipresence-zone__label` separado; não no fixed | **NO** |
| botão Atualizar persistia | FIX-007: colidia com fixed; não participava | **NO** |
| Core persistia | `.cog-global-strip` separado; static após CERT-01.6 | **NO** |
| scroll threshold | nenhum JS/listener histórico | **NO — sempre fixed em desktop** |
| comportamento desktop | fixed top-right até daf338657 | **confirmado** |
| comportamento mobile | fixed bottom (`bottom: 4.5rem`) — **ainda vigente** | **confirmado** |
| remoção identificável | `daf338657` + FIX-007 (colisão Atualizar) | **YES** |

### DOM ancestral histórico

```
.cog-presence-root
  └── CognitiveOmniPresence (.cog-omnipresence-zone)
        ├── .cog-omnipresence-zone__label
        └── .cog-whispers.cog-whispers--multi  ← position: fixed (desktop pré-FIX-007)
              └── .cog-whispers__item
```

**Nota:** INC-015 introduziu `.cc-cognitive-continuity-row` com `display: contents` na zone — arquitectura diferente do histórico.

---

## Decisão

```
HISTORICAL_BEHAVIOR_CONFIRMED = YES
IMPLEMENTATION_APPLIED = YES (Opção B — adaptação mínima)
```

**Racional:** Restauração exacta (sempre fixed) **incompatível** com baseline INC-015 em repouso e **reintroduziria** colisão FIX-007 com Atualizar no topo. Adaptação: valores CSS históricos aplicados **somente após scroll** via `IntersectionObserver`.

---

## Implementação

| Ficheiro | Alteração |
|---|---|
| `useWhisperScrollPersistence.js` | IO: pin quando whisper sai do viewport por cima |
| `CognitiveOmniPresence.jsx` | prop `scrollPersistence`; classe `cog-whispers--scroll-persist` |
| `CentroComando.jsx` | `scrollPersistence` só em `execContinuityLayout` (desktop) |
| `CentroComando.css` | fixed histórico scoped desktop + classe persist |

```
PERSISTENT_ELEMENT = .cog-whispers__item (via .cog-whispers--scroll-persist)
POSITION_BEHAVIOR = fixed; top: 4.5rem; right: 1.25rem; max-width: 320px; z-index: 3
CORE_SCROLL_PERSISTENCE = NO
FULL_CONTINUITY_ROW_PERSISTENCE = NO
UPDATE_BUTTON_DUPLICATED = NO
OMNIPRESENCE_STATE_DUPLICATED = NO
EXTRA_FETCH_CREATED = NO
```

---

## Baselines

```
INC014_BASELINE_PRESERVED = YES
INC015_BASELINE_PRESERVED = YES
INC016_BASELINE_PRESERVED = YES
```

---

## Validação

Probe: `frontend/scripts/inc017-scroll-probe.mjs`  
Screenshots: `frontend/tmp/inc017-screenshots/`

Resultados probe (1366×768):

| Ponto | position | pinned | colisão Atualizar |
|---|---|---|---|
| scroll 0% | static | false | 0 |
| scroll 25% | fixed | true | 0 |
| scroll 50% | fixed | true | 0 |
| scroll 75% | fixed | true | 0 |
| return top | static | false | 0 |

```
SCROLL_0 = PASS
SCROLL_25 = PASS
SCROLL_50 = PASS
SCROLL_75 = PASS
RETURN_TO_TOP = PASS
HORIZONTAL_OVERFLOW = NO
MOBILE_BASELINE_PRESERVED = YES
OMNIPRESENCE_SCROLL_BEHAVIOR_CHANGED = YES (restauração intencional)
```

---

## Reversão

Remover `useWhisperScrollPersistence.js`, prop `scrollPersistence`, bloco CSS INC-017 em `CentroComando.css` → baseline INC-016 exacta.
