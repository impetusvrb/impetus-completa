# Volume IV — Catálogo de Motores
## ICEB v1.0 · Inventário inicial

> **Nota:** O repositório contém **centenas** de ficheiros `*Engine.js`, `*Facade.js`, `*Orchestrator.js`. Este volume cataloga por **tier funcional**, não por listagem plana. Ficha completa: [templates/TEMPLATE-MOTOR.md](./templates/TEMPLATE-MOTOR.md).

Regenerar inventário: `node backend/scripts/audit/buildBlueprintInventory.js`

---

## Taxonomia de tiers

| Tier | Descrição | Qtd. aprox. |
|------|-----------|-------------|
| **T1** | Decisão, política, conselho, verdade | ~25 |
| **T2** | Contexto, identidade, eixo, audiência | ~30 |
| **T3** | Operacional, PLC, previsão, padrões | ~40 |
| **T4** | Exposição: dashboard, painéis, chat, voz | ~35 |
| **T5** | Governança, certificação, runtime-z, safety | ~200+ |
| **R** | Roadmap (world model, twin unificado) | — |

---

## T1 — Decisão e política

| Motor | Ficheiro | AB |
|-------|----------|-----|
| Unified Decision Engine | `services/unifiedDecisionEngine.js` | AB |
| Decision Facade | `services/decisionFacadeService.js` | AB |
| Decision Engine Service | `services/decisionEngineService.js` | AB |
| Cognitive Orchestrator / Council | `ai/cognitiveOrchestrator.js` | AB |
| Cognitive Policy Facade | `services/cognitivePolicyFacadeService.js` | AB |
| Cognitive Policy Decision | `services/cognitivePolicyDecisionService.js` | AB |
| Cognitive Truth Closure | `services/cognitiveTruthClosureService.js` | AB |
| Operational Decision Engine | `services/operationalDecisionEngine.js` | AB |
| Compliance Decision | `services/complianceDecisionService.js` | AB |
| Authority Resolution | `services/authorityResolutionService.js` | AB |
| AIOI Cognitive Simulation | `services/aioi/aioiCognitiveSimulationService.js` | AB (isolado) |

---

## T2 — Contexto e identidade

| Motor | Ficheiro | AB |
|-------|----------|-----|
| Organizational Context | `services/organizationalContextEngine.js` | AB |
| Organizational Identity | `services/organizationalIdentityEngine.js` | AB |
| Organizational Intelligence | `services/organizationalIntelligenceEngine.js` | AB |
| Organizational Presence | `services/organizationalPresenceEngine.js` | AB |
| Functional Axis Resolver | `services/functionalAxisResolver.js` | AB |
| Structural User Profile | `services/structuralUserProfileService.js` | AB |
| Cognitive Audience Resolver | `services/cognitiveAudienceResolver.js` | AB |
| User Context | `services/userContext.js` | AB |
| Unified Session Context | `services/unifiedSessionContextService.js` | AB |
| Operational Context Engine | `cognitiveRuntime/context/operationalContextEngine.js` | AB |
| Secure Context Builder | `services/secureContextBuilder.js` | AB |

---

## T3 — Operacional e industrial

| Motor | Ficheiro | AB |
|-------|----------|-----|
| Cognitive Pulse | `services/cognitivePulseService.js` | AB |
| Living Enrichment | `services/cognitiveLivingEnrichment.js` | AB |
| Industrial Operational Map | `services/industrialOperationalMapService.js` | AB |
| Operational Knowledge Map | `services/operationalKnowledgeMapService.js` | AB |
| Digital Twin (planta) | `services/digitalTwinService.js` | AB |
| PLC Collector | `services/plcCollector.js` | AB |
| PLC Anomaly / Correlation / Trend | `plcAnomalyAnalysisService.js`, etc. | AB |
| Operational Forecasting | `services/operationalForecastingService.js` | AB parcial |
| Operational Prioritization | `services/operationalPrioritizationService.js` | AB |
| Operational Pattern / Event / Explanation | `operational*IntelligenceService.js` | AB |
| Machine Brain | `services/machineBrainService.js` | AB |
| Operational Brain Engine | `services/operationalBrainEngine.js` | AB |

---

## T4 — Exposição e IA conversacional

| Motor | Ficheiro | AB |
|-------|----------|-----|
| Dashboard Composer | `services/dashboardComposerService.js` | AB |
| Dashboard Personalization | `services/dashboardPersonalizationEngine.js` | AB |
| Claude Panel | `services/claudePanelService.js` | AB |
| Smart Panel Command | `services/smartPanelCommandService.js` | AB |
| Chat AI Consolidated | `services/chatAIService.consolidated.js` | AB |
| Multimodal Chat | `services/multimodalChatService.js` | AB |
| PLC Chat Grounding | `services/plcChatGroundingService.js` | AB |
| Gemini / Claude services | `geminiService.js`, `claudeService.js` | AB |
| ManuIA Live Assistance | `services/manuiaLiveAssistanceService.js` | AB |
| Field Analysis (visão) | `modules/technicalLibrary/.../fieldAnalysisService.js` | AB |

---

## T5 — Governança modular e runtime

| Motor | Ficheiro | AB |
|-------|----------|-----|
| Module Access Governance | `services/moduleAccessGovernanceEngine.js` | AB |
| Structural Cadastro Resolver | `services/structuralCadastroModuleResolver.js` | AB |
| Domain Authority | `domainAuthority/` | AB |
| Contextual Module Orchestrator | `contextualModules/moduleOrchestrator.js` | AB |
| AI Security Gateway | `services/aiSecurityGateway.js` | AB |
| AI Compliance Engine | `services/aiComplianceEngine.js` | AB |
| Hallucination Detection | `services/hallucinationDetectionService.js` | AB |
| Runtime Z Cognitive OS | `runtime-z-cognitive-os/` | AB |
| Runtime Z Operational NS | `runtime-z-operational-nervous-system/` | AB |
| Runtime Z Sovereign | `runtime-z-sovereign/` | AB |
| Certification Readiness | `certificationReadiness/` | AB |

---

## Motores roadmap (R)

| Motor | Descrição |
|-------|-----------|
| World Model | Estado global empresa como grafo |
| Twin Cognitive Orchestrator | Fusão twin org + industrial |
| SCADA / MES native | Cliente protocolo shop-floor |
| RTSP Vision Pipeline | Câmera IP → inferência → twin state |

---

## Próximos passos Volume IV

- [ ] Gerar lista completa via `buildBlueprintInventory.js`
- [ ] Ficha TEMPLATE-MOTOR para cada T1 (15 motores)
- [ ] Mapa dependências T1→T2→T4
- [ ] Flags env consolidadas por motor

---

*Volume IV · inventário inicial v1.0*
