# ECO-02 — Plano de Migração por Módulo

**Programa:** Cognitive Ecosystem Convergence  
**Fase:** 2 — Contrato arquitectural  
**Data:** 2026-07-02

---

## Legenda de estratégias

| Estratégia | Descrição |
|------------|-----------|
| **Adapter** | Novo ponto de entrada que normaliza para EG sem alterar produtor core |
| **Consumer** | Módulo passa a ler resultado/camadas EG antes de agir |
| **Replacement** | Substituição de path legacy por path governado |
| **Retirement** | Remoção de código legacy após certificação |

---

## Módulos P0 — ECO-03

### operationalActionExecutor

| Campo | Valor |
|-------|-------|
| Estado actual | `executeOperationalActions` → `unifiedMessaging.sendToUser` directo |
| Estado final | Evento CHAT_OPERATIONAL → EG → notificationCenterExecutor/chatExecutor |
| Estratégia | **Adapter** (`chatOperationalGovernanceAdapter` ou extensão adapter existente) |
| Rollback | Flag `ECO_OAE_VIA_EG=false` + path legacy |
| NC | NC-INT-004 |

### operationalRealtimeCoordinator

| Campo | Valor |
|-------|-------|
| Estado actual | `processChatMessage` → classify Gemini → `notifyUsers` → unifiedMessaging |
| Estado final | Normalizar mensagem → EG → executor; Gemini só pós-decisão allow |
| Estratégia | **Adapter** + **Replacement** do path notify |
| Rollback | `ECO_CHAT_VIA_EG=false` |
| NC | NC-ECO-P0-002 |

### organizationalAI

| Campo | Valor |
|-------|-------|
| Estado actual | `notifyRecipients` → `appImpetusService.sendMessage` |
| Estado final | notify via EG executor |
| Estratégia | **Adapter** |
| Rollback | `ECO_ORG_AI_VIA_EG=false` |
| NC | NC-ECO-P0-003 |

### Políticas órfãs (CHAT_OPERATIONAL, NC_BRIDGE_MIRROR)

| Campo | Valor |
|-------|-------|
| Estado actual | Catálogo referencia módulos sem adapter |
| Estado final | Adapters ligados; políticas matcháveis |
| Estratégia | **Adapter** |
| Rollback | Adapter OFF; políticas permanecem no catálogo |
| NC | NC-INT-005 |

---

## Módulos P2 — ECO-04

### cognitiveControllerService

| Campo | Valor |
|-------|-------|
| Estado actual | `handleCognitiveRequest` → council sem EG |
| Estado final | EG primeiro → Controller consumer → council condicional |
| Estratégia | **Consumer** (ADR-ECO-001) |
| Rollback | `ECO_CONTROLLER_EG_FIRST=false` |
| NC | NC-INT-001 |

### unifiedDecisionEngine

| Campo | Valor |
|-------|-------|
| Estado actual | `decide` como autoridade paralela |
| Estado final | Helper pós-EG; não autoridade |
| Estratégia | **Replacement** (autoridade) + **Retirement** (ECO-08) |
| Rollback | Flag restore decide path |
| NC | NC-ECO-P2-002 |

---

## Módulos P3 — ECO-05

### pulseCognitive (conjunto)

| Campo | Valor |
|-------|-------|
| Estado actual | GOVERNANCE interno; sem EG pipeline |
| Estado final | Consumer Learning/Memory/Intelligence; GOVERNANCE retired |
| Estratégia | **Consumer** (ADR-ECO-002) |
| Rollback | `ECO_PULSE_EG_CONSUME=false` |
| NC | NC-INT-006 |

### cognitiveEventBackboneService

| Campo | Valor |
|-------|-------|
| Estado actual | Publishers sem subscriber EG |
| Estado final | Bridge publisher → entrada EG |
| Estratégia | **Adapter** (bridge); backbone permanece (ADR-005) |
| Rollback | `ECO_BACKBONE_BRIDGE=false` |
| NC | NC-INT-002 |

---

## Módulos ECO-06

### Conversation Context Engine

| Campo | Valor |
|-------|-------|
| Estado actual | Classificação prompt-only |
| Estado final | + Knowledge Base consumer read-only |
| Estratégia | **Consumer** (ADR-ECO-004) |
| Rollback | `ECO_CONVERSATION_KB_ENRICH=false` |

### governanceKnowledgeBaseService

| Campo | Valor |
|-------|-------|
| Estado actual | Audit API ONLINE |
| Estado final | Consumido por Conversation Context (sem alteração serviço) |
| Estratégia | Nenhuma (já certificado) |
| Rollback | N/A |

---

## Módulos ECO-07

### Executive Dashboards (conjunto)

| Campo | Valor |
|-------|-------|
| Estado actual | Múltiplas fontes BD/runtime |
| Estado final | Executive Insights API única fonte KPIs governados |
| Estratégia | **Consumer** (ADR-ECO-003) |
| Rollback | `ECO_EXECUTIVE_INSIGHTS_ONLY=false` |
| NC | NC-INT-003 |

### Fontes a consolidar

- `pulseCognitive/executiveDashboard.js`
- `cognitivePulseService.js`
- `organizationalIntelligenceEngine.js`
- `frontend/dashboardContextAdapter.js`

---

## Módulos ECO-08 — Retirement

| Módulo / artefacto | Estratégia | Condição |
|--------------------|------------|----------|
| Catch fallbacks adapters | **Retirement** | Domínios ON 30d estáveis |
| Bypass paths ECO-03 | **Retirement** | Zero chamadas legacy em métricas |
| GOVERNANCE Pulse interno | **Retirement** | ECO-05 certificado |
| `decide` autoridade UDE | **Retirement** | ECO-04 certificado |
| Agregação dashboard legacy | **Retirement** | ECO-07 certificado |
| Flags shadow domínio | **Replacement** | Template `.env` enterprise |

---

## Módulos fora de escopo (observação)

| Módulo | Motivo |
|--------|--------|
| workflowOrchestrator | Domínio workflow ≠ EG v1 |
| ANAM | Token externo; opcional |
| Event Governance core | Infraestrutura congelada |
| 11 adapters baseline | Manter; domínios promovidos em ECO-03/08 |

---

## Resumo rollback global

| Fase | Flag master | Restaura |
|------|-------------|----------|
| ECO-03 | `ECO_BYPASSES_VIA_EG=false` | Todos bypasses P0/P1 |
| ECO-04 | `ECO_CONTROLLER_EG_FIRST=false` | Controller paralelo |
| ECO-05 | `ECO_PULSE_EG_CONSUME=false` | Pulse GOVERNANCE interno |
| ECO-06 | `ECO_CONVERSATION_KB_ENRICH=false` | Prompts sem KB |
| ECO-07 | `ECO_EXECUTIVE_INSIGHTS_ONLY=false` | Dashboards legacy |
| ECO-08 | Tag git pré-ECO-08 | Estado completo pré-retirement |

---

## Referências

- [`ECO_02_ADR_INDEX.md`](./ECO_02_ADR_INDEX.md)
- [`ECO_02_DEPENDENCY_MATRIX.md`](./ECO_02_DEPENDENCY_MATRIX.md)
- [`ECO_02_EXECUTION_SEQUENCE.md`](./ECO_02_EXECUTION_SEQUENCE.md)
