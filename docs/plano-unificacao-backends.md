# Plano de unificação — `backend/` (IA avançada) + `impetus_complete/backend/` (tronco legado)

**Regras activas (este documento não executa alterações):**

- Não quebrar produção.
- Não remover ficheiros nesta fase.
- Não alterar PM2 nesta fase.
- Não mudar contratos de rotas existentes (mesmos paths, mesmos métodos públicos).

---

## ETAPA 1 — Base

### Premissa de negócio (pedido)

Definir **`impetus_complete/backend/`** como **árvore “base” / tronco** para absorver capacidades do **`backend/`** da raiz.

### Premissa técnica (estado actual)

O processo PM2 **`impetus-backend`** está configurado para **`…/impetus-completa/backend/src/server.js`** (árvore da **raiz**), não para `impetus_complete/backend/`. Isto **não entra em conflito** com o plano, desde que:

1. Toda a migração ocorra em **branch + ambiente de staging** com o mesmo `cwd`/entrypoint que produção *ou* cópia espelhada.
2. O **cutover** (mudança de PM2 ou única árvore) seja **última fase** explícita, fora do âmbito “sem alterar PM2”.

### Definição operacional de “backend oficial” durante o plano

| Conceito | Significado |
|----------|-------------|
| **Tronco de código alvo** | `impetus_complete/backend/src/` — onde os módulos novos devem *pousar* quando a equipa executar a migração. |
| **Backend que serve tráfego hoje** | `backend/` na raiz — **inalterado** até decisão de cutover. |
| **Fonte de origem dos módulos** | `backend/src/` — cópia/merge controlado para o tronco. |

Até ao cutover: manter **duas árvores** sincronizadas por processo de PR (não por delete automático).

---

## ETAPA 2 — Módulos em `backend/` que **não** existem em `impetus_complete/backend/` (por caminho)

**Contagem aproximada:** ~**295** ficheiros `.js`/`.sql` só na árvore principal (comparação por caminho relativo a `src/`).

### Classificação (CRÍTICO / IMPORTANTE / OPCIONAL)

#### CRÍTICO — IA, orquestração cognitiva, pipeline operacional, learning estratégico

| Área | Caminhos (resumo) |
|------|-------------------|
| **Orquestrador + camadas IA** | `ai/*` (incl. `cognitiveOrchestrator.js`, `layers/ingressLayer.js`, `policyLayer.js`, `complianceLayer.js`, `executionLayer.js`, dossier, auditoria cognitiva, etc.) |
| **Contexto e dados para IA** | `services/dataRetrievalService.js`, `correlationService.js`, `correlationInsightsService.js`, `predictionService.js`, `prioritizationService.js` |
| **Plano e decisão operacional** | `services/operationalPlanningService.js`, `operationalDecisionEngine.js`, `operationalActionExecutor.js` |
| **Intent** | `services/intentDetectionService.js` |
| **Proactividade** | `services/proactiveRetrievalService.js` |
| **Learning** | `services/operationalLearningService.js`, `services/strategicLearningService.js` |
| **Sessão unificada (multi-turn + BD)** | `services/unifiedSessionContextService.js`, `contextSessionService.js`, `sessionContextService.js` + `repositories/sessionContextRepository.js` |
| **Rotas que expõem o stack** | `routes/cognitiveCouncil.js`, `routes/centralIndustryAI.js` (+ serviço homónimo) |
| **Merge de contexto** | `services/contextualDataMergeService.js` |
| **Policy (runtime IA)** | `services/policyLayer.js`, `policyEngineService.js`, `policyEnforcementService.js`, `policyHardeningService.js` *(nota: existe também `ai/layers/policyLayer.js` — ver Etapa 5)* |

#### IMPORTANTE — governança, compliance alargado, produto, integrações, schema

| Área | Caminhos (resumo) |
|------|-------------------|
| **Incidentes / governação IA** | `services/aiIncidentService.js`, `aiIncidentGovernanceService.js`, `governanceAlertService.js`, `adaptiveGovernanceEngine.js`, `aiPromptGuardService.js`, `aiEgressGuardService.js`, … |
| **Compliance & relatórios** | `aiComplianceEngine.js`, `complianceReportingService.js`, `complianceDecisionService.js`, `complianceAnonymizerService.js`, `humanValidationClosureService.js`, … |
| **Cifra e segredos** | `services/encryptionService.js`, `services/kms/*`, `logSecretLeakDetector.js` |
| **Observabilidade / readiness** | `observabilityService.js`, `systemReadinessService.js`, `aiIntegrationsHealthService.js` |
| **Repositories do pipeline** | `repositories/userRepository.js`, `machineRepository.js`, `eventRepository.js`, `productRepository.js`, `workOrderRepository.js`, `correlationHistoryRepository.js` |
| **Inteligências sectoriais + rotas** | `*IntelligenceService.js` (warehouse, quality, hr, logistics), rotas `warehouseIntelligence.js`, `qualityIntelligence.js`, `hrIntelligence.js`, `logisticsIntelligence.js` |
| **ManuIA (pacote)** | `routes/manuiaApp.js`, `services/manuiaApp/*`, `routes/manutencao-ia.js`, fallbacks |
| **Dashboard “vivo” / Pulse** | `routes/liveDashboard.js`, `services/liveDashboardService.js`, `routes/pulse.js`, `services/pulseService.js`, `pulseAI.js`, `pulseOperationalSnapshot.js` |
| **Nexus / billing** | `billingTokenService.js`, `nexusWalletService.js`, rotas `nexusIa.js`, admin nexus, webhook `stripeNexusWallet.js` |
| **Configuração dura** | `config/configValidator.js`, `config/security.js` |
| **Middleware de segurança extra** | `globalRateLimit.js`, `secureStaticUploads.js`, `healthExposure.js`, `incomingWebhookAuth.js`, `tenantResourceAssert.js`, … |
| **Biblioteca técnica modular** | `modules/technicalLibrary/**` + `routes/technicalLibrary.js` + `routes/admin/equipmentLibrary.js` |
| **Models SQL** | Grande parte de `models/*.sql` presente só no principal (migrações alinhadas ao stack novo) |

#### OPCIONAL — refinamento de produto, builders, testes, utilitários

| Área | Caminhos (resumo) |
|------|-------------------|
| **Builders de dashboard** | `dashboardAlertBuilder.js`, `dashboardInsightBuilder.js`, `dashboardWidgetRegistry.js`, `dashboardComposer.js` (≠ `dashboardComposerService`), `visualizationSelector.js`, `relevanceEngine.js`, `eventEngine.js`, … |
| **Voz / realtime avançado** | `voiceStreamSocket.js`, `realtimeOpenaiProxy.js`, `realtimeResponseLipsyncTap.js`, `avatarLipsyncSocket.js`, vários `voice*` / `openaiVozService` se já houver paridade no tronco |
| **Testes automatizados** | `tests/*.js` na árvore principal |
| **Utils** | `sendSafeError.js`, `apiResponse.js`, `parseBooleanEnv.js`, `publicAppUrl.js`, … *(migrar conforme imports)* |

---

## ETAPA 3 — Dependências (por módulo-chave)

*Tirado dos `require` reais — cada bloco “precisa vir junto”. Caminhos relativos a `src/`.*

### `ai/cognitiveOrchestrator.js`

Depende de:

- `uuid`; módulos locais `aiRoles`, `cognitiveDossier`, `cognitiveAudit`
- **Serviços:** `aiAnalyticsService`, `aiProviderService`, `adaptiveGovernanceEngine`, `observabilityService`, `behavioralIntelligenceService`, `intentDetectionService`, **`dataRetrievalService`**, `contextualDataMergeService`, **`operationalLearningService`** (outcomes), **`unifiedSessionContextService`**, **`proactiveRetrievalService`**
- **Camadas:** `./layers/ingressLayer`, `policyLayer`, `complianceLayer`, **`executionLayer`**

**Pacote mínimo associado:** pasta `ai/` completa + serviços listados + `dataRetrievalService` e a sua cadeia (Etapa 3.2).

### `services/dataRetrievalService.js`

Depende de:

- `utils/security` (`isValidUUID`)
- **Repositories:** `userRepository`, `workOrderRepository`, `machineRepository`, `eventRepository`, `productRepository`
- **Serviços:** `correlationService`, `correlationInsightsService`, `predictionService`, `prioritizationService`, **`operationalLearningService`** (`getLearningSummary`), **`operationalPlanningService`**, **`operationalDecisionEngine`**, **`operationalActionExecutor`**

**Pacote mínimo:** repositórios acima + toda a cadeia correlação → plano → decisão → executor + learning/priorização.

### `services/proactiveRetrievalService.js`

Depende de:

- **`services/policyLayer.js`** (`allowsAutonomousOperationalAnalysis`)
- **`dataRetrievalService.retrieveContextualData`** (lazy)

**Pacote mínimo:** `policyLayer` (serviço) + política coerente + `dataRetrievalService`.

### `services/operationalActionExecutor.js`

Depende tipicamente de: messaging, `operationalAlertsService`, `strategicLearningService`, `dashboardComposerService`, `operationalLearningService`, etc. (efeitos secundários seguros).

### Migrações SQL

Vários módulos assumem tabelas criadas por ficheiros só no principal (`models/*_migration.sql`). Sem aplicar migrações no ambiente alvo, o código migra mas **quebra em runtime**.

---

## ETAPA 4 — Ordem de migração segura (sem mudar rotas)

Objectivo: cada fase deve compilar, passar testes/smoke, e **não exigir** alteração de paths públicos (novos endpoints podem ser adicionados **em paralelo** com prefixo novo *só se* política o permitir; as regras actuais dizem para **não mudar rotas existentes** — interpretação: **não renumerar nem quebrar** `/api/...` já expostos; rotas **novas** podem ser acordadas noutro passo).

Ordem sugerida:

1. **Serviços isolados e infra transversal**  
   `utils/*` necessários, `configValidator` + `security` (atrás de feature flag), `encryptionService` + `kms/*`, `systemReadinessService`, partes de `observabilityService` sem acoplar rotas.

2. **Repositories + `models/*.sql`**  
   Aplicar migrações em staging; validar schema.

3. **Pipeline operacional “chão”** (sem cognitive):  
   `correlationService` → `correlationInsightsService` → `predictionService` → `prioritizationService` → `operationalPlanningService` → `operationalDecisionEngine` → `operationalActionExecutor` → `dataRetrievalService` (integração interna).

4. **Learning**  
   `operationalLearningService`, `strategicLearningService`, cargas/bootstrap que o `server` da raiz faz.

5. **IA cognitiva**  
   Pasta `ai/` + `intentDetectionService` + `contextualDataMergeService` + `unifiedSessionContextService` (e repositório de sessão).

6. **Proactive**  
   `proactiveRetrievalService` após `dataRetrievalService` + `policyLayer` estável.

7. **`executionLayer` (e restantes camadas IA)**  
   Por último na cadeia cognitiva, quando dossier/compliance/policy já estão integrados; validar com testes `cognitive*` e rota espelho (ver abaixo).

### Estratégia de “nova rota” sem violar regra

Enquanto não houver cutover:

- Manter routers no **principal**; no tronco `impetus_complete`, pode montar **apenas** rotas de **teste interno** (ex.: `/api/_staging/cognitive-council`) **se** a política de produto permitir; caso contrário, validar só via testes integrados e `node` scripts **sem** expor HTTP.

*(As regras do utilizador focam “não mudar rotas existentes”; adicionar prefixos de staging deve ser acordado com equipa.)*

---

## ETAPA 5 — Riscos

| Risco | Descrição | Mitigação |
|-------|-----------|-----------|
| **Homónimos** | `dashboardComposer.js` vs `dashboardComposerService.js`; `services/policyLayer.js` vs `ai/layers/policyLayer.js` | Mapa de imports; renomeação **só** pós-cutover e com busca global. |
| **Duplicidade funcional** | Dois `ai.js` / orquestradores / `operationalBrainEngine` vs pipeline novo | Congelar API pública; desduplicar **internamente** com adapter; testes de regressão no dashboard chat. |
| **Quebra de contrato** | `safe()` no tronco esconde routers em falta (ex.: `manutencao-ia`) | Ao integrar, **falhar build** ou test de smoke que exija ficheiro presente para rotas montadas. |
| **`package.json` no tronco** | `impetus_complete/backend` pode não ter manifesto versionado | Antes do primeiro merge: **gerar `package.json` alinhado** ao principal (deps mínimas). |
| **Paths de uploads / estáticos** | `server.js` vs `app.js` usam caminhos diferentes para `/uploads` | Unificar **numa só** função `resolveUploadsPath()` na fase de cutover. |
| **Sockets** | Namespaces distintos (`voiceStreamSocket`, avatar) | Checklist de integração Socket.IO idêntica ao principal. |
| **Variáveis de ambiente** | `configValidator` na raiz falha closed se faltar chave | Documentar `.env.example` unificado; staging primeiro. |

---

## ETAPA 6 — Resultado final (visão)

### Estrutura alvo (após migração completa e cutover)

Uma única árvore sob **`impetus_complete/backend/`** (se mantiver premissa de Etapa 1), com:

- `src/server.js` + `src/app.js` **ou** `server.js` monolítico **escolhido explicitamente** (decisão de arquitectura única).
- `src/ai/**` completo.
- `src/services/**` unificado (sem duplicar versões antigas).
- `src/repositories/**` completo para o pipeline contextual.
- `src/routes/**` com **todos** os mounts do principal *sem* remover endpoints existentes do tronco.
- `src/models/**` ou `migrations/**` único, com histórico de SQL consolidado.

### O que poderá ser removido **depois** (não agora)

*Apenas após período de observabilidade + testes de carga + paridade de rotas.*

- Árvore **`backend/` da raiz** reduzida a proxy legado **ou** eliminada se PM2 apontar só para `impetus_complete/backend`.
- Cópias duplicadas de serviços que foram fundidos com adapters (ex.: antigo `aiOrchestrator` parcial).
- `safe()` que mascara routers em falta — substituir por `require` directo com falha explícita em startup (modo estrito).

---

## Checklist de saída (passo a passo, sem execução nesta tarefa)

1. Aprovar **tronco** (`impetus_complete` vs unificar na raiz — este plano segue o pedido `impetus_complete`).
2. Criar **branch** `feat/unify-backend-tronco`.
3. Copiar **Etapa 4.1–4.2** (utils, config, encryption, repos, SQL) + rodar `migrate` em staging.
4. Copiar **pipeline operacional** (Etapa 4.3) + testes smoke `retrieveContextualData`.
5. Copiar **learning** (Etapa 4.4) + validar bootstrap DB.
6. Copiar **`ai/`** + rotas cognitivas / central AI (Etapa 4.5) + testes cognitivos.
7. Copiar **proactive** + **executionLayer** (Etapa 4.6–4.7).
8. **Paridade de `package.json`** e lockfile.
9. **Cutover** PM2 + monitorização *(fora do âmbito actual)*.
10. **Cleanup** duplicados *(Etapa 6 — remove)*.

---

*Documento de planeamento; não altera ficheiros nem processos em produção.*
