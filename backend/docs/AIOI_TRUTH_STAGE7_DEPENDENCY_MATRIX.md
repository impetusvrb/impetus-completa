# AIOI_TRUTH_STAGE7_DEPENDENCY_MATRIX

**Fase:** AIOI-ORG-2 — Truth Stage 7 Certification  
**Etapa:** 2 — Mapeamento de dependências Truth  
**Data:** 2026-06-09  
**Modo:** CERTIFICATION ONLY · ADDITIVE ONLY

---

## 1. Grafo de Dependência Canónico

```
                    ┌─────────────────────────────────────┐
                    │  Fontes de Dados Verificáveis        │
                    │  PostgreSQL · PLC · MES · Snapshots  │
                    └──────────────────┬──────────────────┘
                                       │
           ┌───────────────────────────┼───────────────────────────┐
           │                           │                           │
           ▼                           ▼                           ▼
  F40–F47 PLC Packs          mesErpIntegrationService    softwareOperationalSnapshot
  (operationalPrioritization)         │                           │
           │                           │                           │
           └───────────────┬───────────┴───────────┬───────────────┘
                           │                       │
                           ▼                       ▼
              industrialTruthEnforcementService ◄── checkOperationalAvailability
              (SOBERANO · regex determinístico F40–F47)
                           │
           ┌───────────────┼───────────────┬──────────────────┐
           │               │               │                  │
           ▼               ▼               ▼                  ▼
  enforceTextResponse  shadowAssess   guardClaudePanel   guardPanelVisualization
           │               │               │                  │
           └───────────────┴─────── cognitiveTruthClosureService
                                   (applyCognitiveTextTruth)
                           │
           ┌───────────────┼───────────────┬──────────────────┐
           ▼               ▼               ▼                  ▼
     dashboard.js    chatAIService   executiveMode    cognitiveCouncil
     smartPanel       manuia closure  claude panel     voice shadow
                           │
                           ▼
                    audit_logs / aiAnalytics traces
                           │
                           ▼
              AIOI Adapters ──► aioiEventIngestionService
              (truth_state + evidence_refs determinísticos)
                           │
                           ▼
              industrial_operational_events (IOE)
```

---

## 2. Matriz Produtor → Validador → Consumidor

| Produtor evidência | Validador / Enforcement | Consumidor | Classificação |
|--------------------|-------------------------|------------|---------------|
| `buildPriorityEvidence()` F47 | `detectForbiddenPriorityPredictionClaims` | `enforceTextResponse` → chat/dashboard | **CERTIFIED PATH** |
| `plcAioiAdapter.evidence_refs` | `aioiEventIngestionService` enum check | IOE table, decision bridge | **IOE PATH** |
| `mesAioiAdapter.kpi_snapshot` | TC-04 adapter rule | IOE + UI futura | **IOE PATH** |
| `collectEvidenceFromContext()` | `buildEvidenceBinding()` | Trace meta | **AUDIT PATH** |
| PLC intelligence packs F40–F46 | Classifiers F40–F46 em enforcement | Texto LLM substituído | **CERTIFIED PATH** |
| Synthetic C2 events | `verification_state: synthetic` | cognitiveConvergence | **RISK PATH** (documentado GAP-05) |

---

## 3. Enforcement Layers

| Layer | Ordem | Componente | Determinístico? | Bypass permitido? |
|-------|-------|------------|-----------------|-------------------|
| L0 | Pré-LLM | `buildPromptTruthAppendix` | Sim (texto fixo) | Não substitui L2 |
| L1 | Pós-LLM texto | `enforceTextResponse` | **Sim** (regex + availability) | Só se mode=off |
| L2 | Closure | `applyCognitiveTextTruth` | Delega L1 | Não |
| L3 | Painel JSON | `guardClaudePanelPayload` | Sim (structural + availability) | Parcial chart |
| L4 | IOE ingest | `_validateIoePayload` | Sim (enum + ranges) | Rejeita insert |
| L5 | DB constraint | `chk_ioe_truth_state` | Sim (CHECK) | Impossível INSERT inválido |

---

## 4. Dependências AIOI → Truth (READ ONLY)

| Serviço AIOI | Depende de Truth Service? | Depende de F47? | Reimplementa claims? |
|--------------|---------------------------|-----------------|----------------------|
| `plcAioiAdapter` | Não importa (by design P0.2) | Sim — score | **NÃO** |
| `mesAioiAdapter` | Não importa | Não | **NÃO** — TC-04 local |
| `taskAioiAdapter` | Não importa | Não | **NÃO** |
| `communicationAioiAdapter` | Não importa | Não | **NÃO** |
| `aioiEventIngestionService` | Schema Truth IOE | Não | **NÃO** — validação enum |
| `aioiDecisionBridgeService` | Propaga campos | Não | **NÃO** |
| `aioiOutboxConsumerService` | Propaga campos | Não | **NÃO** |
| `aioiLearningBridge` | **Proibido** import Truth | — | **NÃO** (teste P0.4) |
| `aioiExecutionBridge` | **Proibido** import Truth | — | **NÃO** (teste P0.4) |

---

## 5. Canais Cognitivos — Matriz Closure

| Canal | Rota / Serviço | Truth closure | Status Stage 7 |
|-------|----------------|---------------|----------------|
| Dashboard chat | `POST /dashboard/chat` | `applyCognitiveTextTruth` / `enforceTextResponse` | **CERTIFIED** |
| Chat interno | `chatAIService.consolidated` | `applyCognitiveTextTruth` | **CERTIFIED** (GAP-03 mitigado) |
| Executive mode | `executiveMode.js` | `applyCognitiveTextTruth` | **CERTIFIED** (GAP mitigado) |
| Conselho cognitivo | `cognitiveCouncil.js` | `applyCognitiveTextTruth` | **CERTIFIED** (GAP-04 mitigado) |
| Claude panel | `finalizeClaudePanelResponse` | guard + narrative truth | **CERTIFIED** F36 |
| ManuIA live | `finalizeManuIaCopilotReply` | `applyCognitiveTextTruth` | **CERTIFIED** F36-B |
| Smart panel | `smartPanelCommandService` | `guardPanelVisualizationPayload` | **PARTIAL** guards |
| Voz IMPETUS | `impetusVoiceChatService` | `applyCognitiveTextTruth` | **CERTIFIED** pós-processo |
| Anam realtime stream | WebRTC client-side | prompt appendix only | **GAP RESIDUAL** (GAP-02) |
| API voz legacy | `routes/voz.js` | **Ausente** | **GAP RESIDUAL** |
| AIOI adapters | P0.2 | truth_state determinístico | **CERTIFIED** foundation |

---

## 6. Contratos IOE Truth — Dependências

| Contrato | Produtor | Validador | Consumidor UI |
|----------|----------|-----------|---------------|
| TC-01 telemetry_only sem MES | mes/plc adapters | ingestion enum + adapter logic | Futuro AIOI queue |
| TC-02 scores_provisional | adapters | ingestion default | CEO indicator |
| TC-03 LLM narrative | cognitive channels | enforceTextResponse | Chat/voz |
| TC-04 oee=null | mesAioiAdapter | adapter build | KPI display |
| TC-05 insufficient score | plc adapter | scores_provisional flag | Queue rank |
| TC-06 insufficient_data | ingestion default | DB CHECK | Fila baixa confiança |
| TC-07 MTBF/MTTR sem MES | enforcement regex | enforceTextResponse | Dashboard CEO |

---

## 7. Anti-Dependências (Proibidas)

| Anti-padrão | Detecção | Severidade |
|-------------|----------|------------|
| `aioiTruthValidator` em AIOI | grep services/aioi | FATAL |
| Regex FORBIDDEN_* duplicado em adapter | grep aioi adapters | HIGH |
| LLM dentro `enforceTextResponse` | grep OpenAI/Anthropic in truth service | FATAL |
| IOE INSERT sem truth_state | migration NOT NULL | BLOCKED |
| scores_provisional=false com truth!=grounded | adapter review | VIOLATION TC-02 |

---

## 8. Stage 7 (F47 Priority) — Dependência Específica

```
operationalPrioritizationService.buildOperationalPriorityPack()
        │
        ├──► industrialTruthEnforcementService (priorityPack in enforceTextResponse)
        │         ├── classifyPrioritySupportedClaims()
        │         └── detectForbiddenPriorityPredictionClaims()
        │
        └──► plcAioiAdapter
                  ├── computePriorityScore() [F47 score soberano]
                  └── evidence_refs: priority_pack_f47
                            └──► aioiEventIngestionService → IOE
```

**Stage 7 certificado quando:** F47 priority claims passam por classificadores determinísticos; IOE carrega evidência F47 sem bypass.

---

## 9. Referências

| Documento | Uso |
|-----------|-----|
| `AIOI_TRUTH_STAGE7_INVENTORY.md` | Inventário completo |
| `AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT.md` | Critérios formais |
| `TRUTH_GAP_REPORT.md` | Gaps residuais documentados |
| `AIOI_QUEUE_PRECEDENCE_CONTRACT.md` | Preservado ORG-1 |

---

*AIOI_TRUTH_STAGE7_DEPENDENCY_MATRIX — Etapa 2 AIOI-ORG-2.*
