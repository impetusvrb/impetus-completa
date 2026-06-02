# GEMINI_PRODUCTION_READINESS_REPORT

**Data:** 2026-06-01  
**Ambiente auditado:** `/var/www/impetus-completa` (PM2 `impetus-backend`)  
**Estado observado:** `gemini_available: false`

---

## 1. Resumo executivo

O IMPETUS declara `gemini_available=false` porque **não existe cliente Google GenAI configurado** no runtime de produção. Não é falha de código do `geminiService.js`; é **ausência de credenciais** (`GEMINI_API_KEY` / `GOOGLE_API_KEY` ou par Vertex AI).

O pipeline strict (`IMPETUS_STRICT_AI_PIPELINE`) está **desligado** no `.env` atual, pelo que o sistema continua operacional via OpenAI/Claude com **fallback degradado** nos módulos que preferem Gemini.

---

## 2. Root cause

| Verificação | Resultado |
|-------------|-----------|
| `geminiService.isAvailable()` | `false` |
| `GEMINI_API_KEY` | não definida |
| `GOOGLE_API_KEY` | não definida |
| `GOOGLE_GENAI_USE_VERTEXAI` | não definida |
| `GOOGLE_CLOUD_PROJECT` | não definida |
| `architectureHealth.missing_stages` | `['gemini_credentials']` |
| Live ping (`generateText('ping')`) | `client_not_configured` |

**Causa raiz:** credenciais Google Generative AI ausentes no ambiente do processo Node (`.env` + PM2 `--update-env`).

---

## 3. Onde o Gemini é utilizado

| Módulo | Ficheiro | Função |
|--------|----------|--------|
| Percepção multimodal | `src/ai/layers/executionLayer.js` | Texto/visão industrial |
| Ingress gate | `src/services/geminiIngressEngine.js` | Contexto obrigatório (se enforce ON) |
| Event pipeline | `src/eventPipeline/intent/intentRefinementService.js` | Refinamento de intent |
| Cognitive ingress | `src/ai/cognitiveIntentIngress.js` | Classificação de intent |
| Orquestrador | `src/services/aiOrchestrator.js` | Imagem/sensor |
| Qualidade | `src/services/aiComplaintDetectionService.js` | Classificação reclamação |
| ManuIA | `src/services/manuiaLiveAssistanceService.js` | Visão ao vivo |
| Cadastro IA | `src/routes/cadastrarComIA.js` | Extração de imagem |
| HITL | `src/services/humanValidationClosureService.js` | Classificador reação |
| Chat operacional | `src/services/operationalRealtimeCoordinator.js` | Coordenação realtime |
| Health | `src/services/aiIntegrationsHealthService.js` | Sondagem `/health` |
| Arquitetura | `src/services/architectureHealthService.js` | `gemini_available` |

---

## 4. Onde o Gemini **deveria** estar disponível

- Pipeline oficial documentado: **Gemini → Orquestrador → Claude → ChatGPT** (`architectureHealthService`, `vertexCentralOrchestrator`).
- Percepção de imagens e sensores (`executionLayer`, `aiOrchestrator`).
- Refinamento de eventos industriais (`eventPipeline`).
- Supervisão/classificação leve (`geminiIngressEngine`, `humanValidationClosureService`).

---

## 5. Impacto operacional

| Área | Com Gemini OFF |
|------|----------------|
| Chat dashboard / Anam | **Não bloqueado** — usa OpenAI Realtime / GPT |
| Painel inteligente | **Não bloqueado** — Claude ou OpenAI |
| Cockpits / Motor A / V2 | **Não alterados** nesta entrega |
| Visão / cadastro imagem | **Degradado** — etapas Gemini ignoradas ou fallback |
| Strict pipeline | **OFF** — `pipeline_integrity` pode ser BROKEN sem derrubar tráfego |

---

## 6. Plano de recuperação (ETAPA 2)

### Opção A — Google AI Studio (mais rápida)

1. Obter API key em [Google AI Studio](https://aistudio.google.com/apikey).
2. No `.env` do backend:
   ```env
   GEMINI_API_KEY=<sua_chave>
   GEMINI_MODEL=gemini-2.5-flash
   GOOGLE_GENAI_USE_VERTEXAI=false
   ```
3. `pm2 restart impetus-backend --update-env`
4. Validar: `node scripts/gemini-readiness-audit.js` → `live_ping.ok: true`, `gemini_available: true`

### Opção B — Vertex AI (enterprise)

```env
GOOGLE_GENAI_USE_VERTEXAI=true
GOOGLE_CLOUD_PROJECT=<project_id>
GOOGLE_CLOUD_LOCATION=global
# ADC: service account ou gcloud auth application-default login no host
GEMINI_MODEL=gemini-2.5-flash
```

### Validações pós-recuperação

- `GET /health` (detalhe) → integração Google `up`
- `architectureHealthService.getArchitectureHealth()` → `gemini_available: true`
- Log sem `[GEMINI] generateText:` em pedido de teste

**Nota:** Nesta auditoria **não foi possível ativar Gemini** — não há chave no ambiente. A recuperação depende da equipa de operações.

---

## 7. Risco de regressão

| Risco | Mitigação |
|-------|-----------|
| Quota / billing Google | Monitorizar 429; circuit breaker já existe (`circuitBreakerService`) |
| `IMPETUS_STRICT_AI_PIPELINE=true` sem todas as chaves | Manter strict OFF até validação completa |
| `IMPETUS_ENFORCE_GEMINI_INGRESS=true` | Só após `gemini_available=true` |
| Modelo `gemini-2.5-flash` indisponível na região | Fallback `GEMINI_MODEL=gemini-1.5-pro` |

---

## 8. Evidência de auditoria

Script: `backend/scripts/gemini-readiness-audit.js`

```bash
cd backend && node scripts/gemini-readiness-audit.js
```

Exit code `1` enquanto `live_ping.ok !== true` (estado atual).

---

## 9. Decisão ETAPA 2

**Gemini NÃO restaurado nesta entrega** — bloqueio exclusivamente de credenciais. Implementação de código permanece válida; basta injetar secrets e reiniciar PM2.
