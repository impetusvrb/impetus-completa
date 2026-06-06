# GEMINI_LIVE_CERTIFICATION

**Fase:** 46.6 — Gemini Live Certification  
**Data:** 2026-06-02T13:15Z  
**Ambiente:** `/var/www/impetus-completa/backend` — PM2 `impetus-backend` (id 3)  
**Escopo:** Validação técnica apenas — sem alteração de arquitetura, serviços ou código de produção (exceto script temporário de diagnóstico).

---

## Veredito

### **READY_AFTER_KEY_REPLACEMENT**

**Justificação técnica:** Toda a cadeia IMPETUS (env → dotenv no arranque → `geminiService.isAvailable()` → SDK `@google/genai` → pedido HTTP a `generativelanguage.googleapis.com`) funciona. A Google API responde com **HTTP 400** e razão explícita **`API_KEY_INVALID`**. O valor actual de `GEMINI_API_KEY` no `.env` é o **placeholder literal** `<SECRET>` (8 caracteres), não uma chave AI Studio válida. Substituir apenas por uma chave real e `pm2 restart impetus-backend --update-env` deve fazer `live_ping.ok=true`, `google_vertex.status=up` e `gemini_transport=google_ai_studio` sem engenharia adicional.

**Não aplicável:** `ADDITIONAL_ENGINEERING_REQUIRED` — não há evidência de bug de integração, modelo inexistente, rede ou permissões GCP nesta fase.

---

## ETAPA 46.6-A — `gemini-readiness-audit.js`

**Comando:** `node scripts/gemini-readiness-audit.js`  
**Saída bruta:** `backend/docs/gemini-readiness-audit-46.6.raw.json`

| Campo | Valor |
|-------|-------|
| `gemini_available` | **true** |
| `missing_stages` | `[]` |
| `gemini_transport` | **google_ai_studio** |
| `vertex_ai_assists_gemini` | **false** |
| `live_ping.ok` | **false** |
| `live_ping.sample` | **null** |

**Log stderr (Google API):**

```text
API key not valid. Please pass a valid API key.
reason: API_KEY_INVALID
service: generativelanguage.googleapis.com
status: INVALID_ARGUMENT (400)
```

---

## ETAPA 46.6-B — `scripts/gemini-live-ping.js` (temporário)

**Comando:** `node scripts/gemini-live-ping.js`  
**Saída bruta:** `backend/docs/gemini-live-ping-46.6.raw.json`

### `geminiService.generateText("Responda apenas OK")`

| Campo | Valor |
|-------|-------|
| `model` | `gemini-2.5-flash` |
| `returned` | **null** |
| `ok` | **false** |
| `thrown` | **null** (erro absorvido em `generateText` → `console.warn` + `null`) |

### SDK directo (mesmo env/modelo — captura excepção completa)

| Campo | Valor |
|-------|-------|
| `ok` | **false** |
| `error.name` | `ApiError` |
| `error.status` | **400** |
| `classification` | **INVALID_API_KEY** |

**Stack (trecho):**

```text
ApiError: ... API key not valid ...
  at throwErrorIfNotOK (@google/genai/dist/node/index.cjs:12706:30)
  at async Models.generateContent ...
```

---

## ETAPA 46.6-C — Classificação do erro

| Classe | Aplica? |
|--------|---------|
| **INVALID_API_KEY** | **SIM** |
| PERMISSION_DENIED | Não |
| QUOTA_EXCEEDED | Não |
| MODEL_NOT_FOUND | Não |
| NETWORK_ERROR | Não |
| UNKNOWN | Não |

**Evidência Google:** `reason: API_KEY_INVALID`, `message: API key not valid. Please pass a valid API key.`

---

## ETAPA 46.6-D — Teste directo `gemini-2.5-flash`

| Teste | Modelo | Resultado |
|-------|--------|-----------|
| `gemini-live-ping.js` (direct SDK) | `gemini-2.5-flash` | **Falha 400** — `INVALID_API_KEY` |
| Readiness audit live_ping | `gemini-2.5-flash` | **Falha** — sem texto de resposta |

O modelo foi **alcançado** pela API (resposta estruturada 400 sobre a chave, não 404 de modelo).

---

## ETAPA 46.6-E — `GET /health`

**Saída bruta:** `backend/docs/health-46.6.raw.json`

```json
{
  "google_vertex": {
    "status": "down",
    "configured": true,
    "detail": "Gemini sem texto de resposta"
  },
  "openai": { "status": "up", "configured": true },
  "anthropic": { "status": "up", "configured": true }
}
```

`configured: true` confirma que o cliente local existe; `down` reflecte falha na sondagem `generateText('ping')` por chave inválida.

---

## Questionário obrigatório (46.6-F)

### 1. SDK funciona?

**Sim.** Pacote `@google/genai` instalado; `Models.generateContent` executa e recebe resposta HTTP da Google.

### 2. Cliente inicializa?

**Sim.** `geminiService.isAvailable()` → **true**; `getClient()` instancia `GoogleGenAI({ apiKey })`.

### 3. PM2 carrega env?

**Parcial / suficiente.** `pm2 env 3` **não lista** `GEMINI_*` (variáveis não injectadas no snapshot PM2). O processo `server.js` carrega `dotenv` de `backend/.env` no arranque (`require('dotenv').config()` + override). Scripts CLI e health do processo em `:4000` usam o mesmo `.env` via dotenv.

### 4. Chave chega ao runtime?

**Sim.** `GEMINI_API_KEY_set: true` em todos os testes. **Problema:** o valor efectivo é o placeholder **`GEMINI_API_KEY=<SECRET>`** (metadados: `len=8`, `placeholder=true`) — não é uma chave AI Studio.

### 5. API responde?

**Sim.** A API Google Generative Language **responde** com erro semântico claro (400 `API_KEY_INVALID`). Não é timeout nem falha de rede.

### 6. Motivo exacto da falha?

**Chave inválida:** placeholder `<SECRET>` no `.env` (ou chave revogada/expirada se já tiver sido substituída por outro valor inválido). Google confirma `API_KEY_INVALID` em todas as chamadas live.

### 7. Trocando apenas a chave o sistema sobe?

**Sim, com alta confiança.** Sem mudanças de código. Passos:

1. Substituir `GEMINI_API_KEY` por chave válida do [Google AI Studio](https://aistudio.google.com/apikey).
2. Manter `GOOGLE_GENAI_USE_VERTEXAI=false`, `GEMINI_MODEL=gemini-2.5-flash`.
3. `pm2 restart impetus-backend --update-env`
4. Validar: `node scripts/gemini-readiness-audit.js` → `live_ping.ok: true`
5. Validar: `GET /health` → `integrations.google_vertex.status: "up"`

---

## Resumo da hipótese (Fase 46.5 → 46.6)

| Fase | Conclusão |
|------|-----------|
| 46.5 / auditoria Vertex | Causa A: credenciais inexistentes — **resolvida** (env presente, SDK up) |
| 46.6 | Único bloqueio: **credencial Google inválida** (placeholder ou key morta) |

---

## Artefactos

| Ficheiro | Conteúdo |
|----------|----------|
| `docs/gemini-readiness-audit-46.6.raw.json` | Saída completa readiness audit |
| `docs/gemini-live-ping-46.6.raw.json` | Saída completa live ping |
| `docs/health-46.6.raw.json` | Resposta `/health` |
| `scripts/gemini-live-ping.js` | Script temporário de diagnóstico (remover após certificação operacional se desejado) |

---

*Certificação live 46.6 — validação apenas.*
