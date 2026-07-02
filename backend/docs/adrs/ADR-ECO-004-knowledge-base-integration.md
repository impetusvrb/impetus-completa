# ADR-ECO-004 — Knowledge Base Integration

**Status:** Aceite (contrato ECO-02)  
**Data:** 2026-07-02  
**Fase de implementação:** ECO-06  
**Relacionado:** EG-19, Conversation Context Engine

---

## Motivação

O Conversation Context Engine (`backend/src/conversationContext/`) classifica contexto de conversa para prompts (style, audience, domain) sem aceder à Knowledge Base institucional do Event Governance (EG-19). A convergência liga o engine ao índice de referências governadas, enriquecendo prompts com conhecimento operacional auditado sem alterar o pipeline de execução EG.

---

## Arquitetura atual

```text
Mensagem chat → resolveConversationContext
              → classifyConversationContext (heurística + LLM)
              → prompt assembly (sem KB institucional)
              → cognitiveController / chatAIService
```

- **Impacto actual:** prompt/style apenas — sem notificação  
- **KB EG:** `governanceKnowledgeBaseService` ONLINE, audit API apenas  
- **Sem NC crítica** — gap de enriquecimento cognitivo

---

## Arquitetura futura

```text
Mensagem chat → resolveConversationContext
              → classifyConversationContext
              → Knowledge Base Consumer
                    GET audit/knowledge-base?refs=…
                    merge referências institucionais no contexto
              → prompt enriquecido
              → Controller (pós-EG em ECO-04)
```

O Conversation Context Engine torna-se **consumidor read-only** da Knowledge Base; não publica eventos nem altera políticas.

---

## Impacto

| Área | Impacto |
|------|---------|
| `conversationContext/*.js` | Novo consumer KB |
| `governanceKnowledgeBaseService.js` | **Sem alteração** — só leitura audit |
| Controller / chat | Prompts mais ricos; sem mudança API |
| ANAM | Opcional — pode consumir mesmo consumer |

---

## Riscos

| Risco | Mitigação |
|-------|-----------|
| Prompt injection via refs KB | Sanitização refs; allowlist company_id |
| Latência fetch KB | Cache por sessão; timeout 200ms |
| Contexto stale | TTL + timestamp mono na UI debug |

---

## Estratégia de migração

1. **Pré-requisito:** ECO-05 (Pulse consumer) completo.
2. **KB Consumer module:** `conversationContext/knowledgeBaseConsumer.js` (novo ficheiro ECO-06).
3. **Shadow:** log refs que seriam injectadas; não altera prompt.
4. **Enrich:** Flag `ECO_CONVERSATION_KB_ENRICH=true`.
5. **Observabilidade:** audit log de refs consumidas por sessão.

**Estratégia:** Consumer (read-only).

**Rollback:** `ECO_CONVERSATION_KB_ENRICH=false` — prompts sem KB.

---

## Alternativas descartadas

| Alternativa | Motivo |
|-------------|--------|
| KB no pipeline exec | Alteraria EG v1 |
| Duplicar índice KB no conversationContext | Dívida de sincronização |
| Substituir classificação por KB | Perde heurística de audience |

---

## Referências

- `backend/src/conversationContext/`
- `backend/src/services/governanceKnowledgeBaseService.js`
- [`ECO_02_CONVERGENCE_ARCHITECTURE.md`](../ECO_02_CONVERGENCE_ARCHITECTURE.md)
