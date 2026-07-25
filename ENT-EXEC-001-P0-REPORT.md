# ENT-EXEC-001 — Fase 1 — P0 — Relatório de Integridade e Segurança

**Origem:** ENT-AUD-002  
**Estado da fase:** AGUARDA P0 EXECUTIVE REVIEW  
**Microciclos concluídos:** MB-001 a MB-009  
**Progresso P0:** 9 de 9 itens concluídos ou formalmente aceites  
**Data:** 21/07/2026

## 1. Resumo executivo

O microciclo MB-001 eliminou respostas operacionais fictícias em
`GET /api/voz/alertas` e `POST /api/voz/comando`.

Não existe fonte operacional configurada para esses endpoints. Ambos agora
respondem de forma determinística com HTTP 503, estado `not_configured` e
campos factuais nulos. Nenhum domínio, runtime, motor, contrato de rota,
RBAC, pipeline cognitivo ou canal certificado foi criado, removido ou
refatorado.

As rotas de TTS, transcrição e o canal certificado `/api/voz/conversa`
permaneceram intocados.

No MB-002, o finding canónico TD-002 foi corrigido no workspace Logistics
legacy: falhas da fonte deixaram de produzir KPIs fixos, filas, docas e
telemetria fictícias. A auditoria ampliada encontrou padrões semelhantes em
superfícies certificadas OPM/WMS/UX e no serviço legacy de inteligência
logística. Esses artefactos não foram alterados, conforme o protocolo de
segurança arquitectural. Em 21/07/2026, o MB-002 canónico foi formalmente
aceite com essas observações encaminhadas para escopos existentes.

No MB-003, o fallback de `InsightsList` que fabricava três ocorrências
operacionais foi removido. Uma coleção vazia agora mantém o painel e declara
que os dados estão indisponíveis e o risco não foi avaliado. A cadeia
backend certificada permaneceu intacta; observações adicionais foram
encaminhadas aos MB-019, MB-020, MB-021 e MB-030.

No MB-004, hubs Safety não certificados deixaram de fabricar saúde,
sensores, alertas e sinais cognitivos. O snapshot backend de telemetria
passou a declarar `not_configured` com métricas nulas. A auditoria também
confirmou proxies e defaults no cockpit Z.25 ativo, protegido pela Baseline
Safety v1.0 `LOCKED`. Em 21/07/2026, a correção segura foi formalmente aceite
e as observações protegidas foram encaminhadas aos escopos existentes.

No MB-005, foram eliminados defaults sensíveis hardcoded e bloqueadas novas
exposições por diagnósticos de flags e snapshots PM2. A persistência SEC-21C
agora utiliza allowlist e redação profunda. Segredos ativos não foram
reproduzidos nem rotacionados; a rotação externa, a proteção das evidências
históricas e a limpeza do ambiente PM2 vivo permanecem ações operacionais.

No MB-006, a auditoria confirmou que backend e frontend vivos conservam
`NODE_ENV=development`, que o frontend conserva binding e ambiente herdados
e que launchers por nome não selecionavam `env_production`. As fontes locais
foram alinhadas por um adaptador aditivo sobre o ecosystem certificado:
perfis existentes passaram a ser selecionados explicitamente, o ambiente do
processo tornou-se autoritativo e processos web passaram a filtrar namespaces
backend. Nenhuma alteração foi aplicada ao PM2 vivo.

No MB-007, o histórico demonstrou que os reinícios são predominantemente
dirigidos por operações `restart/reload`, não por `watch` ou cron PM2. O
backend também sofreu abortos reais por heap OOM e cinco encerramentos
forçados pelo timeout vivo de 1,6 s. Foi adicionada uma política operacional
contra reinícios implícitos e o adaptador passou a alinhar o `kill_timeout`
ao watchdog interno, sem aumentar memória nem alterar o PM2 vivo.

No MB-008, o pool vivo foi medido contra a capacidade PostgreSQL e auditado
quanto a aquisições, releases, transações, bloqueios e pressão histórica.
Não há vazamento ou transação órfã observável no snapshot atual, mas existe
histórico severo de saturação e amplificação de logs. O default divergente foi
realinhado ao valor canónico e o aviso de pressão passou a ser limitado no
tempo, sem alterar o valor vivo do pool ou a infraestrutura PostgreSQL.

No MB-009, foi restaurada a função ausente que tornava o módulo SEC-05
inexequível e foram eliminados descartes silenciosos das fontes SEC-02/03/04.
O bootstrap agora mantém estado auditável, emite eventos estruturados e expõe
falhas saneadas no payload administrativo. O runtime vivo não foi reiniciado;
a ativação da correção depende de janela operacional.

## 2. Itens MB-001 a MB-009

### MB-001 — `/api/voz/*`

**Status:**

- [ ] Não iniciado
- [ ] Em andamento
- [x] Concluído

#### Arquivos afetados

Alterados:

- `backend/src/routes/voz.js`
- `backend/src/tests/ent-exec-001/mb001VoiceIntegrity.test.js` (novo)
- `ENT-EXEC-001-P0-REPORT.md` (novo)

Auditados diretamente, sem alteração:

- `backend/src/server.js`
- `backend/src/services/openaiVozService.js`
- `backend/src/services/mediaProcessorService.js`
- `backend/src/services/impetusVoiceChatService.js`
- `backend/src/services/impetusVoiceSession.js`
- `backend/src/services/truthProtectedCognitivePipeline.js`
- `backend/src/services/truthChannelRegistry.js`
- `backend/src/services/cognitiveTruthClosureService.js`
- `backend/src/services/industrialTruthEnforcementService.js`
- `backend/src/services/secureContextBuilder.js`
- `backend/src/services/documentContext.js`
- `backend/src/services/contextIntegrityService.js`
- `frontend/src/services/api.js`
- `frontend/src/hooks/useVoiceOutput.js`

#### Diagnóstico

`GET /api/voz/alertas` usava `Math.random()` para afirmar uma falha de
produção ou a ausência de alerta. Não havia consulta a BD, telemetria, MES
ou serviço de alertas.

`POST /api/voz/comando` devolvia valores fixos sobre produção, manutenção e
eficiência e podia sintetizar essas afirmações por TTS. Não havia fonte
operacional ligada ao handler.

Não foi localizado consumidor frontend ativo desses dois endpoints. As
outras quatro rotas do router possuem integração técnica real ou proteção
Truth e não faziam parte da correção.

#### Correção aplicada

- Removida a seleção aleatória de alertas.
- Removidas as afirmações hardcoded sobre produção, manutenção e eficiência.
- Removida a geração TTS de respostas operacionais fictícias.
- Preservados os caminhos e a autenticação existentes.
- Adotado HTTP 503 com:
  - `ok: false`;
  - `status: "not_configured"`;
  - `code: "VOICE_OPERATIONAL_SOURCE_NOT_CONFIGURED"`;
  - campos factuais e áudio em `null`.
- Adicionado teste de contrato determinístico, incluindo garantia de que TTS
  não é chamado.

#### Impacto

Risco de implementação: **baixo**.

Existe alteração semântica intencional de `200/sucesso fictício` para
`503/not_configured`. A rota pública, o middleware `requireAuth` e os campos
legados principais foram preservados. Não há impacto arquitetural e não
foram alterados Domain Governance, Finance Certified Chain, Prediction
Platform, ARC, NAV, EOX ou o canal certificado `/api/voz/conversa`.

#### Evidências

Validações executadas:

- `node --check src/routes/voz.js`: aprovado.
- `node --check src/tests/ent-exec-001/mb001VoiceIntegrity.test.js`: aprovado.
- `node --test src/tests/ent-exec-001/mb001VoiceIntegrity.test.js`:
  **1 aprovado, 0 falhas**.
- `node src/tests/m1/M1_19EnterprisePromotionCertification.test.js`:
  **7 aprovados, 0 falhas**.
- `npm run test:ent-aud-002`:
  **7 aprovados, 0 falhas**.
- Diagnóstico do editor nos dois arquivos de código:
  **nenhum erro de lint**.

A auditoria AIOI Truth Stage 7 apresentou **54 aprovados e 2 falhas** antes
e depois da correção. As falhas T8 e T12 já existentes tratam de IOE e de
detecção estática dos canais `executive_mode`/`impetus_voice`; não são
causadas pelo MB-001. Corrigi-las exigiria alterar escopo ou baseline
certificada e, portanto, não foi autorizado.

#### Justificativa

Os dois endpoints sem fonte operacional deixaram de produzir ou narrar
informação fictícia. A ausência da integração agora é explícita, estável e
testada.

#### Pendências

- Nenhuma pendência funcional para o MB-001.
- Uma eventual fonte operacional futura deve ser tratada em escopo próprio.
- O drift da certificação AIOI deve permanecer registrado para atividade
  explicitamente autorizada; não bloqueia a correção isolada do MB-001.

### MB-002

**Status:**

- [ ] Não iniciado
- [ ] Em andamento
- [x] Concluído por aceitação formal

#### Arquivos analisados

Finding canónico e superfícies frontend:

- `frontend/src/domains/logistics/operational-runtime/LogisticsOperationalWorkspace.jsx`
- `frontend/src/domains/logistics/routes/LogisticsOperationalWorkspacePage.jsx`
- `frontend/src/domains/logistics-operational/pages/WmsOperationalDashboardPage.jsx`
- `frontend/src/domains/logistics-operational/services/wmsV1ApiClient.js`
- `frontend/src/presentation/hooks/useWmsOperationalSummary.js`
- `frontend/src/features/dashboard/centroComando/WidgetLogistica.jsx`
- `frontend/src/features/dashboard/centroComando/WmsOperationalCcExposure.jsx`
- `frontend/src/features/dashboard/centroComando/LogisticsNativeCockpitPromotion.jsx`
- `frontend/src/pages/LogisticaInteligente.jsx`
- `frontend/src/pages/AdminLogistics.jsx`
- `frontend/src/services/api.js`

Módulos OPM/WMS:

- `frontend/src/domains/logistics-operational/modules/warehouse-intelligence/wiKpiUtils.js`
- `frontend/src/domains/logistics-operational/modules/warehouse-intelligence/useWarehouseIntelligenceFoundation.js`
- `frontend/src/domains/logistics-operational/modules/warehouse-intelligence/WarehouseIntelligenceModule.jsx`
- `frontend/src/domains/logistics-operational/modules/cognitive-logistics/clKpiUtils.js`
- `frontend/src/domains/logistics-operational/modules/cognitive-logistics/useCognitiveLogisticsFoundation.js`
- `frontend/src/domains/logistics-operational/modules/cognitive-logistics/CognitiveLogisticsModule.jsx`
- Utilitários KPI, foundations e módulos de `warehouse`, `inventory`,
  `receiving`, `picking`, `shipping` e `transfers` em
  `frontend/src/domains/logistics-operational/modules/`.

Backend e fontes:

- `backend/src/server.js`
- `backend/src/routes/logisticsIntelligence.js`
- `backend/src/routes/admin/logistics.js`
- `backend/src/services/logisticsIntelligenceService.js`
- `backend/src/domains/logistics/routes/logisticsRoutes.js`
- `backend/src/domains/logistics/services/logisticsFoundationService.js`
- `backend/src/domains/logistics/services/logisticsObservabilityService.js`
- `backend/src/domains/logistics-operational/routes/logisticsOperationalRoutes.js`
- `backend/src/domains/logistics-operational/routes/wmsV1Routes.js`
- `backend/src/domains/logistics-operational/controllers/wmsOperationalApiControllers.js`
- `backend/src/domains/logistics-operational/compatibility/operationalCompatibilityLayer.js`
- `backend/src/domains/logistics-operational/services/operationalServices.js`
- `backend/src/cognitiveRuntime/domains/logistics/bridge/logisticsTenantSignalLoader.js`
- `backend/src/cognitiveRuntime/domains/logistics/bridge/logisticsBlockBridge.js`
- `backend/src/cognitiveRuntime/domains/logistics/runtime/logisticsFoundationAttachment.js`
- `backend/src/cognitiveRuntime/domains/logistics/runtime/logisticsCockpitConsolidationRuntime.js`

Governança e evidência:

- `frontend/docs/evidence/ENT-AUD-002/ENT-AUD-002-MASTER-BACKLOG.md`
- `frontend/docs/evidence/ENT-AUD-002/technical-debt/ENT-AUD-002-TECHNICAL-DEBT.md`
- `frontend/docs/evidence/OPM-000-FUNCTIONAL-CONFORMANCE.md`
- `frontend/docs/evidence/OPM-007-WAREHOUSE-INTELLIGENCE.md`
- `frontend/docs/evidence/UX-001-COMMAND-CENTER.md`
- `backend/docs/evidence/BASELINE-LOGISTICS-v1.1.md`
- `backend/docs/evidence/WMS-007-ROUTING.md`

#### Arquivos alterados

- `frontend/src/domains/logistics/operational-runtime/LogisticsOperationalWorkspace.jsx`
- `frontend/src/tests/ent-exec-001/mb002LogisticsIntegrity.test.mjs` (novo)
- `.cursor/rules/ent-exec-001-execution-order.mdc` (novo; persistência da
  ordem do programa solicitada)
- `ENT-EXEC-001-P0-REPORT.md`

#### Diagnóstico

O finding TD-002 estava confirmado no workspace Logistics legacy. A rota
`/api/logistics-operational/operations/overview` não existe no backend
canónico e, quando falhava, o frontend apresentava:

- OTIF: `93%`;
- recebimentos pendentes: `12`;
- pickings abertos: `47`;
- expedições pendentes: `8`;
- ocupação de docas: `65%`.

O mesmo workspace mostrava três zonas de picking inventadas com zero itens,
três docas fictícias em estado `Livre`, `Alertas ativos = 0` e a afirmação
de que a integração GPS/TMS estava ativa sem consultar qualquer fonte.

A auditoria ampliada também identificou falsos zeros em falhas WMS, scores
saudáveis derivados de snapshots vazios nos módulos Warehouse Intelligence
e Cognitive Logistics, e indicadores/recomendações fixos no serviço legacy
de inteligência logística.

#### Correção aplicada

- Removidos os cinco valores KPI usados como fallback.
- Falhas HTTP ou de rede agora mantêm `data = null` e exibem
  `Fonte operacional não configurada ou indisponível`.
- KPIs sem fonte exibem `—` com cor neutra, sem saúde aparente.
- Zonas e contagens de picking fictícias foram substituídas por estado vazio.
- Docas e estados `Livre` fictícios foram substituídos por estado vazio.
- `Alertas ativos = 0` foi substituído por `—`.
- A afirmação `Integração GPS/TMS ativa` foi substituída por estado
  `não configurada ou sem dados`.
- Layout, navegação, feature flags e contratos backend foram preservados.

Não foram alterados o fluxo Receiving, rollout, telemetria nova, APIs,
integrações, módulos OPM/WMS certificados ou Baseline Logistics v1.1.

#### KPIs e indicadores ajustados

1. OTIF `93%` → `—` quando a fonte não responde.
2. Recebimentos `12` → `—`.
3. Pickings `47` → `—`.
4. Expedições `8` → `—`.
5. Ocupação de docas `65%` → `—`.
6. Filas Zona A/B/C com `0 itens` → coleção visual vazia.
7. Docas 1/2/3 em estado `Livre` → sem telemetria de docas.
8. Alertas ativos `0` → `—`.
9. GPS/TMS `ativa` → `não configurada ou sem dados`.

#### Impacto

Risco da correção aplicada: **baixo**. Não houve impacto arquitectural,
alteração de rota, contrato público, navegação ou componente certificado.

#### Evidências

- `node --test src/tests/ent-exec-001/mb002LogisticsIntegrity.test.mjs`:
  **2 aprovados, 0 falhas**.
- `npm run test:logistics-runtime-validation`:
  **6 aprovados, 0 falhas**.
- `npm run test:logistics-native-cockpit-promotion`:
  **12 aprovados, 0 falhas**.
- `npm run test:ent-aud-002`:
  **7 aprovados, 0 falhas**.
- `npm run build`: aprovado.
- Diagnóstico do editor nos arquivos alterados:
  **nenhum erro de lint**.
- Busca pelos cinco fallbacks, zonas, docas e afirmação GPS/TMS no workspace:
  **nenhuma ocorrência remanescente**.

#### Justificativa

O finding canónico TD-002 foi eliminado sem expandir arquitetura. O item não
poderia ser encerrado pelo critério ampliado de “nenhum dado sintético em
todo o domínio” sem modificar artefactos protegidos ou contratos. A decisão
de governança de 21/07/2026 aceitou formalmente o fechamento canónico e o
encaminhamento das observações adicionais.

#### Observações formalmente aceites

- `WmsOperationalDashboardPage.jsx` e `useWmsOperationalSummary.js`
  convertem falhas de fontes reais em arrays vazios e exibem zeros.
- Warehouse Intelligence pode apresentar `1 WH`, SLA `OK`, eficiência
  `100%` e congestionamento `0%` sem dados.
- Cognitive Logistics pode apresentar health `100`, risco `0`, eficiência
  `100%`, tendência estável e risco baixo sem dados.
- Módulos OPM renderizam zeros durante loading/erro antes do estado técnico.
- `logisticsIntelligenceService.js` persiste `bottleneck_count = 0` sem
  cálculo e contém recomendações determinísticas rotuladas como IA.
- Alterar essas superfícies conflita com certificações OPM/WMS/UX,
  `BASELINE-LOGISTICS-v1.1` ou exige mudança de contrato público.

Conforme a governança, essas pendências não foram corrigidas sem autorização
explícita e tratamento de baseline. Foram encaminhadas ao MB-023, que trata
a consolidação das superfícies Logistics existentes; qualquer alteração
futura continua condicionada à INC exigida pelas respectivas baselines.

### MB-003

**Status:**

- [ ] Não iniciado
- [ ] Em andamento
- [x] Concluído

#### Arquivos analisados

Frontend e fluxo direto:

- `frontend/src/components/InsightsList.jsx`
- `frontend/src/components/InsightsList.css`
- `frontend/src/components/DataLineageBlock.jsx`
- `frontend/src/pages/InsightsPage.jsx`
- `frontend/src/features/dashboard/DashboardInteligente.jsx`
- `frontend/src/features/dashboard/DashboardMecanico.jsx`
- `frontend/src/hooks/useCachedFetch.js`
- `frontend/src/services/api.js`
- `frontend/src/App.jsx`
- `frontend/src/features/dashboard/widgets/CenterWidget.jsx`
- `frontend/src/utils/industrialCoreAccess.js`
- `frontend/src/tests/reg002/reg002-operational-insights.test.mjs`
- `frontend/src/tests/ent-aud-002/entAud002.test.mjs`

Backend e fontes diretamente relacionadas:

- `backend/src/server.js`
- `backend/src/routes/dashboard.js`
- `backend/src/routes/dashboardOperationalBrain.js`
- `backend/src/services/dashboardKPIs.js`
- `backend/src/services/personalizedInsightsService.js`
- `backend/src/services/dataLineageService.js`
- `backend/src/services/dashboardInsightBuilder.js`
- `backend/src/services/dashboardProfileResolver.js`
- `backend/src/services/operationalInsightsService.js`
- `backend/src/services/productionRealtimeService.js`
- `backend/src/services/qualityIntelligenceService.js`
- `backend/src/services/hrIntelligenceService.js`
- Adapters KPI e signal loaders diretamente consumidos pelos modos
  Environmental, Production e HR.

Governança e baseline:

- `frontend/docs/evidence/ENT-AUD-002/ENT-AUD-002-MASTER-BACKLOG.md`
- `frontend/docs/evidence/ENT-AUD-002/technical-debt/ENT-AUD-002-TECHNICAL-DEBT.md`
- `frontend/docs/evidence/REG-002/REG-002-R4-OPERATIONAL-INSIGHTS.md`
- `backend/docs/evidence/SYSTEM-ARCHITECTURE-HOMOLOGATION.md`
- `backend/docs/evidence/BASELINE-SYSTEM-v1.0.md`

#### Arquivos modificados

- `frontend/src/components/InsightsList.jsx`
- `frontend/src/components/InsightsList.css`
- `frontend/src/tests/ent-exec-001/mb003InsightsIntegrity.test.mjs` (novo)
- `ENT-EXEC-001-P0-REPORT.md`

#### Diagnóstico

Quando `insights` era uma coleção vazia, `InsightsList` substituía o
resultado por três objetos estáticos sem fonte operacional. O mesmo fallback
era exibido após indisponibilidade do serviço, erro HTTP ou ausência de
empresa, convertendo “sem dados” em risco operacional fictício.

#### Riscos sintéticos removidos

1. `Risco de atraso em manutenção crítica`, impacto alto, referência
   `259.XXX.007` e recomendação de rever alocação de equipa.
2. `Oportunidade de otimização de consumo`, referência `153.XXX.007` e
   recomendação de ajustar configuração B1.
3. `Anomalia detectada: Pico de temperatura`, referência `139.XXX.007` e
   recomendação de inspecionar o setor Ar.

#### Correção aplicada

- Removidos `defaultInsights` e a substituição da coleção vazia.
- Dados reais recebidos pelo componente continuam a usar o fluxo existente.
- Coleção vazia agora apresenta:
  - `Dados de insights indisponíveis`;
  - `Risco não avaliado`;
  - `A ausência de dados não significa ausência de risco`.
- Card, loading, modal de explicabilidade, cliques, rota, guard e navegação
  foram preservados.
- O novo estado visual utiliza exclusivamente tokens do Design System
  Industrial 4.0 e `border-radius` de 4 px.

#### Impacto

Risco de implementação: **baixo**. Impacto arquitectural: **nenhum**.
Nenhuma rota, contrato público, engine, modelo de IA ou backend certificado
foi alterado.

Baselines preservadas: **Sim**.

#### Evidências

- `node --test src/tests/ent-exec-001/mb003InsightsIntegrity.test.mjs`:
  **2 aprovados, 0 falhas**.
- `npm run test:reg002-operational-insights`:
  **4 aprovados, 0 falhas**.
- `npm run test:ent-aud-002`:
  **7 aprovados, 0 falhas**.
- `npm run build`: aprovado.
- Diagnóstico do editor:
  **nenhum erro de lint**.
- Teste MB-003 proíbe os três títulos, referências e recomendações
  fictícias e valida o estado `Risco não avaliado`.

#### Observações protegidas

Sem alteração neste microciclo:

- A rota Dashboard converte todos os KPIs em insights e deriva severidade
  apenas da cor, inclusive quando o valor é zero.
- Alguns adapters convertem fontes ausentes em `0` ou `—` antes da geração
  de insights.
- Prioridade pode ser derivada da posição do item.
- Linhagem usa fiabilidade e frescura default sem prova concreta da fonte.
- Loaders Environmental e HR utilizam proxies que não equivalem a medições
  operacionais.

Encaminhamento:

- MB-019: contratos, mounts, owners e consumidores.
- MB-020: disponibilidade e fonte real das capabilities.
- MB-021: reconciliação da documentação canónica.
- MB-030: persistência e classificação dos sinais Environment.

#### Pendências

Nenhuma pendência funcional no finding canónico MB-003. As observações
protegidas exigem os escopos acima e não autorizam alteração da baseline
Dashboard `LOCKED`.

### MB-004

**Status:**

- [ ] Não iniciado
- [ ] Em andamento
- [x] Concluído por aceitação formal

#### Arquivos analisados

Frontend Safety:

- Todos os arquivos em `frontend/src/domains/safety/`.
- `frontend/src/cognitiveRuntime/domains/sst/safetyCockpitRuntime.js`
- `frontend/src/cognitiveRuntime/domains/sst/safetyFallbackRuntime.js`
- `frontend/src/observability/safetyOperationalTelemetry.js`
- `frontend/src/platform/cognitive/adapters/safety/safetyCognitiveAdapter.js`
- `frontend/src/presentation/eox/EoxDomainNavLayout.jsx`
- `frontend/src/services/api.js`
- `frontend/src/App.jsx`
- `frontend/src/certification/opm001dOperationalBaselineRegistry.js`

Backend Safety e fluxo Z.25:

- `backend/src/routes/safetyTelemetry.js`
- `backend/src/routes/safetyOperational.js`
- `backend/src/services/operationalAlertsService.js`
- `backend/src/services/machineSafetyService.js`
- `backend/src/cognitiveRuntime/pilot/safetyCockpitPilot.js`
- `backend/src/cognitiveRuntime/domains/sst/bridge/safetySignalLoader.js`
- `backend/src/cognitiveRuntime/domains/sst/bridge/safetyEngineBridge.js`
- `backend/src/cognitiveRuntime/domains/sst/cockpit/incidentIntelligenceCenter.js`
- `backend/src/cognitiveRuntime/domains/sst/cockpit/ppeComplianceCenter.js`
- `backend/src/cognitiveRuntime/domains/sst/cockpit/permitGovernanceCenter.js`
- `backend/src/cognitiveRuntime/domains/sst/cockpit/safetyTelemetryCenter.js`
- `backend/src/cognitiveRuntime/domains/sst/runtime/safetyCockpitConsolidationRuntime.js`
- `backend/src/cognitiveRuntime/domains/sst/cockpit/safetyCockpitConsolidator.js`
- `backend/src/cognitiveRuntime/domains/sst/observability/safetyCognitiveHealth.js`
- `backend/src/domains/safety/analytics/safetyOperationalValidationOrchestrator.js`
- `backend/src/domains/safety/analytics/safetyCognitivePressureAnalyzer.js`

Testes, evidência e baseline:

- `frontend/src/tests/safety-operational-validation/safetyOperationalValidationScenarios.mjs`
- `frontend/src/tests/safety-publication-runtime/safetyPublicationRuntimeScenarios.mjs`
- `frontend/src/tests/arc003a/arc003aPresentationRecoveryTests.mjs`
- `backend/tests/cognitive-runtime/runSstNativeCockpitTests.js`
- `frontend/docs/evidence/ENT-AUD-002/technical-debt/ENT-AUD-002-TECHNICAL-DEBT.md`
- `backend/docs/evidence/BASELINE-SAFETY-v1.0.md`

#### Arquivos modificados

- `frontend/src/domains/safety/telemetry/SafetyTelemetryHub.jsx`
- `frontend/src/domains/safety/cognitive/SafetyCognitiveHub.jsx`
- `backend/src/routes/safetyTelemetry.js`
- `frontend/src/tests/ent-exec-001/mb004SafetyIntegrity.test.mjs` (novo)
- `ENT-EXEC-001-P0-REPORT.md`

#### Diagnóstico e correções aplicadas

1. **Health frontend hardcoded:** erro HTTP/rede produzia runtime
   operacional, eventos/fila zero e WAVE 3 ativa.
   - Correção: `health` e sensores nulos com `Telemetria indisponível`.
2. **Sensores demonstrativos:** cinco sensores locais apareciam `Online`
   com valores nominais.
   - Correção: removido o catálogo demonstrativo; somente sensores presentes
     no payload podem ser renderizados. Sem payload: `Sensor não configurado
     ou sem dados disponíveis`.
3. **KPIs de telemetria:** ausência era convertida em zero, `Ativo` ou estado
   saudável.
   - Correção: métricas ausentes exibem `—`/`Indisponível`; thresholds só
     são avaliados para números reais.
4. **Alertas SST:** críticos, avisos e informativos eram sempre zero.
   - Correção: valores ausentes exibem `—`; somente payload real produz
     contagens.
5. **Sinais cognitivos frontend:** séries de incidentes/near miss e índices
   42%, 87%, 91% e 94% eram enviados ao backend como operação.
   - Correção: removido o gerador e interrompida a chamada sem fonte real;
     estado explícito `Fonte de sinais SST não configurada` e `Estado SST não
     avaliado`.
6. **Defaults cognitivos de apresentação:** existência de um pack podia
   produzir conformidade 87%, exposição 42% e tendência crescente.
   - Correção: todos passam a `—` quando o campo real não existe, sem cor
     saudável.
7. **Snapshot backend:** devolvia `ok: true` com duas métricas constantes
   iguais a zero.
   - Correção: preservado o envelope, agora com `ok: false`,
     `status: not_configured`, código técnico e métricas nulas.

#### Impacto

Risco da correção aplicada: **baixo**. Impacto arquitectural: **nenhum**.
Não foram criados sensores, providers, integrações ou engines. Rotas,
navegação e envelope do snapshot foram preservados.

Baselines certificadas alteradas: **Não**.

#### Evidências

- Teste específico MB-004: **3 aprovados, 0 falhas**.
- Safety operational validation: **8 aprovados, 0 falhas**.
- Safety publication runtime: **6 aprovados, 0 falhas**.
- ARC-003A presentation recovery: **10 aprovados, 0 falhas**.
- Z.25 SST Native Cockpit: **15 aprovados, 0 falhas**.
- `node --check backend/src/routes/safetyTelemetry.js`: aprovado.
- `npm run build`: aprovado.
- Diagnóstico do editor: **nenhum erro de lint**.

#### Observações protegidas

- O loader Z.25 conta propostas genéricas como incidentes Safety e deriva
  near miss, criticidade, PT, EPI e exposição por fórmulas fixas.
- Em erro, o loader pode devolver setor `operacional` com contagem `3`.
- A tendência semanal é uma série fixa sem fonte persistida.
- Centers Z.25 usam EPI 90%, PT 100%, telemetry `stable/ok` e saúde cognitiva
  default na ausência de dados.
- O pilot Safety envia contagens fixas para validação cognitiva.
- `SafetyRolloutHub` e `SafetyGovernanceHub` contêm cenários demonstrativos;
  componentes certificados não foram alterados.

Encaminhamento:

- O núcleo Z.25 continua pertencendo ao MB-004, mas exige nova INC ou
  aceitação formal devido à Baseline Safety v1.0 `LOCKED`. A correção segura
  foi formalmente aceite em 21/07/2026, sem autorização para alterar o Z.25.
- MB-018: eventual prova e integração de hardware/sensores.
- MB-020: distinção `implemented/mounted/enabled/running` dos adapters.
- MB-031: persistência e sink de observabilidade Safety.
- MB-014: decisão formal sobre pilot, rollout e governance demonstrativos.

#### Pendências

O critério ampliado de ausência total de sintéticos não foi comprovado no
cockpit Z.25 protegido. A decisão de governança aceitou formalmente o
fechamento da parcela autorizada e o encaminhamento das observações, sem
alterar esses artefactos.

### MB-005

**Status:**

- [ ] Não iniciado
- [ ] Em andamento
- [x] Concluído

#### Arquivos auditados

Configuração e ambiente:

- `backend/.env` — permissões `0600`; valores não reproduzidos.
- `backend/.env.example`
- `frontend/.env.production`
- `ecosystem.config.js`
- `backend/ecosystem.industrial-lab.config.js`
- `infra/observability/docker-compose.yml`
- `docker-compose.override.example.yml`

Diagnósticos, segurança e PM2:

- `backend/src/securityApplication/secretManagement.js`
- `backend/src/governance/flagReconcilerRuntime.js`
- `backend/src/rolloutCenter/resolvers/effectiveFlagsResolver.js`
- `backend/src/routes/admin/runtimeFlags.js`
- `backend/src/routes/rolloutCenter.js`
- `backend/src/securityGoLiveValidation/engine/runtimeHealthValidator.js`
- `backend/src/securityGoLiveValidation/engine/goLiveValidationEngine.js`
- `backend/src/securityGoLiveValidation/engine/goLiveDecisionEngine.js`
- `backend/src/securityGoLiveValidation/index.js`
- `backend/src/routes/audit.js`
- `scripts/pm2-secure-restart.sh`
- `scripts/security-baseline-01-collect.sh`

Serviços e scripts com defaults:

- `backend/src/services/timeClockIntegrationService.js`
- `backend/scripts/industrial-lab-oidc-provider.js`
- `backend/scripts/seed-admin-portal.js`

Evidências históricas:

- `backend/docs/evidence/backend-stability-p0-001/phase-a-snapshot.txt`
- `backend/docs/evidence/operational-go-live-01/infrastructure-validation.json`
- `backend/docs/evidence/operational-go-live-01/sec21c-validation.json`
- `backend/docs/evidence/sec-21c/go-live-validation-latest.json`
- `backend/docs/evidence/sec-21c/go-live-validation-report.json`

Foram ainda auditados os logs PM2 atuais por padrões de alta confiança, sem
reproduzir conteúdo sensível.

#### Arquivos modificados

- `backend/src/securityApplication/diagnosticRedaction.js` (novo)
- `backend/src/securityApplication/secretManagement.js`
- `backend/src/governance/flagReconcilerRuntime.js`
- `backend/src/rolloutCenter/resolvers/effectiveFlagsResolver.js`
- `backend/src/securityGoLiveValidation/engine/runtimeHealthValidator.js`
- `backend/src/securityGoLiveValidation/engine/goLiveValidationEngine.js`
- `backend/src/securityGoLiveValidation/index.js`
- `backend/src/securityGoLiveGate/engine/infrastructureGateValidator.js`
- `backend/src/services/timeClockIntegrationService.js`
- `backend/scripts/audit/cert04_pilot_day0.js`
- `backend/scripts/environment-shadow-activation-deploy.js`
- `backend/scripts/industrial-lab-oidc-provider.js`
- `backend/scripts/seed-admin-portal.js`
- `backend/src/tests/ent-exec-001/mb005DiagnosticExposure.test.js` (novo)
- `ENT-EXEC-001-P0-REPORT.md`

`ecosystem.config.js` foi testado com uma mitigação local, mas a alteração
foi removida após a regressão SEC-04 identificar drift da baseline P0.
Portanto, o arquivo certificado não integra o diff final do MB-005.

#### Segredos encontrados

Nenhum valor é registado neste relatório. Foram confirmadas configurações
ativas, com aparência não-placeholder, para as seguintes categorias:

- PostgreSQL: `DB_APP_PASSWORD`, `DB_PASSWORD`, `PGPASSWORD`.
- Assinatura/autorização: `JWT_SECRET`, `IMPETUS_ADMIN_JWT_SECRET`.
- Provedores IA/média: `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`,
  `GEMINI_API_KEY`, `D_ID_API_KEY`, `ELEVEN_API_KEY`, `ANAM_API_KEY`.
- Segurança e criptografia: `IMPETUS_MFA_ENCRYPTION_KEY`,
  `DATA_ENCRYPTION_KEY`, `TIME_CLOCK_ENC_KEY`.
- Integrações: `ADMIN_PORTAL_TURNSTILE_SECRET_KEY`,
  `IMPETUS_EDGE_AGENT_TOKEN`, `GITHUB_WORKFLOW_TOKEN`.

Localizações e risco:

1. `backend/.env`: armazenamento ativo com permissão adequada, mas os
   valores foram propagados para snapshots PM2.
2. Cinco evidências históricas `0644`: contêm ambiente PM2 e indicadores de
   credenciais reais. Risco crítico de leitura local e cópia indevida.
3. Processo frontend PM2: herdou variáveis exclusivas do backend pelo
   ambiente do daemon. Risco alto; correção efetiva requer atualização
   operacional da configuração e restart controlado.
4. Endpoints de flags: podiam classificar nomes sensíveis `IMPETUS_*` como
   feature flags e devolver os respetivos valores.
5. SEC-21C: persistia e podia devolver `pm2 jlist` integral.
6. Três defaults hardcoded: chave de criptografia do ponto, segredo OIDC lab
   e senha do seed administrativo.

#### Correções aplicadas

- Criada redação diagnóstica recursiva com detecção deny-first de nomes
  sensíveis.
- Flag Reconciler e Rollout Center agora omitem variáveis sensíveis antes de
  construir snapshots/respostas.
- O probe SEC-21C executa `pm2 jlist` uma única vez e conserva somente nome,
  PID, status, reinícios, uptime, caminhos e métricas CPU/memória.
- `checks.pm2.output` passa a ser sempre `[REDACTED]`.
- O endpoint de auditoria SEC-21C aplica redação profunda em defesa.
- O writer SEC-21C sanitiza uma cópia antes de qualquer `JSON.stringify`.
- O gate SEC-21A e o snapshot CERT-04 passaram a usar a mesma allowlist PM2.
- O deploy Environment passou a gravar snapshots PM2 saneados e backups de
  ambiente com permissão `0600`.
- O scanner APPSEC passou a cobrir `.json`, `.txt`, `.log` e `.md`, incluindo
  `pm2_env` e nomes de credenciais críticas.
- Removido o fallback criptográfico previsível do serviço de ponto.
- O provider OIDC lab passou a exigir segredo configurado em ambiente.
- O seed administrativo passou a exigir email e senha em ambiente e deixou
  de conter senha default.

#### PM2

Exposição encontrada:

- snapshots históricos com `pm2_env`;
- herança de segredos backend pelos processos web;
- dump PM2 local protegido por diretório `0700` e arquivo `0600`.

Redução aplicada:

- novos probes e evidências deixam de persistir `pm2_env`;
- endpoints deixam de devolver variáveis sensíveis;
- nenhuma alteração, restart ou `--update-env` foi executado.

Riscos restantes:

- processos vivos continuam com o ambiente anterior até ação operacional;
- aplicar `filter_env` exige alteração/revalidação da baseline no MB-006;
- evidências certificadas existentes não foram modificadas.

#### Impacto

Impacto arquitetural: **nenhum**. Não houve alteração de autenticação,
infraestrutura, CI/CD, deployment ou contratos públicos. As respostas
diagnósticas preservam o envelope e omitem somente conteúdo sensível.

Baselines preservadas: **Sim**. O drift experimental de
`ecosystem.config.js` foi revertido antes do encerramento.

#### Evidências e testes

- Teste MB-005: **7 aprovados, 0 falhas**.
- APPSEC-01: **20 aprovados, 0 falhas**.
- SEC-04: **19 aprovados, 1 falha ambiental não causada pelo MB-005**:
  `NGINX_CONFIG_DRIFT`, `BLUEPRINT_DRIFT` e `UFW_DRIFT`; hashes ficaram
  conformes após a reversão do ecosystem.
- Sintaxe dos arquivos JS modificados: aprovada.
- Probe PM2 sanitizado: 10 processos, `output=[REDACTED]`, sem `pm2_env`.
- Verificação de flags: nome e valor sensíveis omitidos; flag segura mantida.
- Scanner ampliado: 33 artefactos potenciais sinalizados sem leitura pública
  dos valores.
- Build frontend: aprovado em **34,13 s**, com aviso preexistente de chunks
  acima de 500 kB.
- Lint: nenhum erro.

#### Segredos removidos

Do código:

- fallback criptográfico previsível do sistema de ponto;
- segredo estático do OIDC lab;
- senha administrativa default do seed.

Não foram removidos nem rotacionados valores ativos do ambiente.

#### Pendências

- Rotacionar externamente credenciais PostgreSQL, JWT/admin JWT, provedores
  IA/média, Turnstile, edge, GitHub e chaves criptográficas.
- Invalidar sessões/tokens derivados após rotação de JWT/MFA.
- Restringir/quarentenar originais históricos e produzir sucessores
  saneados, preservando bytes e hashes certificados.
- Aplicar filtro de ambiente aos processos frontend/admin no MB-006, com
  janela operacional e revalidação SEC-04.
- Reiniciar processos com `--update-env` somente em atividade operacional
  autorizada.

### MB-006

**Status:** [ ] Não iniciado · [ ] Em andamento · [x] Concluído

#### Diagnóstico

A auditoria READ-ONLY do PM2 vivo encontrou 10 processos, um daemon e nenhum
nome duplicado. Sem reproduzir valores ambientais:

- `impetus-backend`: online, script/cwd/porta esperados, mas PM2 conserva
  `NODE_ENV=development`;
- `impetus-frontend`: online, `NODE_ENV=development`, binding
  `0.0.0.0:3000` e ausência das variáveis `SERVE_DIST_*` do perfil produtivo;
- `impetus-admin-portal`: online e classificado como `production`;
- `lipsync-api`: online, sem `NODE_ENV`; a disponibilidade na porta declarada
  não foi diagnosticada, pois estabilidade pertence ao MB-007;
- processos lab misturam perfil ausente e `production`; não foram alterados.

O dump persistido reproduz o perfil incorreto de backend/frontend. O frontend
conserva variáveis backend herdadas, inclusive nomes classificados como
sensíveis; nenhum nome sensível específico ou valor foi registado neste
relatório.

Também foram confirmadas quatro inconsistências locais:

1. `ecosystem.config.js` combina `cwd=backend` com
   `script=./backend/src/server.js`, resolução inválida para nova partida;
2. vários launchers reiniciavam processos por nome com `--update-env`, o que
   não seleciona `env_production`;
3. o loader de ambiente permitia que ficheiros locais sobrescrevessem o
   perfil fornecido pelo processo;
4. `npm run dev` do backend não declarava `NODE_ENV=development`.

Não existe perfil PM2 de homologação. Nenhum foi criado porque o prompt do
MB-006 proíbe novos perfis; a definição e qualificação desse ambiente ficam
encaminhadas ao MB-010.

#### Arquivos auditados

- `ecosystem.config.js`;
- `ecosystem.lipsync.config.cjs`;
- `backend/ecosystem.industrial-lab.config.js`;
- `docker/ecosystem.backend.container.cjs`;
- `docker/ecosystem.frontend.container.cjs`;
- `backend/src/config/loadEnv.js`;
- `backend/src/server.js`;
- `backend/package.json`;
- `frontend/package.json`;
- `admin-portal/package.json`;
- `frontend/serveDist.cjs`;
- `start.sh`;
- `scripts/pm2-secure-restart.sh`;
- `scripts/continue-from-checkpoint.sh`;
- `scripts/deploy-impetus.sh`;
- `backend/scripts/ops/install-industrial.sh`;
- `backend/scripts/runtime-unification-promotion-pipeline.sh`;
- `backend/scripts/environment-shadow-activation-deploy.js`;
- `infra/scripts/impetus-emergency-restore.sh`;
- estado PM2 vivo e dump persistido, exclusivamente por projeção saneada.

#### Correções

- Criado `ecosystem.runtime.config.cjs`, adaptador aditivo que importa o
  ecosystem certificado, corrige somente a resolução do script backend,
  explicita o perfil development já existente no Admin Portal e aplica
  `filter_env` por prefixo a frontend/admin.
- `ecosystem.config.js` foi devolvido exatamente ao hash anterior ao MB-006
  (`fe8b16b19486fb91d41b4f82a3fe5c3866c43b6d8cb2986453789419b8237fc8`);
  nenhuma evidência ou hash certificado foi atualizado.
- Os sete launchers canónicos auditados passaram a utilizar o adaptador com
  `--env production --update-env`; launchers seletivos usam `--only`, a
  instalação limpa usa `startOrRestart` e o checkpoint resolve a partir da
  raiz independentemente do diretório de chamada.
- `loadEnv.js` passou a aplicar precedência determinística
  `process.env > primário > legado > .env do cwd`.
- `npm run dev` do backend passou a declarar explicitamente
  `NODE_ENV=development`.
- Nenhum processo, dump, serviço, binding, variável viva ou ficheiro `.env`
  foi modificado.

#### Impacto

Impacto arquitetural: **nenhum**. O adaptador não cria aplicações, perfis,
rotas, serviços ou contratos; deriva a configuração certificada sem a
modificar. Deployment, CI/CD e infraestrutura permaneceram intocados.

Baselines preservadas: **Sim** em relação ao estado de entrada do MB-006. O
ecosystem certificado conserva o hash pré-ciclo e os artefactos históricos
não foram alterados. Permanece o drift histórico já existente entre esse
hash de entrada e uma baseline mais antiga; ele não foi ocultado nem
rebaselined neste microciclo.

#### Evidências e testes

- Teste MB-006: **7 aprovados, 0 falhas**, incluindo precedência real entre
  fontes, não mutação do ecosystem certificado e robustez dos launchers.
- Sintaxe Node dos arquivos JS/CJS alterados: aprovada.
- Sintaxe Bash dos seis launchers shell alterados: aprovada.
- Build frontend: aprovado em **36,99 s**, com aviso preexistente de chunks
  acima de 500 kB.
- Diagnósticos IDE nos arquivos alterados: **0 erros**.
- `npm run lint` backend: **não executável** por ausência preexistente de
  configuração ESLint; o comando foi encerrado após emitir esse diagnóstico.
  Não foi criada configuração por estar fora do escopo.
- SEC-04: **19 aprovados, 1 falha ambiental preexistente** no cenário
  “baseline íntegra”; o resultado permanece associado aos drifts ambientais
  já registados e não autorizou alteração de baseline.
- Revisão técnica independente: primeira passagem reprovou precedência
  primário/legado e dois launchers; as três falhas foram corrigidas. Segunda
  passagem: **APROVADO**, 7/7 testes, sem regressão crítica/alta e MB-007
  liberado.

#### Divergências eliminadas

- Ambiguidade de precedência entre ambiente do processo e ficheiros `.env`.
- Script de desenvolvimento backend sem perfil explícito.
- Launchers canónicos que reiniciavam por nome sem selecionar produção.
- Resolução inválida do backend para novas partidas pelo ecosystem.
- Herança futura de namespaces backend pelos processos web, quando o
  adaptador for aplicado em janela operacional.

#### Pendências operacionais

- Backend e frontend vivos continuam classificados como `development`.
- Frontend vivo continua ligado a `0.0.0.0:3000`.
- Variáveis herdadas permanecem nos processos já existentes.
- O dump PM2 persistido continua reproduzindo o estado anterior.
- Aplicar o adaptador em janela autorizada, validar health/bindings e somente
  depois persistir um dump saneado.
- Definir o contrato de homologação no MB-010 ou fase operacional aplicável,
  sem criar perfil neste P0.
- Tratar launchers especializados pertencentes a componentes certificados
  somente nos respectivos escopos; não foram refatorados neste microciclo.
- Disponibilidade Lipsync e estabilidade/restarts permanecem para MB-007.

### MB-007

**Status:** [ ] Não iniciado · [ ] Em andamento · [x] Concluído

#### Processos e histórico analisados

O inventário READ-ONLY encontrou 10 processos, todos online e sem
`unstable_restarts`:

- `impetus-backend`: **489** reinícios no processo vivo;
- `impetus-frontend`: **21**;
- `impetus-admin-portal`: **3**;
- Lipsync, cinco processos lab e `pm2-logrotate`: **0**.

O dump persistido, datado de 11/07/2026, contém uma instância backend anterior
com **4.766** reinícios, frontend com 5 e admin com 10. Como processos foram
recriados depois, os contadores não são cumulativos entre instâncias. O dump
é obsoleto e não representa o runtime atual.

No log PM2 disponível entre 15 e 21/07:

- backend: 148 saídas — 127 `SIGINT`, 16 `SIGABRT` e 5 `SIGKILL`;
- frontend: 20 saídas por `SIGINT`;
- admin: 1 saída por `SIGINT`;
- Lipsync e processos lab: nenhuma saída observada.

Os 148 eventos backend têm mediana aproximada de 3.710 s e apenas um
intervalo de até 60 s. Portanto, não existe evidência de crash-loop rápido.

#### Causas identificadas

1. **Reinício dirigido por operação — confiança alta.** Existem 436 chamadas
   históricas de ferramentas Cursor e 37 entradas shell contendo
   `restart/reload` do backend. Esses números não são somados como cardinalidade
   exata, pois comandos podem sobrepor-se ou falhar, mas explicam a dominância
   de `SIGINT` e demonstram reinícios usados repetidamente como validação.
2. **Heap OOM do backend — confiança confirmada.** Os logs rotacionados contêm
   30 eventos fatais `JavaScript heap out of memory`; no período do log PM2,
   os 16 `SIGABRT` são compatíveis com esses abortos. Uma amostra atingiu cerca
   de 2,1 GB de heap. Não houve OOM killer do kernel.
3. **Timeout de shutdown PM2 — confiança confirmada.** Em cinco eventos, o PM2
   registou processo ainda vivo após 1.600 ms e enviou `SIGKILL`. O backend
   possui watchdog interno de 12 s; a política viva não carregou o adaptador.
4. **Drift e monitorização PM2 — confiança confirmada.** Backend/frontend vivos
   não possuem as políticas declaradas de restart, timeout e memória. O PM2
   registou 42.871 pares de falhas `pidusage/invalid pid` e reporta memória
   zero, tornando o controlo `max_memory_restart` não confiável no ambiente.
5. **Daemon systemd — risco ambiental, sem causalidade confirmada.** A unidade
   está ativa desde 15/07, conserva `NRestarts=197`, `Restart=on-failure` e
   atraso de 100 ms. Não há journal suficiente para atribuir os reinícios das
   aplicações ao daemon.

Não foram encontrados `watch`, `cron_restart`, backoff, timer systemd ou cron
do host capazes de explicar a cadência. `max_restarts` não limita reinícios
estáveis ao longo da vida; aplica-se a falhas abaixo de `min_uptime`.

#### Configurações alteradas

- `ecosystem.runtime.config.cjs`: `kill_timeout` do backend ajustado para
  15.000 ms, acima do watchdog interno de 12.000 ms. O limite deriva
  diretamente da sequência de shutdown e dos cinco `SIGKILL`; não é aumento
  arbitrário.
- `.cursor/rules/pm2-runtime-operation-safety.mdc`: regra always-on impede
  agentes de executar mutações PM2 sem autorização explícita, proíbe restart
  como etapa implícita de testes/builds e limita a um restart por processo por
  ciclo autorizado.
- Criado teste estático `mb007Pm2Stability.test.js`.

Nenhuma configuração foi aplicada ao daemon ou processos vivos.

#### Configurações mantidas

- `autorestart=true`, pois desativá-lo ocultaria falhas.
- `watch=false`; não há evidência de loop por ficheiros.
- `max_memory_restart=1G` certificado; não foi aumentado para mascarar OOM.
- `max_restarts`, `restart_delay`, `min_uptime` e `listen_timeout` certificados.
- Sem `cron_restart`, `exp_backoff_restart_delay` ou `stop_exit_codes`.
- Ecosystem certificado, systemd, PM2 instalado e dump permaneceram intocados.

#### Impacto e baselines

Impacto arquitetural: **nenhum**. Não houve alteração funcional, de
infraestrutura, deployment, CI/CD, banco de dados ou contratos. A correção é
aditiva no adaptador e na política de operação.

Baselines preservadas: **Sim**. `ecosystem.config.js` e evidências certificadas
não foram modificados; o adaptador recebeu apenas a política sustentada pelo
watchdog existente.

#### Testes, build e lint

- Teste MB-007: **3 aprovados, 0 falhas**.
- Regressão conjunta MB-006 + MB-007: **10 aprovados, 0 falhas**.
- Sintaxe Node dos arquivos alterados: aprovada.
- Diagnósticos IDE: **0 erros**.
- Build frontend: aprovado.
- Lint backend: indisponível pela ausência preexistente de configuração ESLint;
  nenhuma configuração foi criada neste escopo.

#### Pendências operacionais

- Aplicar o adaptador em janela autorizada, verificar política efetiva e health,
  e somente então substituir o dump obsoleto com `pm2 save`.
- Executar profiling de heap em homologação para localizar a retenção que
  causa OOM; não aumentar limites sem esse diagnóstico.
- Corrigir/atualizar a monitorização `pidusage` do PM2 em janela operacional.
- Avaliar a unidade systemd e seu histórico de 197 reinícios na homologação.
- Contadores históricos não devem ser “zerados” para produzir evidência verde.

### MB-008

**Status:** [ ] Não iniciado · [ ] Em andamento · [x] Concluído

#### Configuração atual

Pool efetivo carregado pelo backend:

- `max=35`, `min=2`;
- `idleTimeoutMillis=30000`;
- `connectionTimeoutMillis=10000`;
- `statement_timeout=60000`;
- `idle_in_transaction_session_timeout=30000`;
- `keepAlive=true`, `allowExitOnIdle=false`.

O PostgreSQL declara `max_connections=100`, com 3 conexões reservadas, logo
97 slots utilizáveis. Um único pool backend de 35 pode ocupar até 36% dessa
capacidade. O código usava fallback 30, enquanto `.env.example`, documentação,
validação de produção e baseline de configuração declaram 20. O ambiente vivo
declara 35 e não foi alterado.

Configuração PostgreSQL observada:

- `shared_buffers=128 MiB`;
- `work_mem=4 MiB`;
- `temp_buffers=8 MiB`;
- `statement_timeout=60 s`;
- `idle_in_transaction_session_timeout=30 s`;
- `lock_timeout=0`.

#### Uso observado

Nos snapshots READ-ONLY:

- backend vivo variou de 14 conexões idle até 24 conexões contabilizadas,
  temporariamente sem idle/waiters enquanto conexões ainda eram estabelecidas;
- após a rajada, PostgreSQL/backend convergiram em 25 conexões, 24 idle e uma
  consulta do próprio probe — 71% do `max=35`;
- duas sessões `idle in transaction` apareceram num snapshot transitório e
  desapareceram antes da primeira de seis amostras subsequentes, espaçadas em
  5 s;
- 0 consultas ou transações acima de 30 s;
- 0 sessões bloqueadas e 0 deadlocks desde o último reset estatístico;
- conexão mais antiga com aproximadamente 3 dias, ociosa e contabilizada pelo
  pool, sem evidência de orfandade.

A soma RSS dos 20 processos PostgreSQL foi aproximadamente 1,0 GiB, mas esse
valor superestima memória exclusiva por incluir páginas compartilhadas.

Desde o reset de `pg_stat_database` em 15/07/2026 foram registados 11.535
ficheiros temporários e aproximadamente 2,91 TB de escrita temporária. A
extensão `pg_stat_statements` não está instalada, portanto não foi possível
atribuir esse volume a queries específicas sem alterar infraestrutura.

#### Concorrência e histórico

Os logs rotacionados contêm:

- **86.597** eventos `DATABASE_POOL_WAIT`;
- **7.228** timeouts ao tentar obter/estabelecer conexão;
- **43.625** ocorrências de esgotamento de slots, concentradas num incidente
  histórico de 11/07;
- 26 encerramentos inesperados de conexão;
- nenhum `statement_timeout` observado.

Uma amostra junto ao OOM registou `totalCount=35`, `idleCount=0` e
`waitingCount=31`, confirmando saturação real do pool em períodos de carga.

#### Vazamentos e transações

A auditoria estática percorreu todas as aquisições diretas
`pool.connect()` do código de produção. Cada aquisição possui `release()` e
bloco `finally`; nenhum suspeito lexical permaneceu. O snapshot vivo também
não mostrou transação ociosa persistente ou bloqueio. A divergência transitória
entre `pool.totalCount` e `pg_stat_activity` convergiu após a fase de conexão.

Conclusão: **nenhum vazamento de conexão foi comprovado no estado atual**.
Os incidentes históricos demonstram saturação/rajadas, não uma conexão
permanentemente perdida.

#### Correções aplicadas

- `backend/src/db/index.js`: fallback `DB_POOL_MAX` alinhado de 30 para o valor
  canónico 20. O valor vivo 35 continua prevalecendo e não foi reduzido.
- O log de pressão passou a emitir no máximo um evento a cada 10 s, incluindo
  a quantidade suprimida desde o aviso anterior. Isso preserva observabilidade
  e elimina amplificação de dezenas de milhares de linhas durante saturação.
- Criado `mb008PostgresPoolIntegrity.test.js` para proteger configuração,
  limitação de logs e release em `finally`.

Não foram alterados PostgreSQL, `.env`, contratos, queries, transações,
limites de memória ou processos vivos.

#### Relação com OOM do MB-007

Em 27 dos 30 eventos OOM havia pressão do pool nas 50 linhas anteriores; em
nenhum caso o aviso apareceu nas cinco linhas imediatamente anteriores.
Existe, portanto, **correlação temporal forte**, mas causalidade não
demonstrada.

Saturação pode manter requests/promises pendentes e amplificar logs, mas o
pico observado de 31 waiters não explica isoladamente um heap de cerca de
2,1 GB. Não foi encontrado vazamento de client PostgreSQL capaz de atribuir
os OOM diretamente ao pool. Heap profiling continua obrigatório antes de
alterar memória ou concorrência.

#### Impacto e baselines

Impacto arquitetural: **nenhum**. O pool único, driver, contratos, queries e
infraestrutura foram preservados.

Baselines preservadas: **Sim**. A alteração limita-se ao módulo canónico de
pool não listado nos manifests certificados consultados e alinha seu fallback
à configuração/documentação já existentes.

#### Testes, build e lint

- Teste MB-008: **3 aprovados, 0 falhas**.
- Regressão MB-006 a MB-008: **13 aprovados, 0 falhas**.
- Sintaxe Node: aprovada.
- Diagnósticos IDE: **0 erros**.
- Build frontend: aprovado em **45,80 s**, com aviso preexistente de chunks
  acima de 500 kB.
- Lint backend: indisponível pela ausência preexistente de configuração ESLint.

#### Pendências operacionais

- Dimensionar o valor vivo 35 com teste de carga representativo e orçamento
  de conexões para todas as instâncias; não há evidência para reduzi-lo ou
  aumentá-lo neste ciclo.
- Instalar/autorizar `pg_stat_statements` e atribuir os 2,91 TB temporários às
  queries responsáveis.
- Realizar heap profiling conjunto com série temporal de pool/request queue.
- Investigar o incidente histórico de esgotamento de 11/07 e a origem das
  rajadas de conexão.
- Definir `lock_timeout` operacional após workload certificado; não aplicar
  valor arbitrário.

### MB-009

**Status:** [ ] Não iniciado · [ ] Em andamento · [x] Concluído

#### Arquivos auditados

- `backend/src/server.js`;
- `backend/src/securityNotification/index.js`;
- `backend/src/securityNotification/runtime/notificationRuntime.js`;
- `backend/src/securityNotification/engine/notificationEngine.js`;
- `backend/src/securityNotification/config/securityNotificationFlags.js`;
- `backend/src/securityNotification/metrics/notificationMetrics.js`;
- `backend/src/securityNotification/channels/channelRouter.js`;
- `backend/src/routes/audit.js`;
- `backend/src/tests/securityNotification/SEC_05_NOTIFICATION_AUDIT.test.js`;
- documentação SEC-05 e integrações SEC-06/SEC-07/SEC-21.

#### Fluxo analisado

Após o boot HTTP e os módulos SEC-01 a SEC-04, `server.js` carrega
`securityNotification` e chama `init()`. Com
`SECURITY_NOTIFICATION_CENTER=true`, o runtime executa um ciclo inicial e
agenda ciclos de 60 s. O engine lê fontes SEC-02, SEC-03 e SEC-04, gera
notificações e entrega nos canais existentes. Os payloads administrativos são
expostos em `/api/audit/security-notifications*`.

O ambiente vivo possui a flag SEC-05 ativa.

#### Falhas silenciosas encontradas

1. `notificationEngine.js` perdeu a declaração de
   `buildCommandCenter(incident, threatProfile, integrityReport)`. O bloco
   remanescente produzia `Unexpected token '}'` durante `require()`.
2. Foram contabilizadas **226** falhas históricas `[SEC-05_BOOT]` com esse
   erro. O backend continuava a iniciar porque `server.js` capturava a
   exceção, deixando SEC-05 indisponível.
3. Falhas do ciclo inicial/periódico eram apenas impressas, sem estado,
   contador ou timestamp auditável.
4. Exceções ao carregar SEC-02, SEC-03 e SEC-04 eram descartadas por três
   `catch` vazios.
5. O payload SEC-05 declarava critérios disponíveis sem informar o estado
   real do bootstrap.
6. Os fallbacks das rotas administrativas devolviam a mensagem bruta da
   exceção e não o estado do bootstrap.

Antes da correção, a suíte canónica SEC-05 apresentou **12 aprovados e 8
falhas**.

#### Correções aplicadas

- Restaurada somente a assinatura ausente de `buildCommandCenter`; a lógica
  existente permaneceu intacta.
- Criado `bootstrapObservability.js`, estado exclusivamente observacional com
  schema `sec05_bootstrap_status_v1`.
- O runtime passou a registar tentativa, flag, estado, ciclos, sucesso,
  falhas, fontes degradadas e shutdown.
- Os três `catch` silenciosos das fontes passaram a registar falha estruturada
  e continuar o comportamento consultivo existente.
- `server.js` passou a produzir `[SEC-05_BOOT_FAILURE]` saneado e persistir o
  estado mesmo em falha de carga/init.
- O payload administrativo ganhou `bootstrap`,
  `criteria.bootstrap_observable` e
  `criteria.silent_bootstrap_failures_eliminated`.
- As rotas SEC-05 preservam HTTP 500/`ok:false` em indisponibilidade e
  acrescentam código estável `SEC05_BOOTSTRAP_UNAVAILABLE` e snapshot saneado.
- Criado teste MB-009 com cenários disabled, running, cycle failure, source
  degradation e fallback administrativo.

#### Logs e eventos adicionados

- `[SEC-05_BOOT]`: estado disabled/running do ciclo inicial;
- `[SEC-05_BOOT_FAILURE]`: falha síncrona de load/init;
- `[SEC-05_CYCLE_FAILURE]`: falha do ciclo inicial ou periódico;
- `[SEC-05_SOURCE_FAILURE]`: indisponibilidade de SEC-02, SEC-03 ou SEC-04.

Os eventos incluem somente fase, estado, contadores, estágio, nome e código
do erro. Mensagens brutas, stack traces, tokens e credenciais não integram o
snapshot.

#### Impacto e baselines

Impacto arquitetural: **nenhum**. Não foram alterados autenticação,
autorização, regras, canais, remediação, contratos de notificação ou
dependências SEC-01 a SEC-07. A observabilidade é aditiva.

Baselines preservadas: **Sim quanto à arquitetura e aos contratos**. Nenhum
manifest ou evidência certificada foi atualizado. `server.js` é artefacto
historicamente hasheado e recebeu a correção pontual explicitamente autorizada
por MB-009; sua revalidação formal de hash permanece no gate executivo.

#### Testes, build e lint

- Teste MB-009: **6 aprovados, 0 falhas**.
- Regressão MB-006 a MB-009: **19 aprovados, 0 falhas**.
- SEC-05: **20 aprovados, 0 falhas**; antes: 12/20.
- SEC-06 adjacente: **22 aprovados, 0 falhas**.
- SEC-04: **19 aprovados, 1 falha ambiental/baseline já conhecida** no
  cenário “baseline íntegra”; encaminhada à revalidação executiva.
- Sintaxe dos arquivos JS alterados: aprovada.
- Diagnósticos IDE: **0 erros**.
- Build frontend: aprovado em **41,69 s**, com aviso preexistente de chunks
  acima de 500 kB.
- Lint backend: indisponível pela ausência preexistente de configuração ESLint.

#### Pendências operacionais

- O processo vivo ainda executa a versão anterior e continuará a falhar SEC-05
  até aplicação controlada do adaptador/runtime em janela autorizada.
- Após a aplicação, confirmar `bootstrap.status=running`, executar ciclo real
  e validar os endpoints administrativos autenticados.
- Revalidar formalmente o hash de `server.js` e SEC-04 no P0 Executive Review.
- Falhas futuras de credenciais/webhook são ambientais; devem aparecer como
  degraded/failed e não ser contornadas no código.

## 3. Evidências consolidadas

As evidências disponíveis cobrem MB-001 a MB-009, incluindo a aceitação
formal das observações protegidas de Logistics e Safety. Os testes
específicos validam a ausência dos dados fictícios canónicos; as regressões
preservam Truth de voz, auditoria de origem, runtime Logistics, promoção do
cockpit, navegação dos Insights, apresentação Safety, controles APPSEC e
consistência do runtime PM2, do pool PostgreSQL e do bootstrap SEC-05.

## 4. Arquivos alterados

1. `backend/src/routes/voz.js`
2. `backend/src/tests/ent-exec-001/mb001VoiceIntegrity.test.js`
3. `frontend/src/domains/logistics/operational-runtime/LogisticsOperationalWorkspace.jsx`
4. `frontend/src/tests/ent-exec-001/mb002LogisticsIntegrity.test.mjs`
5. `.cursor/rules/ent-exec-001-execution-order.mdc`
6. `frontend/src/components/InsightsList.jsx`
7. `frontend/src/components/InsightsList.css`
8. `frontend/src/tests/ent-exec-001/mb003InsightsIntegrity.test.mjs`
9. `frontend/src/domains/safety/telemetry/SafetyTelemetryHub.jsx`
10. `frontend/src/domains/safety/cognitive/SafetyCognitiveHub.jsx`
11. `backend/src/routes/safetyTelemetry.js`
12. `frontend/src/tests/ent-exec-001/mb004SafetyIntegrity.test.mjs`
13. `backend/src/securityApplication/diagnosticRedaction.js`
14. `backend/src/securityApplication/secretManagement.js`
15. `backend/src/governance/flagReconcilerRuntime.js`
16. `backend/src/rolloutCenter/resolvers/effectiveFlagsResolver.js`
17. `backend/src/securityGoLiveValidation/engine/runtimeHealthValidator.js`
18. `backend/src/securityGoLiveValidation/engine/goLiveValidationEngine.js`
19. `backend/src/securityGoLiveValidation/index.js`
20. `backend/src/securityGoLiveGate/engine/infrastructureGateValidator.js`
21. `backend/src/services/timeClockIntegrationService.js`
22. `backend/scripts/audit/cert04_pilot_day0.js`
23. `backend/scripts/environment-shadow-activation-deploy.js`
24. `backend/scripts/industrial-lab-oidc-provider.js`
25. `backend/scripts/seed-admin-portal.js`
26. `backend/src/tests/ent-exec-001/mb005DiagnosticExposure.test.js`
27. `ecosystem.runtime.config.cjs`
28. `backend/src/config/loadEnv.js`
29. `backend/package.json`
30. `scripts/pm2-secure-restart.sh`
31. `scripts/continue-from-checkpoint.sh`
32. `scripts/deploy-impetus.sh`
33. `backend/scripts/ops/install-industrial.sh`
34. `backend/scripts/runtime-unification-promotion-pipeline.sh`
35. `infra/scripts/impetus-emergency-restore.sh`
36. `backend/src/tests/ent-exec-001/mb006RuntimeConsistency.test.js`
37. `.cursor/rules/pm2-runtime-operation-safety.mdc`
38. `backend/src/tests/ent-exec-001/mb007Pm2Stability.test.js`
39. `backend/src/db/index.js`
40. `backend/src/tests/ent-exec-001/mb008PostgresPoolIntegrity.test.js`
41. `backend/src/securityNotification/engine/notificationEngine.js`
42. `backend/src/securityNotification/runtime/notificationRuntime.js`
43. `backend/src/securityNotification/observability/bootstrapObservability.js`
44. `backend/src/securityNotification/index.js`
45. `backend/src/routes/audit.js`
46. `backend/src/server.js`
47. `backend/src/tests/ent-exec-001/mb009Sec05BootstrapObservability.test.js`
48. `ENT-EXEC-001-P0-REPORT.md`

## 5. Riscos remanescentes

- O ambiente PM2 vivo e o dump persistido ainda conservam o perfil anterior;
  a aplicação do adaptador MB-006 depende de janela operacional autorizada.
- O backend apresenta OOM de heap confirmado e o PM2 vivo não produz métricas
  de memória confiáveis por falhas `pidusage`; profiling/correção são
  pendências de homologação/operação.
- O PostgreSQL acumulou aproximadamente 2,91 TB de temporários desde 15/07,
  sem `pg_stat_statements` para atribuição; pool e OOM estão correlacionados,
  mas não foi demonstrada causalidade.
- SEC-05 permanece indisponível no processo vivo até aplicação autorizada da
  correção e validação do estado `running`.
- O lint backend permanece indisponível por ausência de configuração ESLint.
- Rotações externas, quarentena das evidências históricas e limpeza do
  ambiente PM2 vivo permanecem pendentes.
- As observações Safety protegidas foram formalmente aceites e encaminhadas
  aos MB-014, MB-018, MB-020 e MB-031.
- As observações adicionais de Logistics foram formalmente aceites e
  encaminhadas ao MB-023, sem autorização para alterar baselines neste ciclo.
- As observações protegidas de Insights foram encaminhadas aos MB-019,
  MB-020, MB-021 e MB-030.
- Consumidores externos não inventariados podem precisar tratar o novo HTTP
  503, embora os caminhos e campos principais tenham sido preservados.
- A suíte AIOI Truth Stage 7 permanece vermelha por duas falhas preexistentes
  fora do escopo deste microciclo.

## 6. Próximos passos

Executar a **P0 Executive Review** consolidada. Não iniciar MB-010 antes do
parecer formal sobre critérios, pendências, regressões e baselines.

## 7. Recomendação para liberação da Fase 2

**NÃO LIBERAR a Fase P1 (MB-010 a MB-022) antes da P0 Executive Review.**

Os nove microciclos estão executados, mas o gate de governança P0 permanece
aberto até revisão executiva e validação independente.

## 8. Rastreabilidade ENT-EXEC-001

| MB | Status | Evidência principal | Baseline preservada | Próximo MB |
|---|---|---|---|---|
| MB-001 | Concluído | Teste de contrato Voz + M1.19 + ENT-AUD-002 | Sim | MB-002 |
| MB-002 | Concluído por aceitação formal | Teste Logistics + runtime + cockpit + build | Sim | MB-003 |
| MB-003 | Concluído | Teste Insights + REG-002 + build | Sim | MB-004 |
| MB-004 | Concluído por aceitação formal | Teste Safety + ARC-003A + Z.25 + build | Sim | MB-005 |
| MB-005 | Concluído | Teste de redação + APPSEC-01 + build/lint | Sim | MB-006 |
| MB-006 | Concluído | Teste runtime + build + sintaxe + auditoria PM2 saneada | Sim | MB-007 |
| MB-007 | Concluído | Logs PM2 + teste de estabilidade + build + lint disponível | Sim | MB-008 |
| MB-008 | Concluído | Métricas PostgreSQL + teste do pool + build + lint disponível | Sim | MB-009 |
| MB-009 | Concluído | SEC-05 20/20 + observabilidade bootstrap + SEC-06 22/22 | Sim* | P0 Executive Review |

\* Preservação arquitetural/contratual confirmada; hash de `server.js` requer
revalidação formal no gate executivo.
