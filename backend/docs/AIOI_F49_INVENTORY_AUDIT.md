# AIOI_F49_INVENTORY_AUDIT

**Fase:** AIOI-ORG-3 — F49 Certification Closure  
**Etapa:** 1 — Inventário F49  
**Data:** 2026-06-10  
**Modo:** READ ONLY · AUDIT ONLY · ADDITIVE ONLY  
**Pré-requisitos:** `AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS` · `AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS`

---

## 1. Definição Canónica de F49

**F49 = Truth Program Closure + Gemini/TRI-AI Certification**

Conforme documentado em `AIOI_GOVERNANCE_01_CERTIFICATION.md`, `AIOI_ARCHITECTURE_TARGET_FORENSIC_01.md` e `AIOI_P0_AUTHORIZATION.md`:

> "F49 neste repositório = fecho do programa Truth + validação Gemini (INDUSTRIAL_TRUTH_PROGRAM_CLOSURE.md, TRI_AI_CERTIFICATION_STATUS.md). Não define schema IOE, bus operacional nem lógica de fila."

F49 tem dois sub-tracks:

| Sub-track | Documento | Estado |
|-----------|-----------|--------|
| **F49-E** Truth Program Closure | `INDUSTRIAL_TRUTH_PROGRAM_CLOSURE.md` | `TRUTH_PROGRAM_COMPLETE_WITH_EXTERNAL_DEPENDENCIES` |
| **F49-B** TRI-AI Gemini Certification | `TRI_AI_CERTIFICATION_STATUS.md` | `TRI_AI_PENDING_EXTERNAL_DEPENDENCY` |

---

## 2. Componentes F49 Identificados

### 2.1 Serviço Gemini

| # | Componente | Caminho | Função |
|---|------------|---------|--------|
| 1 | `geminiService.js` | `backend/src/services/geminiService.js` | Cliente Google GenAI (AI Studio / Vertex); `isAvailable()`, `generateText()`, `analyzeImage()`, `geminiSupervisor()` |
| 2 | `geminiIngressEngine.js` | `backend/src/services/geminiIngressEngine.js` | Contexto ingress HTTP; gate `IMPETUS_GEMINI_INGRESS_ENABLED` |
| 3 | `geminiIngressMiddleware.js` | `backend/src/middleware/geminiIngressMiddleware.js` | Middleware opcional HTTP |
| 4 | `geminiIngressMetrics.js` | `backend/src/services/geminiIngressMetrics.js` | Métricas ingress |

### 2.2 Pontos de Uso Gemini no Código

| # | Módulo | Arquivo | Uso | Graceful fallback? |
|---|--------|---------|-----|--------------------|
| 1 | Percepção multimodal | `ai/layers/executionLayer.js` | Texto + visão industrial | Sim — `!isAvailable()` guarda |
| 2 | Ingress gate | `services/geminiIngressEngine.js` | Contexto obrigatório se enforce ON | Sim — modo degradado |
| 3 | Event pipeline intent | `eventPipeline/intent/intentRefinementService.js` | Refinamento de intent | Sim |
| 4 | Cognitive intent ingress | `ai/cognitiveIntentIngress.js` | Classificação de intent | Sim |
| 5 | Orquestrador | `services/aiOrchestrator.js` | Imagem/sensor | Sim |
| 6 | Qualidade | `services/aiComplaintDetectionService.js` | Classificação reclamação | Sim — retorna `null` se indisponível |
| 7 | ManuIA analyze-frame | `services/manuiaLiveAssistanceService.js` | Visão ao vivo | Sim — degradado |
| 8 | Cadastro c/ IA | `routes/cadastrarComIA.js` | Extração de imagem | Sim |
| 9 | HITL classifier | `services/humanValidationClosureService.js` | Classificador reação | Sim — fallback heurístico |
| 10 | Chat operacional | `services/operationalRealtimeCoordinator.js` | Coordenação realtime | Sim |
| 11 | Health check | `services/aiIntegrationsHealthService.js` | Sondagem `/health` | N/A (read only) |
| 12 | Architecture health | `services/architectureHealthService.js` | `gemini_available` flag | N/A |
| 13 | Vertex central | `ai/vertexCentralOrchestrator.js` | Pipeline Gemini→Claude→GPT | Sim — bypass se down |
| 14 | Registro IA | `governance/aiModelRegistry.js` | `google:gemini-1.5-pro` registado | N/A |

### 2.3 Scripts e Ferramentas F49

| # | Arquivo | Função |
|---|---------|--------|
| 1 | `scripts/gemini-readiness-audit.js` | Auditoria status Gemini |
| 2 | `scripts/gemini-live-ping.js` | Ping live API |
| 3 | `docs/gemini-readiness-audit-fase49.raw.json` | Resultado última auditoria F49 |
| 4 | `docs/gemini-readiness-audit-46.7.raw.json` | Resultado auditoria F46.7 |
| 5 | `docs/gemini-live-ping-46.6.raw.json` | Ping F46.6 |

### 2.4 Documentação F49

| # | Documento | Conteúdo |
|---|-----------|----------|
| 1 | `INDUSTRIAL_TRUTH_PROGRAM_CLOSURE.md` | Fecho F49-E — `TRUTH_PROGRAM_COMPLETE_WITH_EXTERNAL_DEPS` |
| 2 | `TRI_AI_CERTIFICATION_STATUS.md` | F49-B — `TRI_AI_PENDING_EXTERNAL_DEPENDENCY` |
| 3 | `TRI_AI_PRODUCTION_CERTIFICATION.md` | Produção TRI-AI |
| 4 | `GEMINI_PRODUCTION_READINESS_CERTIFICATION.md` | Status `NOT_READY_FOR_PRODUCTION` (F46.5-J) |
| 5 | `GEMINI_PRODUCTION_READINESS_REPORT.md` | Root cause — credenciais ausentes |
| 6 | `GEMINI_PRE_ACTIVATION_AUDIT.md` | Auditoria pré-ativação |
| 7 | `GEMINI_STUDIO_ACTIVATION_GUIDE.md` | Guia ativação AI Studio |
| 8 | `GEMINI_VERTEX_ACTIVATION_PLAN.md` | Plano ativação Vertex |
| 9 | `GEMINI_VERTEX_AUDIT_REPORT.md` | Auditoria Vertex |
| 10 | `GEMINI_VERTEX_ROOT_CAUSE.md` | Root cause Vertex |
| 11 | `GEMINI_LIVE_CERTIFICATION.md` | Certificação live |

### 2.5 Feature Flags F49/Gemini

| Flag | Default atual | Função |
|------|--------------|--------|
| `GEMINI_API_KEY` | ausente / inválida | Credencial Google AI Studio |
| `GOOGLE_API_KEY` | ausente | Alternativa credencial |
| `GOOGLE_GENAI_USE_VERTEXAI` | não definida | Vertex ADC mode |
| `GOOGLE_CLOUD_PROJECT` | não definida | Vertex project ID |
| `IMPETUS_GEMINI_INGRESS_ENABLED` | `true` (`.env`) | Motor ingress HTTP |
| `IMPETUS_ENFORCE_GEMINI_INGRESS` | não ativado | Gate obrigatório ingress |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Modelo padrão |
| `GEMINI_SUPERVISOR_MODEL` | `gemini-2.5-flash` | Modelo supervisor |

---

## 3. Componentes F49 — Rerank e Weight Versions

| Componente | Estado | Caminho |
|------------|--------|---------|
| IA rerank fila CEO | **AUSENTE** | Não implementado |
| `aioi_weight_versions` | **AUSENTE** | Tabela não existe |
| `aioi_outcomes` | **AUSENTE** | Tabela não existe |
| Proposta admin weight change | **AUSENTE** | Não implementado |
| Ranking engine AIOI autónomo | **AUSENTE** | F47 `operationalPrioritizationService` é o soberano |

---

## 4. Estado Atual F49 — Síntese Forense

| Dimensão | Estado |
|----------|--------|
| Gemini serviço (código) | **IMPLEMENTADO** — `geminiService.js` production-grade |
| Gemini credenciais | **PENDENTE** — chave inválida/ausente |
| Gemini functional (ping) | **FAIL** — `live_ping.ok=false`, `API_KEY_INVALID` |
| Truth Program (F49-E) | **CONCLUÍDO** — `TRUTH_PROGRAM_COMPLETE_WITH_EXTERNAL_DEPS` |
| TRI-AI (F49-B) | **PARCIAL** — OpenAI UP, Anthropic UP, Gemini DOWN |
| IA rerank | **NÃO INICIADO** |
| Weight versions | **NÃO INICIADO** |
| Stress 100 perguntas | **CONCLUÍDO** — 95/100 PASS, 0% invenção (F48) |

---

## 5. Módulos com `isAvailable()` Guard (não bloqueiam operação)

Todos os 13 pontos de uso Gemini têm verificação `geminiService.isAvailable()` antes de chamar a API, garantindo operação degradada sem Gemini.

**Impacto operacional sem Gemini:**

| Funcionalidade | Impacto |
|----------------|---------|
| Chat dashboard / CEO | **ZERO** — usa OpenAI |
| Voz / Anam | **ZERO** — usa OpenAI |
| ManuIA texto | **ZERO** — usa OpenAI |
| ManuIA visão (analyze-frame) | **DEGRADADO** — sem análise de imagem |
| Cognitive council | **ZERO** — usa OpenAI/Claude |
| HITL classifier | **DEGRADADO** — fallback heurístico |
| Intent refinement | **DEGRADADO** — skip Gemini stage |
| Cadastro com IA (imagem) | **DEGRADADO** — sem extração visual |
| AIOI P0–P2 (fila, decisão, execução) | **ZERO** — 100% determinístico |
| AIOI P3 IA rerank | **BLOQUEADO** — requer Gemini + volume |

---

## 6. Invariantes Preservados

| Invariante | Estado |
|------------|--------|
| Queue Governance ORG-1 | Preservada |
| Truth Stage 7 ORG-2 | Preservada |
| P6 / P7 / P8 | Intocados |
| `runtime_enabled/active/authorized` | `false` |
| `cognitive_execution_allowed` | `false` |

---

*AIOI_F49_INVENTORY_AUDIT — Etapa 1 AIOI-ORG-3 · read only.*
