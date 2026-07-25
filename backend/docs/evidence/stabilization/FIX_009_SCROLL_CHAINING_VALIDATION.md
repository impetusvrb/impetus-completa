# FIX-009 — Scroll Chaining Validation

**Data:** 2026-07-13  
**Escopo:** wheel / overscroll / preventDefault no ecossistema cognitivo e SmartPanel

---

## Pesquisa estática

| Padrão | Resultado |
|--------|-----------|
| `addEventListener('wheel'` | **0** em cognitiveEcosystem + SmartPanel + ImpetusVoiceOverlay |
| `onWheel` JSX | **0** nos componentes auditados |
| `preventDefault` + scroll | **0** — únicos preventDefault são formulários e atalho Alt+Shift+V (`ImpetusVoiceProvider.jsx` L359) |
| `overscroll-behavior` | **1** — `SmartPanel.css` L647 `contain` no visual stage |
| `touch-action` | não aplicado nos owners auditados |
| `-webkit-overflow-scrolling: touch` | `SmartPanel.css` L649 (mobile smooth scroll interno) |

```text
CUSTOM_WHEEL_HANDLER_PRESENT = NO
PREVENT_DEFAULT_PRESENT      = NO (wheel/scroll)
SCROLL_CHAINING_BLOCKED      = YES (CSS intencional no SmartPanel)
```

---

## Cadeia SmartPanel (overlay voz)

```
.impetus-voice-overlay          fixed, sem scroll
  .impetus-voice-overlay__panel overflow: hidden
    .impetus-voice-overlay__right overflow: hidden
      .impetus-voice-overlay__dynamic-body--visual-only overflow: hidden
        .smart-panel__visual-stage overflow-y: auto + overscroll-behavior: contain
```

**Comportamento esperado:**
- Wheel sobre stage → scroll interno do painel
- Limite superior/inferior do stage → chain **contido** (`contain`)
- Ancestrais não scrolláveis → **sem double scrollbar** na coluna direita

**Probe 1366×768:**
- Wheel em `#panel-scroll` → `panel-scroll` delta +400
- Wheel em área overlay fora do stage → nenhum owner move

---

## Cadeia Centro de Comando (página)

```
.layout overflow: hidden
  .main-content overflow: hidden
    .content overflow-y: auto  ← owner primário
      .cc__rail overflow-y: auto (sticky, desktop) ← owner secundário coluna independente
```

**Comportamento esperado:**
- Wheel na coluna principal → só `.content`
- Wheel no rail → só `.cc__rail` (probe: page-scroll permanece 400, rail-scroll +400)

**Sem conflito:** duas barras em **colunas distintas**, não duas barras na mesma coluna.

---

## CognitiveOmniPresence / FIX-007

```text
.cog-whispers position: static (desktop/tablet ≥768px)
Participação em scroll: NENHUMA (fluxo documental, pointer-events: none)
FIX_007 rules intactas — cognitivePresence.css não alterado nesta missão
```

---

## Classificação final chaining

| Teste | Resultado |
|-------|-----------|
| `WHEEL_OUTSIDE_PANEL` | EXPECTED: nenhum scroll (overlay) / page owner (centro) — **PASS** |
| `WHEEL_INSIDE_PANEL` | EXPECTED: panel owner — **PASS** |
| `SCROLL_ESCAPE_FROM_PANEL` | NOT_APPLICABLE (modal fullscreen) |
| Wheel capture regressão (SEC-RUNTIME-02 class) | **0** |

---

*Validação chaining — FIX-009, sem patch aplicado.*
