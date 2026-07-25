# FIX-009 — Cognitive Ecosystem / SmartPanel Scroll Ownership Audit

**Data:** 2026-07-13  
**Status:** **NO_PATCH_REQUIRED**  
**Classificação:** `STALE_OR_LEGITIMATE_BEHAVIOR`  
**Escopo:** Auditoria scroll — sem alteração de código, build ou PM2.

---

## Finding formal

```text
FIX_009_ORIGINAL_FINDING     = Possível scroll duplo / ownership ambíguo entre página,
                               ecossistema cognitivo e SmartPanel
FIX_009_MATRIX_REFERENCE     = UX-006 (cognitiveEcosystem.css overflow:hidden × SmartPanel)
                               UX-007 (.smartPanel overflow:auto aninhado)
                               PENDING_FIXES_ROADMAP FIX-009
FIX_009_AFFECTED_COMPONENTS  = Layout (.content), CentroComando (.cc__rail),
                               CognitivePresenceShell, ImpetusVoiceOverlay,
                               SmartPanel (.smart-panel__visual-stage)
FIX_009_EXPECTED_BEHAVIOR    = Um scroll owner primário por coluna/contexto;
                               SmartPanel com scroll interno delimitado no overlay de voz;
                               sem wheel capture indevido; sem clipping de página
```

---

## FASE 1 — Árvore de scroll (CSS/DOM auditado)

```
APPLICATION SHELL
└── .layout                    overflow: hidden; height: 100vh
    └── .main-content          overflow: hidden; flex column
        └── .content            overflow-y: auto  ← PAGE_SCROLL_OWNER (Centro Comando)
            └── .cog-presence-root
                └── .cog-presence-content
                    └── .cc (CentroComando)
                        ├── .cc__main              fluxo documental
                        └── .cc__rail              overflow-y: auto; sticky; max-height calc(100vh-120px)
                                                   ← COGNITIVE_RAIL_SCROLL_OWNER (desktop)

VOICE OVERLAY (estado modal — SmartPanel isolado da página)
└── .impetus-voice-overlay     position: fixed; inset: 0
    └── .impetus-voice-overlay__panel   overflow: hidden; height: 100%
        └── .impetus-voice-overlay__right
            └── .impetus-voice-overlay__dynamic-body--visual-only   overflow: hidden
                └── .smart-panel--visual-canvas
                    └── .smart-panel__visual-stage   overflow-y: auto; overscroll-behavior: contain
                                                       ← SMARTPANEL_SCROLL_OWNER
```

| Elemento | overflow-y | height / max-height | IS_SCROLLABLE (1366) | Papel |
|----------|------------|---------------------|----------------------|-------|
| `.layout` | hidden | 100vh | Não | Shell fixo |
| `.main-content` | hidden | flex | Não | Encapsula topbar + content |
| `.content` | **auto** | flex:1 | **Sim** (3881/714) | **Página** |
| `.cc__rail` | **auto** | max-height 648px sticky | **Sim** (1392/648) | **Rail lateral** (desktop) |
| `.cog-whispers` | — | static (FIX-007) | Não | Sem participação scroll |
| `.impetus-voice-overlay__panel` | hidden | 100% | Não | Delega ao painel |
| `.smart-panel__visual-stage` | **auto** | max-height 100% | **Sim** (1161/626) | **SmartPanel** |

```text
PAGE_SCROLL_OWNER        = .content (Layout)
COGNITIVE_SCROLL_OWNER   = .cc__rail (desktop sticky rail) + micro-regiões max-height em widgets cognitivos
SMARTPANEL_SCROLL_OWNER  = .smart-panel__visual-stage (overlay voz apenas)
NUMBER_OF_VERTICAL_SCROLL_OWNERS = 2 (desktop centro: page + rail) | 1 (mobile centro) | 1 (overlay)
```

**Nota:** `overflow: hidden` em `.cog-band`, `.cog-presence-root` decorativos e `.impetus-voice-overlay__panel` **clipa scanners/ambiente**, não cria scroll trap de página.

---

## FASE 3 — Classificação

```text
FINDING_CLASSIFICATION           = STALE_OR_LEGITIMATE_BEHAVIOR
DOUBLE_SCROLL_CONFIRMED          = NO
SCROLL_TRAP_CONFIRMED            = NO
OWNERSHIP_CONFLICT_CONFIRMED     = NO
```

| Evidência | Conclusão |
|-----------|-----------|
| Desktop 1366×768: 2 barras verticais | **Legítimo** — coluna principal (`.content`) + coluna rail (`.cc__rail`) independentes |
| Overlay voz: 1 barra | **Legítimo** — único owner `.smart-panel__visual-stage` |
| Wheel fora do painel (overlay) | Não move scroll (sem page atrás; body hidden) |
| Wheel no painel | Move apenas `panel-scroll` |
| Wheel na página (centro) | Move apenas `page-scroll` |
| Wheel no rail | Move apenas `rail-scroll` sem arrastar página |

Micro-scrolls cognitivos (`.cog-feed__list` max-height 140px, `.cog-orgmap` 200px, etc.) são **LEGITIMATE_NESTED_SCROLL** dentro de widgets — não competem com page owner.

---

## FASE 4 — Scroll chaining

```text
CUSTOM_WHEEL_HANDLER_PRESENT = NO (scroll contexts auditados)
PREVENT_DEFAULT_PRESENT      = NO (wheel/scroll)
SCROLL_CHAINING_BLOCKED      = YES (intencional no SmartPanel)
```

| Mecanismo | Ficheiro | Detalhe |
|-----------|----------|---------|
| `overscroll-behavior: contain` | `SmartPanel.css` L647 | Impede chain do painel para ancestral no overlay |
| `overflow: hidden` | `ImpetusVoiceOverlay.css` L22, L473 | Ancestrais não scrolláveis — ownership delegado ao stage |
| `body.style.overflow = hidden` | `Layout.jsx` L215 | Apenas mobile + sidebar aberta — não afeta desktop centro |

**Sem** handlers `wheel` / `touchmove` com `preventDefault` no ecossistema cognitivo ou SmartPanel.

---

## FASE 5 — Relação FIX-007

```text
FIX_007_SAFE_AREA_PRESERVED              = YES
FIX_007_POSITION_STATIC_RULE_PRESERVED   = YES
FIX_007_NOTEBOOK_MEDIA_RULE_PRESERVED    = YES
COGNITIVE_PRESENCE_CSS_UNTOUCHED          = TRUE
```

---

## FASE 6 — Intenção arquitetural

Comentário canónico em `SmartPanel.css` L641–647:

> *Overlay voz: permite rolar relatórios / tabelas longas (flex default min-height:auto cortava scroll)*

```text
SMARTPANEL_SCROLL_INTENT         = INTERNAL_SCROLL
ORIGINAL_SCROLL_INTENT_CONFIRMED = YES
```

SmartPanel **só é montado** em `ImpetusVoiceOverlay.jsx` (`voiceOnly`) — não coexistem SmartPanel + página scroll no mesmo viewport.

---

## FASE 7 — Root cause

```text
ROOT_CAUSE_IDENTIFIED = NOT_APPLICABLE (sem regressão confirmada)
```

O finding UX-006/007 originou-se de **análise estática** (`overflow: hidden` + `overflow: auto` na mesma árvore) sem reprodução runtime. A auditoria demonstra **ownership correto** e comportamento intencional.

---

## FASE 8 — Decisão

```text
FIX_009_STATUS = NO_PATCH_REQUIRED
PATCH_APPLIED  = NO
PATCH_SCOPE    = NOT_APPLICABLE
```

Nenhum build. Nenhum restart PM2.

---

## FASE 10–11 — Regressões

```text
DOUBLE_SCROLL_REGRESSION = 0
NESTED_SCROLL_TRAP = 0
FIXED_HEIGHT_CLIPPING = 0
UNREACHABLE_CONTENT = 0
WHEEL_CAPTURE_REGRESSION = 0
MOBILE_SCROLL_REGRESSION = 0
PREVIOUS_FIX_REGRESSION_COUNT = 0
/health liveness ≈ 0.004s (probe pós-auditoria)
```

---

## Storage (observação)

```text
DISK_USAGE_BEFORE = 95%
DISK_AVAILABLE_BEFORE ≈ 5.4G
journalctl ≈ 1016M
DISK_USAGE_AFTER = 95% (sem alteração — sem build)
FORENSIC_EVIDENCE_PRESERVED = TRUE
STORAGE_REMEDIATION_UNTOUCHED = TRUE
DELETION_EXECUTED = NO
```

---

## Critérios de aceite

```text
FIX_009_FINDING_REPRODUCED = YES (reproduzido e classificado como legítimo)
SCROLL_OWNER_MAPPING_COMPLETE = YES
ORIGINAL_SCROLL_INTENT_CONFIRMED = YES
DOUBLE_SCROLL_CONFIRMED = NO
SCROLL_TRAP_CONFIRMED = NO
OWNERSHIP_CONFLICT_CONFIRMED = NO
ROOT_CAUSE_IDENTIFIED = NOT_APPLICABLE
PATCH_APPLIED = NO
FIX_007_SAFE_AREA_PRESERVED = YES
PREVIOUS_FIX_REGRESSION_COUNT = 0
NEW_REGRESSIONS = 0
```

---

*Auditoria FIX-009 — estabilização funcional IMPETUS.*
