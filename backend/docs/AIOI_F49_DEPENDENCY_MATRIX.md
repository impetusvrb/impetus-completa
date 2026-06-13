# AIOI_F49_DEPENDENCY_MATRIX

**Fase:** AIOI-ORG-3 — F49 Certification Closure  
**Etapa:** 2 — Mapeamento de dependências F49  
**Data:** 2026-06-10  
**Modo:** AUDIT ONLY · ADDITIVE ONLY

---

## 1. Classificações

| Código | Significado |
|--------|-------------|
| `BLOCKED_BY_F49` | Não pode ser executado sem Gemini operacional |
| `PARTIAL_F49` | Funciona em modo degradado sem Gemini |
| `NO_F49_DEPENDENCY` | Independente de Gemini / F49 completamente |
| `F49_REPLACED_BY_OTHER` | Substituído por OpenAI/Claude ou outro mecanismo |
| `F49_DEFERRED_P3` | Bloqueado mas diferido para fase P3 (não urgente) |

---

## 2. Quem depende de F49 (Gemini)

| Componente | Classificação | Dependência específica | Impacto sem Gemini |
|------------|---------------|----------------------|-------------------|
| ManuIA `analyze-frame` visão | `BLOCKED_BY_F49` | `identifyPartFromImageWithGemini()` | Análise de imagem indisponível |
| Percepção multimodal (`executionLayer`) | `PARTIAL_F49` | `analyzeImage()` / `generateText()` | Texto degradado; imagem OFF |
| Intent refinement pipeline | `PARTIAL_F49` | `intentRefinementService` Gemini stage | Skip Gemini; OpenAI/rule fallback |
| Cognitive intent ingress | `PARTIAL_F49` | `cognitiveIntentIngress` Gemini path | Fallback classifiers |
| HITL classifier `gemini_supervisor` | `PARTIAL_F49` | `humanValidationClosureService` | Fallback heurístico |
| Cadastro c/ IA (imagem produto) | `PARTIAL_F49` | `routes/cadastrarComIA.js` | Sem extração visual |
| AI complaint detection | `PARTIAL_F49` | `aiComplaintDetectionService` | Retorna `null` |
| **IA rerank fila CEO** | `BLOCKED_BY_F49` + `F49_DEFERRED_P3` | Gemini + volume IOE ≥10k/dia | Não implementado |
| **`aioi_weight_versions`** | `BLOCKED_BY_F49` + `F49_DEFERRED_P3` | P3 outcomes + Gemini | Não implementado |
| **`aioi_outcomes` + aprendizado** | `F49_DEFERRED_P3` | P1+ execution + volume | Não implementado |
| Vertex central pipeline Gemini→Claude→GPT | `PARTIAL_F49` | `vertexCentralOrchestrator` | Claude/GPT assumem |
| Architecture health `gemini_available` | `PARTIAL_F49` | `architectureHealthService` | Reporta `false` — não bloqueia |

---

## 3. Quem **não** depende de F49

| Componente | Classificação | Evidência |
|------------|---------------|-----------|
| AIOI P0 — IOE schema, adapters, outbox | `NO_F49_DEPENDENCY` | `AIOI_P0_AUTHORIZATION.md` §4 |
| AIOI P0 — classificação, criticidade, prioridade | `NO_F49_DEPENDENCY` | Determinístico via F47 |
| AIOI P0 — queue API + snapshot CEO | `NO_F49_DEPENDENCY` | `AIOI_P0_AUTHORIZATION.md` §4 |
| AIOI P0 — decision engine (shadow) | `NO_F49_DEPENDENCY` | OpenAI tools |
| AIOI P0 — execution / HITL workflow | `NO_F49_DEPENDENCY` | `actionRuntimeOrchestrator` |
| AIOI P1 — KPI MES snapshots | `NO_F49_DEPENDENCY` | MES connector independente |
| AIOI P2 — workflow / governance | `NO_F49_DEPENDENCY` | `workflowOrchestrator` |
| Dashboard chat CEO | `NO_F49_DEPENDENCY` | OpenAI |
| Voz / Anam | `NO_F49_DEPENDENCY` | OpenAI TTS / WebRTC |
| Claude Panel | `NO_F49_DEPENDENCY` | Anthropic |
| ManuIA live chat (texto) | `NO_F49_DEPENDENCY` | OpenAI |
| Truth enforcement F40–F47 | `NO_F49_DEPENDENCY` | Determinístico regex |
| Queue governance ORG-1 | `NO_F49_DEPENDENCY` | Governança documental |
| P8 Runtime Stack | `NO_F49_DEPENDENCY` | Foundation only, desativado |

---

## 4. Quem consumiria F49 (Gemini) quando disponível

| Consumidor futuro | Fase AIOI | Condição de ativação |
|-------------------|-----------|----------------------|
| IA rerank fila CEO | P3 | `GEMINI_API_KEY` válida + `≥10k IOE/dia` + Etapa 7 PASS |
| ManuIA analyze-frame → IOE automático | P1+ | `GEMINI_API_KEY` válida |
| Narrativa LLM Gemini em classificação IOE | P3 | `GEMINI_API_KEY` válida + Truth estável |
| Weight versions versionadas | P3 | P3 outcomes + volume + Gemini rerank |
| Vertex pipeline pleno | Qualquer | `GEMINI_API_KEY` válida + `GOOGLE_GENAI_USE_VERTEXAI=false` |

---

## 5. Quem está bloqueado por F49

| Bloqueado | Tipo de bloqueio | Desbloqueio |
|-----------|-----------------|-------------|
| IA rerank fila CEO | HARD (requisito técnico + de produto) | `GEMINI_API_KEY` válida + ≥10k IOE/dia + stress PASS |
| `aioi_weight_versions` | SOFT (roadmap P3) | Depende de P1 execution + volume P3 |
| ManuIA visão → IOE pipe | SOFT (enhancement) | `GEMINI_API_KEY` válida |
| TRI-AI READY status | SOFT (certificação) | Mesma chave |

---

## 6. Quem não depende mais de F49 (substituído)

| Componente | Substituição | Evidência |
|------------|--------------|-----------|
| Chat dashboard / CEO (narrativa) | OpenAI/Claude com Truth enforcement | F49-E closure + stress 95/100 |
| Cognitive council | OpenAI primário + Claude secundário | `TRI_AI_CERTIFICATION_STATUS.md` |
| Voice / Anam | OpenAI TTS + prompt appendix Truth | `INDUSTRIAL_TRUTH_PROGRAM_CLOSURE.md` |
| HITL classification (não-visão) | Heurístico fallback | `humanValidationClosureService` |
| Stress 100 perguntas Truth | Executado com OpenAI (F48) | 95 PASS, 0 invenção |

---

## 7. Matriz Resumida de Dependência

```
F49 Gemini
    │
    ├── BLOQUEADO (P3 futuro)
    │       ├── IA rerank fila CEO         [F49_DEFERRED_P3]
    │       ├── aioi_weight_versions        [F49_DEFERRED_P3]
    │       └── Narrativa Gemini em IOE     [F49_DEFERRED_P3]
    │
    ├── DEGRADADO (funciona sem — partial)
    │       ├── ManuIA analyze-frame       [PARTIAL_F49]
    │       ├── Percepção multimodal       [PARTIAL_F49]
    │       ├── Intent refinement          [PARTIAL_F49]
    │       ├── HITL classifier            [PARTIAL_F49]
    │       └── Vertex pipeline            [PARTIAL_F49]
    │
    └── INDEPENDENTE (zero impacto)
            ├── AIOI P0–P2                 [NO_F49_DEPENDENCY]
            ├── Queue governance ORG-1     [NO_F49_DEPENDENCY]
            ├── Truth Stage 7 ORG-2        [NO_F49_DEPENDENCY]
            ├── Chat / voz / council       [NO_F49_DEPENDENCY / F49_REPLACED_BY_OTHER]
            └── P8 Runtime Stack           [NO_F49_DEPENDENCY]
```

---

## 8. Dependências Classificadas — Contagem

| Classificação | Contagem |
|---------------|----------|
| `BLOCKED_BY_F49` + `F49_DEFERRED_P3` | 3 |
| `PARTIAL_F49` (degradado, operacional) | 6 |
| `NO_F49_DEPENDENCY` | 14+ |
| `F49_REPLACED_BY_OTHER` | 5 |

**Resultado:** F49 bloqueia apenas **3 features P3** que ainda não foram iniciadas e **não são urgentes** para a operação atual.

---

*AIOI_F49_DEPENDENCY_MATRIX — Etapa 2 AIOI-ORG-3.*
