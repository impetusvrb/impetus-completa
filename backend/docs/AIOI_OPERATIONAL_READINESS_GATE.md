# AIOI_OPERATIONAL_READINESS_GATE

**Fase:** AIOI-ORG-4 — P0 Production Pilot Certification  
**Etapa:** 4 — Operational Readiness Gate  
**Data:** 2026-06-10  
**Modo:** CERTIFICATION FIRST · ADDITIVE ONLY

---

## 1. Perguntas Formais do Gate

| Pergunta | Resposta |
|----------|----------|
| P0 está pronto para piloto? | **SIM** — fundação production-grade; faltam worker + classification engine + Queue API |
| P0 está pronto para produção limitada? | **CONDICIONAL** — após migrations executadas em BD + worker setInterval ativo |
| P0 está pronto para multi-tenant? | **SIM** — RLS ENABLED + FORCED em IOE e Outbox; company_id enforced em todo path |
| Quais gates permanecem abertos? | Ver §3 abaixo |

---

## 2. Resumo de Readiness por Camada

| Camada | Estado | Observação |
|--------|--------|------------|
| IOE schema + migration | ✅ ENTREGUE | Executar em BD produção |
| Outbox schema + migration | ✅ ENTREGUE | Executar em BD produção |
| Persistence hardening | ✅ ENTREGUE | Executar em BD produção |
| Serviço de ingestão | ✅ PRODUCTION-GRADE | Pronto para uso |
| Outbox consumer (primitivas) | ✅ PRODUCTION-GRADE | Pronto para uso |
| Adapters (PLC, MES, Task, Comm) | ✅ COMPLIANT | Prontos para uso |
| Decision Bridge | ✅ COMPLIANT | P0.4 — pronto |
| Evidence Chain | ✅ ÍNTEGRA | Todos os adapters populam evidence_refs |
| Truth Propagation | ✅ ÍNTEGRA | ENUMs validados; scores_provisional coerente |
| Worker outbox (setInterval P0) | ⚠️ AUSENTE | Implementar antes de produção |
| Classification engine | ⚠️ AUSENTE | consumer_type='classification' preparado; engine pendente |
| Queue API `GET /api/aioi/queue` | ⚠️ AUSENTE | Read models existem; rota pendente |
| CEO Dashboard block (UI) | ⚠️ AUSENTE | Read models/view-models existem; bloco UI pendente |
| Execution Bridge (P1.0) | ⚠️ FORA ESCOPO P0 | Correto — aguarda HITL P1 |
| Learning Bridge (P1.2) | ⚠️ FORA ESCOPO P0 | Correto — aguarda P1 execution |

---

## 3. Gates Abertos (Pré-Produção)

| ID | Gate | Tipo | Bloqueador para |
|----|------|------|----------------|
| G-01 | Migrations executadas em BD produção | Operacional | Toda operação P0 |
| G-02 | Worker outbox (`setInterval`) implementado | Dev | Processamento automático |
| G-03 | Classification engine | Dev | Triagem automática IOE |
| G-04 | Queue API `GET /api/aioi/queue` | Dev | CEO Dashboard |
| G-05 | CEO Dashboard UI block | Dev/UI | Visibilidade CEO |
| G-06 | Smoke test piloto 30 dias | Qualidade | Gate para P1 |
| G-07 | `IMPETUS_AIOI_ENABLED=false` → ativar apenas 1 tenant piloto | Config | Restrição R1 |
| G-08 | `IMPETUS_AIOI_QUEUE_ACTIVE=false` → ativar após smoke tests | Config | Restrição R3 |
| G-09 | PM2 7 dias sem restart não planeado | Estabilidade | Gate conjunto P1 |
| G-10 | CEO teste 15 min documentado | Validação humana | Gate conjunto P1 |

---

## 4. P0 está pronto para piloto?

**SIM — COM CONDIÇÕES**

A fundação de código P0 está production-grade. O piloto pode iniciar quando:

1. Migrations `aioi_ioe_foundation_migration.sql` e `aioi_outbox_foundation_migration.sql` forem executadas em BD produção.
2. Um worker `setInterval` básico for implementado para processar o outbox.
3. `IMPETUS_AIOI_ENABLED=true` para o tenant piloto (restrição R1).
4. Máximo 3 tenants na fase piloto (restrição R8).

---

## 5. P0 está pronto para produção limitada?

**CONDICIONAL**

Pré-condições:
- G-01 cumprido (migrations)
- G-02 cumprido (worker)
- G-07 cumprido (flag tenant piloto)
- G-06 cumprido (smoke test ≥ 7 dias estável)

---

## 6. P0 está pronto para multi-tenant?

**SIM**

RLS está corretamente configurado:
- `industrial_operational_events`: ENABLE + FORCE RLS + policy `_impetus_tenant_isolation`
- `aioi_outbox`: ENABLE + FORCE RLS + policy `_impetus_tenant_isolation`
- Todo path de código usa `set_config('app.current_company_id')` e `bypass_rls=false`
- `company_id NOT NULL` em todos os registros
- UNIQUE `(company_id, idempotency_key)` previne colisão cross-tenant

---

## 7. Qual é o próximo passo após ORG-4?

Com base no estado atual:

| Opção | Condição | Recomendação |
|-------|----------|--------------|
| **ORG-5 Workflow & SLA Readiness** | P0 gates G-01..G-02 cumpridos + Piloto estável | ✅ RECOMENDADO se piloto iniciar imediatamente |
| **P1 Operational Rollout Certification** | P0 piloto ≥ 30 dias + G-06..G-10 cumpridos | ✅ RECOMENDADO após piloto validado |

**Veredito:** O próximo passo imediato é cumprir os gates G-01 e G-02 (migrations + worker) e iniciar o piloto com 1 tenant. Após 30 dias estáveis → **P1 Operational Rollout Certification**.

---

## 8. Classificação Final

```
AIOI_P0_FOUNDATION_CERTIFIED
AIOI_P0_PILOT_READY_WITH_CONDITIONS
AIOI_P0_MULTI_TENANT_READY
AIOI_P0_PRODUCTION_GATES_OPEN: G-01..G-10
```

---

*AIOI_OPERATIONAL_READINESS_GATE — Etapa 4 AIOI-ORG-4.*
