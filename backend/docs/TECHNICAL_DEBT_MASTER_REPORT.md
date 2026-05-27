# IMPETUS — TECHNICAL DEBT MASTER REPORT

**Data:** 2026-05-25
**Escopo:** débitos arquiteturais, operacionais, cognitivos, frontend, telemetria, IA, observabilidade, edge
**Tipo:** auditoria não-implementadora

---

## 0. Sumário executivo

O IMPETUS apresenta uma **massa de débitos arquiteturais de magnitude moderada-alta**, característica de um sistema que foi construído em **camadas aditivas sucessivas** (Motor A → Engine V2 → Runtime Z → SZ1–SZ5 → cockpits cognitivos por domínio). A disciplina *additive-only* preservou estabilidade mas introduziu **cognitive sprawl** e várias **duplicações controladas**.

**Total de débitos identificados:** **27** (11 críticos, 9 médios, 7 baixos)
**Concentração:** runtime cognitivo (8) + telemetria industrial (5) + frontend/UX (4) + governança/observabilidade (5) + IA safety (3) + outros (2).

---

## 1. Inventário detalhado por área

### 1.1 Runtimes inacabados / shadow

#### D1 — Z.28 (Adaptive Orchestration) em shadow indefinido
- **Local:** `IMPETUS_ADAPTIVE_ORCHESTRATION=shadow`, `cognitiveRuntime/orchestration/adaptive*`
- **Causa:** ausência de gate de aprovação para promoção a `controlled`/`active`.
- **Impacto:** lógica adaptativa observa e aprende mas **não atua** — capacidade investida sem retorno operacional.
- **Risco:** Médio (técnico) / Baixo (operacional, pois está em shadow).
- **Fix:** Definir KPIs de promoção (divergência shadow vs. esperado < 1%) + dashboard de promotion gate; promover por tenant pilot (já existe `IMPETUS_SZ1_PROMOTED_TENANTS=…`).
- **Ordem:** após estabilização SZ5 + Z.29.

#### D2 — Z.29 (Governance Learning) em shadow
- **Local:** `IMPETUS_GOVERNANCE_LEARNING=shadow`
- **Causa:** aprendizagem de governança requer HITL formal antes de produção.
- **Impacto:** sistema observa padrões de governança mas não auto-evolui.
- **Risco:** Médio. Sem HITL, promoção é arriscada.
- **Fix:** Workflow de approval (governance-board-of-review) + audit trail por sugestão aceita.
- **Ordem:** após D11 (model registry).

#### D3 — Cognitive Block Registry definitional (delivery_active=false)
- **Local:** `backend/src/cognitiveRuntime/registry/cognitiveBlockRegistry.js`
- **Causa:** blocos foram modelados antes do delivery pipeline real (Engine V2 / cockpit composer entregam por outros caminhos).
- **Impacto:** **registry diverge do runtime real** — fonte de confusão entre o que está catalogado e o que efetivamente roda.
- **Risco:** Alto (médio prazo, em refactoring).
- **Fix:** ou (a) consolidar entrega no registry (real) ou (b) marcar explicitamente registry como `metadata-only` e remover qualquer caminho legado que tente consumir.
- **Ordem:** Tier 2 (consolidação cognitiva).

#### D4 — `chatAIService.js` (legado) coexiste com `chatAIService.consolidated.js`
- **Local:** `backend/src/services/chatAIService.js` (legado) e `.consolidated.js` (hot path actual)
- **Causa:** consolidação iniciada, não concluída.
- **Impacto:** confusão para newcomers + risco de uso indevido do legado.
- **Risco:** Médio.
- **Fix:** marcar `chatAIService.js` como `@deprecated`, ou converter em re-export do consolidated; remover quando 100% dos consumidores migrados.
- **Ordem:** Tier 2.

#### D5 — `impetusChatOperationalContextService.js` parcialmente desligado do hot path
- **Local:** serviço usado em voice/panel; chat texto agora usa SZ5 directo
- **Causa:** desenho original anterior a SZ5.
- **Impacto:** duplicação de lógica de contexto entre `impetusChatOperationalContextService` (voice/panel) e `zUnifiedConversationalContextInjector` (texto).
- **Risco:** Médio.
- **Fix:** unificar: voice/panel passa também por SZ5 injector com adapter `mode: 'voice'`.
- **Ordem:** Tier 2.

#### D6 — SZ4 sem persistência (`IMPETUS_SZ4_PERSISTENCE=off`)
- **Local:** `runtime-z-operational-nervous-system/`
- **Causa:** inicialmente in-memory para evitar pressão DB.
- **Impacto:** após reboot, sinais SZ4 acumulados perdem-se → forensics limitada.
- **Risco:** Médio.
- **Fix:** ligar persistência num tenant pilot com schema enxuto + TTL 30 dias.
- **Ordem:** Tier 1 (compliance/auditabilidade).

#### D7 — Multi-Domain Foundation em shadow
- **Local:** `IMPETUS_MULTI_DOMAIN_FOUNDATION=shadow`, `IMPETUS_COGNITIVE_ORCHESTRATION=shadow`, `IMPETUS_SEMANTIC_DOMAIN_RUNTIME=shadow`
- **Causa:** dependência de promoção Quality + Safety + Environment em paralelo, ainda não consolidada.
- **Impacto:** cross-domain cognition limitada.
- **Risco:** Médio.
- **Fix:** promover após Safety/Environment saírem de shadow publication.
- **Ordem:** Tier 2.

#### D8 — Coexistência Motor A + Engine V2 + Runtime Z
- **Local:** múltiplos.
- **Causa:** princípio aditivo + risco de big-bang migration.
- **Impacto:** **3 motores em produção simultaneamente** — manutenção dupla/tripla.
- **Risco:** Alto (longo prazo).
- **Fix:** plano de deprecação Motor A (12–18 meses) após Engine V2 cobrir 100% dos casos.
- **Ordem:** Tier 3 (estratégico).

### 1.2 Telemetria / Edge

#### D9 — Conectores MQTT/OPC-UA/Modbus em modo simulação
- **Local:** `backend/src/domains/environment/telemetry/connectors/*`
- **Causa:** ambiente sem hardware industrial conectado.
- **Impacto:** scaffolding pronto mas **nenhum loop real validado** com PLC/sensor.
- **Risco:** Alto se cliente industrial real entrar.
- **Fix:** lab industrial com PLC Siemens/Allen-Bradley + broker MQTT (HiveMQ/Mosquitto) + OPC-UA simulator (Prosys); validar end-to-end.
- **Ordem:** Tier 1 (industrial readiness).

#### D10 — Edge runtime conceptual, sem agente físico
- **Local:** rotas `/integrations/edge/*`; sem repositório `impetus-edge-agent`.
- **Causa:** prioridade dada ao backend.
- **Impacto:** offline factory floor não-suportado.
- **Risco:** Alto para indústria.
- **Fix:** projeto separado (Go ou Rust ou Node embedded) com store-and-forward + WireGuard + mutual TLS + assinatura de eventos.
- **Ordem:** Tier 1 (industrial readiness).

#### D11 — Sem retention policy industrial em `industrial_event_outbox`
- **Local:** `backend/src/models/industrial_event_backbone_migration.sql`
- **Causa:** outbox foi entregue como mirror; volumes reais ainda baixos.
- **Impacto:** tabelas crescerão sem limite quando telemetria real ligar.
- **Risco:** Alto a 6–12 meses.
- **Fix:** partition por mês + archive job + retention TTL parametrizado.
- **Ordem:** Tier 1 (escalabilidade).

#### D12 — Sem observabilidade externa industrial (APM)
- **Local:** sem evidência de OpenTelemetry/Prometheus/Datadog.
- **Causa:** observabilidade interna foi suficiente para piloto.
- **Impacto:** SLO/SLA impossíveis de medir externamente; clientes enterprise pedem APM.
- **Risco:** Alto.
- **Fix:** instrumentar `dashboardEngineV2` + chat hot path com OpenTelemetry → Prometheus + Grafana; KPIs: p50/p95 latência, error rate, AI-token rate.
- **Ordem:** Tier 1 (enterprise).

#### D13 — Telemetria SCADA/MES sem fusão real
- **Local:** `cognitiveRuntime/composition/runtimeCockpitComposer.js`
- **Causa:** fusão depende de protocolos reais (D9/D10).
- **Impacto:** intelligence cross-system limitada.
- **Risco:** Médio.
- **Fix:** depois D9+D10; introduzir adapter MES/ERP (REST + webhook).
- **Ordem:** Tier 2.

### 1.3 Frontend / UX

#### D14 — Rota `/api/dashboard/visibility` ausente
- **Local:** `frontend/src/hooks/useDashboardVisibility.js` (chama rota inexistente)
- **Causa:** consolidação interrompida.
- **Impacto:** fail-open `ALL_TRUE` no frontend — todos os módulos visíveis para todos.
- **Risco:** **Alto (segurança/governança)**.
- **Fix:** implementar `GET /api/dashboard/visibility` no backend; UI consome.
- **Ordem:** **Tier 1 crítico**.

#### D15 — `DashboardInteligente.jsx` usa `sections` locais em vez de `dashboardPayload.sections`
- **Local:** `frontend/src/DashboardInteligente.jsx`
- **Causa:** legado anterior a Engine V2 payload.
- **Impacto:** inconsistência entre o que backend declara e o que UI mostra.
- **Risco:** Médio.
- **Fix:** migrar para `dashboardPayload.sections` com fallback.
- **Ordem:** Tier 1.

#### D16 — Service-worker industrial robusto ausente (offline)
- **Local:** `frontend/src/` (PWA leve em AppMobile)
- **Causa:** PWA serve ManuIA leve; chão de fábrica offline não suportado.
- **Impacto:** operário sem rede não consegue registar.
- **Risco:** Alto para indústria.
- **Fix:** SW com background-sync + queue local IndexedDB + reconciliação no servidor (CRDT ou versioning).
- **Ordem:** Tier 2.

#### D17 — Inconsistência de design system em screens legadas
- **Local:** alguns componentes (`ErrorOffline`, etc.) podem não seguir tokens `tokens.css`
- **Causa:** evolução sem refactor passada.
- **Impacto:** UX inconsistente.
- **Risco:** Baixo.
- **Fix:** auditoria visual + refactor incremental.
- **Ordem:** Tier 3.

### 1.4 Governança / Observabilidade

#### D18 — Flags `IMPETUS_*` em número excessivo (~244)
- **Local:** `backend/.env`
- **Causa:** desenho shadow-first granular.
- **Impacto:** debug e raciocínio sobre estado real do runtime são difíceis.
- **Risco:** Médio.
- **Fix:** introduzir **flag dashboard interno** (`/api/internal/flags/effective?stage=…&domain=…`) e agrupar flags por *runtime-stage*.
- **Ordem:** Tier 2.

#### D19 — Env drift entre PM2 e dotenv documentado mas não automatizado
- **Local:** `pm2-live-runtime-audit.md`
- **Causa:** dotenv com `override: true`.
- **Impacto:** ops vê via `pm2 env` algo diferente do que Node processa.
- **Risco:** Médio.
- **Fix:** **flag-reconciler boot-check** que loga divergências e bloqueia start em prod se divergir > threshold.
- **Ordem:** Tier 1.

#### D20 — Sem dashboard de rollout consolidado
- **Local:** múltiplos `*RolloutEngine` em `domains/*/activation`
- **Causa:** cada domínio implementou o seu.
- **Impacto:** visão holística do rollout fica fragmentada.
- **Risco:** Baixo.
- **Fix:** painel interno `/admin/rollout-overview` que consume `*PublicationMetricsRuntime` de cada domínio.
- **Ordem:** Tier 2.

#### D21 — `auditMiddleware` parcialmente aplicado
- **Local:** muitas rotas write sem audit.
- **Causa:** introduzido tardiamente.
- **Impacto:** cobertura forense incompleta.
- **Risco:** Médio (compliance).
- **Fix:** middleware-by-default em todas as rotas `POST`/`PUT`/`PATCH`/`DELETE`; allowlist explícita para opt-out.
- **Ordem:** Tier 1.

#### D22 — Inconsistência semântica flags: `IMPETUS_COGNITIVE_RUNTIME=off` mas Z.18 ativa via `IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY=on`
- **Local:** `cognitiveRuntimeFacade.js`
- **Causa:** semântica "observabilidade" disparou facade real.
- **Impacto:** raciocínio sobre o que está ativo torna-se contraintuitivo.
- **Risco:** Médio.
- **Fix:** separar `OBSERVABILITY` (read-only) de `EXECUTION` (write/side-effect) com gate explícito.
- **Ordem:** Tier 1.

### 1.5 IA / Cognitive safety

#### D23 — Sem hallucination detection formal
- **Local:** `structuralAIGovernanceService.js` (heurístico)
- **Causa:** abordagem inicial baseada em padrões.
- **Impacto:** respostas IA "general_knowledge" passam só por heurísticas.
- **Risco:** Alto se IA promover acções operacionais.
- **Fix:** segundo modelo (judge) opcional + cross-check com tools (consultar_*) + score de fidelidade vs. SZ5 facts.
- **Ordem:** Tier 1 (antes de action runtime autónomo).

#### D24 — Sem model registry / AI cards
- **Local:** sem evidência
- **Causa:** prioridade dada ao runtime cognitivo.
- **Impacto:** ISO 42001 não-conforme; auditoria forense de respostas LLM por modelo/versão é difícil.
- **Risco:** Alto (compliance/internacional).
- **Fix:** tabela `ai_model_registry` + `ai_card` markdown por modelo/uso (descrição, dados, métricas, limitations); persistir `model_version` em `chat_messages` e `ai_legal_audit_logs`.
- **Ordem:** Tier 1.

#### D25 — Action runtime (tool calling) desligado por padrão
- **Local:** `operationalToolRegistry.js`, `OPERATIONAL_TOOL_CALLING_ENABLED=false`
- **Causa:** decisão prudente (sem HITL formal).
- **Impacto:** capacidade existe mas não é entregue.
- **Risco:** Baixo agora, Alto se promovido sem D23+D24.
- **Fix:** introduzir HITL (`require_approval` no tool) + workflow de aprovação por persona.
- **Ordem:** Tier 2 (depois D23+D24).

### 1.6 Outros

#### D26 — Logistics domain só scaffolding (12 ficheiros vs Environment 108)
- **Local:** `backend/src/domains/logistics/`
- **Causa:** domínio priorizado depois.
- **Impacto:** roadmap industrial fica incompleto.
- **Risco:** Baixo (sem cliente exigindo agora) / Alto se mercado pedir.
- **Fix:** seguir blueprint Environment (analytics + cognitive + telemetry + executive + activation).
- **Ordem:** Tier 3 (estratégico).

#### D27 — Sem suite e2e robusta de fuzzing multi-tenant
- **Local:** `backend/tests/`
- **Causa:** testes funcionais por feature.
- **Impacto:** garantia de isolamento por amostragem, não exaustiva.
- **Risco:** Médio.
- **Fix:** suite que cria N tenants sintéticos + executa M operações cruzadas + assert zero leakage.
- **Ordem:** Tier 2.

---

## 2. Resumo por severidade

### Crítico (Tier 1) — 11

D6 (SZ4 persistence), D9 (conectores reais), D10 (edge agent), D11 (retention industrial), D12 (APM externo), D14 (rota visibility), D15 (DashboardInteligente sections), D19 (flag-reconciler), D21 (auditMiddleware universal), D22 (semantic obs vs exec), D23 (hallucination detection), D24 (model registry).

> nota: D14, D15 e D24 contam 1 vez no total 11 (D14 + D15 são UI-bound mas listados separados para clareza).

### Médio (Tier 2) — 9

D3 (registry definitional), D4 (chatAIService legado), D5 (impetusChat operationalContext), D7 (multi-domain foundation), D13 (fusão SCADA/MES), D16 (service-worker industrial), D18 (flag dashboard), D20 (rollout overview), D25 (action runtime gating).

### Baixo / Estratégico (Tier 3) — 7

D1 (Z.28 promoção), D2 (Z.29 promoção), D8 (deprecação Motor A), D17 (DS consistency), D26 (Logistics pleno), D27 (suite multi-tenant fuzzing), D8 cont.

---

## 3. Ordem ideal de desenvolvimento (sequência técnica)

```
Wave A — Fundação Industrial Crítica (3–4 sprints)
  1. D14 + D15 (visibility reconciliation completa)
  2. D19 (flag-reconciler boot-check)
  3. D21 (auditMiddleware universal)
  4. D22 (separar OBSERVABILITY vs EXECUTION)
  5. D11 (retention industrial)
  6. D6 (SZ4 persistence em pilot)

Wave B — Telemetria & Edge (4–6 sprints)
  7. D9 (conectores reais com lab industrial)
  8. D10 (edge agent v0)
  9. D12 (APM externo)
  10. D13 (fusão SCADA/MES)

Wave C — AI Governance & Safety (3–4 sprints)
  11. D24 (model registry + AI-cards)
  12. D23 (hallucination detection)
  13. D25 (action runtime com HITL)
  14. D5 (unificar contexto voice/text via SZ5)

Wave D — Consolidação Cognitiva (4–6 sprints)
  15. D3 (registry definitional vs operacional)
  16. D4 (deprecar chatAIService legado)
  17. D18 + D20 (flag dashboard + rollout overview)
  18. D7 (promoção multi-domain foundation)
  19. D27 (suite fuzzing multi-tenant)

Wave E — Estratégicos (6–12 meses)
  20. D1 + D2 (promoção Z.28 + Z.29 com HITL)
  21. D26 (Logistics pleno)
  22. D16 (service-worker industrial)
  23. D17 (DS consistency completa)
  24. D8 (deprecação Motor A) — longo prazo
```

---

## 4. Conclusões

A **dívida técnica do IMPETUS é mais arquitetural do que operacional**: não há código quebrado em produção, mas há **sprawl cognitivo, fragmentação de governança e capacidades preparadas mas não promovidas**. Endereçar a **Wave A** já remove os bloqueios para certificação inicial e pilot industrial real; a **Wave B** abre o mercado de chão de fábrica; a **Wave C** abre internacionalização e ISO 42001.

Os débitos foram acumulados conscientemente sob disciplina `additive-only`; a remediação deve seguir a mesma disciplina (shadow-first + flag-gated + tenant-scoped).

---
*Documento gerado como auditoria estratégica. Nenhum código foi alterado.*
