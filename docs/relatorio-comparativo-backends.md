# Relatório técnico comparativo: `backend/` vs `impetus_complete/backend/`

Data de análise: ambiente em `/var/www/impetus-completa` (workspace actual).

---

## ETAPA 1 — Identificar execução real

### `backend/` (raiz do repositório principal)

| Aspecto | Detalhe |
|---------|---------|
| **Entrypoint** | `backend/src/server.js` — aplicação Express **monolítica**: montagem de middleware, rotas (`useRoute`), HTTP server, Socket.IO, cron de métricas, operational brain, etc. |
| **Package** | `backend/package.json` existe; `"main"` e `"start"`: `node src/server.js`. |
| **Standalone** | Sim — `npm start` / `node src/server.js` com `.env` e Postgres é o fluxo previsto. `node --check src/server.js` passa. |
| **Dependências** | ~21 dependências principais (`express`, `pg`, `openai`, Anthropic, Google GenAI/KMS/TTS, `socket.io`, `ws`, `zod`, `helmet`, `compression`, etc.) + ferramentas de teste/migrate no `scripts`. |

### `impetus_complete/backend/` (subárvore aninhada)

| Aspecto | Detalhe |
|---------|---------|
| **Entrypoint** | `impetus_complete/backend/src/server.js` — **fino**: cria `http.Server`, Socket.IO, `require('./app')`, schedulers (`reminderScheduler`, `machineMonitoring`, optional `operationalBrain`). |
| **Segundo ficheiro** | `impetus_complete/backend/src/app.js` — define Express (`app`), middleware base, `safe()` para `require` resiliente de routers. |
| **Package** | **Não existe `package.json`** nesta pasta (apenas `.env`, `node_modules/`, `src/`, `uploads/`). Reinstalação limpa exigiria copiar dependências do backend principal ou recriar manifesto. |
| **Standalone** | Sintacticamente sim (`node --check` passou); operacionalmente **frágil** sem `package.json` versionado e com routers referenciados mas em falta (ver Etapa 2). |

### Nota sobre comentário em `backend/src/server.js`

O comentário indica que *historically* o PM2 poderia apontar para `impetus_complete/backend/src/server.js`. No ambiente inspecionado na Etapa 5, o processo **`impetus-backend` usa explicitamente `.../impetus-completa/backend/src/server.js`** (árvore principal).

---

## ETAPA 2 — Rotas e cobertura

### Inventário por montagem (prefixos `/api`)

**`backend/src/server.js`** monta (entre outros):  
`/api/media`, `/api/auth`, `/api/factory-team`, `/api/companies`, `/api/onboarding`, `/api/dashboard`, `/api/live-dashboard`, `/api/communications`, `/api/impetus-admin`, **`/api/admin-portal`**, `/api/admin/*` (users, logs, settings, help-manual, departments, operational-teams, structural, ai-audit, incidents, ai-policies, equipment-library, warehouse, raw-materials, logistics, time-clock, nexus-custos, nexus-wallet), `/api/technical-library`, `/api/nexus-ia`, `/api/dashboard/chat/voice`, `/api/realtime-presence`, `/api/tts`, `/api/voz`, `/api/did`, `/api/asset-management`, `/api/vision`, `/api/proacao`, `/api/cadastrar-com-ia`, `/api/chat`, `/api/tpm`, `/api/tasks`, **`/api/diagnostic`**, `/api/central-ai`, `/api/integrations`, webhooks, `/api/diag-report`, `/api/manuals`, `/api/lgpd`, `/api/intelligent-registration`, `/api/internal-chat`, `/api/role-verification`, `/api/usuarios`, `/api/plc-alerts`, `/api/app-impetus`, `/api/subscription`, `/api/alerts`, `/api/app-communications`, `/api/audit`, **`/api/warehouse-intelligence`**, **`/api/quality-intelligence`**, **`/api/hr-intelligence`**, `/api/pulse`, **`/api/cognitive-council`**, `/api/raw-material-lots`, `/api/operational-anomalies`, **`/api/logistics-intelligence`**, `/api/internal/sales`, **`/api/manutencao-ia`** (ou fallback se `ENABLE_MANUIA=false`).

**`impetus_complete/backend/src/app.js`** monta:  
`/api/auth`, `/api/chat`, `/api/usuarios`, `/api/companies`, `/api/tasks`, `/api/alerts`, `/api/manuals`, `/api/audit`, `/api/communications`, `/api/subscription`, `/api/tpm`, `/api/pulse`, `/api/lgpd`, `/api/role-verification`, `/api/app-communications`, `/api/app-impetus`, `/api/internal-chat`, `/api/proacao`, `/api/plc-alerts`, `/api/integrations`, `/api/webhook`, `/api/admin` (router agregador), `/api/impetus-admin`, `/api/dashboard`, **`/api/live-dashboard`** (ficheiro pode faltar — ver `safe()`), **`/api/manutencao-ia`** (router **`routes/manutencao-ia.js` não está presente** no diretório `routes/` listado), **`/api/diagnostics`** (plural — não `/api/diagnostic`), `/api/cadastrar-com-ia`, `/api/intelligent-registration`, `/api/decision-engine`, `/api/voz`, `/api/dashboard/chat/voice`, `/api/tts`, `/api/vision`, `/api/did`, `/api/asset-management`, mais `/api/me` e `/api/usuarios/conta` se `meAccount` existir.

### Rotas destacadas

| Prefixo | `backend/` | `impetus_complete/backend/` |
|---------|:-----------:|:---------------------------:|
| **`/api/cognitive-council`** | Sim (`cognitiveCouncil.js` + `ai/cognitiveOrchestrator`) | **Não** montado |
| **`/api/dashboard`** | Sim | Sim (`routes/dashboard.js` extenso) |
| **`/api/admin-portal`** | Sim (`adminPortalGovernance`) | **Não** |
| **`/api/manutencao-ia`** | Sim (ou fallback ManuIA desligada) | Montado, mas **ficheiro de rota em falta** → `safe()` devolve router vazio |
| **`/api/chat`** | Sim (`requireAuth`) | Sim |

### Resumo conjunto / exclusivos

- **Presentes só no `backend/` principal (exemplos):** `cognitive-council`, `admin-portal`, `central-ai`, `factory-team`, `media`, `onboarding` (montagem dedicada), `realtime-presence`, muitos prefixos `admin/*` expostos directamente, `warehouse-intelligence`, `quality-intelligence`, `hr-intelligence`, `logistics-intelligence`, `raw-material-lots`, `operational-anomalies`, `nexus-ia`, stripe webhook path duplicado em estrutura diferente, etc.
- **Padrões só ou com variantes em `impetus_complete`:** `/api/diagnostics` vs `/api/diagnostic`; tentativa de `/api/me` + `meAccount`; `decision-engine` como prefixo próprio; ausência material de vários routers de inteligência.

---

## ETAPA 3 — Sistemas de IA

| Componente | `backend/` | `impetus_complete/backend/` |
|------------|------------|------------------------------|
| **`cognitiveOrchestrator`** | Presente em `src/ai/cognitiveOrchestrator.js`; usado por `routes/cognitiveCouncil.js` e partes do `dashboard.js` | **Ausente** (sem pasta `src/ai/`) |
| **`dataRetrievalService`** | Presente (`services/dataRetrievalService.js`) — pipeline contextual (correlação, plano, decisões) | **Ausente** |
| **`intentDetectionService`** | Presente no principal | **Ausente** |
| **Correlação / predição / priorização** | `correlationService`, `predictionService`, `prioritizationService`, `correlationInsightsService` | **Ausentes** (sem serviços homónimos na árvore analisada) |
| **`operationalPlanning` / motor de plano** | `operationalPlanningService`, `operationalDecisionEngine`, `operationalActionExecutor` | **Ausentes** |
| **`proactiveRetrievalService`** | Presente | **Ausente** |
| **Learning** | `operationalLearningService`, `strategicLearningService` (e integração em decisão/execução) | `operationalBrainEngine`, `operationalInsightsService`, `patternAnalysisService`, etc. — **modelo mais antigo/reduzido**, sem camada estratégica/retrieval proactivo do principal |

Conclusão IA: o **`backend/` principal** concentra o stack “cérebro contextual + conselho cognitivo + planeamento operacional recente”. **`impetus_complete`** mantém IA clássica (`ai.js`, orquestradores, chat, resumos) **sem** orquestração cognitiva nem pipeline de dados contextual recuperado ao mesmo nível.

---

## ETAPA 4 — Governança

| Tema | `backend/` | `impetus_complete/backend/` |
|------|------------|------------------------------|
| **Policy / guardrails** | `policyLayer`, `policyEngineService`, `policyEnforcement`, `policyHardening`, integração em rotas e IA | **Sem** referências a `policyLayer` / motor de política equivalente na amostra grepped |
| **Compliance** | Vários serviços (`complianceReporting`, `aiComplianceEngine`, etc.) | Conjunto **muito menor** |
| **Encryption / KMS** | `encryptionService` + providers `kms/*` | **Não** encontrado serviço homónimo |
| **Audit** | Rotas e serviços de auditoria alinhados ao stack actual | `middleware/audit.js` + rotas `/api/audit` (LGPD-focused) |
| **LGPD** | `middleware/lgpd.js` + rotas | Presente (`middleware/lgpd.js`, rotas) |

---

## ETAPA 5 — Deploy

| Questão | Evidência |
|---------|-----------|
| **Qual backend o PM2 usa** | Processo **`impetus-backend`**: *script* `.../impetus-completa/backend/src/server.js`, *cwd* `.../impetus-completa/backend`. |
| **Diferença repo vs runtime** | O código em execução corresponde ao **`backend/` da raiz** versionado em `main`, **não** ao entrypoint em `impetus_complete/backend/`. |
| **Estado de `impetus_complete/`** | Subdirectório com `.git` próprio, **`package.json` em falta** no backend, routers referenciados inexistentes → perfil de **cópia legada / sandbox**, não de deploy activo. |

*(Recomenda-se não versionar segredos no ambiente; credenciais em variáveis PM2 devem ser revistas separadamente.)*

---

## ETAPA 6 — Veredito

1. **Qual backend é mais completo funcionalmente?**  
   **`backend/` (raiz).** Expõe mais domínios (IA central, conselho cognitivo, inteligências sectoriais, portal admin, ManuIA real, material lots, anomalias, Nexus, media, presença realtime, etc.) e integra o pipeline operacional/plano mais recente.

2. **Qual é mais estável para produção?**  
   **`backend/` (raiz)** — é o que o PM2 corre, tem `package.json` e testes/scripts de migração; a árvore `impetus_complete/backend/` está **incompleta** (manifesto em falta, rotas órfãs).

3. **Qual deve ser o BACKEND OFICIAL?**  
   **`backend/`** na raiz do repositório `impetus-completa`.

4. **Qual deve ser descontinuado (ou arquivado)?**  
   **`impetus_complete/backend/`** como produto deployável: tratar como **legado / referência** ou mover para `archive/` com README, **a menos** que se invista em reconciliar `package.json`, ficheiros em falta (`manutencao-ia`, `liveDashboard`, etc.) e alinhar rotas com o principal.

---

## Recomendações operacionais

1. Actualizar o comentário no topo de `backend/src/server.js` para reflectir que **PM2 usa este entrypoint** (evitar confusão com `impetus_complete`).  
2. Se `impetus_complete` já não for necessário: **remover ou arquivar** para reduzir divergência cognitiva da equipa.  
3. Se for necessário manter: gerar **`package.json`** espelhado, corrigir paths `safe()` que silenciam routers em falta, e documentar *explicitamente* o papel (ex.: “build experimental”).

---

*Documento gerado para apoio a decisão de arquitectura; números de ficheiros: ~203 serviços `.js` em `backend/src/services` vs ~75 em `impetus_complete/backend/src/services` (amostra local).*
