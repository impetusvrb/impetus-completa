# TRUTH PROGRAM — Plano de Correção Final

**Programa Truth — Etapa 9**  
**Data:** 2026-06-28  
**Documento canónico:** plano formal de correcções aplicadas e remanescentes

---

## Objectivo

Consolidar todas as correcções do Programa Truth (Etapas 1–10 + Fases 37–49 + M1.16) num único plano rastreável — sem duplicar implementação.

---

## 1. Correções aplicadas (runtime)

| # | Gap / Item | Acção | Evidência | Data |
|---|------------|-------|-----------|------|
| C1 | Truth mode shadow | `IMPETUS_INDUSTRIAL_TRUTH_MODE=enforce` | `.env`, FASE 47-R | 2026-06-03 |
| C2 | Hallucination block off | `IMPETUS_HALLUCINATION_BLOCK=on` | stress test 100 | 2026-06-03 |
| C3 | C2 synthetic events | `IMPETUS_C2_SYNTHETIC_EVENTS_WHEN_SPARSE=off` | OPERATIONAL_TRUTH_GAP GAP-05 | 2026-06-03 |
| C4 | Anam oral enforce | `IMPETUS_VOICE_TRUTH_ORAL_ENFORCE=true` + `anamPanelBridge.js` | ANAM_TRUTH_AUDIT_REPORT | 2026-06-03 |
| C5 | AI Gateway / Cognitive Safety | Flags ON | `.env` bloco Truth | 2026-06-03 |
| C6 | PM2 config sanitization | Remoção credenciais inline | PM2_CONFIG_SANITIZATION_CERTIFICATION | 2026-06 |
| C7 | Financial RBAC F48 | Unificação `roles+role_permissions` | M1.16 `authorize.js` | 2026-06-16 |
| C8 | Truth-safe denial 403 | `buildTruthSafePermissionDenial` | M1.16 dashboard/chat | 2026-06-16 |
| C9 | Production/Quality shadow→active | ZP1, Z19/Z20 promoted | M1.16 `.env` | 2026-06-16 |
| C10 | Workflow permission gate | `workflowPermissionGate.js` | M1.20 | 2026-06-28 |

---

## 2. Correções documentais (closure nomenclatura)

| # | Item plano original | Acção | Documento canónico |
|---|---------------------|-------|-------------------|
| D1 | Etapa 3 cenários A/B/C | Criado | `DATA_GENERATION_AUDIT_SCENARIOS_ABC.md` |
| D2 | Etapa 4 ANAM_TRUTH_AUDIT_REPORT | Consolidado | `ANAM_TRUTH_AUDIT_REPORT.md` |
| D3 | Etapa 8 OPERATIONAL_TRUTH_GAP_REPORT | Canónico | `OPERATIONAL_TRUTH_GAP_REPORT.md` |
| D4 | Etapa 9 Plano Correção Final | Este documento | `TRUTH_PROGRAM_FINAL_CORRECTION_PLAN.md` |
| D5 | Registry Etapas 1–10 | Índice | `TRUTH_PROGRAM_ETAPAS_CLOSURE_REGISTRY.md` |

---

## 3. AIOI-P0 — closure parcial → total

| Item | Acção | Ficheiro |
|------|-------|----------|
| P0-2 Schema separado | Extraído sem alterar comportamento | `schemas/industrialOperationalEvent.schema.js` |
| P0-5 Work Order adapter | Facade anti-duplicação | `workOrderAioiAdapter.js` |
| P0-9 Criticality engine | Facade sobre classification | `aioiCriticalityEngine.js` |
| P0-10 Priority engine | Facade sobre classification | `aioiPriorityEngine.js` |

*Política:* `AIOI_ANTI_DUPLICATION_POLICY.md` — lógica única, superfícies múltiplas.

---

## 4. Pendências remanescentes (não bloqueantes Truth core)

| # | Item | Tipo | Decisão | Bloqueador M2? |
|---|------|------|---------|----------------|
| P1 | Gravação CEO Anam 15 min | Validação humana | Procedimento manual | Não |
| P2 | Gemini API key válida | Dependência externa | Aguardar chave Google | Não (TRI-AI OpenAI/Anthropic UP) |
| P3 | Safety FULL ON | Rollout decisão | `SAFETY_ENVIRONMENT_FULL_ON_BLOCKING_REPORT.md` | Não (governança) |
| P4 | Environment FULL ON adopção | Adopção operacional | M1.17/M1.21 paths | Não (arquitectura OK) |
| P5 | GAP-01 Council enforceTextResponse | Código | Backlog controlado | Não (triade mitiga) |
| P6 | GAP-03 Chat @ImpetusIA | Código | Triade ON | Não |

---

## 5. Critérios de encerramento Etapa 9

| Critério | Estado |
|----------|--------|
| Todas as correcções runtime listadas | ✅ |
| Pendências classificadas (humana / externa / decisão) | ✅ |
| Zero alteração arquitectural não autorizada | ✅ |
| Regressão M1.11–M1.16 validada | ✅ M1.16 |

---

## Veredicto Etapa 9

**TOTAL** — plano formal dedicado com correcções aplicadas, documentais e pendências explícitas.

*Truth Program Etapa 9 — closure 2026-06-28.*
