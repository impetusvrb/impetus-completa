# COGNITIVE_FLOW_MASTER_MAP — FASE 47-A

**Data:** 2026-06-03  
**Modo:** READ ONLY — mapeamento de código e rotas  
**Referência:** Plano original Etapa 1 + núcleo Truth 03/06

Legenda: **PROTECTED** | **PARTIAL** | **UNPROTECTED** | **N/A** (sem texto LLM operacional livre)

---

## Fluxo canónico (quando aplicável)

```text
IA (modelo / orquestrador)
  ↓ Prompt Builder
  ↓ Context Provider
  ↓ Truth Enforcement (industrialTruthEnforcementService / cognitiveTruthClosureService)
  ↓ Hallucination Detection (V1 integrado em enforce + ai_hallucination_assessments)
  ↓ Response (HTTP / WebRTC / JSON painel)
```

---

## Tabela mestra

| Fluxo | Entrada principal | Prompt Builder | Context Provider | Truth | Hallucination | Classificação |
|-------|-------------------|----------------|------------------|-------|---------------|---------------|
| **Dashboard Chat** | `POST /dashboard/chat` | GPT + `structuralAIGovernance` + pack contextual | `retrieveContextualData`, snapshots, KPIs | `enforceTextResponse` / `applyCognitiveTextTruth` | Via enforce + assessments | **PROTECTED** |
| **Chat Principal** (@ImpetusIA) | `chat.js` → `chatAIService.consolidated` | OpenAI / triade | `operationalMemoryBinding`, contextual pack | `finalizeAndDeliverChatReply` → `applyCognitiveTextTruth` | Via closure | **PROTECTED** |
| **Chat Multimodal** | `POST /dashboard/chat-multimodal` | `multimodalChatService` + GPT | Ficheiro + mensagem | `applyCognitiveTextTruth` | Via closure | **PROTECTED** |
| **Executive Chat** | `executiveMode.processCEOMessageFromWeb` em `chat.js` | Modo CEO dedicado | Memória executiva | **Sem** truth closure | Não auditado | **UNPROTECTED** |
| **Cockpit Chat** | Widgets cockpit Z.* / Motor A | Blocos registry (shadow/partial) | BD + `cognitiveRuntimeFacade` | Widgets: dados BD; chat cockpit raro | N/A texto livre | **N/A / PARTIAL** |
| **Smart Panel** | `POST /dashboard/panel-command` | `smartPanelCommandService` plano LLM | Hidratação KPIs/snapshots | `guardPanelVisualizationPayload` + trace meta | Guard numérico, não texto completo | **PARTIAL** |
| **Voice Assistant** | `POST /api/voz/conversa` → `impetusVoiceChatService` | `buildSystemPrompt` + `runAI` | `chatUserContext`, memória sessão | **Sem** enforce pós-resposta | **Sem** | **UNPROTECTED** |
| **Anam Realtime** | Anam SDK WebRTC + `anamService` | `buildAnamSystemPrompt` | `voiceRealtimeContextService`, `injectOperationalVoiceContext` | Pós-fala: `assessVoiceTranscriptShadow` + oral enforce (cliente) | Shadow + oral | **PARTIAL** |
| **Voice Context Service** | `voiceRealtimeContextService.buildVoiceRealtimeContext` | Appendix truth no prompt | KPIs, snapshots, bridge SZ5 | Só prompt; não valida fala | N/A saída | **PARTIAL** |
| **Voice Realtime Context** | `GET /dashboard/voice-realtime-context` | N/A (JSON contexto) | Mesmo serviço | N/A | N/A | **PARTIAL** (entrada) |
| **Quality Assistant** | Cockpit quality_native + APIs quality-intelligence | Blocos cognitivos | BD qualidade | Sem LLM KPI livre nas rotas auditadas | N/A | **PROTECTED** (dados) |
| **Production Assistant** | `PRODUCTION_COGNITIVE_RUNTIME=production_native` | Cockpit blocks | PLC, ordens | Widgets governados | N/A | **PROTECTED** (dados) |
| **Maintenance Assistant** | ManuIA + manutenção cockpit | Vários serviços | OT/manutenção | Live chat: closure; analyze-frame: não | Parcial | **PARTIAL** |
| **Safety Assistant** | Cockpit shadow | Registry shadow | BD safety | Shadow UI | N/A | **PARTIAL** |
| **Environment Assistant** | Cockpit shadow | Registry shadow | BD environment | Shadow UI | N/A | **PARTIAL** |
| **Executive Assistant** | Executive cockpit shadow | Registry | Consolidado executivo | Shadow/preview | N/A | **PARTIAL** |
| **RH Assistant** | HR cockpit shadow | Registry | BD RH | Shadow | N/A | **PARTIAL** |
| **Cognitive Council** | `cognitiveCouncil.js` + ramo triade em `dashboard/chat` | `runCognitiveCouncil` | `retrieveContextualData` | `applyCognitiveTextTruth` (F34+) | Via enforce | **PROTECTED** |
| **Workflow Engine** | `workflowEngine` orchestrator | N/A geração narrativa KPI | Eventos industriais | Sem resposta LLM métrica ao utilizador | N/A | **N/A** |
| **Action Runtime** | `actionRuntime` HITL | N/A LLM livre | Fila aprovação | Sem narrativa inventada auditada | N/A | **N/A** |
| **Alert System** | `getIntelligentAlerts` | N/A | SQL agregação | Sem LLM | N/A | **N/A** |
| **ManuIA** | `manutencao-ia` live + analyze-frame | OpenAI copilot / Gemini visão | Dossiê técnico | Live chat: `finalizeManuIaCopilotReply`; frame: **sem** truth texto | Parcial | **PARTIAL** |

---

## Detalhe por fluxo crítico

### Dashboard Chat
- **Ficheiros:** `routes/dashboard.js` (~3158+), `industrialTruthEnforcementService.enforceTextResponse`
- **Bypass residual:** ramos erro/FALLBACK sem texto; conselho tem ramo separado (protegido)

### Anam Realtime
- **Ficheiros:** `anamService.js`, `voiceRealtimeContextService.js`, `anamPanelBridge.js`, `POST voice-truth-shadow-validate`
- **Gap:** stream Anam cloud gera texto **antes** do servidor; correção **pós-fala**

### Voice Assistant (`/api/voz`)
- **Ficheiros:** `impetusVoiceChatService.js`, `ai/orchestrator.runAI`
- **Gap:** nenhum `applyCognitiveTextTruth` no turno

### Executive Chat
- **Ficheiros:** `executiveMode.js`, atalho CEO em `chat.js`
- **Gap:** resposta directa ao chat sem truth

---

## Conclusão Etapa 1 (FASE 47-A)

| Métrica | Valor |
|---------|-------|
| Fluxos mapeados | 22 |
| PROTECTED | 6 |
| PARTIAL | 11 |
| UNPROTECTED | 2 |
| N/A | 3 |

**Etapa 1:** **COMPLETE** para inventário único; manutenção contínua quando novos canais forem adicionados.

---

*FASE 47-A — sem alteração de código.*
