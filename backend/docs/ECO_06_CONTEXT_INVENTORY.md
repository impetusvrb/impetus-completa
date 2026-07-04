# ECO-06 — Inventário Conversation Context Engine (PARTE 1)

**Fase:** 6 · **Data:** 2026-07-02 · **Base:** ADR-ECO-004

---

## Fluxo CCE

```text
Mensagem / voz
  → resolveConversationContext (conversationContextEngine.js)
  → classifyConversationContext (heurística)
  → executivePresentationContext (modo apresentação)
  → buildPromptAppend (perfil conversacional)
  → [ECO-06] conversationKnowledgeConsumerAdapter
  → voiceRealtimeContextService / executiveMode / smartPanelCommandService
```

---

## Classificação de responsabilidades

| Área | Módulo | Classificação |
|------|--------|---------------|
| Contexto operacional (perfil tom/verbosidade) | `conversationContextClassifier.js` | **Permanece próprio** |
| Memória conversacional efémera | `presentationContextSessionStore.js` | **Permanece próprio** |
| Memória institucional | — (não existia no CCE) | **Passa a consumir KB** |
| Contexto persistente (apresentação) | `executivePresentationContext.js` | **Permanece próprio** |
| Consultas históricas institucionais | — | **Passa a consumir KB** (`history`) |
| Conhecimento duplicado | Nenhum índice paralelo detectado | **N/A — gap, não duplicação** |

---

## Tipos KB consumidos (certificados)

| Tipo EG | Uso no CCE |
|---------|-------------|
| Institutional Knowledge | `buildInstitutionalKnowledgeReport` (refs) |
| Historical References | `queryKnowledge({ type: 'history' })` |
| Similar Cases | `queryKnowledge({ type: 'similar_case' })` |
| Recommendations | `queryKnowledge({ type: 'recommendation' })` |
| Policy References | `queryKnowledge({ type: 'policy' })` |
| Decision References | `queryKnowledge({ type: 'decision' })` |

---

## Legado / fora de scope ECO-06

| Item | Motivo |
|------|--------|
| `conversationProfileRegistry.js` | Perfil UX — não institucional |
| `conversationContextObservability.js` | Métricas CCE próprias |
| `dashboardProfileResolver` | Permissões/perfil dashboard |
| Knowledge Base service core | **Congelado** — read-only via adapter |

---

## Consumidores CCE

| Consumidor | Entry |
|------------|-------|
| `voiceRealtimeContextService.js` | Voz / realtime |
| `executiveMode.js` | Modo executivo |
| `smartPanelCommandService.js` | SmartPanel |

---

## Dependências pós-ECO-06

```text
conversationContextEngine
  → conversationContextClassifier, executivePresentationContext
  → [ECO-06] conversationKnowledgeConsumerAdapter
       → governanceKnowledgeBaseService (queryKnowledge, read-only)
       → ecoContextFlags (ECO_CONTEXT_VIA_EG)
```
