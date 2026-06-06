# AIOI_P0_AUTHORIZATION

**Fase:** AIOI-GOVERNANCE-01 — Etapa 07  
**Data:** 2026-06-05  
**Modo:** READ-ONLY FORENSE — nenhum código alterado  
**Objetivo:** Emitir decisão formal sobre autorização do AIOI-P0  

---

## 1. Checklist de Pré-Autorização

| Item | Status | Documento de Referência | Notas |
|------|--------|------------------------|-------|
| **[x] Soberania definida** | ✅ COMPLETO | `AIOI_SOVEREIGNTY_MAP.md` | 9 domínios mapeados; conflitos CRITICAL identificados e mitigados |
| **[x] Integração definida** | ✅ COMPLETO | `AIOI_INTEGRATION_CATALOG.md` | 10 módulos catalogados; REUSE/WRAP/BRIDGE/DEPRECATE_FUTURE definidos |
| **[x] IOE definido** | ✅ COMPLETO | `AIOI_IOE_SPECIFICATION.md` | Schema completo, ENUMs, contratos Truth/F47, idempotência — IOE_SPEC_READY |
| **[x] Bus definido** | ✅ COMPLETO | `AIOI_BUS_ARCHITECTURE.md` | PostgreSQL Outbox aprovado — BUS_ARCHITECTURE_APPROVED |
| **[x] Anti-duplicação aprovada** | ✅ COMPLETO | `AIOI_ANTI_DUPLICATION_POLICY.md` | 5 domínios + 15 riscos catalogados — ANTI_DUPLICATION_PASS |
| **[x] Readiness estrutural validada** | ✅ COMPLETO | `AIOI_STRUCTURAL_READINESS.md` | PARTIAL — P0 viável; RLS tabelas AIOI obrigatório |

**Todos os 6 itens do checklist formalmente endereçados.**

---

## 2. Análise de Riscos Residuais

### 2.1 Riscos CRITICAL

| ID | Risco | Status | Mitigação antes de P0 |
|----|-------|--------|----------------------|
| R-Q1 | Duas filas CEO simultâneas | **MITIGADO** | `IMPETUS_AIOI_QUEUE_ACTIVE=false` padrão + contrato Q-05 |
| R-P1 | Reimplementação de score PLC | **MITIGADO** | Contratos P-01/P-04 + checklist code review |
| R-E1 | Execução sem HITL | **MITIGADO** | `IMPETUS_AIOI_AUTO_EXECUTE_BAND=none` obrigatório P0 |
| R-T3 | Tenant leakage em worker | **MITIGADO** | RLS obrigatório em migration IOE + fuzz tests |
| G1 | Auto-exec critical sem HITL | **MITIGADO** | Flag `=none` P0 |
| M1 | Leakage company_id em worker | **MITIGADO** | RLS PG + testes fuzz (suite existente) |

**Todos os riscos CRITICAL têm mitigação definida.**

### 2.2 Riscos HIGH com gate antes de P0

| ID | Risco | Gate |
|----|-------|------|
| R-E2 | Duplicação IOE / machine_detected_events | `idempotency_key` obrigatório na migration |
| DB3 | Duplicata `idempotency_key` | `UNIQUE (company_id, idempotency_key)` na migration |
| RLS AIOI | Sem RLS nas tabelas novas | Adicionar em migration antes de primeiro INSERT |
| TR1 | Priority score sem Truth | `scores_provisional = true` + UI "Indisponível" |

---

## 3. Restrições Obrigatórias P0

As seguintes restrições são **condições não negociáveis** para o P0:

| # | Restrição | Responsável | Verificação |
|---|-----------|-------------|-------------|
| R1 | `IMPETUS_AIOI_ENABLED=false` padrão — ativar apenas para 1 tenant piloto | Tech Lead | `.env` + feature flag |
| R2 | `IMPETUS_AIOI_AUTO_EXECUTE_BAND=none` — toda ação requer HITL | Tech Lead | `actionRuntimeFlags` |
| R3 | `IMPETUS_AIOI_QUEUE_ACTIVE=false` padrão — ativar fila CEO apenas após smoke tests | Tech Lead | Feature flag |
| R4 | RLS em `industrial_operational_events` obrigatório antes de INSERT | Desenvolvedor | Migration CI check |
| R5 | RLS em `aioi_outbox` obrigatório antes de INSERT | Desenvolvedor | Migration CI check |
| R6 | `UNIQUE (company_id, idempotency_key)` obrigatório na migration IOE | Desenvolvedor | Migration CI check |
| R7 | Nenhum LLM no path crítico da fila P0 — 100% determinístico | Tech Lead | Code review |
| R8 | Piloto: máximo 3 tenants; mínimo 1 semana de observação antes de expandir | Product | Runbook |
| R9 | Sem processo PM2 dedicado P0 — worker via setInterval com flag de shutdown graceful | Infra | PM2 config |
| R10 | Score PLC via `operationalPrioritizationService` obrigatório — PR rejeitado sem import | Reviewer | Lint rule |

---

## 4. Dependências F49

| Módulo AIOI | Dependência F49 | Conclusão |
|-------------|-----------------|-----------|
| IOE schema + adapters PLC/comm/task | **NENHUMA** | Pode iniciar agora |
| `aioi_outbox` worker | **NENHUMA** | Pode iniciar agora |
| Classificação / criticidade / prioridade | **NENHUMA** | Pode iniciar agora |
| Queue API + snapshot CEO | **NENHUMA** | Pode iniciar agora |
| Decision / execution / workflow | **NENHUMA** | Pode iniciar agora (shadow mode) |
| KPI MES snapshots | **PARCIAL** | Gemini não é dependência; MES connector depende de tenant |
| Narrativa LLM sobre IOE | **SIM** | P3+ — aguardar F49 Truth + volume de traces |
| IA rerank fila | **SIM** | P3+ proibido em P0 |

**Conclusão:** F49 **NÃO bloqueia P0**.

---

## 5. Decisão Formal

```
P0_AUTHORIZED_WITH_RESTRICTIONS
```

### Justificativa Técnica

**AUTORIZADO porque:**
1. Soberania de todos os domínios está formalmente definida
2. Contratos de integração impedem duplicação dos riscos CRITICAL
3. Barramento PostgreSQL Outbox é compatível com toda a stack
4. IOE especificado com idempotência, RLS e Truth contracts
5. Estrutura organizacional (setores/cargos/RBAC) cobre P0 completamente
6. Todos os 6 items do checklist foram formalmente endereçados
7. F49 não é pré-requisito para nenhum módulo P0

**COM RESTRIÇÕES porque:**
1. RLS nas tabelas AIOI deve ser criado na mesma migration (não pode ser adicionado depois)
2. Worker PM2 dedicado apenas em P1 — P0 usa processo integrado com flag
3. Fila CEO deve ser controlada por feature flag `AIOI_QUEUE_ACTIVE` — transição gradual
4. `auto_execute_band=none` obrigatório P0 — CEO aprova manualmente
5. Máximo 3 tenants piloto com semana de observação

### O que NÃO está autorizado no P0

| Proibido | Motivo |
|---------|--------|
| IA/LLM no path de scoring | Determinístico obrigatório P0 |
| Auto-execução de critical | Risco operacional sem HITL |
| Exibir duas filas CEO simultaneamente | Risco CRITICAL de confiança |
| Kafka / RabbitMQ / Redis | Infraestrutura desnecessária; custo sem benefício P0 |
| Rollout > 3 tenants antes de stress test | Risco de escala sem validação |
| Criar `aioiLearningService` | Violação de soberania de aprendizado |
| Criar segundo executor | Violação de soberania de execução |

---

## 6. Sequência Autorizada de Implementação P0

```
Semana 1-2: IOE Schema + RLS + adapters PLC/comm/task
Semana 2-3: aioi_outbox + worker + consumers básicos
Semana 3-4: Classification Engine + Priority Engine (chama F47)
Semana 4-5: Queue API + aioi_executive_queue_snapshot
Semana 5-6: CEO Dashboard bloco + smoke tests (1 tenant piloto)
```

---

*AIOI_P0_AUTHORIZATION — documento forense, nenhum arquivo operacional alterado.*  
*Gerado em: AIOI-GOVERNANCE-01 / Etapa 07*
