# AIOI_TRUTH_STAGE7_INVENTORY

**Fase:** AIOI-ORG-2 — Truth Stage 7 Certification  
**Etapa:** 1 — Inventário Truth  
**Data:** 2026-06-09  
**Modo:** READ ONLY · CERTIFICATION ONLY · ADDITIVE ONLY  
**Pré-requisito:** `AIOI_ORG_1_QUEUE_SOVEREIGNTY_RESOLUTION_PASS`

---

## 1. Escopo

Inventário de todos os componentes relacionados ao mecanismo **Industrial Truth** (F40–F47 + IOE + closure cognitivo), incluindo:

- Soberano Truth
- Validadores e classificadores determinísticos
- Cadeias de evidência
- Contratos e políticas
- Auditorias e relatórios existentes
- Integração AIOI (adapters, ingestão IOE)

**Fora de escopo ORG-2:** ativação runtime P8, inferência LLM nova, alteração Queue ORG-1.

---

## 2. Soberano Truth

| # | Componente | Caminho | Responsabilidade | Soberano |
|---|------------|---------|------------------|----------|
| 1 | **Industrial Truth Enforcement Service** | `backend/src/services/industrialTruthEnforcementService.js` | Regex determinístico F40–F47; `enforceTextResponse`; shadow; guards painel; evidence binding | **ÚNICO soberano Truth operacional** |
| 2 | **Cognitive Truth Closure Service** | `backend/src/services/cognitiveTruthClosureService.js` | Pipeline canónico LLM → Truth → Audit Trace → Response | Delega 100% a (1) |
| 3 | **Software Operational Snapshot Service** | `backend/src/services/softwareOperationalSnapshotService.js` | Snapshots verificáveis para grounding | Input do enforcement |

---

## 3. Estágios Truth (F40 → F47) — Stage 7 = F47 Priority

| Stage | Fase | Regex / Função principal | Claims suportados | Claims proibidos |
|-------|------|--------------------------|-------------------|------------------|
| F40 | Telemetria | `FORBIDDEN_TELEMETRY_INVENTED_KPI_RE`, `TELEMETRY_SUPPORTED_CLAIM_RE` | Telemetria PLC observável | OEE/MTBF/MTTR inventados em telemetry_only |
| F41 | Tendências | `TREND_SUPPORTED_CLAIM_RE`, `FORBIDDEN_PREDICTIVE_CLAIM_RE` | Tendência observada | Previsão de parada |
| F42 | Anomalias | `ANOMALY_SUPPORTED_CLAIM_RE`, `FORBIDDEN_FAILURE_PREDICTION_CLAIM_RE` | Anomalia observada | Falha iminente |
| F43 | Correlações | `CORRELATION_SUPPORTED_CLAIM_RE`, `FORBIDDEN_CAUSALITY_CLAIM_RE` | Correlação observável | Causalidade inferida |
| F44 | Eventos | `EVENT_SUPPORTED_CLAIM_RE`, `FORBIDDEN_EVENT_PREDICTION_CLAIM_RE` | Evento operacional observado | Previsão de evento |
| F45 | Padrões | `PATTERN_SUPPORTED_CLAIM_RE`, `FORBIDDEN_PATTERN_PREDICTION_CLAIM_RE` | Padrão recorrente observado | Repetição futura inevitável |
| F46 | Explicações | `EXPLANATION_SUPPORTED_CLAIM_RE`, `FORBIDDEN_ROOT_CAUSE_CLAIM_RE` | Explicação com evidência | Causa raiz confirmada |
| **F47** | **Prioridade (Stage 7)** | `PRIORITY_SUPPORTED_CLAIM_RE`, `FORBIDDEN_PRIORITY_PREDICTION_CLAIM_RE` | Prioridade observável / priority_score | "Mais perigoso", "vai falhar primeiro" |

**Exportações Stage 7 (F47):** `classifyPrioritySupportedClaims`, `detectForbiddenPriorityPredictionClaims`, integração em `enforceTextResponse` via `priorityPack`.

---

## 4. Validadores e Enforcement Layers

| # | Componente | Tipo | Caminho |
|---|------------|------|---------|
| 4 | `enforceTextResponse` | Enforcement texto LLM/voz pós-processada | `industrialTruthEnforcementService.js` |
| 5 | `shadowAssessTextResponse` | Avaliação shadow (não altera UX) | idem |
| 6 | `guardClaudePanelPayload` | Guard painel Claude | idem |
| 7 | `guardPanelVisualizationPayload` | Guard Smart Panel | idem |
| 8 | `buildEvidenceBinding` | Binding evidência → canal | idem |
| 9 | `collectEvidenceFromContext` | Extração evidência contextual | idem |
| 10 | `checkOperationalAvailability` | Disponibilidade dados por domínio | idem |
| 11 | `buildPromptTruthAppendix` | Appendix prompt (Anam/voz) | idem |
| 12 | `aioiEventIngestionService._validateIoePayload` | Validação enum `truth_state` IOE | `backend/src/services/aioi/aioiEventIngestionService.js` |
| 13 | Migration `chk_ioe_truth_state` | CHECK DB 5 estados Truth | `backend/migrations/aioi_ioe_foundation_migration.sql` |

---

## 5. Produtores de Evidência (Evidence Producers)

| # | Produtor | Evidência gerada | Formato |
|---|----------|------------------|---------|
| 1 | `operationalPrioritizationService.buildPriorityEvidence()` | Traceability F47 | Objeto + números auditáveis |
| 2 | `plcAioiAdapter` | `evidence_refs[]` com `priority_pack_f47` | JSONB IOE |
| 3 | `mesAioiAdapter` | KPI snapshot MES; `oee=null` se telemetry_only | JSONB + TC-04 |
| 4 | `taskAioiAdapter` | `evidence_refs` task/workflow | JSONB IOE |
| 5 | `communicationAioiAdapter` | `evidence_refs` comunicação | JSONB IOE |
| 6 | `industrialTruthEnforcementService.collectEvidenceFromContext` | `evidence_binding` runtime | Objeto canal |
| 7 | `dataLineageService.buildLineageForChatContext` | Linhagem chat | Objeto trace |

---

## 6. Consumidores de Evidência (Evidence Consumers)

| # | Consumidor | Fonte evidência | Uso |
|---|------------|-----------------|-----|
| 1 | `enforceTextResponse` | availability + PLC packs F40–F47 | Substituição claims não suportados |
| 2 | `cognitiveTruthClosureService.applyCognitiveTextTruth` | via enforceTextResponse | Resposta final utilizador |
| 3 | `dashboard.js` (chat) | truthClosure + truthEnforcement | POST dashboard chat |
| 4 | `chatAIService.consolidated.js` | truthClosure | Chat @ImpetusIA |
| 5 | `executiveMode.js` | truthClosure | CEO executive query |
| 6 | `cognitiveCouncil.js` | truthClosure | Conselho cognitivo |
| 7 | `smartPanelCommandService.js` | truthEnforcement guards | Smart Panel |
| 8 | `aioiDecisionPayloadBuilder.js` | `ioe.evidence_refs`, `truth_state` | Bridge decisão |
| 9 | `aioiOutcomePayloadBuilder.js` | `evidence_refs` outcome | Tracking outcome |

---

## 7. Contratos e Políticas Truth

| Documento | Contratos | Secção |
|-----------|-----------|--------|
| `AIOI_ANTI_DUPLICATION_POLICY.md` | TR-01 – TR-05 | §7 |
| `AIOI_IOE_SPECIFICATION.md` | TC-01 – TC-07; `truth_state` ENUM | §3.5, §13 |
| `AIOI_SOVEREIGNTY_MAP.md` | Truth soberano único | §1, §4 regra 7 |
| `AIOI_INTEGRATION_CATALOG.md` | Integração Truth + PLC | §Truth |
| `AIOI_GOVERNANCE_01_CERTIFICATION.md` | Truth certificação P0 | Declarações |
| `AIOI_P0_AUTHORIZATION.md` | Gates Truth / F49 | Riscos |

---

## 8. Auditorias e Relatórios Truth (legado certificação)

| Documento | Conteúdo |
|-----------|----------|
| `PHASE47_TRUTH_CERTIFICATION_REPORT.md` | Closure F47 + Etapa 7 stress test pendente |
| `TRUTH_COVERAGE_FINAL_AUDIT.md` | Cobertura por canal |
| `TRUTH_GAP_REPORT.md` | GAP-01 – GAP-09 bypasses documentados |
| `TRUTH_SOURCE_INVENTORY.md` | Fontes permitidas/proibidas |
| `CLAUDE_PANEL_TRUTH_AUDIT.md` | Paridade Claude Panel |
| `MANUIA_TRUTH_AUDIT.md` | ManuIA live |
| `ANAM_REALTIME_TRUTH_AUDIT.md` | Voz Anam stream |
| `CEO_CHAT_TRUTH_AUDIT.md` | Executive chat |
| `OPERATIONAL_TRUTH_CERTIFICATION_SCORECARD.md` | Scorecard |
| `scripts/phase48-operational-truth-stress-test.js` | Stress 100 perguntas (Etapa 7 quantitativa) |
| `scripts/industrial-truth-enforcement-smoke.js` | Smoke enforcement |

---

## 9. Integração AIOI — Truth (sem reimplementação)

| Componente | Truth behavior | Conformidade |
|------------|----------------|--------------|
| `plcAioiAdapter` | `truth_state` determinístico; delega score F47 | TR-05 ✓ |
| `mesAioiAdapter` | TC-04 `oee=null` telemetry_only | TC-04 ✓ |
| `taskAioiAdapter` | `provisional` + `scores_provisional=true` | TR-01 ✓ |
| `communicationAioiAdapter` | idem | TR-01 ✓ |
| `aioiEventIngestionService` | VALID_TRUTH_STATES + default provisional | TR-01 ✓ |
| `aioiDecisionBridgeService` | Propaga `truth_state`, `evidence_refs` | Rastreabilidade ✓ |
| **Proibido** | `aioiTruthValidator` | **AUSENTE** ✓ |

---

## 10. Módulos Convergência (não soberanos — runtime interno)

| Componente | Caminho | Nota ORG-2 |
|------------|---------|------------|
| `operationalTruthValidationEngine` | `cognitiveRuntime/c4/truth/` | Validação grafo runtime Z — **não substitui** industrialTruthEnforcement |
| `inferenceTruthEngine` | `cognitiveRuntime/validation/` | Inferência runtime — **fora path CEO P0/P8 foundation** |
| `runtimeTruthSynchronizer` | `runtimeConsistency/` | Sync estado — não enforcement claims |
| `cognitiveTruthExplanation` | `cognitiveConvergence/` | Explicação — delega contexto |
| `governedTruthRegistry` | `cognitiveConvergence/` | Registry interno — não soberano claims LLM |

**Classificação:** SECONDARY / INTERNAL — não competem com `industrialTruthEnforcementService`.

---

## 11. Flags Operacionais Truth

| Flag | Default documentado | Efeito |
|------|---------------------|--------|
| `IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT` | `on` | Liga camada |
| `IMPETUS_INDUSTRIAL_TRUTH_MODE` | `enforce` | enforce \| shadow \| off |
| `IMPETUS_HALLUCINATION_BLOCK` | `on` (prod) | Block entrega |
| `IMPETUS_VOICE_TRUTH_ORAL_ENFORCE` | `true` (prod) | Correção oral voz |
| `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE` | `true` | Eventos sintéticos — risco se misturados |

---

## 12. Invariantes Preservados

| Invariante | Estado ORG-2 |
|------------|--------------|
| Queue Governance ORG-1 | Preservada — sem alteração |
| P6 / P7 / P8 | Intocados |
| `runtime_enabled/active/authorized` | `false` |
| `cognitive_execution_allowed` | `false` |
| Soberano Truth único | `industrialTruthEnforcementService` |

---

*AIOI_TRUTH_STAGE7_INVENTORY — Etapa 1 AIOI-ORG-2 · certificação only.*
