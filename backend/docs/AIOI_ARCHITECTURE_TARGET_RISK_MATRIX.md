# AIOI_ARCHITECTURE_TARGET_RISK_MATRIX

**Fase:** AIOI-ARCHITECTURE-TARGET-FORENSIC-01  
**Data:** 2026-06-03  
**Modo:** READ ONLY — matriz de riscos para implementação futura do AIOI

---

## Legenda

| Nível | Significado |
|-------|-------------|
| **LOW** | Aceitável com monitorização |
| **MEDIUM** | Mitigação obrigatória no desenho |
| **HIGH** | Bloqueia piloto até mitigação |
| **CRITICAL** | Bloqueia produção / reputação CEO |

---

## 1. Riscos técnicos

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| T1 | Race condition em consumers (mesmo equipment_id) | MEDIUM | Ordenar por `company_id` + `equipment_id`; optimistic lock em IOE |
| T2 | Worker outbox crash mid-batch | MEDIUM | SKIP LOCKED + idempotent consumers |
| T3 | Migration IOE em BD produção sem janela | HIGH | Janela maintenance; migration additive-only |
| T4 | JSONB payload oversized | LOW | Limite 64KB; truncar raw em adapter |
| T5 | Adapter PLC lento (scan 59k rows) | MEDIUM | Cursor + janela temporal; não backfill total em P0 |

---

## 2. Riscos arquiteturais

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| A1 | **Duas filas CEO** (F47 pack vs AIOI queue) | **CRITICAL** | UI única; deprecate pack UI; documentar precedência AIOI |
| A2 | Dois event buses sem contrato | HIGH | `correlation_id` bridge; matriz evento W2 ↔ IOE |
| A3 | Reimplementar F47 scores | HIGH | `priorityEngine` delega PLC branch a `operationalPrioritizationService` |
| A4 | `operationalDecisionEngine` vs `decisionEngine` divergem | MEDIUM | IOE-centric decision; plan engine como input opcional |
| A5 | Bounded context bleed (Safety shadow UI) | MEDIUM | `category` + publication flags; não promover Safety como autoritativo |

---

## 3. Riscos operacionais

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| O1 | Operador ignora fila AIOI | MEDIUM | Integrar com notificações existentes P1 |
| O2 | Falso critical por telemetria ruidosa | HIGH | `classification_confidence` + triaged humano |
| O3 | CEO teste 15 min falha (oral/API) | HIGH | Gate piloto; não confundir com AIOI queue |
| O4 | Piloto 1 tenant sem dados PLC | MEDIUM | Adapter comm/OS; mensagem empty state |

---

## 4. Riscos de produto

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| P1 | Expectativa “AIOI = IA genérica” | MEDIUM | `O_QUE_E_A_IA_IMPETUS_RESUMO.md`; marketing Truth-first |
| P2 | Scope creep LLM na fila | **HIGH** | Charter P0: proibido LLM sort |
| P3 | Concorrência com roadmap Safety full | MEDIUM | Roadmap comunicado; AIOI não substitui Safety cockpit |
| P4 | Investidor/Holding pedido cedo | LOW | Campos `audience_key` reservados |

---

## 5. Riscos de escalabilidade

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| S1 | &gt;500 evt/min outbox lag | MEDIUM | BullMQ P1; métricas lag |
| S2 | Cardinalidade tenant explosion | MEDIUM | Partição lógica; retenção governance |
| S3 | Snapshot CEO stale 60s | LOW | TTL + `generated_at` visível UI |

---

## 6. Riscos de governança

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| G1 | Auto-exec critical sem HITL | **CRITICAL** | `IMPETUS_AIOI_AUTO_EXECUTE_BAND=none` P0 |
| G2 | Políticas tenant JSON inválidas | MEDIUM | Schema validation; shadow simulate |
| G3 | Escalonamento para role inexistente | HIGH | FK `assigned_role_id`; fallback triaged |

---

## 7. Riscos Truth

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| TR1 | `priority_score` com minutos parada inventados | **HIGH** | `scores_provisional`; cap se `telemetry_only` |
| TR2 | KPI OEE na fila sem MES | HIGH | `truth_state`; UI “indisponível” |
| TR3 | LLM explica fila com números não no IOE | MEDIUM | CEO dashboard sem narrativa LLM P0 |

---

## 8. Riscos multi-tenant

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| M1 | Leakage `company_id` em worker | **CRITICAL** | RLS PostgreSQL + testes fuzz (reutilizar tenant isolation) |
| M2 | Pilot tenant hardcoded em código | MEDIUM | Só `IMPETUS_AIOI_PILOT_TENANTS` env |

---

## 9. Riscos de performance

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| PF1 | Re-rank job 2 min bloqueia BD | MEDIUM | Batch LIMIT; índice `(company_id, status, priority_score DESC)` |
| PF2 | JOIN IOE + 8 tabelas na API queue | MEDIUM | Snapshot materializado |

---

## 10. Riscos de base de dados

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| DB1 | Tabela IOE crescimento ilimitado | MEDIUM | Retention policy (governance W2 alinhada) |
| DB2 | ENUM migration lock | MEDIUM | Expandir ENUM em migrations separadas |
| DB3 | Duplicata idempotency_key | HIGH | UNIQUE (company_id, idempotency_key) |

---

## 11. Riscos PM2 / infra (estado actual)

| ID | Risco | Nível | Mitigação |
|----|-------|-------|-----------|
| I1 | **348 restarts** lifetime backend | **MEDIUM** | Sanitização PASS; monitor 7d antes P1 workers |
| I2 | Worker outbox no mesmo processo HTTP | MEDIUM | Processo PM2 dedicado `impetus-aioi-worker` P1 |

---

## 12. Matriz resumo por fase

| Fase | Riscos CRITICAL abertos | Riscos HIGH dominantes |
|------|-------------------------|------------------------|
| **P0** | A1 (se duas UIs) | A3, TR1, DB3, M1 |
| **P1** | G1 | G3, TR2, O2 |
| **P2** | — | A2, workflow compensation |
| **P3** | — | P2 scope LLM, volume |

---

## 13. Top 10 — acção antes de codificar P0

1. Charter escrito: AIOI ≠ substituto F47.  
2. UI CEO: uma fila só.  
3. Contrato idempotency adapter.  
4. RLS + fuzz tenant no CI gate.  
5. Flags default safe (`ENABLED=false`, `AUTO_EXECUTE=none`).  
6. Métricas outbox lag desde dia 1.  
7. Alinhamento Truth em scores.  
8. Não iniciar P0 sem owner structural org.  
9. PM2 monitoring 7 dias.  
10. Gate: stress Etapa 7 planeado antes P3.

---

*Matriz viva — actualizar após cada fase de implementação.*
