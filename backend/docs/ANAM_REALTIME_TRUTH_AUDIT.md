# ANAM_REALTIME_TRUTH_AUDIT

**Auditoria:** PROMPT 33A (read-only)  
**Data:** 2026-06-01  
**Âmbito:** Anam Realtime, Voice Context Service, Voice Realtime Context, OpenAI Realtime fallback

---

## 1. Arquitectura Anam

```text
Browser (Anam SDK)
  ↓ POST /api/anam/session-token
anamService.createSessionToken
  ↓ buildAnamSystemPrompt(user, sessionCtx)
      ├─ buildChatUserContext (identidade, memória)
      └─ voiceRealtimeContextService.buildVoiceRealtimeContext({ channel: 'anam_voice', forceOperationalSnapshot: true })
  ↓ systemPromptAppend → Anam API session-token
WebRTC stream (persona Liv) — respostas geradas no cliente / Anam cloud
  ↓ (paralelo) injectOperationalVoiceContext → GET /dashboard/voice-realtime-context
  ↓ addContext() no SDK
SmartPanel / claude-panel via eventos de voz
```

**Ficheiros chave**

| Papel | Path |
|-------|------|
| Token + prompt | `backend/src/services/anamService.js` |
| Contexto operacional | `backend/src/services/voiceRealtimeContextService.js` |
| Snapshots | `backend/src/services/softwareOperationalSnapshotService.js` |
| Rotas | `backend/src/routes/anam.js`, `GET /dashboard/voice-realtime-context` |
| Cliente | `frontend/src/services/anamPanelBridge.js`, `anamSessionSingleton` |
| Ponte painel | `frontend/src/features/smartPanel/smartPanelEvents.js` |

---

## 2. buildAnamSystemPrompt

**Comportamento auditado:**

1. Carrega identidade (`buildChatUserContext`).
2. Força snapshot operacional (`channel: 'anam_voice'`, `forceOperationalSnapshot: true`).
3. Anexa `buildAnamSessionContextPrompt(sessionCtx)` (hora, nome).
4. Anexa `ANAM_SYSTEM_PROMPT_APPEND` (env, não auditado linha a linha).
5. Trunca a 28 000 caracteres.

**Truth enforcement:** indirecto via `buildVoiceRealtimeContext` → `buildPromptTruthAppendix()` (regras «NUNCA invente KPIs…», mensagem `MSG_NO_DATA`).

**Não inclui:** `enforceTextResponse` sobre output da persona.

---

## 3. injectOperationalVoiceContext (frontend)

```javascript
// frontend/src/services/anamPanelBridge.js
async function injectOperationalVoiceContext(client, hint = '') {
  const r = await dashboard.getVoiceRealtimeContext(params);
  client.addContext(`[ATUALIZAÇÃO DADOS IMPETUS ...]\n${append}`);
  pushPanelContextToClient(client);
}
```

**Disparos:** início de sessão, após turnos relevantes, refresh manual (grep: linhas ~357, 490, 519).

**Validação:**

| Aspeto | Estado |
|--------|--------|
| Origem dos dados | Servidor — `buildVoiceRealtimeContext` |
| Refresh | Sim — nova chamada HTTP + `addContext` |
| Cache | Token Anam em memória servidor (`sessionTokenCache`, TTL ~expiresIn); contexto operacional **não** cacheado no serviço de voz |
| RBAC | `structuralAIGovernance`, `dashboardAccessService.getAllowedKpis` |
| company_id | Propagado via `req.user` |

---

## 4. voiceRealtimeContextService

### Origem dos dados

| Bloco | Fonte |
|-------|--------|
| KPIs | `dashboardKPIs.getDashboardKPIs` + personalização + `getAllowedKpis` |
| Resumo | `getDashboardSummary` (alertas, interações, propostas, insights) |
| Snapshot módulos | `softwareOperationalSnapshotService.buildSnapshotsForQuery` |
| Chat | `chatContextBridge.resolveChatContextForChannel(VOICE)` |
| Governança | `structuralAIGovernance.buildAIGovernancePackage` |

### Comportamento quando snapshot está vazio

- KPI: string `(nenhum indicador neste snapshot — não inventes valores)`
- Resumo: `Resumo agregado indisponível — não inventes totais`
- Erro snapshot: fallback `formatCatalogBlock(getSoftwareCatalogForUser)` — **lista módulos**, não métricas inventadas
- `injectOperational=false` (intent educativo): bloco explícito sem dados internos

### Fallback catalogue

Se `buildSnapshotsForQuery` falhar, o utilizador recebe **catálogo de módulos permitidos**, não números. Risco residual: modelo ainda pode alucinar se ignorar instruções.

---

## 5. softwareOperationalSnapshotService (voz)

- Domínios inferidos por texto (`inferDomainsFromText`).
- Filtro `userCanAccessDomain` + `company_id` em queries.
- Formato prompt: `formatForAIPrompt(bundle)` — tabelas/métricas reais ou vazias.

**Gap:** domínio mal inferido → snapshot omitido → modelo pode generalizar (mitigação parcial: truth appendix).

---

## 6. Session refresh e invalidação

| Mecanismo | Detalhe |
|-----------|---------|
| `POST /anam/prepare` | `clearSessionTokenCache` por `clientLabel` |
| Token cache key | hora local + nome + opening line |
| Context refresh | HTTP GET voice-realtime-context (sem invalidação centralizada) |
| Persona greeting | `ensurePersonaSkipLabGreeting` — evita saudação improvisada Anam Lab |

**Gap:** entre refreshes, dados no painel podem estar mais recentes que o último `addContext`.

---

## 7. OpenAI Realtime (fallback)

Quando `VITE_ANAM_PRIMARY=false` e `VITE_VOICE_REALTIME=true`:

- `useVoiceEngine.js` → `buildRealtimeSessionUpdate` → mesmo endpoint `voice-realtime-context`
- Proxy WebSocket `openaiRealtimeVoiceSession.js`
- **Mesma lacuna:** sem enforcement na transcrição da resposta

---

## 8. Integração Smart Panel / Claude

| Evento | Truth |
|--------|-------|
| Comando voz → `panel-command` | **guardPanelVisualizationPayload** no servidor |
| Pós-resposta → `claude-panel` | **NOT VERIFIED** |
| `dispatchClaudePanelBridge` | Envia transcript; Claude gera JSON |

**Risco composto:** voz pode ser corrigida apenas por instruções; painel direito pode mostrar gráficos Claude não guardados.

---

## 9. Auditoria de verdade (checklist Anam)

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Existe Truth Enforcement? | **PARCIAL** (prompt appendix apenas) |
| 2 | Serviço? | `industrialTruthEnforcementService.buildPromptTruthAppendix` — **não** `enforceTextResponse` na stream |
| 3 | Responde sem passar? | **SIM** — **CRITICAL GAP** |
| 4 | Fallback sem dados? | Instruções + `MSG_NO_DATA` no appendix; **não garantido** na fala |
| 5 | Risco fictício? | **HIGH** (oral) / **MEDIUM** (painel smart) / **HIGH** (claude panel) |

**Classificação Anam Realtime:** **PARTIALLY VERIFIED**

**Classificação Voice Realtime Context (servidor):** **VERIFIED** como *fonte*; **NOT VERIFIED** como *garantia de resposta*.

---

## 10. company_id e permissões

- Todas as queries passam `effectiveUser` pós `structuralAIGovernance`.
- `hierarchicalFilter.resolveHierarchyScope` limita agregados.
- Domínios snapshot respeitam `DOMAIN_REGISTRY` e permissões efectivas.

**Não auditado nesta fase:** fugas cross-tenant (assumido middleware `requireAuth` + serviços existentes).

---

## 11. Comparação com Dashboard Chat (texto)

| Capacidade | Dashboard Chat GPT | Anam |
|------------|-------------------|------|
| Snapshot no prompt | Sim | Sim |
| Truth appendix | Sim (via voice builder no chat não; chat tem enforce) | Sim |
| enforceTextResponse | Sim | **Não** |
| Trace + hallucination async | Sim | Depende de bridge Claude / não na fala |
| HITL | Sim (safety) | Não mapeado na stream |

---

## 12. Recomendações (documentação — sem implementação)

1. **Loop servidor:** capturar transcript final Anam → `enforceTextResponse` → opcional `talk()` corrigido.
2. Unificar refresh: invalidar contexto após mutações operacionais (WebSocket empresa).
3. Aplicar `guardPanelVisualizationPayload` a outputs `claude-panel` ou forçar `panel-command` quando dados obrigatórios.
4. Telemetria: log `anam_turn` com `evidence_binding` do último snapshot hash.

---

## 13. Conclusão

A Anam Realtime está **bem instrumentada na entrada** (contexto IMPETUS autorizado, RBAC, snapshots PostgreSQL, SZ5 bridge, instruções anti-invenção), mas **não está completamente protegida na saída**. Para certificação operacional baseada em verdade, a lacuna **CRITICAL** é a ausência de enforcement pós-geração na stream de voz e no ramo Claude panel associado.
