# CERT — CHAT-IA-RUNTIME-COUNCIL-FIX

**Classe:** FIX (P0) | **Data:** 2026-06-23  
**Sintoma:** Chat Impetus IA → «Erro ao conectar com a IA.» (frontend) / Conselho Cognitivo bloqueado

---

## 1. Causa raiz (confirmada)

### A — Conselho Cognitivo bloqueado (403)

`IMPETUS_RUNTIME_STATE_ENFORCEMENT=enforce` activo.

`POST /api/cognitive-council/execute` era resolvido pelo prefixo genérico `/api/cognitive` → módulo `cognitive.envelope` (estágio **ENRICH**).

POST em módulo ENRICH → `RUNTIME_STATE_BLOCKED` (403 em 3ms).

O frontend (`ChatApp.jsx`, modo Conselho Cognitivo) recebia 403 via axios → catch → mensagem genérica «Erro ao conectar com a IA.»

**Prova:**

```json
{"code":"RUNTIME_STATE_BLOCKED","module":"cognitive.envelope","stage":"enrich"}
```

### B — Saudações substituídas por `UNSUPPORTED_OPERATIONAL_CLAIM`

`industrialTruthEnforcementService` aplicava enforcement operacional a turnos conversacionais («Bom dia»), quando o LLM respondia com texto de onboarding/planta.

### C — Timeout nginx marginal

Pedidos `/api/dashboard/chat` podiam levar ~55s; `proxy_read_timeout` era 60s — risco de 504 em picos.

---

## 2. Correções

| Ficheiro | Alteração |
|----------|-----------|
| `runtimeStateEnforcementMiddleware.js` | Prefixos específicos: `cognitive-council` → `cognitive.council` (EXECUTION) |
| `industrialTruthEnforcementService.js` | `isConversationalTurn()` — bypass truth em saudações/identidade |
| `ChatApp.jsx` | Catch expõe `error`/`code` da API em vez de só mensagem genérica |
| `/etc/nginx/sites-enabled/impetus` | `proxy_read_timeout 120s` para `/api/dashboard/chat` e `/api/cognitive-council` |

---

## 3. Inalterado

- OpenAI / Claude / Gemini — chaves válidas (teste directo OpenAI OK)
- Fluxo `POST /api/dashboard/chat` — arquitectura preservada
- Gateway IA (`IMPETUS_AI_GATEWAY_ENABLED=true`)

---

## 4. Testes

```bash
cd backend && node src/tests/chat-ai/chatRuntimeRouteScenarios.js
# → [chat-ai/chatRuntimeRouteScenarios] OK
```

Validação HTTP pós-fix:

| Endpoint | Antes | Depois |
|----------|-------|--------|
| `POST /cognitive-council/execute` «Bom dia» | 403 RUNTIME_STATE_BLOCKED | ≠ 403 (pipeline IA) |
| `POST /dashboard/chat` «Bom dia» | UNSUPPORTED_OPERATIONAL_CLAIM (alguns tenants) | Resposta conversacional |

---

## 5. Critérios de aceite

| Critério | Estado |
|----------|--------|
| Conselho Cognitivo não bloqueado por runtime map | ✅ |
| Saudações respondem sem UNSUPPORTED | ✅ |
| Erro API visível no chat (não mascarado) | ✅ |
| Testes regressão | ✅ |
| Sem mocks / sem fallback silencioso | ✅ |
