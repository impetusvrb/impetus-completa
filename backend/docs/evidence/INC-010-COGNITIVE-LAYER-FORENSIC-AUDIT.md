# INC-010 — COGNITIVE LAYER FORENSIC AUDIT

**Data:** 2026-07-15  
**Modo:** READ-ONLY — nenhuma alteração de código ou deploy nesta execução  
**Referência visual:** capturas pré-incidente com faixa «IMPETUS COGNITIVE CORE · ACTIVE · …» e composição «Centro de Comando Industrial Cognitivo / Painel Vivo»

---

## 1. ENVIRONMENT_BASELINE_FREEZE_CONFIRMATION

```
BASELINE_ENVIRONMENT_DASHBOARD_V1 = FROZEN
status: VALIDATED_IN_REAL_BROWSER
document: backend/docs/evidence/ENVIRONMENT_BASELINE_V1.md
```

Segregação ambiental (INC-009) congelada. Apresentação global **não** declarada final.

---

## 2. CURRENT_DASHBOARD_COMPONENT_TREE

Rota `/app` → perfil não-manutenção → `CentroComando.jsx`:

```
Layout
└── CognitivePulseProvider
    └── CognitivePresenceShell
        ├── [tablet only] CognitiveGlobalStrip (variant=tablet) — dentro do shell
        ├── CognitiveOmniPresence (onipresença global, whispers)
        └── .cog-presence-content
            └── .cc.cc--premium
                ├── LiveDashboardUnifiedPanel (variant=exec)     ← «Operação em tempo real · IA & orquestração»
                │       └── Máquina do tempo (timebar)
                ├── CognitiveMobileStripSlot (mobile, compact)
                ├── CognitiveDesktopStripSlot (desktop, summary card)
                ├── CentroComandoCommandHeader                   ← «CENTRO DE COMANDO INDUSTRIAL COGNITIVO»
                ├── StructuralIdentityBanner
                ├── CognitiveOmniHeader (whispers canal header)
                ├── CentroComandoHeroKpis
                ├── LiveSurfacePanel (se liveSurface.blocks)
                ├── AdaptiveOperationalShell
                │       └── cc__grid (domain widgets)
                ├── CognitiveCollapsibleSection [recolhido por defeito]
                │       └── CognitiveEcosystemBand (expandido manualmente)
                └── CognitiveLiveTicker (footer «// COGNITIVE LIVE»)
```

**DashboardMecanico** (manutenção): árvore separada — não montada para perfil ambiental após INC-009.

---

## 3. OLD_REFERENCE_COMPONENT_TREE

Reconstruído a partir de `git show 105410855` (Z18–Z21) + docs CERT-01.1:

```
Layout
└── .cc.cc--premium (sem CognitivePresenceShell wrapper)
    ├── LiveDashboardUnifiedPanel
    ├── CentroComandoCommandHeader          ← título + badges identidade + IA ATIVA + SUPERFÍCIE AO VIVO
    ├── CentroComandoHeroKpis
    ├── CognitiveEcosystemBand              ← SEMPRE VISÍVEL (não colapsável)
    │       ├── header «INTELIGÊNCIA ORGANIZACIONAL VIVA / COMMAND CENTER»
    │       └── CognitiveEcosystemDetailContent
    │               └── CognitiveCoreHub    ← grid status ACTIVE/ENABLED/STABLE/…
    ├── LiveSurfacePanel + cc__grid
    └── (sem CognitiveOmniPresence / StructuralIdentityBanner / slots desktop-mobile)
```

A faixa «IMPETUS COGNITIVE CORE · ACTIVE · ENABLED · STABLE · ONLINE» corresponde a **`CognitiveGlobalStrip`** (commit `d6b6f5b59` CERT-01.6), documentada em `CERT-01-1_UI_DESKTOP_COGNITIVE_CORE.md`:

```
Linha 1: IMPETUS COGNITIVE CORE · pulse
Linha 2: chips Core/Behavior/Cross-analysis/Operational Sync/Awareness/Predictive
Linha 3: N bpm · N% awareness · ONLINE | [Consciência total]
```

---

## 4. COGNITIVE_CORE_COMPONENT_LOCATION

| Componente | Ficheiro | Existe? | Renderizado hoje? |
|---|---|---|---|
| Faixa global de motores | `CognitiveGlobalStrip.jsx` | Sim | **Parcial** — desktop via `CognitiveDesktopStripSlot` (card compacto); tablet via shell; mobile compact |
| Card resumo CONF/SYNC/AWARE | `CognitiveCoreSummaryCard.jsx` | Sim | Sim (dentro do strip desktop/mobile) |
| Hub detalhado status grid | `CognitiveCoreHub.jsx` | Sim | **Só** dentro de `CognitiveEcosystemBand` colapsável |
| Banda rica «COMMAND CENTER» | `CognitiveEcosystemBand.jsx` | Sim | **Colapsada** (`CognitiveCollapsibleSection`, default `false`) |
| Onipresença whispers | `CognitiveOmniPresence.jsx` | Sim | Sim (INC-008) |
| Header comando industrial | `CentroComandoCommandHeader.jsx` | Sim | Sim |
| Painel vivo unificado | `LiveDashboardUnifiedPanel.jsx` | Sim | Sim — **primeiro** no stack |
| Ticker footer | `CognitiveLiveTicker.jsx` | Sim | Sim (rodapé) |
| Organizational Awareness overlay | `OrganizationalAwarenessMode.jsx` | Sim | Modal sob demanda |

---

## 5. COGNITIVE_CORE_DATA_SOURCES

| Indicador | Fonte | Classificação |
|---|---|---|
| `cognitive_core.status.*` (ACTIVE, ENABLED, STABLE, …) | `GET /api/dashboard/cognitive-pulse` → `organizationalIntelligenceEngine.composeOrganizationalIntelligence()` | **REAL_RUNTIME_DATA** quando `IMPETUS_COGNITIVE_LIVING_ENRICHMENT=true` |
| Modo `PRESENCE` + CONF/SYNC/AWARE = `—` | Idem, living enrichment **OFF** (prod default) | **DERIVED_RUNTIME_DATA** (presence-only, INC-008) |
| Chips engine no strip | `core.status` filtrado em `CognitiveGlobalStrip` L107–114 | **REAL_RUNTIME_DATA** (ou subset em PRESENCE) |
| `· ONLINE` alternante | `CognitiveGlobalStrip` L60 `tick % 2` | **STATIC_PRESENTATION** (efeito visual) |
| CognitiveLiveTicker FALLBACK `CORE ACTIVE / AWARENESS ONLINE` | `CognitiveLiveTicker.jsx` L4–8 quando sem energy data | **HARDCODED_STATUS** (fallback UI) |
| `IA ATIVA` no header | `CentroComandoCommandHeader` — `dashboardCtx.assistente_ia.ativo !== false` | **DERIVED_RUNTIME_DATA** |
| `SUPERFÍCIE AO VIVO` | `liveSurface?.blocks?.length` | **REAL_RUNTIME_DATA** |
| Living enrichment engines ENABLED/ACTIVE | `cognitiveLivingEnrichment.js` | **DERIVED_RUNTIME_DATA** (flag-gated) |

**Endpoint principal:** `GET /api/dashboard/cognitive-pulse` (`cognitivePulseService.buildCognitivePulse`).

**Health check dedicado:** não existe endpoint «Cognitive Core health» isolado; estado vem do pulse composto.

---

## 6. COGNITIVE_TOTAL_FINDINGS

Pesquisa exaustiva por `Cognitive Total`, `cognitive_total`, `cognitiveTotal`, `COGNITIVE TOTAL`:

| Resultado | Evidência |
|---|---|
| **Nomenclatura «Cognitive Total» como componente** | **Não encontrada** no frontend/backend actual |
| Equivalente funcional mais próximo | Botão **«Consciência total»** → `OrganizationalAwarenessMode.jsx` |
| Tag visual relacionada | `OrganizationalAwarenessMode` L24: `IMPETUS · COGNITIVE CORE` |
| CSS / classes `cognitive-total` | **Não encontradas** |
| API field `cognitive_total` | **Não encontrado** em `/cognitive-pulse` |

**Conclusão:** «Cognitive Total» nas capturas antigas provavelmente refere-se à **UI «Consciência total» / Organizational Awareness Mode**, não a um módulo com esse nome técnico.

**Classificação:** `UNKNOWN` (label visual) → mapeado para `OrganizationalAwarenessMode` (`LEGACY_COMPONENT` / ainda existente, modal).

---

## 7. OLD_VS_CURRENT_DIFF

| Elemento | Classificação | Notas |
|---|---|---|
| IMPETUS COGNITIVE CORE (faixa motores) | **SIMPLIFIED + MOVED** | De banda expandida sempre visível → card compacto; ordem após Painel Vivo |
| Status ACTIVE/ENABLED/STABLE/ONLINE | **SIMPLIFIED** | Prod: `PRESENCE` mode (INC-008); living off reduz chips |
| Centro de Comando Industrial Cognitivo | **PRESERVED** | `CentroComandoCommandHeader` |
| Painel Vivo / Operação em tempo real | **MOVED** | Agora **acima** do header cognitivo compacto |
| Identity badges (cargo, função, setor, nível) | **PRESERVED** | Header chips |
| IA ATIVA | **PRESERVED** | Header |
| SUPERFÍCIE AO VIVO | **PRESERVED** | Header, condicional liveSurface |
| Base Estrutural / identity banner | **MOVED** | `StructuralIdentityBanner` adicionado pós-Z21 |
| Organizational Awareness | **HIDDEN** | Modal; trigger «Consciência total» no strip |
| CognitiveEcosystemBand rica | **HIDDEN** | Colapsada por defeito (`CognitiveCollapsibleSection`) |
| Onipresença Cognitiva | **REPLACED/ADDED** | Nova camada INC-008 (`CognitiveOmniPresence`) |
| Máquina do Tempo | **PRESERVED** | `LiveDashboardUnifiedPanel` timebar |
| CognitiveLiveTicker footer | **ADDED** | Pós CERT-01.x |

---

## 8. REMOVED_OR_DISCONNECTED_COMPONENTS

Nenhum ficheiro core foi **removido** do repositório. Desconexão é de **composição**, não de delete:

| Componente | Estado | Commit relevante |
|---|---|---|
| `CognitiveEcosystemBand` inline no stack principal | **DISCONNECTED** (movido para secção colapsável) | `d6b6f5b59` CERT-01.6 |
| `CognitiveGlobalStrip` desktop expandido (3 linhas chips) | **DISCONNECTED** do topo; substituído por `desktop-summary` card | `d6b6f5b59` |
| Status motores completos (6 chips ACTIVE…) | **DISCONNECTED** quando living enrichment OFF | INC-008 presence-only |
| `CognitivePresenceShell` wrapper | **ADDED** — reorganizou tier rendering | `d6b6f5b59` |

---

## 9. SAFE_FORWARD_PORT_PLAN

**Princípio:** FORWARD PORT — nunca rollback amplo.

### Fase A — Composição (sem tocar segregação INC-009)

1. Reordenar stack em `CentroComando.jsx`:
   - Camada 1: `CognitiveDesktopStripSlot` / strip expandido (opcional por tier)
   - Camada 2: `CentroComandoCommandHeader`
   - Camada 3: `LiveDashboardUnifiedPanel`
   - Preservar ordem fail-closed de routing (`Dashboard.jsx` intocado)

2. Expor strip expandido desktop (variant `tablet` ou novo `desktop-expanded`) **atrás de flag**:
   - `VITE_COGNITIVE_STRIP_LAYOUT=compact|expanded` (default `compact` = baseline actual)

### Fase B — Dados honestos (CEO + ambiental)

3. Separar **presentation tier** de **data tier**:
   - Living enrichment ON → chips ACTIVE/ENABLED (já implementado backend)
   - Living OFF → manter PRESENCE + labels honestos (não reintroduzir métricas fabricadas)

4. Opcional: expandir `CognitiveCollapsibleSection` default para liderança ambiental/executiva via capability — **não** via profile string hack.

### Fase C — Validação

5. Matriz regressão: `test:dashboard-surface-segregation` + browser triplo (Lima / Marcos / Wellington)
6. CEO baseline doc (`CEO_BASELINE_V1.md`) — validar Onipresença após qualquer reorder visual

---

## 10. FILES_THAT_MUST_NOT_BE_TOUCHED (forward port)

**Segregação congelada (INC-009 / ENV V1):**

- `frontend/src/utils/dashboardSurfaceCapabilities.js`
- `frontend/src/utils/roleUtils.js` (gate `hasMaintenanceProfileContext`)
- `frontend/src/hooks/useVisibleModules.js` (`resolveMaintenanceFromDashboardMe`)
- `frontend/src/pages/Dashboard.jsx` (roteamento superfície)
- `frontend/src/features/dashboard/DashboardMecanico.jsx` (+ `.css`)

**CEO provisional (INC-008):**

- `backend/src/services/organizationalIntelligenceEngine.js` (presence-only)
- `frontend/src/features/dashboard/centroComando/cognitiveEcosystem/CognitiveOmniPresence.jsx`

**Alteração permitida com review:**

- `CentroComando.jsx` — **somente ordem/stack visual**
- `CognitiveGlobalStrip.jsx` / slots — variantes layout
- `CognitiveCollapsibleSection.jsx` — default expanded policy
- CSS cognitivo (`cognitivePresence.css`, `cognitiveEcosystem.css`)

---

## Respostas objetivas — Fase 4

| # | Pergunta | Resposta |
|---|---|---|
| 1 | Faixa visual estática? | **Não** — consome `pulse.cognitive_core.status` |
| 2 | ACTIVE/ENABLED/STABLE/ONLINE reais? | **Sim** com living enrichment; **PRESENCE/—** sem |
| 3 | Endpoint? | `GET /api/dashboard/cognitive-pulse` |
| 4 | Hardcoded? | Fallback ticker sim; strip principal não |
| 5 | Health check real? | Não dedicado — pulse composto |
| 6 | Estado Cognitive Core? | Sim — `cognitive_core.status` + `consciousness` |
| 7 | Componente dedicado? | `CognitiveGlobalStrip` + `CognitiveCoreHub` |
| 8 | Removido ou desmontado? | **Desmontado/reordenado** (CERT-01.6 + INC-008) |
| 9 | CSS existe? | Sim — `cognitivePresence.css`, `cognitiveEcosystem.css` |
| 10 | Partilhado entre dashboards? | Sim — `CentroComando`, `DashboardMecanico` (shell), `Layout` (ManuIA compact) |

---

## Status final desta execução

```
BASELINE_ENVIRONMENT_DASHBOARD_V1 = FROZEN
COGNITIVE_LAYER_AUDIT = COMPLETE
NO_PRODUCTION_CODE_CHANGED = TRUE
GLOBAL_DASHBOARD_PRESENTATION_NOT_FINAL = TRUE
SAFE_FORWARD_PORT_PLAN = DOCUMENTED
```
