# AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT

**Fase:** AIOI-ORG-2 — Truth Stage 7 Certification  
**Etapa:** 3 — Contrato formal de certificação  
**Data:** 2026-06-09  
**Versão:** 1.0.0  
**Modo:** CERTIFICATION ONLY · ADDITIVE ONLY  
**Token alvo:** `AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS`

---

## 1. Declaração

Este contrato define os requisitos mínimos para certificar **Truth Stage 7** (F47 Priority + stack Truth F40–F47 + integração IOE AIOI) como **pronto para gates operacionais subsequentes**, sem ativar runtime cognitivo.

**Soberano único:** `industrialTruthEnforcementService`  
**Delegação canónica:** `cognitiveTruthClosureService.applyCognitiveTextTruth` → `enforceTextResponse`

---

## 2. Requisitos Mínimos (RM)

| ID | Requisito | Evidência |
|----|-----------|-----------|
| RM-01 | Existe um único soberano Truth para claims operacionais LLM | `AIOI_SOVEREIGNTY_MAP.md` + código |
| RM-02 | F40–F47 implementados como classificadores regex determinísticos | `industrialTruthEnforcementService.js` exports |
| RM-03 | Stage 7 (F47 priority) classifica claims suportados e proibidos | `PRIORITY_*_RE`, `classifyPrioritySupportedClaims` |
| RM-04 | IOE exige `truth_state` em todo INSERT | migration + ingestion |
| RM-05 | AIOI adapters não reimplementam validação claims (TR-05) | grep `aioiTruthValidator` ausente |
| RM-06 | `cognitiveTruthClosureService` delega sem lógica paralela | require → enforceTextResponse |
| RM-07 | Canais certificados principais passam por closure Truth | matriz dependências ORG-2 |
| RM-08 | Queue governance ORG-1 preservada | contrato precedência intacto |
| RM-09 | P8 runtime permanece desativado | metadata services false |
| RM-10 | Gaps residuais documentados (não ocultos) | TRUTH_GAP_REPORT + relatório ORG-2 |

---

## 3. Critérios de Consistência (CC)

| ID | Critério | Regra |
|----|----------|-------|
| CC-01 | `truth_state` coerente com origem dados | PLC → `telemetry_only` default; MES conectado → `grounded` possível |
| CC-02 | `scores_provisional=true` quando `truth_state != 'grounded'` | TC-02 |
| CC-03 | `priority_band` derivado de `priority_score` F47 | P-02; sem band manual |
| CC-04 | Mesmo equipamento: um score PLC (F47 soberano) | Anti-duplicação P-01 |
| CC-05 | Narrativa LLM operacional não contradiz availability | enforceTextResponse substitui ou declina |
| CC-06 | Synthetic events não apresentados como grounded | `verification_state: synthetic` |

---

## 4. Critérios de Evidência (CE)

| ID | Critério | Regra |
|----|----------|-------|
| CE-01 | Todo IOE PLC inclui `evidence_refs` com rastreabilidade F47 | Contrato P-03 |
| CE-02 | `evidence_refs[].type` e identificador presentes | Sem refs vazias |
| CE-03 | `priority_pack_f47` referencia score/band/contributors | plcAioiAdapter |
| CE-04 | `buildEvidenceBinding` em respostas certificadas | meta industrial_truth |
| CE-05 | `correlation_id` propagado IOE → trace | IOE spec §4 |
| CE-06 | TC-04: `kpi_snapshot.oee = null` se telemetry_only | mesAioiAdapter |

---

## 5. Critérios de Rastreabilidade (CR)

| ID | Critério | Regra |
|----|----------|-------|
| CR-01 | Claim textual → availability check → evidence_binding | enforceTextResponse flow |
| CR-02 | IOE → evidence_refs → F47 pack → plc_collected_data | cadeia documentada |
| CR-03 | Voice/chat → trace_id → audit_logs / aiAnalytics | cognitiveTruthClosure |
| CR-04 | Shadow assessment registra would_replace | shadowAssessTextResponse |
| CR-05 | Stage 7 priority claim → priorityPack audit_evidence | F47 traceability |

---

## 6. Critérios de Auditabilidade (CA)

| ID | Critério | Regra |
|----|----------|-------|
| CA-01 | Modo enforce/shadow/off configurável por env | `getMode()`, `isEnabled()` |
| CA-02 | Ações enforcement registráveis (action, unsupported_claims) | meta retorno |
| CA-03 | Testes AIOI P0 verificam truth_state em IOE | aioiAdapterLayer.test.js |
| CA-04 | Auditoria estática ORG-2 automatizada | AioiTruthStage7CertificationAudit.test.js |
| CA-05 | Stress test 100 perguntas disponível (execução manual) | phase48 script |
| CA-06 | Gaps classificados CRITICAL/HIGH/MEDIUM | TRUTH_GAP_REPORT |

---

## 7. Contratos Herdados

### TR-01 – TR-05 (`AIOI_ANTI_DUPLICATION_POLICY.md`)

| Regra | Certificação ORG-2 |
|-------|-------------------|
| TR-01 | truth_state todo IOE | **REQUIRED** |
| TR-02 | LLM P3+ via enforcement | **REQUIRED** canais certificados |
| TR-03 | scores_provisional | **REQUIRED** adapters |
| TR-04 | CEO P0 determinístico | **PRESERVED** |
| TR-05 | Proibido aioiTruthValidator | **VERIFIED** |

### TC-01 – TC-07 (`AIOI_IOE_SPECIFICATION.md` §13)

Todos **REQUIRED** na camada IOE/adapters; TC-03 aplicável a canais LLM certificados.

---

## 8. Códigos de Falha de Auditoria

| Código | Condição | Severidade |
|--------|----------|------------|
| `TRUTH_BYPASS_PATH` | Canal certificado retorna texto operacional LLM sem closure Truth | **FATAL** |
| `ORPHAN_EVIDENCE_REFERENCE` | `evidence_refs` sem `type` ou identificador em adapter IOE | **FATAL** |
| `UNVERIFIED_OPERATIONAL_CLAIM` | Adapter AIOI gera OEE/KPI inventado sem truth_state adequado | **FATAL** |
| `NON_DETERMINISTIC_TRUTH_VALIDATION` | LLM/API externa dentro enforceTextResponse ou aioi truth validator | **FATAL** |
| `DUAL_TRUTH_SOVEREIGN` | Segundo validador claims paralelo em AIOI | **FATAL** |

---

## 9. Gaps Aceitos (S0 — documentados, não bloqueiam certificação mecanismo)

| Gap | Documento | Bloqueia Stage 7 mechanism? |
|-----|-----------|----------------------------|
| Anam stream sem pós-validação servidor | GAP-02 | Não — mecanismo existe; canal parcial |
| `/api/voz` legacy sem truth | TRUTH_GAP | Não — rota legacy |
| Stress 100 perguntas não executado | PHASE47 Etapa 7 | Não — script existe |
| F49 Gemini pendente | Roadmap | Não — fora Truth mechanism |
| ~79% traces sem industrial_truth meta | Observabilidade | Não — auditabilidade parcial |

---

## 10. Resultado de Certificação

| Campo | Valor |
|-------|-------|
| Stage certificado | **Truth Stage 7 (F47 Priority + Stack F40–F47)** |
| Mecanismo | **CERTIFIED** |
| Evidence chain IOE | **VALIDATED** |
| Enforcement readiness | **READY** (foundation) |
| Token | `AIOI_ORG_2_TRUTH_STAGE7_CERTIFICATION_PASS` |
| Classificações | `TRUTH_STAGE7_CERTIFIED` · `TRUTH_EVIDENCE_CHAIN_VALIDATED` · `TRUTH_ENFORCEMENT_READY` |

---

## 11. Preservação ORG-1 / P8

| Artefato | Alteração ORG-2 |
|----------|-----------------|
| `AIOI_QUEUE_PRECEDENCE_CONTRACT.md` | **NENHUMA** |
| `AIOI_QUEUE_SOVEREIGNTY_MATRIX.md` | **NENHUMA** |
| P8.0–P8.6 providers | **NENHUMA** |
| Runtime flags | **false** preservado |

---

*AIOI_TRUTH_STAGE7_CERTIFICATION_CONTRACT — v1.0.0 · AIOI-ORG-2.*
