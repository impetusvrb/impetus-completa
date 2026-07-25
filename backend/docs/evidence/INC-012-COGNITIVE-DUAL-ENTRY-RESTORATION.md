# INC-012 — RESTORE COGNITIVE CORE DUAL-ENTRY ARCHITECTURE

**Modo:** implementação conservadora, evidence-first, zero redesign  
**Data:** 2026-07-15  
**Status:** IMPLEMENTADO (reposicionamento mínimo)

---

## Fase 0 — Mapa forense

| HISTORICAL_TOP | CURRENT (pré-INC-012) | TARGET | COMPONENT | DATA_SOURCE | ACTION |
|---|---|---|---|---|---|
| Faixa compacta IMPETUS Cognitive Core | Após `LiveDashboardUnifiedPanel` | Antes de `LiveDashboardUnifiedPanel` | `CognitiveDesktopStripSlot` / `CognitiveMobileStripSlot` → `CognitiveGlobalStrip` | `CognitivePulseContext` / `/api/cognitive/pulse` | MOVER para topo |
| Consciência Total (topo histórico) | `CognitiveCoreSummaryCard` → `shellUi.openAwareness` | Mesmo fluxo, nova posição | `OrganizationalAwarenessMode` via `CognitivePresenceShell` | `pulse.awareness_mode` | PRESERVAR semântica |
| ONIPRESENÇA COGNITIVA | `CognitiveOmniPresence` no shell | Inalterado | `CognitiveOmniPresence.jsx` | pulse | NO CHANGE |
| Ecossistema Cognitivo Vivo (bottom) | `CognitiveCollapsibleSection` (fechado default) | Final do dashboard | `CognitiveEcosystemBand` → `CognitiveEcosystemDetailContent` | pulse | PRESERVAR |
| Tablet strip | `CognitivePresenceShell` L75-81 | Inalterado | `CognitiveGlobalStrip variant="tablet"` | pulse | NO CHANGE |

### Entrypoints históricos — trace

| Nome exacto no código | Componente | Commit relevante | Confirmado |
|---|---|---|---|
| ONIPRESENÇA COGNITIVA | `CognitiveOmniPresence` | histórico | SIM |
| Consciência total | `CognitiveGlobalStrip` / `CognitiveCoreSummaryCard` | d6b6f5b59 (CERT-01.6) | SIM |
| Ecossistema cognitivo vivo | `CognitiveCollapsibleSection` | 88ccfd9e2 (colapsável) | SIM |
| ORGANIZATIONAL AWARENESS MODE | `OrganizationalAwarenessMode` | backend title | SIM |
| Cognitive Awareness | — | — | **UNCONFIRMED_HISTORICAL_ELEMENT** (não inventado) |

### Commits consultados

- `105410855` — `CognitiveEcosystemBand` inline sempre visível
- `88ccfd9e2` — ecossistema movido para colapsável fechado
- `d6b6f5b59` — strip compacto desktop/mobile
- INC-008 — presence-only; estados honestos (PRESENCE / AWAITING_DATA / DISABLED)

---

## Before / After — árvore de composição (`CentroComando.jsx`)

### BEFORE

```
CognitivePresenceShell
└── .cc
    ├── LiveDashboardUnifiedPanel          ← "Operação em tempo real · IA & orquestração"
    ├── CognitiveMobileStripSlot           ← DUPLICAÇÃO INDEVIDA (meio)
    ├── CognitiveDesktopStripSlot          ← DUPLICAÇÃO INDEVIDA (meio)
    ├── CentroComandoCommandHeader
    ├── StructuralIdentityBanner
    ├── CognitiveOmniHeader
    ├── CentroComandoHeroKpis
    ├── LiveSurfacePanel (condicional)
    ├── AdaptiveOperationalShell / cc__grid
    ├── CognitiveCollapsibleSection        ← bottom deep ecosystem
    └── CognitiveLiveTicker
```

### AFTER (INC-012)

```
CognitivePresenceShell
└── .cc
    ├── .cc-top-cognitive-presence         ← NOVO wrapper
    │   ├── CognitiveMobileStripSlot       ← TOP (mobile)
    │   └── CognitiveDesktopStripSlot      ← TOP (desktop)
    ├── LiveDashboardUnifiedPanel
    ├── CentroComandoCommandHeader
    ├── … (dashboard operacional inalterado) …
    ├── CognitiveCollapsibleSection        ← bottom deep ecosystem
    └── CognitiveLiveTicker
```

---

## Fase 5 — Auditoria deep ecosystem (`CognitiveEcosystemDetailContent`)

Classificação com `IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false` (presence-only):

| Módulo auditado | Componente | Classificação |
|---|---|---|
| Command Center / Centro Cognitivo | `CentroCognitivoGlobal` | REACHABLE_DEGRADED |
| Cognitive Core detail | `CognitiveCoreHub` | REACHABLE_DEGRADED |
| Digital Twin Organizacional | `DigitalTwinPanel` | REACHABLE_DEGRADED |
| Consultor Estratégico IA | `StrategicIntelligenceHub` | REACHABLE_DEGRADED |
| Energia Organizacional | `OrganizationalEnergyPanel` | REACHABLE_DEGRADED |
| Conselho Multiagente | `MultiAgentCouncil` | REACHABLE_DEGRADED |
| Narrativa Operacional | `OperationalNarrative` | REACHABLE_DEGRADED |
| Causa-Efeito | `CauseEffectChain` | REACHABLE_DEGRADED |
| Inteligência Emergente | `EmergentInsightsPanel` | REACHABLE_DEGRADED |
| Engine de Decisão | `DecisionEnginePanel` | REACHABLE_DEGRADED |
| Timeline Cognitiva Viva | `CognitiveTimelineLive` | REACHABLE_DEGRADED |
| Inteligência Estratégica | `StrategicIntelligenceHub` | REACHABLE_DEGRADED |
| Estado Global da Operação | `GlobalOperationState` | REACHABLE_DEGRADED |
| Tensão Organizacional | `OrganizationalTensionPanel` | REACHABLE_DEGRADED |
| Previsão Avançada | `AdvancedPredictionsPanel` | REACHABLE_DEGRADED |
| Rede Cognitiva | `CognitiveNeuralMesh` | REACHABLE_DEGRADED |
| IA Preditiva | `PredictiveCurvesPanel` | REACHABLE_DEGRADED |
| Previsão Estratégica | `StrategicPredictions` | REACHABLE_DEGRADED |
| Memória Contextual | `OrganizationalMemoryPanel` | REACHABLE_DEGRADED |
| Feed Operacional Vivo | `LiveOperationalFeed` | REACHABLE_DEGRADED |
| Mapa Organizacional Vivo | `LiveOrgMap` | REACHABLE_DEGRADED |
| Heatmap Setorial | `OperationalHeatmap` | REACHABLE_DEGRADED |
| Radar | `OperationalRadar` | REACHABLE_DEGRADED |
| War Room / modos | `WarRoomModeBar` | REACHABLE_DEGRADED |
| Blackbox Engine | `BlackboxEngineBar` | REACHABLE_DEGRADED |

**Nota:** REACHABLE_DEGRADED = componente montado na árvore, dados suprimidos/honestos em presence-only (INC-008). Nenhum módulo PRESENT_BUT_UNREACHABLE identificado.

**Acesso:** Desktop → expandir `Ecossistema cognitivo vivo`. Mobile → bottom sheet via `CognitiveCoreDetailSheet`.

---

## Ficheiros alterados

1. `frontend/src/features/dashboard/centroComando/CentroComando.jsx` — reposicionamento strip
2. `frontend/src/features/dashboard/centroComando/CentroComando.css` — wrapper `.cc-top-cognitive-presence`
3. `frontend/src/features/dashboard/centroComando/cognitiveEcosystem/CognitiveDesktopStripSlot.jsx` — comentário
4. `frontend/src/features/dashboard/centroComando/cognitiveEcosystem/CognitiveMobileStripSlot.jsx` — comentário

**Não alterado:** `DashboardMecanico.jsx`, `dashboardSurfaceCapabilities.js`, backend APIs, semântica de Consciência Total, `IMPETUS_COGNITIVE_LIVING_ENRICHMENT`.

---

## Acceptance criteria

| Critério | Resultado |
|---|---|
| Cognitive Core discretamente no topo | RESTORED |
| Top strip não domina visualmente | OK (desktop-summary ~60–90px) |
| Consciência Total acessível | PRESERVED |
| Estados honestos (presence-only) | PRESERVED |
| Dashboard operacional mesma ordem | PRESERVED |
| Sem bloco cognitivo duplicado no meio | RESTORED |
| Ecossistema Cognitivo Vivo no final | COMPLETE |
| Deep ecosystem abre árvore existente | COMPLETE |
| Radar funcional | PRESERVED |
| Métricas seeded promovidas a real | NO |
| Maintenance baseline | PRESERVED |
| Environment baseline | PRESERVED |
| CEO baseline | PRESERVED |

---

## Confirmação explícita

```
TOP_COGNITIVE_PRESENCE = RESTORED
CONSCIENCIA_TOTAL = PRESERVED
OPERATIONAL_DASHBOARD = PRESERVED
BOTTOM_COGNITIVE_ECOSYSTEM = COMPLETE
SEEDED_METRICS_PROMOTED_AS_REAL = NO
MAINTENANCE_BASELINE = PRESERVED
ENVIRONMENT_BASELINE = PRESERVED
CEO_BASELINE = PRESERVED
```

---

## Testes executados

- `npm run test:dashboard-surface-segregation`
- `npm run build` (frontend)

## Follow-up (INC separada)

- Verificar se Consciência Total, Onipresença Cognitiva e Organizational Awareness eram entrypoints distintos ou evoluções do mesmo fluxo.
- Corrigir `awareness_mode: 'presence_only'` (string) vs objecto em `organizationalIntelligenceEngine.js` L621 se modal degradar objetivamente.
