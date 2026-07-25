# BASELINE UI v1.0 — Centro de Comando IMPETUS

**Data de congelamento:** 2026-07-15  
**Estado:** `BASELINE_LOCKED = YES`

---

## Objetivo

Formalizar o baseline visual aprovado no browser real após INC-014 → INC-020, encerrando a fase de refinamento estrutural da interface do Centro de Comando desktop.

A partir desta versão, **alterações de geometria, composição ou comportamento de shell** exigem **nova INC explícita**. Evolução permitida sem quebrar baseline: conteúdo cognitivo, dados, inteligência e semântica operacional.

---

## INCs incorporadas

| INC | Descrição | Evidência |
|---|---|---|
| **INC-014** | Cognitive Core — faixa única horizontal compacta | `INC-014-COGNITIVE-CORE-COMPACT-STRIP.md` |
| **INC-015** | Linha de continuidade cognitiva (Omni \| mensagem \| Atualizar) | `INC-015-COGNITIVE-TOP-STACK-COMPACTION.md` |
| **INC-016** | Expansão horizontal conservadora do workspace (~10px gutter) | `INC-016-DESKTOP-HORIZONTAL-WORKSPACE.md` |
| **INC-017** | Persistência do whisper durante scroll | `INC-017-OMNIPRESENCE-SCROLL-PERSISTENCE.md` |
| **INC-018** | Semântica visual e cores por priority | `INC-018-WHISPER-VISUAL-SEMANTICS.md` |
| **INC-019** | Stacking foreground + arbitragem de foco | `INC-019-WHISPER-FOCUS-ARBITRATION.md` |
| **INC-020** | Interacção real (dismissed / yielding) | `INC-020-WHISPER-INTERACTION-FIX.md` |
| **INC-021** | Lock baseline + microanimações cosméticas | `INC-021-BASELINE-UI-LOCK.md` |

---

## Mapa visual aprovado (desktop)

```
┌──────────┬────────────────────────────────────────────────────────┐
│ SIDEBAR  │ TOPBAR (54px)                                          │
│  ~230px  ├────────────────────────────────────────────────────────┤
│          │ [Cognitive Core — faixa compacta 6 motores + Brain]    │
│          │ ONIPRESENÇA COGNITIVA │ mensagem viva │ [Atualizar]   │
│          │ Operação em tempo real · IA & orquestração             │
│          │ Máquina do Tempo + painel vivo + dashboard operacional │
│          │ … widgets / cards / ecossistema cognitivo (bottom) …   │
└──────────┴────────────────────────────────────────────────────────┘

Scroll → whisper persistente (canto sup. dir., abaixo topbar)
       → foreground | yielding | dismissed (INC-020)
```

**Gutter estrutural:** ~10px (`.content:has(.cc--premium)`)

---

## Componentes congelados (LOCKED)

| Componente | Notas |
|---|---|
| Sidebar | Largura, comportamento, posição |
| Cognitive Core | Faixa única compacta; Brain → Consciência Total |
| Continuidade cognitiva | Grid `auto \| 1fr \| auto`; portal Atualizar |
| Whisper persistente | Posição INC-018; persistência INC-017 |
| Máquina do Tempo | Controles e timebar |
| Dashboard operacional | LiveDashboardUnifiedPanel composição |
| Workspace horizontal | INC-016 gutters |
| Hierarquia tipográfica | Rajdhani + Share Tech Mono |
| Espaçamentos estruturais | INC-015 vertical compaction |
| Semântica de cores whisper | normal/warning/critical (INC-018) |
| Mecânica de scroll | IntersectionObserver linha continuidade |
| Mecânica yielding/dismissed | pointerdown único; INC-020 |

---

## Componentes evolutivos (NÃO congelados)

Conteúdo e lógica podem evoluir **sem alterar shell**:

- Pensamentos / mensagens (`global_whispers`, frases)
- Motor cognitivo / pulse
- Insights, predição, correlação
- Radar, alertas, Consciência Total (conteúdo do modal)
- Aprendizagem, memória contextual
- Dados operacionais dos cards

---

## Política de alteração

1. **Proibido** alterar baseline LOCKED sem INC numerada e aprovação explícita.
2. **Permitido** evoluir backend, APIs, textos, severity real, ecossistema cognitivo (bottom).
3. **Mobile/tablet** — baseline própria; alterações desktop não devem regressar mobile.
4. **Reversão INC-021** — remover apenas bloco CSS `INC-021` e estado cosmético de transição de mensagem.

---

## Próxima fase do projecto

Evolução da **inteligência cognitiva** (correlação, memória, predição, comportamento IA) — **não** geometria da interface.

---

## Referências de implementação

| Área | Ficheiros canónicos |
|---|---|
| Composição | `CentroComando.jsx`, `CentroComando.css` |
| Onipresença | `CognitiveOmniPresence.jsx` |
| Persistência scroll | `useWhisperScrollPersistence.js` |
| Arbitragem foco | `useWhisperFocusArbitration.js`, `whisperFocusUtils.js` |
| Cores whisper | `whisperSemanticTier.js` |
| Shell layout | `Layout.css` (gutter INC-016) |
| Painel vivo | `LiveDashboardUnifiedPanel.jsx` |
