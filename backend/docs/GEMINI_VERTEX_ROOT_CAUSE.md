# GEMINI_VERTEX_ROOT_CAUSE

**Data:** 2026-06-02  
**Ambiente:** IMPETUS `impetus-backend` @ `/var/www/impetus-completa/backend`  
**Pedido:** Causa raiz exacta — Gemini e Vertex offline (sem correcção)

---

## Classificação oficial

### **A) Credenciais inexistentes** ✓ CAUSA RAIZ PRIMÁRIA

As variáveis necessárias para instanciar `@google/genai` **não existem** nem em `backend/.env` nem no ambiente PM2 do processo Node.

### Sub-classificações (contexto, não substituem A)

| Código | Aplica? | Evidência |
|--------|---------|-----------|
| **B) Credenciais existem mas PM2 não carregou** | **Não** | `.env` também não define `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_GENAI_USE_VERTEXAI` |
| **C) Vertex configurado mas serviço não usa Vertex** | **N/A** | Vertex nunca foi configurado; código usa Vertex só via `GOOGLE_GENAI_USE_VERTEXAI` no **mesmo** `geminiService` |
| **D) Serviço implementado mas desactivado** | **Parcial** | Orquestrador Vertex é simulação (`vertex_central_sim`); flags strict/ingress OFF — **não** explicam offline de `isAvailable()` |
| **E) Outro** | Ver notas | TTS Google separado; variáveis `VERTEX_*` inexistentes no produto |

---

## Cadeia causal (5 porquês)

1. **Sintoma:** UI/health mostram Gemini/Vertex offline (`gemini_available: false`, `google_vertex.status: down`).

2. **Mecanismo imediato:** `geminiService.getClient()` devolve `null` → `isAvailable()` false.

3. **Regra de negócio:** Sem API key (Studio) ou sem `GOOGLE_CLOUD_PROJECT` + ADC (Vertex), o SDK não é criado.

4. **Configuração:** `backend/.env` não contém chaves GenAI; PM2 não injecta variáveis GenAI (só `GOOGLE_TTS_*`).

5. **Causa raiz:** **Nunca foram provisionadas credenciais Google Generative AI neste host** (ou foram removidas). Não é regressão de código nem falha de rede detectada nesta auditoria.

---

## Prova por camada

### Camada 1 — Ficheiro `.env`

```
GEMINI_API_KEY=NOT_IN_FILE
GOOGLE_API_KEY=NOT_IN_FILE
GOOGLE_CLOUD_PROJECT=NOT_IN_FILE
GOOGLE_APPLICATION_CREDENTIALS=NOT_IN_FILE
GOOGLE_GENAI_USE_VERTEXAI=NOT_IN_FILE
```

### Camada 2 — PM2

`pm2 env 3` (impetus-backend): **zero** entradas `GEMINI_*`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_GENAI_USE_VERTEXAI`, `VERTEX_*`.

### Camada 3 — Código (comportamento esperado com env vazio)

| Função | Resultado |
|--------|-----------|
| `geminiService.isAvailable()` | `false` |
| `architectureHealth.missing_stages` | `['gemini_credentials']` |
| `getOrchestrationContext().gemini_transport` | `'unavailable'` |
| `googleVertexProbe()` | `configured: false`, `status: down` |
| `live_ping` | `client_not_configured` |

### Camada 4 — Runtime HTTP

`GET http://127.0.0.1:4000/health` (loopback, detalhe permitido):

```json
"google_vertex": {
  "status": "down",
  "configured": false,
  "detail": "Google Gemini / Vertex não configurado (API key ou projeto)"
}
```

OpenAI e Anthropic: **up** — confirma que o problema é **específico Google GenAI**, não conectividade geral do backend.

---

## O que **não** é a causa raiz

| Hipótese descartada | Motivo |
|---------------------|--------|
| Bug em `isAvailable()` | Lógica coerente; falha só com env vazio |
| Vertex API separada não ligada | Não há `vertexAiService`; Vertex = flag no `geminiService` |
| PM2 não relê `.env` com chaves presentes | Chaves **não estão** no `.env` |
| `VERTEX_LOCATION` / `VERTEX_PROJECT_ID` mal nomeados | Variáveis **não existem** no código IMPETUS |
| Middleware Gemini bloqueia tudo | `geminiIngressMiddleware` **não montado**; `IMPETUS_GEMINI_INGRESS_ENABLED` default false |
| Strict pipeline derruba serviço | `IMPETUS_STRICT_AI_PIPELINE` ausente → strict **OFF** |
| Falha de quota Google em produção | `isAvailable()` nem chega à API; probe nem tenta `generateText` sem cliente |

---

## Vertex vs Gemini — esclarecimento

No IMPETUS, **“Vertex offline”** no health/dashboard significa na prática:

> **O cliente Google GenAI unificado não está configurado.**

Não há segundo serviço Vertex independente. Com credenciais Studio:

- `gemini_transport` → `google_ai_studio`
- `vertex_ai_assists_gemini` → `false`

Com Vertex activo **e** credenciais válidas:

- `gemini_transport` → `vertex_ai`
- `vertex_ai_assists_gemini` → `true`

Hoje: **`unavailable`** porque `isAvailable()` é false **antes** de qualquer decisão de transporte.

O módulo `vertexCentralOrchestrator` **não** chama Google Cloud Vertex AI; apenas regista traces e expõe metadados. Offline de Vertex no produto ≠ falha de Vertex AI Platform API — é **mesma causa** que Gemini Studio (credenciais GenAI).

---

## Service account / ADC

- **Nenhum** `service-account.json` ou `google-tts.json` em `backend/config/`.
- Modo Vertex exigiria ADC (ficheiro ou metadata VM) **além** de `GOOGLE_CLOUD_PROJECT`.
- Estado actual: modo Vertex **nem sequer activado** (`GOOGLE_GENAI_USE_VERTEXAI` ausente).

---

## Síntese para operações

| Pergunta | Resposta |
|----------|----------|
| Por que Gemini offline? | Sem `GEMINI_API_KEY` / `GOOGLE_API_KEY` no env |
| Por que Vertex offline? | Mesma razão + flag Vertex não activa + sem project/ADC |
| É preciso alterar código? | **Não** para restaurar — só credenciais + restart PM2 |
| Classificação | **A) Credenciais inexistentes** |

---

## Próximo passo (fora do âmbito desta auditoria)

Ver `GEMINI_VERTEX_ACTIVATION_PLAN.md` — plano **sem execução** nesta fase.

---

*Documento de causa raiz — VERTEX-AUDIT. Nenhuma alteração foi aplicada ao sistema.*
