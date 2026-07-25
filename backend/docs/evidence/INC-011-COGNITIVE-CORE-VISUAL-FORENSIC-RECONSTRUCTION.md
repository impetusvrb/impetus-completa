# INC-011 — VISUAL FORENSIC RECONSTRUCTION OF IMPETUS COGNITIVE CORE

**Data:** 2026-07-15  
**Modo:** READ-ONLY — `PRODUCTION_CODE_CHANGED = ZERO`  
**Referência:** capturas histórias pré-incidente + estado actual validado (Marcos / `coordinator_environmental`)

---

## Status final

```
INC_011_FORENSIC_AUDIT = COMPLETE
PRODUCTION_CODE_CHANGED = ZERO
BASELINE_MAINTENANCE = PRESERVED
BASELINE_ENVIRONMENT = PRESERVED
CEO_PROVISIONAL_BASELINE = PRESERVED
COGNITIVE_RECONSTRUCTION = NOT_YET_IMPLEMENTED
PARTIAL_VISUAL_RECOVERY = CONFIRMED
HISTORICAL_COGNITIVE_ARCHITECTURE_RESTORED = FALSE
```

**Classificação global (Fase 7):** **E — MIXED_STATE**

Justificação: a árvore UI completa existe no repositório (`CognitiveEcosystemDetailContent.jsx`, 25+ painéis), mas está **colapsada por defeito**, a faixa superior foi **substituída por versão compacta** (CERT-01.6), os dados ricos dependem de **`IMPETUS_COGNITIVE_LIVING_ENRICHMENT=true`** ou telemetria real, e a camada **presence-only** (INC-008) suprime motores ACTIVE/ENABLED/STABLE. Parte do conteúdo da camada presence usa **geradores seeded** em `organizationalPresenceEngine.js` mesmo sem living enrichment.

---

## 1. VISUAL_EVIDENCE_INVENTORY

| ID | Elemento visual histórico | Secção |
|---|---|---|
| A | Faixa IMPETUS COGNITIVE CORE + chips motores | Global strip |
| B | COMMAND CENTER + modos war room | Command center |
| C | FOCO AUTÔNOMO | Autonomous focus |
| D | Painel Central Cognitive Engine v2.0 + grid status | Core hub |
| E | DIGITAL TWIN ORGANIZACIONAL | Digital twin |
| F | CONSULTOR ESTRATÉGICO IA | Assistant strip |
| G | ENERGIA ORGANIZACIONAL | Energy panel |
| H | CONSELHO MULTIAGENTE | Multi-agent council |
| I | NARRATIVA OPERACIONAL | Narrative |
| J | CAUSA → EFEITO | Cause-effect |
| K | INTELIGÊNCIA EMERGENTE | Emergent insights |
| L | ENGINE DE DECISÃO | Decision engine |
| M | TIMELINE COGNITIVA VIVA + REPLAY | Timeline |
| N | INTELIGÊNCIA ESTRATÉGICA | Strategic hub |
| O | ESTADO GLOBAL DA OPERAÇÃO | Global operation |
| P | TENSÃO ORGANIZACIONAL | Tension panel |
| Q | PREVISÃO AVANÇADA / ESTRATÉGICA | Predictions |
| R | REDE COGNITIVA (N vínculos) | Neural mesh |
| S | IA PREDITIVA / curvas | Predictive curves |
| T | MEMÓRIA CONTEXTUAL | Memory panel |

**Estado actual validado (browser):** faixa compacta `PRESENÇA ATIVA` + botões `Ver detalhes` / `Consciência total` + `Centro de Comando — Meio Ambiente` = **PARTIAL_VISUAL_RECOVERY**.

---

## 2. HISTORICAL_COMPONENT_MAP

```
Layout
└── CentroComando (105410855 — Z18/Z21)
    ├── LiveDashboardUnifiedPanel
    ├── CentroComandoCommandHeader
    ├── CentroComandoHeroKpis
    ├── CognitiveEcosystemBand          ← SEMPRE VISÍVEL
    │   ├── header COMMAND CENTER
    │   ├── CognitiveEcosystemDetailContent (árvore completa)
    │   └── CognitiveAssistantStrip
    ├── LiveSurfacePanel + cc__grid
    └── (sem strip compacto, sem Onipresença, sem StructuralIdentityBanner)
```

**Commit referência inline:** `105410855` — *Cockpit cognitivo Z18–Z21*

---

## 3. CURRENT_COMPONENT_MAP

```
Layout
└── CognitivePulseProvider
    └── CognitivePresenceShell
        ├── [tablet] CognitiveGlobalStrip (variant tablet)
        ├── CognitiveOmniPresence
        └── .cog-presence-content
            └── CentroComando
                ├── LiveDashboardUnifiedPanel          ← PRIMEIRO (Painel vivo)
                ├── CognitiveMobileStripSlot / CognitiveDesktopStripSlot  ← faixa compacta
                ├── CentroComandoCommandHeader
                ├── StructuralIdentityBanner
                ├── CognitiveOmniHeader
                ├── CentroComandoHeroKpis
                ├── LiveSurfacePanel + AdaptiveOperationalShell + grid
                ├── CognitiveCollapsibleSection        ← default: FECHADO
                │   └── CognitiveEcosystemBand
                │       ├── COMMAND CENTER header
                │       ├── CognitiveEcosystemDetailContent (árvore completa)
                │       └── CognitiveAssistantStrip
                └── CognitiveLiveTicker
```

**Ficheiro composição:** `frontend/src/features/dashboard/centroComando/CentroComando.jsx`

---

## 4. CERT_01_6_ARCHITECTURAL_DIFF

| Árvore | Commit | Notas |
|---|---|---|
| **BEFORE_CERT_01_6** | `d6b6f5b59^` (≈ `23cb5f366`) | Collapsível já existia; banda completa atrás do toggle; sem strip slots |
| **AFTER_CERT_01_6** | `d6b6f5b59` | + `CognitiveDesktopStripSlot`, `CognitiveMobileStripSlot`, `CognitiveCoreSummaryCard`, `CognitiveCoreDetailSheet`, `CognitiveCollapsibleSection` extraído |
| **CURRENT** | `HEAD` | Igual a pós-01.6 + INC-008 presence-only + INC-009 segregação |

### Linha temporal crítica

| Evento | Commit | Impacto visual |
|---|---|---|
| Banda completa **inline** | `105410855` | Experiência histórica sempre visível |
| Banda movida para **colapsável** | `88ccfd9e2` (Z22–Z29) | Experiência completa **escondida por defeito** |
| Strip compacto no topo | `d6b6f5b59` (CERT-01.6) | Substitui faixa expandida de motores |
| Presence-only backend | INC-008 | Chips ACTIVE→PRESENCE; painéis vazios sem dados |

### Resposta à pergunta crítica (Fase 5)

> A experiência histórica foi movida integralmente para um colapsável?

**Sim — a árvore completa** (`CognitiveEcosystemDetailContent` + `CognitiveAssistantStrip`) **vive hoje dentro de `CognitiveEcosystemBand`**, montada apenas quando o utilizador expande `CognitiveCollapsibleSection` (desktop) ou abre bottom sheet «Ver detalhes» (mobile).

**Não** foi movida para «Consciência total»: esse botão abre **`OrganizationalAwarenessMode`** — subconjunto (rede neural, mapa org, calor setorial).

A mudança para colapsável ocorreu em **`88ccfd9e2`**, anterior a CERT-01.6. CERT-01.6 **adicionou** a faixa compacta substituta no topo, não foi a primeira ocultação.

---

## 5. TOTAL_AWARENESS_ENTRYPOINT_TRACE

### Desktop — «Consciência total»

```
CognitiveCoreSummaryCard.jsx L76-83 onClick={onOpenAwareness}
  → CognitiveGlobalStrip.jsx L90 / L132 onOpenAwareness={shellUi?.openAwareness}
    → CognitivePresenceShell.jsx L38 openAwareness: () => setAwarenessOpen(true)
      → L101-107 {awarenessOpen && <OrganizationalAwarenessMode payload={pulse?.awareness_mode} ... />}
        → OrganizationalAwarenessMode.jsx (modal fullscreen)
          → CognitiveNeuralMesh, LiveOrgMap, heatmap sectors, emergent_insights (top 3)
```

### Desktop — «Ver detalhes»

```
CognitiveCoreSummaryCard onOpenDetails
  → Desktop: CognitiveGlobalStrip DesktopSummaryStrip toggles enginesOpen
    → EngineStatusPanel only (chips motores) — NÃO abre CognitiveEcosystemDetailContent
  → Mobile: shellUi.openDetails → CognitiveCoreDetailSheet → CognitiveEcosystemDetailContent COMPLETO
```

### Experiência histórica completa (actual)

```
CognitiveCollapsibleSection.jsx — clique «Ecossistema cognitivo vivo»
  → CognitiveEcosystemBand.jsx
    → CognitiveEcosystemDetailContent.jsx (25+ módulos)
    + CognitiveAssistantStrip.jsx (sidebar)
```

### Respostas Fase 3

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Consciência total abria OrganizationalAwarenessMode? | **Sim** — desde CERT-01.6; **não** abria a banda completa |
| 2 | Conteúdo das imagens pertence ao mesmo componente? | **Não** — imagens = `CognitiveEcosystemDetailContent`; modal = **subconjunto** |
| 3 | Container pai maior? | **Sim** — `CognitiveEcosystemBand` + `CognitiveEcosystemDetailContent` |
| 4 | AwarenessMode era só parte do Command Center? | **Sim** — visão «mapa/consciência», não conselho/timeline/memória |
| 5 | Mudança semântica CERT-01.6? | **Sim** — «Ver detalhes» desktop degradado para chips; experiência plena → colapsável |
| 6 | Botão actual abre experiência antiga? | **Parcial** — Consciência total **não**; colapsável **sim** (se expandido) |

### Bug / desconexão detectada (presence-only)

Em `organizationalIntelligenceEngine.js` L621, modo presence retorna `awareness_mode: 'presence_only'` (**string**), enquanto `OrganizationalAwarenessMode` espera **objecto** com `title`, `subtitle`, `energy`, etc. O objecto rico é construído em `composeOrganizationalPresence` mas **descartado** no return early. **Impacto:** modal «Consciência total» pode renderizar degradado ou vazio em produção (living off).

---

## 6. COMMAND_CENTER_TRACE

| Elemento | Componente | Ficheiro |
|---|---|---|
| «COMMAND CENTER» header | `CognitiveEcosystemBand` | `CognitiveEcosystemBand.jsx` L73-77 |
| Modos NORMAL…MONITORAMENTO | `WarRoomModeBar` | `WarRoomModeBar.jsx` |
| «IA sugere: normal» | `WarRoomModeBar` L30-32 | `suggestedMode` vs `activeMode` |
| Árvore de painéis | `CognitiveEcosystemDetailContent` | `CognitiveEcosystemDetailContent.jsx` |

**Tipo de superfície histórica:** **composed dashboard** — não rota dedicada, não página monolítica; secção dentro de `CentroComando`, originalmente inline, hoje **collapsible section**.

**Modos war room:** funcionais na **UI** (`onModeChange` → `warRoomMode` → CSS `data-war-room`, `cc--mode-*`). Fonte sugerida: `pulse.operational_mode` via `inferOperationalMode()` em `cognitivePulseService.js`. Override local via botões — **não** persiste no backend.

---

## 7. DATA_TRUTH_CLASSIFICATION

### Feature flags

| Flag | Default prod | Efeito |
|---|---|---|
| `IMPETUS_COGNITIVE_LIVING_ENRICHMENT` | `false` | OFF → presence-only core status; painéis vazios; OFF → sem oscilação seeded em KPIs globais |
| (nenhuma flag frontend) | — | Strip layout hardcoded por viewport tier |

### Métricas históricas (Fase 6)

| Métrica visual | Campo / origem | Classificação | Restaurar como real? |
|---|---|---|---|
| 88% awareness | `cognitive_core.awareness_level_pct` | **MOCK** (seed) se living ON; **null** se OFF | **DO_NOT_RESTORE_AS_REAL_METRIC** |
| 81% eficiência global | `centro_cognitivo.global_efficiency_pct` | **REAL_DERIVED** se DB; **MOCK** via `applyLivingOscillation` se living | Condicional |
| 84% sincronia | `tension.organizational_sync_pct` | **HYBRID** — real heatmap ou seeded em living | Condicional |
| 94% confiança IA | `centro_cognitivo.ia_confidence_pct` | **HYBRID** | Condicional |
| 77% saúde org. | `global_operation.organizational_health_pct` | **MOCK** em `buildGlobalOperationState` (living) | **DO_NOT_RESTORE** sem dados |
| Risco baixo | `operational_risk` | **REAL_DERIVED** de alertas/tasks | OK se scoped |
| 8 vínculos activos | `neural_graph.links.length` | **MOCK** se living (`buildNeuralGraph`); vazio se OFF | Marcar origem |
| Previsões 48h/7d/14d | `advanced_predictions.items` | **MOCK** (`buildAdvancedPredictions` + seed) | **SIMULATION** |
| Chips ACTIVE/ENABLED/STABLE | `cognitive_core.status.*` | **MOCK** (living) / **PRESENCE** (OFF) | Honest status only |
| Energia org. morale 78% | `organizationalPresenceEngine.buildOrganizationalEnergy` | **MOCK** (seededFloat) mesmo em presence | **DO_NOT_RESTORE_AS_REAL** |
| Conselho multiagente diálogo | `buildMultiAgents` | **HYBRID** — agentes reais se living + condições; vazio em presence | |
| Memória contextual CRISIS/LEADERSHIP | `buildContextualMemory` | **MOCK** (templates seeded) | **SIMULATION** |
| Decision engine acções | `buildDecisionEngine` | **MOCK** (percentagens seeded) | Recommendations only |
| RECOMMENDATIONS rotativas | `CognitiveAssistantStrip` L3-8 | **HARDCODED** | UI fallback |

**Endpoint único:** `GET /api/dashboard/cognitive-pulse` → `cognitivePulseService.buildCognitivePulse` → `organizationalIntelligenceEngine.composeOrganizationalIntelligence` + `organizationalPresenceEngine.composeOrganizationalPresence`.

---

## 8. HISTORICAL_VS_CURRENT_MATRIX

Legenda estado: ver Fase 2. Legenda dados: ver Fase 2.

| Visual | Componente | Ficheiro | Commit origem | Estado actual | Dados | Render actual |
|---|---|---|---|---|---|---|
| A — Global strip motores | `CognitiveGlobalStrip` | `CognitiveGlobalStrip.jsx` | `d6b6f5b59` | **ACTIVE_BUT_SIMPLIFIED** | HYBRID | Compact card; chips expandidos sob demanda |
| B — Command Center | `CognitiveEcosystemBand` | `CognitiveEcosystemBand.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | HYBRID | Só se expandir colapsável |
| B — Modos war room | `WarRoomModeBar` | `WarRoomModeBar.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | REAL_DERIVED + UI | Dentro de DetailContent |
| C — Foco autónomo | `AutonomousFocusBar` | `AutonomousFocusBar.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | REAL_DERIVED se living; vazio OFF | `focus_areas: []` presence |
| D — Core engine panel | `CognitiveCoreHub` | `CognitiveCoreHub.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | HYBRID | Grid status; PRESENCE se OFF |
| E — Digital Twin | `DigitalTwinPanel` | `DigitalTwinPanel.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | REAL_DERIVED / empty | Empty state honesto |
| F — Consultor IA | `CognitiveAssistantStrip` | `CognitiveAssistantStrip.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | HYBRID + HARDCODED recs | Com banda expandida |
| G — Energia org. | `OrganizationalEnergyPanel` | `OrganizationalEnergyPanel.jsx` | `105410855` | **ACTIVE_BUT_UNMOUNTED** | MOCK (presence seed) | Panel null se `energy` null |
| H — Conselho multiagente | `MultiAgentCouncil` | `MultiAgentCouncil.jsx` | `105410855` | **BACKEND_DATA_DISABLED** | HYBRID | `agents: []` presence |
| I — Narrativa | `OperationalNarrative` | `OperationalNarrative.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | MOCK se living | Headline only presence |
| J — Causa-efeito | `CauseEffectChain` | `CauseEffectChain.jsx` | `105410855` | **BACKEND_DATA_DISABLED** | REAL if living | `chains: []` presence |
| K — Emergente | `EmergentInsightsPanel` | `EmergentInsightsPanel.jsx` | `105410855` | **ACTIVE_BUT_UNMOUNTED** | MOCK (presence engine) | Null se sem items no pulse exposto |
| L — Decisão | `DecisionEnginePanel` | `DecisionEnginePanel.jsx` | `105410855` | **ACTIVE_BUT_UNMOUNTED** | MOCK | Null se sem `decisions` |
| M — Timeline | `CognitiveTimelineLive` | `CognitiveTimelineLive.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | REAL_DERIVED audit/feed | REPLAY local UI |
| N — Intel. estratégica | `StrategicIntelligenceHub` | `StrategicIntelligenceHub.jsx` | `105410855` | **BACKEND_DATA_DISABLED** | MOCK if living | Empty presence |
| O — Estado global | `GlobalOperationState` | `GlobalOperationState.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | MOCK / REAL | Simplified if no global |
| P — Tensão | `OrganizationalTensionPanel` | `OrganizationalTensionPanel.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | HYBRID | |
| Q — Previsão avançada | `AdvancedPredictionsPanel` | `AdvancedPredictionsPanel.jsx` | `105410855` | **BACKEND_DATA_DISABLED** | MOCK | `items: []` presence |
| R — Rede cognitiva | `CognitiveNeuralMesh` | `CognitiveNeuralMesh.jsx` | `105410855` | **ACTIVE_BUT_UNMOUNTED** | MOCK if living | Modal awareness + collapsible |
| S — IA preditiva | `PredictiveCurvesPanel` | `PredictiveCurvesPanel.jsx` | `105410855` | **BACKEND_DATA_DISABLED** | MOCK | Empty curves OFF |
| T — Memória | `OrganizationalMemoryPanel` | `OrganizationalMemoryPanel.jsx` | `105410855` | **ACTIVE_BUT_UNMOUNTED** | MOCK contextual | Null if no entries |
| Consciência total | `OrganizationalAwarenessMode` | `OrganizationalAwarenessMode.jsx` | `88ccfd9e2` | **ACTIVE_BUT_UNMOUNTED** | HYBRID | Subset; payload bug presence |
| Blackbox engines bar | `BlackboxEngineBar` | `BlackboxEngineBar.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | DERIVED from core.status | |
| Centro cognitivo global | `CentroCognitivoGlobal` | `CentroCognitivoGlobal.jsx` | `105410855` | **ACTIVE_BUT_COLLAPSED** | REAL / empty honest | |
| Onipresença | `CognitiveOmniPresence` | `CognitiveOmniPresence.jsx` | INC-008 | **ACTIVE_AND_RENDERED** | REAL_DERIVED whispers | Nova camada |
| Painel vivo | `LiveDashboardUnifiedPanel` | `LiveDashboardUnifiedPanel.jsx` | anterior | **ACTIVE_AND_RENDERED** | REAL_DERIVED | Movido acima do core |

---

## 9. ROOT_CAUSE_OF_VISUAL_REDUCTION

Causas **cumulativas** (não uma única):

1. **Recomposição UI (`88ccfd9e2`)** — experiência completa passou de inline para **colapsável fechado por defeito**.
2. **CERT-01.6 (`d6b6f5b59`)** — faixa superior expandida substituída por **card compacto**; «Ver detalhes» desktop deixou de abrir árvore completa.
3. **Política dados (`IMPETUS_COGNITIVE_LIVING_ENRICHMENT=false`)** — motores ACTIVE/ENABLED/STABLE e painéis densos **não são emitidos**; INC-008 força **PRESENCE** honesto.
4. **Semântica «Consciência total»** — nunca foi a árvore completa; sempre foi modal **`OrganizationalAwarenessMode`** (subconjunto). Expectativa visual das capturas aponta para **`CognitiveEcosystemBand`**, não para o modal.
5. **Ordem de stack** — `LiveDashboardUnifiedPanel` precede faixa cognitiva, reduzindo hierarquia visual do Core.

**Não foi delete massivo de código.** Classificação: **FULL_ENGINE_EXISTS_BUT_IS_HIDDEN** + **FULL_ENGINE_EXISTS_BUT_DATA_POLICY_SUPPRESSES_IT** + **UI_EXISTS_BUT_ENGINE_WAS_PARTLY_DEMONSTRATIVE**.

---

## 10. SAFE_RECONSTRUCTION_PLAN

*(Documentação apenas — não implementar nesta execução)*

### LAYER 1 — GLOBAL COGNITIVE PRESENCE

- Repositionar `CognitiveDesktopStripSlot` **acima** de `LiveDashboardUnifiedPanel`.
- Modo **expanded strip** (opt-in flag) com chips motores **truthful**: PRESENCE / AWAITING_DATA / REAL statuses — nunca reactivar percentagens seeded em prod.
- Preservar `CognitiveOmniPresence` (INC-008).

### LAYER 2 — ROLE-SCOPED COMMAND CENTER

- Manter `CentroComandoCommandHeader` + `StructuralIdentityBanner` por perfil (`coordinator_environmental`, etc.).
- **Não** alterar `Dashboard.jsx` routing / `dashboardSurfaceCapabilities.js`.

### LAYER 3 — TOTAL AWARENESS / DEEP COGNITIVE MODE

- **Renomear / realinhar UX:** «Consciência total» deve abrir **`CognitiveEcosystemDetailContent` completo** (ou fullscreen shell), não apenas `OrganizationalAwarenessMode`.
- Corrigir `awareness_mode` presence → objecto ou unificar entrypoints.
- Default **expanded** para liderança (coordenador+) via capability — **não** via string matching cargo.
- Módulos com dados **MOCK/HARDCODED:** marcar `SIMULATION` ou ocultar até haver `REAL_RUNTIME`.
- Módulos **REAL_DERIVED:** Digital Twin, Timeline (audit_logs), feed alertas — mostrar com empty states honestos.

### Fases de implementação futura

| Fase | Escopo | Risco baseline |
|---|---|---|
| R1 | Fix entrypoint Consciência total + reorder strip | Baixo se routing intocado |
| R2 | Flag `cognitive_deep_mode=expanded|collapsed` | Médio — testes triplos |
| R3 | Hidratação real por domínio (ambiental KPIs) | Baixo — additive |
| R4 | Revisão living enrichment (opt-in tenant) | Alto — honestidade métricas |

---

## 11. PROTECTED_BASELINES

| Baseline | Ficheiros intocáveis |
|---|---|
| **MAINTENANCE V1** | `DashboardMecanico.jsx`, `DashboardMecanico.css` |
| **ENVIRONMENT V1** | `dashboardSurfaceCapabilities.js`, `roleUtils.js` (gate), `useVisibleModules.js` |
| **CEO provisional** | `organizationalIntelligenceEngine.js` (presence-only), `CognitiveOmniPresence.jsx` |
| **INC-009 rule** | Nunca usar `eixos` secundários para autorizar superfície dashboard |

Teste mínimo antes de qualquer merge cognitivo:

```bash
cd frontend && npm run test:dashboard-surface-segregation
```

---

## Apêndice — Inventário ficheiros cognitiveEcosystem (50 ficheiros)

Todos **existem** em `frontend/src/features/dashboard/centroComando/cognitiveEcosystem/`. Nenhum foi **DELETED**. Estado dominante: **ACTIVE_BUT_COLLAPSED** ou **BACKEND_DATA_DISABLED** em produção actual.

Motor backend principal: `backend/src/services/organizationalIntelligenceEngine.js`  
Camada presence (whispers, energy seeded, decision mock): `backend/src/services/organizationalPresenceEngine.js`  
Enrichment sintético (flag): `backend/src/services/cognitiveLivingEnrichment.js`
