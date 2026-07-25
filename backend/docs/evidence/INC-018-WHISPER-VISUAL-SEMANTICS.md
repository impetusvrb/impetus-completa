# INC-018 — Semântica visual da Onipresença persistente

**Data:** 2026-07-15  
**Tipo:** legibilidade, posicionamento e cores semânticas (sem alterar mecânica INC-017)

---

## Forense de severidade

| Campo | Valor |
|---|---|
| **SEVERITY_SOURCE_FOUND** | **YES** |
| **SEVERITY_SOURCE** | `global_whispers[].priority` — `organizationalPresenceEngine.js` |
| **Valores observados** | `low`, `medium`, `high`, `critical` |
| **Criticidade fiável** | `critical` — alerta explícito (modo crise/emergência) |
| **Limitação** | `high/medium/low` incluem peso de canal; não reflectem sempre gravidade da frase |
| **EXISTING_DESIGN_TOKENS_REUSED** | **YES** — `--cyan`, `--green`, `--amber`, `--red`, `--glow-*` |

### Mapeamento conservador (`whisperSemanticTier.js`)

| priority (backend) | tier visual | cor persistente |
|---|---|---|
| `critical` | `critical` | `--red` |
| `high` | `warning` | `--amber` |
| `medium`, `low`, default | `normal` | `--cyan` |

**SCROLL_CHANGES_SEVERITY = NO** — mesma `priority` inline e persistente; scroll só altera apresentação.

**Inline (scroll 0%):** verde vivo (`--green`) para todas as mensagens — identidade calma INC-015.

---

## Posicionamento

| Campo | Valor |
|---|---|
| **HISTORICAL_POSITION** | `top: 4.5rem (72px); right: 1.25rem` |
| **CURRENT_SAFE_POSITION** | `top: calc(54px + 2.25rem) ≈ 94px; right: max(12px, 1rem)` |
| **HEADER_COLLISION** | NO |
| **SCROLLBAR_COLLISION** | NO |
| **UPDATE_BUTTON_COLLISION** | NO |

Ganho vs histórico: **+22px** abaixo da topbar — menos competição com controlos globais.

---

## Semântica visual

| Tier | Inline | Persistente |
|---|---|---|
| **NORMAL** | `--green` | `--cyan` + glow discreto |
| **WARNING** | `--green` (calmo) | `--amber` + borda âmbar |
| **CRITICAL** | `--green` (calmo) | `--red` + borda vermelha |

**UNKNOWN_FALLBACK** → `normal`

---

## Integridade

```
INC014_BASELINE_PRESERVED = YES
INC015_BASELINE_PRESERVED = YES
INC016_BASELINE_PRESERVED = YES
INC017_SCROLL_MECHANICS_PRESERVED = YES

OMNIPRESENCE_STATE_DUPLICATED = NO
EXTRA_FETCH_CREATED = NO
EXTRA_TIMER_CREATED = NO
MOBILE_BASELINE_PRESERVED = YES
```

---

## Ficheiros alterados

| Ficheiro | Alteração |
|---|---|
| `whisperSemanticTier.js` | mapeamento priority → tier (novo) |
| `CognitiveOmniPresence.jsx` | classe `--semantic-*`; `data-whisper-priority` |
| `CentroComando.css` | inline verde; persist posição + contraste + cores |

**Não alterado:** `useWhisperScrollPersistence.js`, IO, thresholds INC-017.

---

## Validação

Probe: `frontend/scripts/inc018-whisper-visual-probe.mjs`  
Screenshots: `frontend/tmp/inc018-screenshots/`  
INC-017 probe: **PASS** (mecânica intacta)

```
SCROLL_0 = PASS
SCROLL_50 = PASS (pinned, gap 40px abaixo topbar)
HORIZONTAL_OVERFLOW = NO
```

---

## Reversão

Remover `whisperSemanticTier.js`, classes semânticas em `CognitiveOmniPresence.jsx` e bloco INC-018 em `CentroComando.css` (restaurar posição INC-017 pura).
