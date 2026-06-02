# COGNITIVE_FLOW_INVENTORY

**Auditoria:** PROMPT 33A (read-only)  
**Data:** 2026-06-01

Legenda de classificação: **VERIFIED** | **PARTIALLY VERIFIED** | **NOT VERIFIED**

---

## CHAT

### 1. Dashboard Chat (Impetus IA — Centro de Comando / widget)

| Campo | Detalhe |
|-------|---------|
| **Entry point** | `POST /api/dashboard/chat` — `backend/src/routes/dashboard.js` |
| **Frontend** | `frontend/src/services/api.js` → `dashboard.chat`; `DashboardChatWidget.jsx`, `WidgetPergunteIA.jsx`, `AIChatPage.jsx` |
| **Prompt builder** | `buildDashboardChatPrompt` / `buildNoDataPrompt` (`backend/src/ai/prompts/`) + `structuralAIGovernance.buildAIGovernancePackage` |
| **Context builder** | `dataRetrievalService.retrieveContextualData`; `cognitiveGovernanceFacade.governChatRequest`; `secureContextBuilder`; `proactiveRetrievalService` |
| **Context providers** | KPI pack, `interpretContext`, lineage, autonomous appendix |
| **Truth enforcement** | **PARCIAL** — `industrialTruthEnforcementService.enforceTextResponse` no ramo GPT final |
| **Hallucination detection** | `aiAnalytics.enqueueAiTrace` → `hallucinationDetectionService.enqueueTraceAssessment` (assíncrono) |
| **Response pipeline** | GPT → `synthesize` → egress → `applyUnifiedPostProcessing` → safety → **truth** → trace |
| **Delivery** | JSON `{ reply, content, industrial_truth?, trace headers }` |
| **Classificação** | **PARTIALLY VERIFIED** |

**Mapa (ramo GPT):**

```text
Utilizador
  ↓ POST /dashboard/chat
Prompt Builder (dashboardChatPrompt / noDataMode + structuralAIGov)
  ↓
Context Provider (retrieveContextualData + governChatRequest)
  ↓
LLM (OpenAI via runLlm / síntese)
  ↓
Egress + Safety + applyUnifiedPostProcessing
  ↓
Truth Enforcement (enforceTextResponse) ← obrigatório neste ramo
  ↓
Hallucination Detection (pós-trace, não bloqueia por defeito)
  ↓
Resposta HTTP
```

**Bypass CRITICAL:** se `UNIFIED_DECISION_USE_TRIADE` + `cognitive_escalation`, `runCognitiveCouncil` responde em `return res.json` **sem** passar por `enforceTextResponse` (linhas ~3275–3376 em `dashboard.js`).

---

### 2. Multimodal Chat

| Campo | Detalhe |
|-------|---------|
| **Entry point** | `POST /api/dashboard/chat-multimodal` |
| **Prompt builder** | `multimodalChatService.processMultimodalChat` |
| **Context** | `companyId`, `fileContext`, imagem; sem `dashboardContextualPack` completo |
| **Truth enforcement** | **SIM** — `enforceTextResponse` (`injectOperational: true`) |
| **Hallucination** | `enqueueAiTrace` (`module_name: dashboard_chat_multimodal`) |
| **Classificação** | **PARTIALLY VERIFIED** (enforcement sem pack contextual rico) |

---

### 3. Executive Chat

| Campo | Detalhe |
|-------|---------|
| **Entry point** | Mesmo `POST /dashboard/chat` (perfis CEO/diretor no dashboard executivo) |
| **Contexto extra** | KPIs executivos via mesmo `retrieveContextualData`; cockpits em `GET /dashboard/me` via `cognitiveRuntimeFacade` |
| **Truth / hallucination** | Igual Dashboard Chat |
| **Nota** | `operationalForecastingAI.answerOperationalQuestion` existe mas **não** há rota HTTP mapeada no grep de rotas |
| **Classificação** | **PARTIALLY VERIFIED** |

---

### 4. Cockpit Chat

| Campo | Detalhe |
|-------|---------|
| **Definição** | Não há endpoint `cockpit/chat`. Cockpits (`qualityCockpitRuntime`, `productionCockpit`, etc.) são **composição UI** alimentada por `GET /dashboard/me` + runtime Z18–Z26 |
| **Chat associado** | `WidgetPergunteIA` / overlay voz no cockpit → **Dashboard Chat** ou **Anam** |
| **Classificação** | **PARTIALLY VERIFIED** (via chat partilhado) |

---

### 5. Smart Panel Chat

| Campo | Detalhe |
|-------|---------|
| **Entry point** | `POST /api/dashboard/panel-command` |
| **Serviço** | `smartPanelCommandService.processPanelCommand` |
| **Prompt builder** | `buildSystemPrompt` (plano JSON: type chart/table/kpi/…) |
| **Context** | `dashboardKPIs`, `softwareOperationalSnapshotService`, `chatContextBridge` (PANEL), `operationalBrainEngine` opcional |
| **Truth** | Plano LLM → **hidratação servidor** com números reais → `guardPanelVisualizationPayload` |
| **Hallucination** | Não aplicável ao texto; risco no plano intermédio |
| **Delivery** | JSON painel (`barData`, `kpiCards`, `reportContent`, `truth_guard`) |
| **Classificação** | **PARTIALLY VERIFIED** |

```text
Comando utilizador
  ↓ LLM plano (OpenAI/Claude interpreter)
  ↓ hydratePanelPayload (dados reais PostgreSQL/snapshot)
  ↓ guardPanelVisualizationPayload (Industrial Truth)
  ↓ Frontend SmartPanel / DynamicPanelRenderer
```

---

### 6. Quality / Production / Maintenance / Safety / Environment Chat

| Campo | Detalhe |
|-------|---------|
| **Endpoints dedicados** | **Não encontrados** para chat LLM por domínio |
| **APIs domínio** | Ex.: `GET /api/quality-intelligence/*` — dados BD, sem LLM |
| **Assistência IA domínio** | Conselho com `module: 'environmental'` etc. em `cognitiveOrchestrator`; Manutenção → ManuIA |
| **Chat UX** | Reutiliza Dashboard Chat ou voz |
| **Classificação** | **PARTIALLY VERIFIED** (chat) / **VERIFIED** (APIs só leitura) |

---

### 7. Chat interno (@ImpetusIA)

| Campo | Detalhe |
|-------|---------|
| **Entry point** | `POST /api/chat/...` + socket — `chatAIService.loader` → `chatAIService.consolidated` |
| **Prompt** | `buildLiveChatSystemPrompt` + LGPD protocol |
| **Context** | `retrieveContextualData` se `CHAT_USE_TRIADE=true`; senão histórico + orquestrador |
| **Truth enforcement** | **NÃO** |
| **Hallucination** | Só se `enqueueAiTrace` for chamado (não encontrado no consolidated) |
| **SZ5** | `chatContextBridge` via `CHANNELS.TEXT` quando unification activa |
| **Classificação** | **NOT VERIFIED** |

---

### 8. Conselho Cognitivo (API directa)

| Campo | Detalhe |
|-------|---------|
| **Entry point** | `POST /api/cognitive-council/execute` — `routes/cognitiveCouncil.js` |
| **Orquestração** | `unifiedOrchestrator` ou `runCognitiveCouncil` |
| **Context** | Auto-inject `retrieveContextualData` em `cognitiveOrchestrator.js` |
| **Truth** | **NÃO** |
| **Firewall** | `promptFirewall.analyzePrompt` |
| **Desactivação** | `IMPETUS_PIPELINE_PRIMARY=true` → 503 |
| **Classificação** | **NOT VERIFIED** |

---

## VOZ

### Anam Realtime

Ver [`ANAM_REALTIME_TRUTH_AUDIT.md`](./ANAM_REALTIME_TRUTH_AUDIT.md). **PARTIALLY VERIFIED**.

### OpenAI Realtime (fallback)

| Campo | Detalhe |
|-------|---------|
| **Entry** | `useVoiceEngine.js` + `openaiRealtimeVoiceSession.js` quando `VITE_ANAM_PRIMARY` false |
| **Context** | `GET /dashboard/voice-realtime-context` → `buildVoiceRealtimeContext` |
| **Truth** | Prompt appendix apenas |
| **Classificação** | **PARTIALLY VERIFIED** |

### Voice Context Service

| Campo | Detalhe |
|-------|---------|
| **Serviço** | `voiceRealtimeContextService.js` |
| **Origem** | `dashboardKPIs`, `dashboardAccessService`, `softwareOperationalSnapshotService`, `chatContextBridge`, `structuralAIGovernance` |
| **RBAC** | `getAllowedKpis`, `userCanAccessDomain`, `buildAIGovernancePackage` |
| **company_id** | Via `user.company_id` em todas as queries downstream |
| **Cache** | Sem cache de longa duração no serviço; Anam token cache separado |

---

## ASSISTENTES POR DOMÍNIO

| Domínio | Runtime principal | Context providers | Prompts | Permissões | SZ5 | Truth |
|---------|-------------------|-------------------|---------|------------|-----|-------|
| **Quality** | `qualityIntelligenceService` + cockpit Z23 | BD `quality_*` | N/A chat | `getQualityProfileForUser` | Via dashboard chat bridge | N/A API |
| **Production** | `productionCockpitConsolidationRuntime` | PLC / produção snapshots | Cockpit widgets | `dashboardAccessService` | Bridge se chat | Parcial chat |
| **Maintenance** | `maintenanceCockpit` + **ManuIA** | `manuiaLiveAssistanceService`, Gemini vision | `COPILOT_SYSTEM` | `manuiaGuard` | Parcial | **NÃO** live chat |
| **Safety** | `safetyCockpitConsolidationRuntime` | SST snapshots | Cockpit | RBAC hierárquico | Parcial | Parcial chat |
| **Environment** | `environmentalCockpit` | Ambiental / ESG APIs | Cockpit | RBAC | Parcial | Parcial chat |
| **Executive** | Dashboard + forecasting APIs | `operationalForecastingService` | Dashboard chat | CEO/diretor | Parcial | Parcial chat |
| **RH** | `hrCockpitConsolidationRuntime` | RH snapshots | Cockpit | RBAC | Parcial | Parcial chat |

---

## AUTOMAÇÕES

### Workflow Engine

| Campo | Detalhe |
|-------|---------|
| **Entry** | `/api/workflow-engine/*` — `workflowOrchestrator.js` |
| **Decisão** | BPMN / state machine / HITL `approvalChainService` |
| **Evidência** | `workflowAuditTracer.js` |
| **LLM** | Não encontrado em `workflowEngine/` |
| **Truth / Hallucination** | N/A |
| **Classificação** | **VERIFIED** (não gera KPI fictício via LLM) |

### Action Runtime

| Campo | Detalhe |
|-------|---------|
| **Entry** | `/api/action-runtime/*` |
| **Decisão** | `actionRuntimeOrchestrator` + flags |
| **LLM** | Não encontrado |
| **Classificação** | **VERIFIED** |

### Smart Panel

Ver secção 5 CHAT. **PARTIALLY VERIFIED**.

### Alertas Inteligentes

| Campo | Detalhe |
|-------|---------|
| **Entry** | `GET /api/dashboard/forecasting/alerts` |
| **Serviço** | `operationalForecastingService.getIntelligentAlerts` |
| **LLM** | Não na listagem de alertas |
| **Classificação** | **VERIFIED** |

---

## PAINEL CLAUDE (pós-voz)

| Campo | Detalhe |
|-------|---------|
| **Entry** | `POST /api/dashboard/claude-panel` |
| **Serviço** | `claudePanelService.generateVisualPanel` |
| **Context** | Snapshots + `chatContextBridge` (PANEL) |
| **Regras prompt** | «NÃO invente números»; `hasNoDataSignal` → `shouldRender: false` |
| **Truth enforcement** | **NÃO** — sem `guardPanelVisualizationPayload` |
| **Classificação** | **NOT VERIFIED** |

---

## AUDITORIA DE VERDADE (por fluxo — resumo)

| Fluxo | (1) Truth | (2) Serviço | (3) Bypass? | (4) Fallback sem dados | (5) Risco fictício |
|-------|-----------|-------------|-------------|------------------------|-------------------|
| Dashboard GPT | PARCIAL | `industrialTruthEnforcementService` | SIM (council) | SIM (`MSG_NO_DATA`) | MEDIUM |
| Multimodal | PARCIAL | idem | NÃO no enforcement | SIM | MEDIUM |
| Chat interno | NÃO | — | SIM | Prompt only | HIGH |
| Conselho | NÃO | — | SIM | Prompt + dados inject | HIGH |
| Smart Panel | SIM (guard) | idem | NÃO pós-hidratação | SIM chart downgrade | LOW–MEDIUM |
| Anam | PARCIAL | appendix prompt | SIM (stream) | Instruções prompt | HIGH |
| Claude panel | NÃO | — | SIM | Parcial signal | HIGH |
| ManuIA live | NÃO | — | SIM | Dossiê JSON | HIGH |

---

## Integração SZ5

Canal registry (`runtimeUnification/governance/channelRegistry.js`):

- **VOICE / PANEL:** `chatContextBridge` → `unifiedSz5RuntimeFacade.buildChannelContext`
- **TEXT:** consumidores `chatAIService.consolidated`
- **MEMORY / ORCHESTRATION:** observe-only / health

Legacy fallback: `impetusChatOperationalContextService` quando unification off.
