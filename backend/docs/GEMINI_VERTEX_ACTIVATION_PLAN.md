# GEMINI_VERTEX_ACTIVATION_PLAN

**Data:** 2026-06-02  
**Base:** `GEMINI_VERTEX_AUDIT_REPORT.md`, `GEMINI_VERTEX_ROOT_CAUSE.md`  
**Classificação actual:** **A) Credenciais inexistentes**

> **Aviso:** Este documento é um **plano de activação**. A fase VERTEX-AUDIT **não executou** nenhum passo abaixo (sem alterar `.env`, PM2 ou código).

---

## Objectivo

Restaurar `gemini_available: true`, `integrations.google_vertex.status: up` e `gemini_transport` ≠ `unavailable`, mantendo compatibilidade com OpenAI/Anthropic já operacionais.

---

## Pré-requisitos de decisão

| Decisão | Opção A — Google AI Studio | Opção B — Vertex AI (GCP) |
|---------|---------------------------|---------------------------|
| Controlo de custos / simplicidade | ✓ Recomendado para arranque rápido | Enterprise, IAM GCP |
| Variáveis | `GEMINI_API_KEY` ou `GOOGLE_API_KEY` | `GOOGLE_GENAI_USE_VERTEXAI=true`, `GOOGLE_CLOUD_PROJECT`, ADC |
| Ficheiro SA | Não obrigatório | `GOOGLE_APPLICATION_CREDENTIALS` ou workload identity |
| Código IMPETUS | Sem alteração | Sem alteração |

**Nota:** `VERTEX_LOCATION` e `VERTEX_PROJECT_ID` **não são lidos** pelo backend. Usar `GOOGLE_CLOUD_LOCATION` e `GOOGLE_CLOUD_PROJECT`.

---

## Plano A — Google AI Studio (mínimo)

### 1. Obter credencial

- Criar API key em [Google AI Studio](https://aistudio.google.com/apikey).
- Restringir key por IP/referrer conforme política de segurança da equipa.

### 2. Adicionar ao `backend/.env` (operações)

```env
GEMINI_API_KEY=<chave>
GEMINI_MODEL=gemini-2.5-flash
GOOGLE_GENAI_USE_VERTEXAI=false
```

(`GOOGLE_API_KEY` é alias aceite por `geminiService.js`.)

### 3. Reiniciar processo

```bash
pm2 restart impetus-backend --update-env
```

### 4. Validação (ordem sugerida)

```bash
cd /var/www/impetus-completa/backend
node scripts/gemini-readiness-audit.js
```

Critérios de sucesso:

| Check | Esperado |
|-------|----------|
| `gemini_available` | `true` |
| `missing_stages` | sem `gemini_credentials` |
| `live_ping.ok` | `true` |
| `orchestration.gemini_transport` | `google_ai_studio` |
| `GET /health` (detalhe) | `google_vertex.status: up` |

```bash
curl -s http://127.0.0.1:4000/health | jq '.integrations.google_vertex'
```

### 5. Validação funcional (smoke)

| Endpoint | Teste |
|----------|-------|
| `POST /api/cadastrar-com-ia` | Imagem PNG/JPEG — deve usar Gemini se disponível |
| `POST /api/dashboard/panel-command` | Pedido simples — logs sem skip de percepção Gemini |
| `POST /api/manutencao-ia/live-assistance/analyze-frame` | Frame + visão (se ManuIA activo) |

---

## Plano B — Vertex AI (GCP)

### 1. Projecto GCP

- Projecto com Vertex AI API activada.
- Service account com papel mínimo (ex.: `roles/aiplatform.user`).

### 2. Credenciais no host

Colocar JSON em caminho **fora do git** (ex. `/var/secrets/impetus-gcp-genai.json`):

```bash
chmod 600 /var/secrets/impetus-gcp-genai.json
```

### 3. `backend/.env`

```env
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=<project_id>
GOOGLE_CLOUD_LOCATION=global
GOOGLE_APPLICATION_CREDENTIALS=/var/secrets/impetus-gcp-genai.json
GEMINI_MODEL=gemini-2.5-flash
```

Não é necessário `GEMINI_API_KEY` em modo Vertex (desde que ADC funcione).

### 4. Reinício e validação

Igual ao Plano A; adicionalmente:

| Check | Esperado |
|-------|----------|
| `orchestration.gemini_transport` | `vertex_ai` |
| `orchestration.vertex_ai_assists_gemini` | `true` |

### 5. Riscos Vertex

| Risco | Mitigação |
|-------|-----------|
| Modelo não disponível na região | Testar `GOOGLE_CLOUD_LOCATION`; fallback modelo em `.env` |
| ADC inválido | `gcloud auth application-default print-access-token` no mesmo user do PM2 |
| Billing GCP | Alertas de quota no consola |

---

## Plano C — Flags opcionais (após credenciais OK)

**Não activar antes de `gemini_available: true`.**

| Flag | Efeito | Quando |
|------|--------|--------|
| `IMPETUS_STRICT_AI_PIPELINE=true` | Exige Gemini na entrada cognitiva | Após validação completa das 3 IAs |
| `IMPETUS_GEMINI_INGRESS_ENABLED=true` | Motor de ingress HTTP | Se quiser classificação em todas as rotas `/api` |
| Montar `geminiIngressMiddleware` em `server.js` | Ingress automático por request | Requer alteração de código — **fora do âmbito mínimo** |
| `IMPETUS_ENFORCE_GEMINI_INGRESS=true` | Bloqueia sem ingress válido | Só com middleware ou `runGeminiIngressForContext` activo |

Ordem recomendada:

1. Credenciais + restart  
2. Audit script + `/health`  
3. Smoke endpoints  
4. Strict / ingress (opcional, com rollback documentado)

---

## Plano D — TTS Google (separado de Gemini)

Auditoria encontrou `voz.google_credentials_ok: false` e ausência de `config/google-tts.json`.

| Item | Acção |
|------|-------|
| TTS | `GOOGLE_TTS_KEYFILE` ou `config/google-tts.json` |
| GenAI | `GEMINI_API_KEY` ou Vertex — **independente** |

Activar TTS **não** activa Gemini automaticamente.

---

## Rollback

Se regressão após activação:

1. Remover ou comentar chaves GenAI no `.env`
2. `pm2 restart impetus-backend --update-env`
3. Confirmar `gemini_available: false` e sistema degradado mas operacional (OpenAI/Anthropic)

Tempo de rollback estimado: **< 2 minutos**.

---

## Checklist de entrega (operações)

- [ ] Decisão Studio vs Vertex documentada
- [ ] Chaves/SA criadas e **não** commitadas ao git
- [ ] `.env` actualizado no servidor
- [ ] `pm2 restart impetus-backend --update-env`
- [ ] `node scripts/gemini-readiness-audit.js` → OK
- [ ] `/health` → `google_vertex: up`
- [ ] Smoke cadastro / painel / ManuIA conforme módulos activos
- [ ] (Opcional) Strict / ingress activados com plano de rollback

---

## O que esta auditoria **não** fez

- Não alterou `backend/.env`
- Não reiniciou PM2
- Não criou service accounts
- Não modificou código nem feature flags

---

*Plano de activação derivado da causa raiz A — credenciais inexistentes.*
