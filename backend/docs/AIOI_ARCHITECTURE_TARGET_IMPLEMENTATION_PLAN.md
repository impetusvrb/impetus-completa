# AIOI_ARCHITECTURE_TARGET_IMPLEMENTATION_PLAN

**Fase:** AIOI-ARCHITECTURE-TARGET-FORENSIC-01 (plano oficial — sem implementação autorizada por este documento)  
**Data:** 2026-06-03  
**Pré-requisito de leitura:** `AIOI_ARCHITECTURE_TARGET_FORENSIC_01.md`  
**Veredicto de entrada:** **SIM_COM_RESTRICOES** — P0 pode iniciar **antes** de F49 Gemini concluída

---

## 1. Princípios de implementação (quando autorizada)

1. **Additive-only** — não remover F40–47 nem desactivar backbone W2.  
2. **Orquestrar, não duplicar** — PLC scores via `operationalPrioritizationService`.  
3. **P0 determinístico** — zero LLM na ordenação da fila.  
4. **Shadow-first** — `IMPETUS_AIOI_ENABLED=false` até piloto 1 tenant.  
5. **Truth-first** — `truth_state` em IOE e KPI; `scores_provisional` se sem MES.  
6. **Um executor** — `executionOrchestrator` → Action Runtime / Workflow existentes.

---

## 2. Estrutura de repositório (futura)

```
backend/src/aioi/
  schemas/           # validação IOE
  adapters/          # plc, communication, work_order, task, …
  bus/               # outboxPublisher, outboxWorker
  classification/
  criticality/
  priority/
  queue/
  decision/
  execution/
  metrics/
  learning/
backend/src/routes/aioi.js
backend/src/models/aioi_migration.sql   # quando autorizado
```

**Flags sugeridas:**

| Flag | P0 default |
|------|------------|
| `IMPETUS_AIOI_ENABLED` | `false` |
| `IMPETUS_AIOI_BUS_MODE` | `outbox` |
| `IMPETUS_AIOI_AUTO_EXECUTE_BAND` | `none` |
| `IMPETUS_AIOI_PILOT_TENANTS` | UUID piloto |

---

## FASE AIOI-P0 — Fundação (6–10 semanas)

**Objectivo:** IOE canónico + bus outbox + classificar + criticidade + prioridade + fila API + bloco CEO mínimo.

### Entregáveis

| # | Entregável | Dependências | Complexidade | Risco |
|---|------------|--------------|--------------|-------|
| P0-1 | Migration `industrial_operational_events` + ENUMs + índices RLS | PostgreSQL admin (futuro) | Média | Baixo |
| P0-2 | `industrialOperationalEvent.schema.js` | P0-1 | Baixa | Baixo |
| P0-3 | Adapter `plc_telemetry` (wrap F47) | P0-2, `plcOperationalIntelligenceService` | Média | Médio |
| P0-4 | Adapter `communication` | P0-2, `communications` | Média | Médio |
| P0-5 | Adapter `work_order` | P0-2, `work_orders` | Média | Médio |
| P0-6 | Adapter `task` | P0-2, `tasks` | Baixa | Baixo |
| P0-7 | `aioi_outbox` + publisher + worker SKIP LOCKED | P0-2 | Média | Baixo |
| P0-8 | `classificationEngine` (cascata + rules) | P0-7, `organizationalIdentityEngine` | Alta | Médio |
| P0-9 | `criticalityEngine` | P0-8, F42/F47 | Alta | Médio |
| P0-10 | `priorityEngine` (merge F47 PLC) | P0-9 | Alta | Médio |
| P0-11 | `GET /api/aioi/queue` + snapshot CEO 60s | P0-10, RBAC | Média | Baixo |
| P0-12 | Bloco React fila CEO (DS Industrial 4.0) | P0-11 | Média | Baixo |
| P0-13 | Testes: adapter PLC→IOE, empty tenant, idempotency | P0-3–7 | Média | Baixo |
| P0-14 | Bridge opcional `ioe.created` → `publishIndustrialEvent` | P0-7, W2 flags | Baixa | Médio |

### Fora de P0 (explícito)

- Auto-execução band critical  
- Kafka / Redis  
- IA rerank  
- Decision engine ON  
- Admin UI regras  
- Adapters quality_nc, MES completo, checklist  

### Critérios de aprovação P0

- [ ] 1 tenant piloto com ≥100 IOE/dia sem duplicata idempotency  
- [ ] Top-10 fila ordenada só por `priority_score` (audit log de contributors)  
- [ ] CEO API &lt; 200ms p95 com snapshot cache  
- [ ] Zero número OEE/MTTR na fila sem `truth_state=grounded`  
- [ ] F47 PLC priority pack **consistente** com IOE PLC (diff &lt; 5 pts em amostra 20)  
- [ ] Testes CI com `.env.test` isolado  

### Dependências externas P0

| Dependência | Bloqueia P0? |
|-------------|--------------|
| F49 Gemini | **Não** |
| Certificação Etapa 10 | **Não** |
| Structural org completo | **Parcial** — classificação degrada sem FK |
| PM2 estável | **Recomendado** — não bloqueante |

---

## FASE AIOI-P1 — Decisão e medição (8–12 semanas)

**Objectivo:** Decisões estruturadas + execução HITL + KPI MES + heatmap.

| Entregável | Dependências |
|------------|--------------|
| `aioi_decisions` + `decisionEngine` + `aioi_policies` | P0 completo |
| `executionOrchestrator` → Action Runtime / tools | P1 decision, flags runtime ON piloto |
| `mesMetricsService` + `aioi_kpi_snapshots` | `mesErpIntegrationService`, Truth |
| Heatmap setor × categoria | P0 queue |
| Redis BullMQ (se lag outbox &gt; threshold) | Métricas P0 2 semanas |

### Critérios de aprovação P1

- [ ] 90% decisões critical com HITL aprovado/rejeitado rastreável  
- [ ] OEE snapshot com `evidence_refs` quando MES push activo  
- [ ] Nenhuma execução critical sem `hitl_required` ou política explícita  

---

## FASE AIOI-P2 — Escala e workflows (10–14 semanas)

**Objectivo:** Workflow por processKey, SLA, escalonamento, admin UI, adapters domínio.

| Entregável | Dependências |
|------------|--------------|
| Workflow AIOI (`workflowOrchestrator`) | P1 execution |
| SLA engine + `escalation_level` automático | P1 policies |
| Admin UI regras classificação/políticas | P2 backend APIs |
| Adapters: `quality_nc`, `checklist`, MES push → IOE | P0 patterns |
| WebSocket refresh fila | P1 queue |

### Critérios de aprovação P2

- [ ] 1 processKey piloto end-to-end (open IOE → workflow → resolved)  
- [ ] Escalonamento nível 2 notifica roles correctos (audit log)  

---

## FASE AIOI-P3 — Aprendizado e IA (contínuo)

**Objectivo:** Outcomes, weight versions aprovadas, rerank pós-Truth (opcional).

| Entregável | Dependências |
|------------|--------------|
| `aioi_outcomes` + hook fecho OS/tarefa | P1 execution |
| `aioi_weight_versions` + proposta admin | P3 outcomes volume |
| Governance learning (sair shadow) | P2 estável |
| IA rerank / sugestão template | **F49 Gemini OK**, Etapa 7 stress PASS, ≥10k IOE |
| Kafka | Métricas volume OT |

### Critérios de aprovação P3

- [ ] Stress 100 perguntas 0% inventado (plano original Etapa 7)  
- [ ] Weight change ≤5% por ciclo com aprovação admin  
- [ ] Rerank não altera top-3 sem audit trail  

---

## 3. Ordem de construção (diagrama)

```
IOE (P0-1..2)
  → Adapters (P0-3..6)
    → Outbox (P0-7)
      → Classify (P0-8)
        → Criticality (P0-9)
          → Priority (P0-10)
            → Queue API (P0-11)
              → CEO UI (P0-12)
                → [Gate: piloto 30 dias]
                  → Decision (P1)
                    → Execution (P1)
                      → KPI MES (P1)
                        → Workflow (P2)
                          → Learning (P3)
```

---

## 4. Paralelização com F49 e certificação

| Track | Conteúdo | Pode correr em paralelo com AIOI-P0? |
|-------|---------|--------------------------------------|
| **Track A — AIOI-P0** | IOE, fila, CEO bloco | **Sim** |
| **Track B — F49** | Gemini key, TRI-AI READY | **Sim** (sem dependência) |
| **Track C — Truth** | Stress 100 (Etapa 7), fecho voz/CEO código | **Sim** — recomendado antes de P1 auto-exec |
| **Track D — QA OT** | Brokers VLAN, Safety publication | **Sim** — independente |

**Gate conjunto antes de P1 ON em produção global:**

1. P0 critérios ✓  
2. CEO teste 15 min documentado  
3. PM2 7 dias sem restart não planeado (meta)  
4. Opcional: F49 Gemini UP para visão ManuIA apenas  

---

## 5. Estimativas de esforço (ordem de grandeza)

| Fase | Eng. semanas (1 FTE) | Eng. semanas (2 FTE) |
|------|----------------------|----------------------|
| P0 | 8–10 | 5–6 |
| P1 | 10–12 | 6–8 |
| P2 | 12–14 | 8–10 |
| P3 | Contínuo | Contínuo |

---

## 6. Integração com pendências do programa actual

| Pendência programa | Impacto no plano AIOI |
|--------------------|------------------------|
| F49 Gemini | Adia apenas P3 visão/rerank |
| Certificação plano original | Gate P1/P3; não P0 |
| Hierarquia Conselho/Investidor | Campos reservados P0; UI P2+ |
| `/api/voz` + CEO chat sem truth | **Não** misturar com IOE; corrigir em Track C Truth |

---

*Plano oficial — implementação requer aprovação explícita pós-forensic.*
