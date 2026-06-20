# IMPETUS — Adoption Progress Tracker
## Gate Specification M1.22–M1.27

**Versão:** 1.0  
**Data:** 2026-06-17  
**Fase base:** M1.21 concluída — `ENTERPRISE_CORE_COMPLETE`  
**API:** `GET /api/m1/adoption-progress/status`

---

## Contexto

Após M1.11–M1.21 o IMPETUS não possui mais bloqueadores arquiteturais.  
O único gargalo restante é **evidência operacional real**.

Este documento especifica os critérios mínimos de cada gate operacional
para que os módulos Foundation sejam promovidos a Operational.

---

## Gates Primários (dependência em série)

### Gate M1.22 — ESG Operational Activation

| Critério | Mínimo |
|----------|--------|
| Eventos ESG reais (últimos 30 dias) | 50 |
| Utilizadores activos ESG (últimos 30 dias) | 10 |
| Janela obrigatória | 30 dias |

**Acção imediata:**
```
POST /api/environment-operational/workspace/field/record
Evento: environment.field.occurrence_registered
Tabela: industrial_operational_events
```

**Promoção:** `Environment Operational → Enterprise Operational`

---

### Gate M1.23 — Workflow Operational Activation

**Pré-requisito de modo:**
```
IMPETUS_WORKFLOW_ENGINE_MODE=on   (actualmente: shadow)
```

| Critério | Mínimo |
|----------|--------|
| Instâncias BPMN completas (últimos 30 dias) | 30 |
| Tipos de processo distintos | 2 |
| Janela obrigatória | 30 dias |

**Acção imediata:**
```
1. Definir IMPETUS_WORKFLOW_ENGINE_MODE=on no .env
2. pm2 restart impetus-backend --update-env
3. POST /api/workflow-engine/instances/start { process_key: "operational.task_lifecycle.v1" }
```

**Promoção:** `Workflow BPMN → Enterprise Operational`

---

### Gate M1.24 — MES Operational Pilot

| Critério | Mínimo |
|----------|--------|
| Ordens de produção reais | 100 |
| Execuções registadas | 50 |
| Janela obrigatória | 30 dias |

**Acção imediata:**
```
POST /api/mes/production-orders
{ order_number, product_id, quantity_planned, company_id }
Evento: mes.production_order.created
```

**Promoção:** `MES Foundation → Pilot Ready`

---

## Gates Dependentes (desbloqueiam após M1.22+M1.23+M1.24)

### Gate M1.25 — Operational Evidence Collection (P0A/P0B/P0C)

- **Tipo:** time_based_observation
- **Duração:** 60–90 dias de operação contínua
- **Equivale a:** P0A (operação contínua) + P0B (observação prolongada) + P0C (métricas reais)
- **Pode iniciar:** após todos os 3 gates primários abertos

### Gate M1.26 — Multi-Tenant Real Validation (P0D)

- **Tipo:** business_decision
- **Arquitectura:** completa (M1.19)
- **Requisito:** 2º tenant produtivo
- **Desbloqueio:** decisão comercial / onboarding novo cliente

### Gate M1.27 — Executive Real Operations Report (P0E)

- **Tipo:** evidence_based
- **Requisito:** M1.25 concluída
- **Entrega:** Dashboard CEO com OEE, Custos, SST, ESG, Qualidade e Produtividade reais

---

## Gates Estratégicos (dependem de M1.24+M1.25)

| Gate | Equivalente | Entrada necessária |
|------|------------|-------------------|
| M2.0 | MES Operational Certification | 90 dias operação + ordens/paradas reais |
| M2.1 | Quality Operational | M2.0 concluída |
| M2.2 | SST Operational | M2.0 concluída |
| M2.3 | Environment Operational | M1.22 + M2.0 |
| M2.4 | Logistics Operational | Foundation → Operational |
| M2.5 | Analytics Operational | Foundation + dados reais 90 dias |
| M2.6 | Predictive Intelligence | 6–12 meses histórico real |

---

## Dependências Não Implementáveis por Código

| Item | Razão | Responsável |
|------|-------|------------|
| ESG events reais | Acção de operador no workspace | Utilizador piloto |
| Workflow instances reais | Env flag + acção humana | DevOps + Utilizador |
| MES orders reais | Input de chão-de-fábrica | Utilizador MES |
| CEO Anam 15 min | Gravação manual | CEO Fresh & Fit |
| Gemini API key | Google AI Studio | Administrador |
| P17–P20 AIOI | Proibição de governança | Ver §P17-P20 abaixo |
| ML Preditivo | Requer 6–12 meses histórico | Evolução estratégica |

---

## Monitorização em Tempo Real

```
GET /api/m1/adoption-progress/status     → todos os gates
GET /api/m1/adoption-progress/esg        → gate M1.22
GET /api/m1/adoption-progress/workflow   → gate M1.23
GET /api/m1/adoption-progress/mes        → gate M1.24
GET /api/m1/adoption-progress/analytics  → gate M2.5
GET /api/m1/adoption-progress/logistics  → gate M2.4
```

Todos os endpoints são **READ ONLY**, autenticados e sem dados mock.
