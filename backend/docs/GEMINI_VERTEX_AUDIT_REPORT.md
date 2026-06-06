# GEMINI_VERTEX_AUDIT_REPORT

**Fase:** VERTEX-AUDIT — Diagnóstico de conectividade Gemini / Vertex  
**Data:** 2026-06-02  
**Ambiente:** `/var/www/impetus-completa` — PM2 `impetus-backend` (pid 3, online)  
**Modo:** Somente leitura — sem alterações a código, PM2 ou `.env`

---

## 1. Resumo executivo

| Componente | Estado observado |
|------------|------------------|
| `geminiService.isAvailable()` | **false** |
| `architectureHealth.gemini_available` | **false** |
| `orchestration.gemini_transport` | **`unavailable`** |
| `orchestration.vertex_ai_assists_gemini` | **false** |
| `/health` → `integrations.google_vertex` | **down** (`configured: false`) |
| Live ping (`generateText`) | **`client_not_configured`** |

**Conclusão:** Gemini e Vertex aparecem “offline” porque **não há credenciais GenAI no `.env` nem no ambiente PM2**. O código está implementado e activo com fallbacks; o runtime não consegue instanciar `GoogleGenAI`.

**Classificação final:** **A) Credenciais inexistentes** (ver `GEMINI_VERTEX_ROOT_CAUSE.md`).

---

## 2. `backend/.env`

Ficheiro **existe** (`/var/www/impetus-completa/backend/.env`).

| Variável (pedido na auditoria) | Estado no `.env` |
|--------------------------------|------------------|
| `GEMINI_API_KEY` | **NOT_IN_FILE** |
| `GOOGLE_API_KEY` | **NOT_IN_FILE** |
| `GOOGLE_CLOUD_PROJECT` | **NOT_IN_FILE** |
| `GOOGLE_APPLICATION_CREDENTIALS` | **NOT_IN_FILE** |
| `VERTEX_LOCATION` | **NOT_IN_FILE** (não usada pelo código — ver secção 4) |
| `VERTEX_PROJECT_ID` | **NOT_IN_FILE** (não usada pelo código) |
| `GOOGLE_GENAI_USE_VERTEXAI` | **NOT_IN_FILE** |
| `GOOGLE_CLOUD_LOCATION` | **NOT_IN_FILE** |

**Nota:** `.env.example` documenta `GEMINI_API_KEY`, `GOOGLE_API_KEY`, `GOOGLE_CLOUD_PROJECT`, `GOOGLE_GENAI_USE_VERTEXAI`, `GOOGLE_CLOUD_LOCATION` — mas o `.env` de produção **não as define**.

Outras variáveis relacionadas (também ausentes no `.env`):

- `IMPETUS_STRICT_AI_PIPELINE`
- `IMPETUS_ENFORCE_GEMINI_INGRESS`
- `IMPETUS_GEMINI_INGRESS_ENABLED`

`PORT=4000` confirmado no `.env`.

---

## 3. PM2 runtime (`pm2 env impetus-backend` / processo id 3)

| Variável GenAI / Vertex | Presente no env PM2? |
|-------------------------|----------------------|
| `GEMINI_API_KEY` | **Não** |
| `GOOGLE_API_KEY` | **Não** |
| `GOOGLE_CLOUD_PROJECT` | **Não** |
| `GOOGLE_APPLICATION_CREDENTIALS` | **Não** |
| `VERTEX_LOCATION` | **Não** |
| `GOOGLE_GENAI_USE_VERTEXAI` | **Não** |

**Presentes no PM2 (apenas TTS, não GenAI):**

- `GOOGLE_TTS_*` (voz, SSML, `GOOGLE_TTS_VOICE`, etc.)

**Processo:**

- `exec cwd`: `/var/www/impetus-completa/backend`
- `script`: `backend/src/server.js`
- `node env`: **development** (observado em `pm2 describe`)
- Restarts: 345 (histórico de instabilidade não relacionado directamente a Gemini)

**Conclusão PM2:** O processo **não carrega** chaves Gemini/Vertex. Não é caso **B** isolado (credenciais só no ficheiro): o ficheiro também não as tem.

---

## 4. `geminiService.js`

**Localização:** `backend/src/services/geminiService.js`  
**SDK:** `@google/genai` (`GoogleGenAI`)

### Variáveis exigidas

| Modo | Condição | Variáveis |
|------|----------|-----------|
| **Google AI Studio** (default) | `GOOGLE_GENAI_USE_VERTEXAI` ≠ true/1/yes | `GOOGLE_API_KEY` **ou** `GEMINI_API_KEY` (qualquer uma não vazia) |
| **Vertex AI** | `GOOGLE_GENAI_USE_VERTEXAI` = true/1/yes | `GOOGLE_CLOUD_PROJECT` (obrigatório); `GOOGLE_CLOUD_LOCATION` (opcional, default `global`); credenciais **ADC** (ficheiro SA via `GOOGLE_APPLICATION_CREDENTIALS` ou metadata GCP) |

**Opcionais:** `GEMINI_MODEL`, `GEMINI_SUPERVISOR_MODEL`

**Não implementado no código:** `VERTEX_LOCATION`, `VERTEX_PROJECT_ID` (zero referências no repositório).

### `isAvailable()` — lógica

```javascript
function isAvailable() {
  return !!getClient();
}
```

`getClient()`:

1. Se Vertex activo → exige `GOOGLE_CLOUD_PROJECT`; senão `return null`
2. Se Studio → exige API key; senão `return null`
3. Caso contrário → `new GoogleGenAI({ apiKey })` ou `new GoogleGenAI({ vertexai: true, project, location })`

### Quando retorna `false`

- Vertex flag ON e **project vazio**
- Vertex flag OFF (ou ausente) e **ambas** `GOOGLE_API_KEY` e `GEMINI_API_KEY` vazias/ausentes
- Não há outro ramo — não testa conectividade de rede em `isAvailable()` (só configuração local)

Erros de API em `generateText` / `analyzeImage` **não** alteram `isAvailable()` — apenas devolvem `null` na chamada.

---

## 5. Vertex — implementação e activação

### Ficheiros procurados

| Ficheiro | Existe? |
|----------|---------|
| `vertexService.js` | **Não** |
| `vertexAiService.js` | **Não** |
| `googleAiService.js` | **Não** |

### Equivalente canónico

| Módulo | Papel |
|--------|--------|
| `backend/src/services/geminiService.js` | Cliente único GenAI (Studio **ou** Vertex via flag) |
| `backend/src/ai/vertexCentralOrchestrator.js` | Orquestração **simulada** (`orchestrator_id: vertex_central_sim`) — fluxo/trace, **não** chama API Vertex nativa |

Comentário no código (`vertexCentralOrchestrator.js`):

> *Implementação em Node até integração nativa com Vertex AI Agent/Flow*

### Feature flags / env

| Flag / env | Efeito |
|------------|--------|
| `GOOGLE_GENAI_USE_VERTEXAI` | Alterna transporte Gemini para Vertex no **mesmo** `geminiService` |
| `IMPETUS_STRICT_AI_PIPELINE` | Se true, pipeline exige Gemini; falha estrita em `cognitiveIntentIngress` |
| `IMPETUS_ENFORCE_GEMINI_INGRESS` | Gate HTTP — exige ingress Gemini válido |
| `IMPETUS_GEMINI_INGRESS_ENABLED` | Activa motor `geminiIngressEngine` (default **false**) |

**Estado actual:** todas OFF ou ausentes → Vertex **não activado**; orquestrador Vertex é só metadados de trace.

### `gemini_transport` vs `vertex_transport`

- Campo exposto: **`gemini_transport`** apenas (`vertex_ai` | `google_ai_studio` | `unavailable`)
- **Não existe** campo `vertex_transport` no código
- Estágios de pipeline incluem nome `vertex_route` (routing simulado, não transporte HTTP Vertex)

Valores observados (script `gemini-readiness-audit.js`):

```json
"gemini_transport": "unavailable",
"vertex_ai_assists_gemini": false
```

---

## 6. Rotas e consumo HTTP

### Rotas HTTP com chamada directa a `geminiService`

| Rota | Método | Uso Gemini |
|------|--------|------------|
| `/api/cadastrar-com-ia` | POST | `extractStructuredFromImage` se `isAvailable()` |
| `/api/manutencao-ia/live-assistance/analyze-frame` | POST | Visão via `manuiaLiveAssistanceService` → Gemini |

### Rotas indirectas (serviços / orquestrador)

| Rota / entrada | Cadeia | Comportamento sem credenciais |
|----------------|--------|-------------------------------|
| `POST /api/dashboard/panel-command` | `cognitiveOrchestrator` → `executionLayer` + `cognitiveIntentIngress` | Degradado: heurística / Claude / OpenAI |
| `POST /api/dashboard/chat-multimodal` | Idem | Percepção Gemini ignorada |
| `POST /api/cognitive-council/execute` | `runCognitiveCouncil` | Intent fallback se strict OFF |
| `POST /api/chat` (mensagens) | `operationalRealtimeCoordinator` | Routing heurístico sem Gemini |
| `GET /health`, `GET /api/health` | `aiIntegrationsHealthService.googleVertexProbe` | `status: down` |
| Voz / HITL | `chatVoice`, `dashboard` panel-command | `humanValidationClosureService` → heurística |

### Código com Gemini mas **sem rota HTTP activa** (ou arquivado)

| Módulo | Estado |
|--------|--------|
| `backend/src/services/aiOrchestrator.js` | **Sem `require` activo** em rotas montadas |
| `backend/_archived/routes/aiOrchestrator.js` | **Arquivado** — `/api/ai/gemini/analyze` nunca montado |
| `backend/src/middleware/geminiIngressMiddleware.js` | **Definido, não registado** em `server.js` |
| `IMPETUS_GEMINI_INGRESS_ENABLED` | Default false — ingress HTTP inactivo |

### Chamadas activas vs mortas

| Classificação | Itens |
|---------------|--------|
| **Activas** (runtime com tráfego potencial) | `cognitiveOrchestrator`, `executionLayer`, `cognitiveIntentIngress`, `geminiIngressEngine` (modo disabled/passthrough), `cadastrarComIA`, `manutencao-ia`, `chat`, health probes |
| **Mortas / legado** | `_archived/routes/aiOrchestrator.js`, `services/aiOrchestrator.js` (não referenciado), `geminiIngressMiddleware` (não montado) |

---

## 7. Health — condições exactas

### `gemini_credentials` em `missing_stages`

**Ficheiro:** `architectureHealthService.js` → `computeMissingStages()`

```javascript
if (!geminiOk) missing.push('gemini_credentials');
```

Onde `geminiOk = geminiService.isAvailable()`.

**Condição:** qualquer falha de `getClient()` (secção 4).

### `gemini_transport: unavailable`

**Ficheiro:** `vertexCentralOrchestrator.js` → `getOrchestrationContext()`

```javascript
gemini_transport: vertex ? 'vertex_ai' : geminiOk ? 'google_ai_studio' : 'unavailable',
```

**Condição:** `GOOGLE_GENAI_USE_VERTEXAI` OFF **e** `geminiService.isAvailable()` false.

### `/health` → `google_vertex.status: down`

**Ficheiro:** `aiIntegrationsHealthService.js` → `googleVertexProbe()`

1. Se `!geminiService.isAvailable()` → `down`, `configured: false`, detail: *"Google Gemini / Vertex não configurado (API key ou projeto)"*
2. Se configurado mas `generateText('ping')` falha/timeout → `down`, `configured: true`

**Evidência live (2026-06-02, loopback :4000/health):**

```json
"google_vertex": {
  "status": "down",
  "configured": false,
  "detail": "Google Gemini / Vertex não configurado (API key ou projeto)"
}
```

`voz.google_credentials_ok: false` — TTS Google separado (sem `config/google-tts.json`).

---

## 8. Teste de credenciais (ficheiros)

| Caminho | Existe? |
|---------|---------|
| `backend/config/google-tts.json` | **Não** |
| `backend/config/service-account.json` | **Não** |
| `backend/service-account.json` | **Não** |
| Qualquer `*service*account*.json` no repo | **0 ficheiros** |

`googleTtsCore.js` resolve credenciais por:

1. `GOOGLE_TTS_KEYFILE`
2. `backend/config/google-tts.json` (default)
3. `GOOGLE_APPLICATION_CREDENTIALS`

Nenhum caminho válido no ambiente actual → TTS Google offline; **não** afecta GenAI directamente, mas confirma ausência de service accounts no host.

---

## 9. Script de auditoria (evidência reproduzível)

```bash
cd /var/www/impetus-completa/backend && node scripts/gemini-readiness-audit.js
```

Resultado 2026-06-02:

- `gemini_available: false`
- `missing_stages: ["gemini_credentials"]`
- `live_ping.reason: "client_not_configured"`
- `root_cause`: credenciais ausentes

---

## 10. Impacto operacional (sem correcção)

| Área | Impacto |
|------|---------|
| Chat / painel / conselho cognitivo | Continua via OpenAI + Anthropic |
| Strict pipeline | OFF — não bloqueia tráfego |
| Visão / cadastro imagem / ManuIA Gemini | Degradado ou mensagem de indisponibilidade |
| Nexus / transparência IA | Cartão Google/Gemini como indisponível |
| Vertex “orquestrador” | Metadados `unavailable`; simulação sem API Vertex |

---

## 11. Referências de código

| Tópico | Ficheiro |
|--------|----------|
| Cliente GenAI | `src/services/geminiService.js` |
| Health arquitectura | `src/services/architectureHealthService.js` |
| Transport / orquestração | `src/ai/vertexCentralOrchestrator.js` |
| Sondagem `/health` | `src/services/aiIntegrationsHealthService.js` |
| Exemplo env | `.env.example` (linhas Gemini/Vertex) |
| Relatório anterior | `docs/GEMINI_PRODUCTION_READINESS_REPORT.md` |

---

*Auditoria VERTEX-AUDIT — nenhum ficheiro de configuração ou processo foi modificado.*
