# AIOI_ARCHITECTURE_TARGET_FORENSIC_01

**Fase:** AIOI-ARCHITECTURE-TARGET-FORENSIC-01  
**Data:** 2026-06-03  
**Modo:** READ ONLY ABSOLUTO — sem alteração de código, schema, PM2, PostgreSQL ou `.env`  
**Blueprint:** AIOI_ARCHITECTURE_TARGET (Etapas 1–14, contexto utilizador + especificação integrada)  
**Estado IMPETUS referenciado:** F40–F48 concluídos; GIT/ENV/PM2 sanitization PASS; F49 (Gemini/Truth fecho) pendente; certificação plano original parcial; hierarquia futura (Conselho, Investidor, Holding) não implementada

---

## 1. Resposta executiva (obrigatória)

| Pergunta | Resposta |
|----------|----------|
| **PODEMOS INICIAR O AIOI ANTES DA F49?** | **SIM, COM RESTRIÇÕES** |
| **Viabilidade técnica** | **Alta** para P0 (IOE + outbox + classificação + criticidade + prioridade + fila) |
| **Viabilidade económica** | **Parcial positiva** — reutiliza 60–70% da stack; custo principal = schema + workers + UI CEO |
| **Compatibilidade arquitectural** | **PARCIAL → SIM** após regras de orquestração explícitas (não substituir F40–47 nem backbone W2) |
| **Veredicto forense** | **APTO PARA AIOI-P0**; **NÃO APTO** para AIOI-P3 (IA rerank) antes de F49 + Etapa 7 stress |

**F49 neste repositório** = fecho programa Truth + certificação **Gemini** (`TRI_AI_CERTIFICATION_STATUS`, `INDUSTRIAL_TRUTH_PROGRAM_CLOSURE`) — **não** é um módulo de fila operacional. **Não bloqueia** IOE/outbox determinísticos.

---

## ETAPA A — INVENTÁRIO ARQUITETURAL

### A.1 Legenda

| Classificação | Significado |
|---------------|-------------|
| **READY** | Existe, production-grade, reutilizável com adaptador fino |
| **PARTIAL** | Existe com âmbito mais estreito ou sem persistência canónica IOE |
| **MISSING** | Não existe; entregável AIOI |

### A.2 Mapa componente AIOI → IMPETUS actual

| Componente AIOI (Etapa alvo) | Já existe? | Classificação | Evidência (caminho / nota) |
|------------------------------|------------|---------------|----------------------------|
| **IOE — schema `industrial_operational_events`** | Não | **MISSING** | Sem tabela/ENUM IOE; sem `backend/src/aioi/` |
| **Adapters multi-fonte (PLC, comm, OS, task, MES…)** | Parcial | **PARTIAL** | Ingestão: `unifiedOperationalIngestionService` (chat/voz/docs); PLC: `plcOperationalIntelligenceService`, F40–47; MES push: `mesErpIntegrationService`; comms/tasks em BD (`communications`, `work_orders`) sem adapter IOE |
| **Event Bus (outbox P0)** | Parcial | **PARTIAL** | `industrial_event_outbox` + `industrialEventBackbone.js` (W2); **não** é fila AIOI por estágio |
| **Event Bus (Redis/Kafka P1+)** | Não | **MISSING** | Sem BullMQ/Kafka no stack AIOI |
| **Classificação cascata** | Parcial | **PARTIAL** | NLP em ingestão; `organizationalIdentityEngine`; `structuralOrgContextService`; sem motor IOE dedicado |
| **Motor criticidade (I,R,F,Rec,S)** | Parcial | **PARTIAL** | `operationalPrioritizationService` (PLC); `operationalPatternIntelligenceService` (F42); `operationalEventIntelligenceService` (F44); fórmulas AIOI **não** unificadas em entidade única |
| **Motor priorização 0–100** | Parcial | **PARTIAL** | `operationalPrioritizationService.computePriorityScore`; `prioritizationService` (riscos + learning); **não** cobre comm/OS/quality_nc globalmente |
| **Fila operacional única (CEO top-N)** | Parcial | **PARTIAL** | `buildLiveFeedPriorities`, packs PLC; `cognitivePulseService`; **sem** vista SQL única cross-domain |
| **Motor decisão + políticas** | Parcial | **PARTIAL** | `operationalDecisionEngine` (sugestões, não IOE); `unifiedDecisionEngine`; `decisionFacadeService` |
| **Motor execução (HITL)** | Parcial | **READY** | `actionRuntimeOrchestrator`, `operationalToolRegistry`, `workflowOrchestrator` |
| **Motor indicadores OEE/MTTR/MTBF** | Parcial | **PARTIAL** | `mesErpIntegrationService` → `production_shift_data`; Truth bloqueia KPI inventado; **sem** `aioi_kpi_snapshots` |
| **Motor aprendizado (outcomes/weights)** | Parcial | **PARTIAL** | `operationalLearningService` (máquina/contexto); `strategicLearningService` (paralelo); **sem** `aioi_outcomes` / weight versions |
| **Dashboard executivo AIOI** | Parcial | **PARTIAL** | CEO `/app`, costs executive, environment executive; **sem** `AioiExecutiveDashboard` |
| **Truth enforcement** | Sim | **READY** | `industrialTruthEnforcementService`, `cognitiveTruthClosureService` |
| **Hallucination block** | Sim | **READY** | Flags `IMPETUS_HALLUCINATION_BLOCK=on` (produção) |
| **Organizational identity / RBAC** | Parcial | **PARTIAL** | `organizationalIdentityEngine` (níveis 0–5); `moduleAccessGovernanceEngine`; sem Conselho/Investidor/Holding |
| **F40–F47 PLC intelligence** | Sim | **READY** | `plcOperationalIntelligenceService`, patterns, events, correlation, explanation, priority |
| **Industrial backbone W2** | Sim | **READY** | `industrialEventBackbone`, outbox, DLQ, backpressure |
| **Executive Mode (CEO chat)** | Sim | **READY** | `executiveMode.js` — **sem** truth (F47.5 gap; fora do AIOI core) |
| **SZ5 / memória** | Sim | **READY** | Runtime Z5, chat context bridge |

### A.3 Síntese quantitativa

| Classificação | Contagem (componentes núcleo AIOI) |
|---------------|-------------------------------------|
| READY | 8 |
| PARTIAL | 14 |
| MISSING | 6 |

**Conclusão Etapa A:** O IMPETUS **já possui 70% dos building blocks cognitivos/industriais**, mas **não possui a camada de orquestração unificada (IOE + fila + bus AIOI)**. O AIOI é **viável como camada additive**, não greenfield.

---

## ETAPA B — DETECÇÃO DE DUPLICIDADE

### B.1 Relação por domínio

| Domínio existente | Relação com AIOI | Risco |
|-------------------|------------------|-------|
| **F40–F47 (PLC pipeline)** | **Reutilizar** — adapter `plc_telemetry` / `plc_pattern` chama `operationalPrioritizationService` | **Alto** se reescrever scores PLC |
| **Truth (F36–49)** | **Complementar** — `truth_state` em IOE/KPI; narrativa LLM separada | **Médio** se scores inventarem minutos parada |
| **Learning** | **Estender** — `operationalLearningService` → `aioi_outcomes` | **Médio** se duas memórias de peso divergirem |
| **Workflow** | **Reutilizar** — `decision_type=workflow` no execution orchestrator | **Baixo** |
| **Action Runtime** | **Reutilizar** — único ponto HITL para mutações | **Baixo** se segundo executor paralelo |
| **Executive Mode** | **Não substituir** — chat CEO ≠ fila IOE | **Alto** se misturar LLM CEO com ranking |
| **Unified Operational Ingestion** | **Adapter upstream** — normaliza chat/voz para facts; IOE para **eventos operacionais** | **Médio** — duas vias de memória |
| **Industrial Event Backbone** | **Enriquecer / bridge** — publicar `ioe.created` após persist; **não** substituir catálogo W2 de imediato | **Alto** se dois buses sem contrato |
| **operationalDecisionEngine** | **Evoluir** — hoje plan-centric; AIOI event-centric | **Médio** |
| **prioritizationService vs operationalPrioritization** | **Unificar conceito** em `priorityEngine` AIOI | **Alto** se duas filas CEO |

### B.2 Riscos de duplicação (priorizados)

1. **CRITICAL:** Segunda fila de prioridades (PLC pack + IOE queue) sem regra de precedência → CEO vê listas contraditórias.  
2. **HIGH:** Duplicar eventos em `machine_detected_events` / F44 packs **e** IOE sem idempotency.  
3. **HIGH:** Reimplementar criticidade ignorando `priorityIntelligenceConfig` / F47.  
4. **MEDIUM:** Dois outboxes (`industrial_event_outbox` vs `aioi_outbox`) sem correlator.  
5. **LOW:** Novo serviço de classificação NLP ignorando `NLP_PATTERNS` da ingestão unificada.

### B.3 Princípio anti-duplicação (obrigatório na implementação)

> **AIOI orquestra; não reimplementa.** PLC → chamar F47; execução → Action Runtime; truth → enforcement existente; bus P0 → tabela dedicada com bridge opcional para W2.

---

## ETAPA C — COMPATIBILIDADE ENTERPRISE

| Princípio IMPETUS | AIOI alinhado? | Nota |
|-------------------|---------------|------|
| Event-driven | **SIM** | IOE + outbox + consumers |
| Multi-tenant | **SIM** | `company_id` + RLS em todas as tabelas IOE |
| Additive-only | **SIM** | Novas tabelas/serviços; adapters leem fontes existentes |
| Shadow-first | **SIM** | `IMPETUS_AIOI_ENABLED=false`, pilot tenant, observe-only rank |
| Truth-first | **SIM** | `truth_state` em IOE/KPI; fila 100% determinística P0 |
| Governance | **SIM** | HITL, políticas JSON, audit trail |
| Bounded contexts | **PARCIAL** | Domínios Quality/Safety/Env têm runtimes próprios — IOE precisa `category` + publication flags |
| Auditabilidade | **SIM** | `correlation_id`, `aioi_execution_log`, traces |
| Feature flags | **SIM** | Padrão IMPETUS (`IMPETUS_AIOI_*`) |
| Rollout gradual | **SIM** | 1 tenant, 1 planta, P0 sem auto-exec critical |

**Veredicto Etapa C:** **PARCIAL → SIM** com contrato explícito de coexistência com W2 backbone e F40–47.

---

## ETAPA D — DEPENDÊNCIAS COM F49

### D.1 O AIOI depende da F49?

| Classificação | **PARTIAL_DEPENDENCY** (não CRITICAL) |

**Explicação:** No repositório actual, **F49 = Truth program closure + validação Gemini** (`INDUSTRIAL_TRUTH_PROGRAM_CLOSURE.md`, `TRI_AI_CERTIFICATION_STATUS.md`). **Não** define schema IOE nem bus operacional.

| Módulo AIOI | Dependência F49 / Gemini |
|-------------|-------------------------|
| IOE schema + adapters PLC/comm/OS | **NO_DEPENDENCY** |
| Outbox PostgreSQL | **NO_DEPENDENCY** |
| Classification / criticality / priority | **NO_DEPENDENCY** (determinístico) |
| Queue API + CEO dashboard bloco | **NO_DEPENDENCY** |
| Decision / execution / workflow | **NO_DEPENDENCY** (OpenAI já up para tools) |
| KPI MES (OEE/MTTR) | **PARTIAL** — MES push existe; Gemini não |
| ManuIA analyze-frame → IOE | **PARTIAL** — visão Gemini down |
| P3 IA rerank / sugestão LLM | **PARTIAL** — desejável pós-Truth estável + volume traces |

### D.2 Desenvolvimento antes da Gemini?

| Classificação | **SIM_COM_RESTRICOES** |

**Restrições:**

1. Não prometer KPI MES “completos” até MES connector + snapshots testados.  
2. P3 (IA na fila) **proibido** em P0/P1.  
3. Manter Truth enforcement em qualquer narrativa LLM adjacente (dashboard CEO pode ser 100% determinístico).  
4. Não bloquear piloto AIOI por `GEMINI_API_KEY=<SECRET>`.

### D.3 Módulos desenvolvíveis agora (sem F49)

| Módulo | Pode começar? |
|--------|---------------|
| IOE schema + validação | **Sim** |
| Adapters: PLC, communication, work_order, task | **Sim** |
| `aioi_outbox` + worker | **Sim** |
| Classification engine | **Sim** (depende structural FK) |
| Criticality + priority engines | **Sim** (chama F47 para PLC) |
| Queue API + snapshot CEO | **Sim** |
| Decision engine (proposed only) | **Sim** (shadow) |
| Execution orchestrator (HITL) | **Sim** (flags Action Runtime) |
| mesMetrics / OEE snapshots | **Sim** (sem Gemini) |
| Learning outcomes | **Sim** (determinístico) |
| IA rerank | **Não** (aguardar P3 + volume) |

### D.4 Módulos que DEVEM esperar F49 (ou pós-condições)

| Módulo | Motivo |
|--------|--------|
| Integração narrativa Gemini em classificação | F49-B Gemini down |
| ManuIA vision → IOE automático | Mesma dependência |
| Certificação “programa Truth 100%” como gate | F49-E fecho ≠ AIOI, mas gestão pode exigir sequência |
| Auto-execução critical sem stress Etapa 7 | Certificação plano original pendente |

---

## ETAPA E — IMPACTO NO SOFTWARE

### E.1 Notas 0–10

| Dimensão | Nota | Justificação |
|----------|------|--------------|
| Escalabilidade | **8** | Outbox PG P0; Redis P1; particionamento `company_id` |
| Governança | **9** | HITL, políticas, audit, Truth — alinhado missão industrial |
| Operação industrial | **9** | Fila única = valor chão de fábrica |
| CEO visibility | **9** | Top-3 problemas com evidência — diferencial vs chat |
| Multi-planta | **7** | `company_id` OK; multi-site precisa `unit_id` / plant key |
| Multi-tenant | **9** | RLS nativo PostgreSQL |
| Enterprise readiness | **8** | Falta hierarquia holding; resto compatível |
| Diferencial competitivo | **8** | Orquestrador excepções + closed loop — raro em SaaS MES-light |

### E.2 Complexidade

| Classificação | **ALTA** |

**Justificação:** Nova entidade canónica, 6+ consumers, coexistência com F40–47 e W2, UI CEO, políticas tenant — não é “só mais uma tabela”.

### E.3 Benefício vs custo

| Classificação | **SIM** (benefício supera custo em horizonte 12 meses) |

**Detalhe:** Custo front-loaded (P0 6–10 semanas, 2–3 eng.). Benefício: reduz duplicação mental (PLC vs comm vs OS), aumenta confiança CEO, prepara MOAT por tenant (learning weights). **Risco:** scope creep com LLM na fila — mitigar com P0 100% determinístico.

---

## ETAPA F — FUTURA EXPANSÃO HIERÁRQUICA

### F.1 O AIOI deve nascer preparado?

| Resposta | **SIM** |

### F.2 Como preparar (sem implementar roles futuros)

| Área | Recomendação |
|------|--------------|
| **RBAC** | `assigned_role_id` + `visibility_scope` enum (`plant`, `company`, `holding`) em IOE; filtrar queue API por `hierarchy_level` |
| **Queue** | Snapshots por `audience_key` (`ceo`, `board`, `investor`) — mesmo dados, filtros diferentes |
| **Dashboard** | Componente parametrizável `audience=executive|board|investor` |
| **Snapshot executivo** | `aioi_executive_queue_snapshot.audience` + JSONB — não hardcode CEO |
| **Escalonamento** | `escalation_level` + matriz roles em `aioi_policies`; níveis 6–8 reservados em ENUM extensível |

**Estado actual:** `organizationalIdentityEngine` cobre níveis 0–5 (Presidência→Operacional). **Conselho / Investidor / Holding** = **MISSING** — não bloqueia P0; exige migration RBAC futura.

---

## ETAPA G — ROADMAP (resumo; detalhe em IMPLEMENTATION_PLAN)

Ver documento `AIOI_ARCHITECTURE_TARGET_IMPLEMENTATION_PLAN.md`.

**Sequência ideal:** IOE → Outbox → Classify → Criticality → Priority → Queue API → Decision (shadow) → Execution (HITL) → KPI snapshots → Learning → Dashboard completo.

**Início:** **AIOI-P0** imediatamente após aprovação; **em paralelo** F49 Gemini (track IT separado).

---

## ETAPA H — RISCOS (resumo; matriz completa em RISK_MATRIX)

| ID | Risco | Severidade |
|----|-------|------------|
| R1 | Duas filas CEO contraditórias | **CRITICAL** |
| R2 | IOE sem idempotency → storm duplicados | **HIGH** |
| R3 | Scores sem Truth → KPI inventado em ranking | **HIGH** |
| R4 | Scope creep LLM na fila P0 | **HIGH** |
| R5 | PM2 instability (348 restarts) com workers novos | **MEDIUM** |
| R6 | Structural FK incompleto → classificação falha | **HIGH** |
| R7 | Backbone W2 vs aioi_outbox drift | **MEDIUM** |

---

## ETAPA I — RECOMENDAÇÃO FINAL

| # | Pergunta | Resposta |
|---|----------|----------|
| 1 | Devemos construir o AIOI? | **SIM** — como camada orquestradora, não substituto MES/PLC |
| 2 | Devemos começar agora? | **SIM** — AIOI-P0 em paralelo à conclusão F49 Gemini |
| 3 | Implementar primeiro? | IOE + 2 adapters + outbox + classify + priority + queue API |
| 4 | NÃO implementar agora? | Kafka, IA rerank, auto-exec critical, OEE sem MES bound |
| 5 | Aguardar F49? | Apenas **P3 IA** e **visão Gemini**; não P0 |
| 6 | Sequência ideal? | P0 → stress Etapa 7 → P1 decision/exec → P2 workflow/admin → P3 learning/IA |
| 7 | Risco global? | **MEDIUM** (integração, não tecnologia impossível) |
| 8 | Retorno estratégico? | **Alto** — fila auditável + CEO + closed loop = posicionamento Industrial 4.0 SaaS |

---

## Anexo — Coerência PM2 (auditoria 03/06, read-only)

| Item relatório Vertente/F47 | Servidor |
|---------------------------|----------|
| Truth enforce + block | Confirmado `.env` |
| PM2 online desde 14:51 UTC 03/06 | Confirmado |
| 348 restarts lifetime | Confirmado |
| Gemini invalid | Confirmado |
| F40–48 código presente | Confirmado paths `operational*`, `plc*`, `eventPipeline` |

**FASE 47 / AIOI:** Documentação F47 no Git; **zero** código `aioi/` — esperado (forensic only).

---

*AIOI-ARCHITECTURE-TARGET-FORENSIC-01 — nenhum ficheiro operacional alterado.*
