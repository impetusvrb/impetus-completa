# Future Industrial Architecture Boundaries — Impetus

> Documento de **arquitetura-alvo** dos módulos industriais (Qualidade, SST, Ambiental, Logística) **após** a evolução estrutural prevista em `enterprise-evolution-master-plan.md` e `enterprise-runtime-evolution-roadmap.md`.
>
> **Não é prescrição de implementação imediata** — é o desenho a respeitar **quando** cada domínio for construído, garantindo bounded contexts, contratos limpos, isolamento de pipelines, isolamento de queries e isolamento cognitivo.

---

## 1. Mapa de domínios e suas fronteiras

```
┌──────────────────────────────────────────────────────────────────────────────┐
│                            SHARED KERNEL (plataforma)                       │
│   tenant • correlation • time • units • identity • policy • events-core     │
└──────────────────────────────────────────────────────────────────────────────┘
        ▲             ▲                ▲                ▲                ▲
        │             │                │                │                │
   ┌────┴────┐   ┌────┴─────┐    ┌─────┴────┐    ┌──────┴────┐    ┌──────┴────┐
   │ QUALITY │   │  SAFETY  │    │   ENV    │    │ LOGISTICS │    │ COGNITIVE │
   │ domain  │   │  domain  │    │  domain  │    │  domain   │    │  layer    │
   └────┬────┘   └────┬─────┘    └─────┬────┘    └──────┬────┘    └──────┬────┘
        │ events       │ events         │ events          │ events         │
        ▼              ▼                ▼                 ▼                ▼
                INDUSTRIAL EVENT BACKBONE (catálogo + outbox + DLQ + replay)
                                       │
                                       ▼
                  OBSERVABILITY (tracing + métricas + SLOs)
```

**Regra de ouro:**
- Domínios comunicam **apenas** via *domain events* (assíncrono) ou *read projections* via ACL (síncrono).
- Domínios **não** importam *services* uns dos outros diretamente.
- Domínios **não** fazem *joins* SQL atravessando schemas/tabelas de outros domínios.
- A camada **Cognitiva** (IA, orchestrator, governance) lê *facts/projections* de cada domínio mas **não** muta diretamente — emite recomendações que viram eventos quando aceites.

---

## 2. Topologia recomendada (após Wave 5)

```
backend/
├── src/
│   ├── shared/                       ← shared kernel
│   │   ├── tenant/                   ← isolation guards, company_id helpers
│   │   ├── correlation/              ← correlation/causation/trace utilities
│   │   ├── time/                     ← ISO timestamps, intervals, calendars
│   │   ├── units/                    ← SI units, conversions, formatting
│   │   ├── identity/                 ← user, role, capability primitives
│   │   ├── policy/                   ← policy engine primitives
│   │   ├── events-core/              ← envelope, catalog reader, outbox client
│   │   └── observability/            ← tracing decorators, metrics helpers
│   │
│   ├── eventPipeline/                ← backbone (existente, ampliado)
│   │   ├── envelope.js
│   │   ├── catalog/
│   │   │   ├── industrial.js         ← catálogo declarativo de eventos
│   │   │   └── versions/
│   │   ├── eventBus/                 ← adapters (in_memory, redis_streams, …)
│   │   ├── outbox/                   ← industrial outbox (multi-domain)
│   │   ├── dlq/                      ← dead-letter queue
│   │   ├── replay/                   ← replay workers
│   │   └── throttling/               ← per-tenant + per-domain
│   │
│   ├── domains/
│   │   ├── quality/
│   │   │   ├── api/                  ← rotas HTTP (REST/JSON)
│   │   │   ├── domain/               ← entidades, value objects, regras puras
│   │   │   │   ├── ncr.js            ← Non-Conformance Report
│   │   │   │   ├── capa.js           ← Corrective and Preventive Action
│   │   │   │   ├── spc.js            ← Statistical Process Control
│   │   │   │   ├── fmea.js
│   │   │   │   ├── inspection.js
│   │   │   │   └── document.js
│   │   │   ├── workflows/            ← state machines bounded
│   │   │   │   ├── ncr.workflow.js
│   │   │   │   └── capa.workflow.js
│   │   │   ├── events/               ← contratos (publish + subscribe)
│   │   │   │   ├── publish/
│   │   │   │   │   ├── ncr.opened.v1.json
│   │   │   │   │   ├── ncr.closed.v1.json
│   │   │   │   │   ├── capa.created.v1.json
│   │   │   │   │   └── spc.sample_recorded.v1.json
│   │   │   │   └── subscribe/
│   │   │   │       └── logistics.lot.received.v1.json   (ACL inbound)
│   │   │   ├── acl/                  ← anti-corruption layers
│   │   │   │   └── logistics_adapter.js
│   │   │   ├── projections/          ← read models (dashboards, IA)
│   │   │   │   ├── quality_kpis.projection.js
│   │   │   │   └── pareto.projection.js
│   │   │   ├── migrations/           ← schemas do domínio
│   │   │   └── README.md
│   │   │
│   │   ├── safety/                   ← SST/EHS (mesma estrutura)
│   │   ├── environment/              ← ambiental (mesma estrutura)
│   │   └── logistics/                ← WMS/TMS (mesma estrutura)
│   │
│   ├── cognitive/                    ← camada IA (existente, governada)
│   │   ├── orchestrator.js
│   │   ├── authorityRouter.js
│   │   ├── pressureService.js
│   │   ├── contextBudgetService.js   ← (Wave 4)
│   │   ├── summarizationEngine.js    ← (Wave 4)
│   │   └── domainAdapters/           ← lê projections de cada domínio
│   │       ├── quality.js
│   │       ├── safety.js
│   │       ├── environment.js
│   │       └── logistics.js
│   │
│   ├── governance/                   ← runtime governance (existente)
│   │   ├── featureGovernanceService.js
│   │   ├── boundedGovernanceEngine.js
│   │   ├── tenantIsolationGuard.js
│   │   ├── internalRouteGuard.js
│   │   └── workflowAbac/             ← (Wave 7)
│   │
│   └── server.js                     ← bootstrap (existente)
```

E (espelho) no frontend:

```
frontend/src/
├── shared/
├── domains/
│   ├── quality/
│   │   ├── routes/                   ← code-split por domínio
│   │   ├── components/
│   │   ├── workflows/                ← UI dos workflows (NCR, CAPA, …)
│   │   ├── operational/              ← UX operacional (coleta, inspeção)
│   │   └── management/               ← UX gestão (dashboards, drill-down)
│   ├── safety/ …
│   ├── environment/ …
│   └── logistics/ …
└── App.jsx                           ← lê module registry e monta lazy
```

---

## 3. Shared kernel — o que pertence e o que não pertence

### 3.1 Pertence
- **Identidade do tenant** (company_id, plant_id quando aplicável).
- **Correlation/causation/trace ids**.
- **Datas e janelas** (ISO 8601 estritos, *time windows*).
- **Unidades de medida** (SI; conversões; formatadores; *units of measure* policy).
- **Identidade do usuário** (id, role, capabilities — primitivas).
- **Policy primitives** (decisão `allow/deny/abstain`).
- **Envelope de evento + catálogo + outbox client**.
- **Decorators de observabilidade** (tracing, métricas, structured logs).
- **Erros padronizados** (`ImpetusError`, códigos canónicos).

### 3.2 NÃO pertence (e por quê)
- Lógica de negócio de qualquer domínio (NCR, CAPA, PT, MTR, OTIF) — mora no domínio.
- Conhecimento de schemas internos de outros domínios.
- Acesso direto ao DB de qualquer domínio — cada domínio expõe o seu próprio repositório.
- *Pricing*, *billing*, *commercial* — outro contexto.

### 3.3 Versionamento

O shared kernel é versionado **separadamente** (`@impetus/shared@x.y.z`). *Breaking changes* exigem janela de coexistência mínima de 1 release.

---

## 4. Domain events — contrato canónico

### 4.1 Naming
`<domain>.<entity>.<verb>.v<version>`

Exemplos:
- `quality.ncr.opened.v1`
- `quality.ncr.closed.v1`
- `quality.capa.action_completed.v1`
- `quality.spc.sample_recorded.v1`
- `safety.permit.issued.v1`
- `safety.permit.cancelled.v1`
- `safety.incident.reported.v1`
- `safety.loto.applied.v1`
- `env.emission.snapshot.v1`
- `env.waste.shipment_dispatched.v1`
- `env.water.balance_calculated.v1`
- `logistics.wave.started.v1`
- `logistics.dock.assigned.v1`
- `logistics.shipment.dispatched.v1`

### 4.2 Estrutura mínima

```json
{
  "id": "uuid",
  "type": "quality.ncr.opened.v1",
  "schema_version": "v1",
  "source": "system | dashboard | edge | external",
  "company_id": "uuid",
  "plant_id": "uuid?",
  "user": "uuid | null",
  "correlation_id": "uuid",
  "causation_id": "uuid?",
  "trace_id": "uuid",
  "workflow_id": "uuid?",
  "priority": "high | medium | low",
  "timestamp": "ISO8601",
  "payload": { "...": "..." }
}
```

### 4.3 Regras invioláveis
- `company_id` **obrigatório** em todo evento industrial.
- `correlation_id` **obrigatório**; vem do `correlationIdMiddleware` quando disponível.
- *Schema versionado*; *backward compatibility* preservada por pelo menos 1 release.
- Eventos são **fatos** (passado). Nada de `should_do` ou `please_do`.
- *Payload* não contém PII bruta — pseudonimizar quando aplicável.

### 4.4 Catálogo declarativo

`backend/src/eventPipeline/catalog/industrial.js` (futuro) exporta uma estrutura como:

```js
module.exports = {
  'quality.ncr.opened.v1': {
    domain: 'quality',
    entity: 'ncr',
    verb: 'opened',
    schema_version: 'v1',
    description: 'Não-conformidade aberta',
    payload_schema: 'zod schema',
    retention: 'workflow',
    pii: false,
    immutable_audit: true
  },
  // ...
};
```

Eventos fora do catálogo são **rejeitados** quando `IMPETUS_EVENT_CATALOG_STRICT=true`.

---

## 5. Anti-corruption layers (ACL)

Quando o domínio A precisa de dado do domínio B, ele declara um **adapter** que:
1. Subscreve a um *event* específico de B.
2. Traduz para o vocabulário interno de A.
3. Persiste no *read model* de A.
4. Nunca devolve referências ao schema de B.

**Exemplo**: `domains/quality/acl/logistics_adapter.js`

```js
// pseudocódigo — referência arquitetural, não implementação
function onLogisticsLotReceived(event) {
  return {
    quality_internal_lot_id: event.payload.lot_id,
    supplier_id: event.payload.supplier_id,
    received_at: event.timestamp,
    company_id: event.company_id
  };
}
```

Se logística mudar o seu schema, *apenas* o ACL muda; o domínio Qualidade fica intocado.

---

## 6. Isolamento de pipelines

| Pipeline | Quem publica | Quem consome | Isolamento |
|---|---|---|---|
| `quality.*` | Qualidade | Qualidade + IA + Observability | Filtrado por *namespace* no bus + per-tenant |
| `safety.*` | SST | SST + IA + Observability | idem |
| `env.*` | Ambiental | Ambiental + IA + Observability | idem |
| `logistics.*` | Logística | Logística + IA + Qualidade (ACL) | idem |

**Garantias:**
- *Throttling* aplicado por `(company_id, domain)`.
- *Circuit breakers* per-tenant (já existe opt-in) extendido para per-domain.
- *DLQ* segregado por domínio (uma DLQ por domínio facilita SLOs e runbooks).
- *Replay* sempre escopado por *correlation_id* + janela máxima.

---

## 7. Isolamento de queries

| Regra | Significado |
|---|---|
| Sem `JOIN` cross-domain em queries de runtime | Cada domínio consulta apenas as suas tabelas. |
| *Read models* explícitos para cross-domain | Quando dashboard precisa de "NCRs por fornecedor", existe `quality_ncr_by_supplier_projection` populada por evento. |
| *Materialized views* para BI | Únicas exceções, geridas separadamente, *refresh* programado. |
| Sem `RAW SQL` cruzando schemas | Linter / code review bloqueia. |

Toda query passa por `tenantIsolationGuard` (`WHERE company_id = $1`) — já é norma reforçada no hardening.

---

## 8. Isolamento cognitivo

A camada cognitiva (IA) tem **domain adapters** dedicados:

```
cognitive/domainAdapters/
├── quality.js       ← lê quality projections; nunca lê tabelas safety
├── safety.js
├── environment.js
└── logistics.js
```

Cada adapter responde a:
```
get_facts(intent, tenant, persona) → bounded set of facts (≤ budget)
get_summary(scope, window) → narrative summary
get_recommendations_context(workflow_id) → workflow-specific context
```

A camada IA recebe **apenas** os domínios relevantes ao *intent* detectado pelo `contextInterpretationLayer`. Cross-domain só por composição explícita (ex.: "qual fornecedor causa mais NCRs e atrasos OTIF" → composição quality+logistics; ainda assim, *facts* já normalizados, não dump cru).

---

## 9. Workflow patterns — *Sagas* limitadas

Workflows industriais (NCR, CAPA, PT, LOTO, OTIF) são modelados como **state machines explícitas**, não como cadeias implícitas de chamadas.

| Workflow | Estados típicos | Eventos emitidos |
|---|---|---|
| **NCR** | `opened → analyzed → action_planned → in_action → verified → closed` | `quality.ncr.<state_transition>.v1` |
| **CAPA** | `proposed → approved → executing → verified → closed → reopened?` | `quality.capa.<state_transition>.v1` |
| **PT (Permit-to-Work)** | `requested → approved → issued → active → suspended? → closed` | `safety.permit.<state_transition>.v1` |
| **LOTO** | `applied → verified → released` | `safety.loto.<state_transition>.v1` |
| **OTIF** | `planned → loaded → dispatched → in_transit → delivered → confirmed` | `logistics.shipment.<state_transition>.v1` |

**Regras:**
- Transições são **idempotentes**.
- Cada transição é um *atomic claim* via `UPDATE ... WHERE state=... RETURNING`.
- Toda transição **emite evento** (mesmo que falhe — `failed_transition.v1`).
- *Compensating events* para reverter (raros, exigem aprovação).

---

## 10. Camada operacional vs camada de gestão (dual-layer)

Cada domínio expõe **duas camadas** que partilham o mesmo domínio mas têm UX e contratos distintos:

| Camada | Cliente | Endpoints típicos | Estilo |
|---|---|---|---|
| **Operacional** | Operadores, inspetores, técnicos | `POST /quality/inspection`, `POST /safety/permit`, `POST /logistics/picking/scan` | *Form-first*, idempotente, offline-friendly |
| **Gestão** | Coordenadores, gerentes, diretores | `GET /quality/dashboards/kpis`, `GET /safety/dashboards/accidents-trend` | *Read-only*, agregado, exportável |

Backend partilha o mesmo modelo de domínio. Frontend pode até estar em *bundles* separados (`quality-operational.bundle.js` vs `quality-management.bundle.js`).

---

## 11. Monorepo, modular monolith ou microsserviços?

| Fase | Recomendação | Por quê |
|---|---|---|
| Hoje → 12 meses | **Modular monolith em monorepo** | Velocidade, baixo custo operacional, observabilidade simples, deploy único. |
| 6 → 18 meses | Adopção de **workspaces internos** (`@impetus/shared`, `@impetus/event-pipeline`, `@impetus/domain-quality`, …) | Versionamento, fronteiras explícitas em build, sem fragmentar deploy. |
| 18+ meses (condicional) | **Microsserviços** **apenas** para domínios com SLA divergente ou equipa dedicada (ex.: telemetria pesada) | Custo operacional só justifica quando escala assimétrica + equipe dedicada. |

**Critérios para considerar microsserviço:**
1. *Throughput* assimétrico (>10× o resto do sistema).
2. Equipa dedicada com *on-call* independente.
3. Latência diferenciada (real-time hard).
4. Compliance que exige isolamento físico.

Sem **dois** desses critérios, monolito modular é superior.

---

## 12. Frontend boundaries (espelho)

```
frontend/src/domains/<dom>/
├── routes/
│   ├── operational.routes.js        ← rotas operacionais (lazy)
│   └── management.routes.js         ← rotas de gestão (lazy)
├── api/                              ← *client* tipado contra domínio backend
├── components/
├── workflows/                        ← UI workflows
├── projections/                      ← *read state* (Zustand/Redux por domínio)
└── index.js                          ← registry export (lazy)
```

**Regras:**
- Cada domínio frontend importa apenas `frontend/src/shared/*` e o seu próprio `api/`.
- *Store* (estado) é **por domínio**; não há *root store* monolítico após Wave 6.
- *Lint rule*: `no-cross-domain-import-frontend`.
- *Realtime channel* único, *rooms* por domínio + tenant.

---

## 13. Observability boundaries

| Sinal | Granularidade obrigatória | Granularidade banida |
|---|---|---|
| Traces | `domain`, `workflow_id`, `tenant_top_N` | `entity_id` em label de métrica (apenas em trace) |
| Métricas | `domain`, `workflow`, `state_from→state_to`, `tenant_top_N` | `user_id` em label |
| Logs | `correlation_id`, `domain`, `workflow_id`, `tenant_id` | binários, PII bruta |
| Eventos audit | `domain`, `entity_id`, `actor_id`, `prev_state`, `next_state` | (auditoria pode ter mais; é cofre) |

---

## 14. Segurança e governance boundaries

| Capability | Quem concede | Quem aplica |
|---|---|---|
| `quality.ncr.open` | RBAC + workflow ABAC | `domains/quality/workflows/ncr.workflow.js` |
| `quality.capa.close` | RBAC + workflow ABAC (signoff_required) | idem |
| `safety.permit.sign` | ABAC com `seniority_level >= N` | `domains/safety/workflows/permit.workflow.js` |
| `env.mtr.dispatch` | ABAC com `role: env_responsible` | `domains/environment/workflows/mtr.workflow.js` |
| `logistics.dispatch.confirm` | ABAC com `role: shipping_supervisor` | `domains/logistics/workflows/dispatch.workflow.js` |

Tudo aplicado **no backend**; *frontend* apenas oculta UI (já política reforçada no hardening).

---

## 15. Sinalização de prontidão por domínio (ordem de construção)

| Domínio | Pré-requisitos arquiteturais | Sinal verde quando |
|---|---|---|
| **Qualidade** | Wave 1 + 2 + 4 + 5 | Catálogo, outbox, tracing, context budget, topologia OK |
| **Logística** | Wave 1 + 2 + 4 + 5 + parte da Wave 6 (offline para picking) | Acima + realtime channel único + IndexedDB drivers |
| **Ambiental** | Wave 1–7 + storage temporal (Wave 3) | Acima + Timescale provado + LGPD industrial |
| **SST** | Tudo da Wave 1–7 + LGPD industrial maduro (W7) | Acima + cifragem wearables + DSAR + workflow ABAC |

---

## 16. Conclusão arquitetural

A arquitetura-alvo do Impetus industrial é um **modular monolith governado por eventos**, com:
- Shared kernel pequeno e estável.
- Domínios isolados por *bounded context*, ACLs explícitos e *domain events* versionados.
- Backbone de eventos único (lógico) com transport substituível por fase.
- Camada cognitiva com adapters por domínio, *context budget* e summarizer.
- Frontend espelhando os domínios, lazy por *route*, dual-layer (operacional × gestão).
- Observabilidade ortogonal, com SLOs por workflow.
- Segurança em camadas: RBAC + ABAC por workflow + auditoria imutável industrial.

> Cumprindo estes limites, o Impetus pode receber Qualidade, SST, Ambiental e Logística **sem reescrever** o que existe — apenas estendendo. É a única forma de evoluir mantendo `ZERO breaking changes`, `ZERO acoplamento indevido` e `ZERO regressões cognitivas`.

---

## Apêndice A — Anti-padrões proibidos

| Anti-padrão | Por quê é proibido | Substituto correto |
|---|---|---|
| Import direto `require('../../safety/services/X')` no domínio Qualidade | Acopla, viola bounded context | Domain event + ACL |
| `JOIN quality.ncr q ON logistics.shipment l ON q.lot_id = l.lot_id` | Acopla schemas; quebra evolução independente | Read projection populada por evento |
| Salvar foto/PDF como `bytea` em Postgres | IO + backup + retenção | Object storage + URI/hash |
| IA recebendo `SELECT *` de telemetria | Saturação, hallucination | Summarizer + facts compactos |
| Worker industrial sem `correlation_id` | Quebra trace | Propagar middleware |
| Workflow sem state machine explícita | Estado implícito → bugs | `domains/<d>/workflows/<wf>.workflow.js` |
| Capability checada só no frontend | Bypass trivial | Backend é autoridade |
| Métrica com label `entity_id` | Cardinalidade explode | Top-N tenants/domain only |
| Migration sem rollback | Não-reversível | `_rollback/<n>_<name>.sql` obrigatório |
| Flag de runtime sem default seguro | Surpresas em produção | `featureGovernanceService` valida |

---

## Apêndice B — Checklist arquitetural para qualquer novo domínio (post-Wave 5)

- [ ] `domains/<dom>/README.md` descreve responsabilidade, escopo, *out-of-scope*.
- [ ] `domains/<dom>/events/publish/*.contract.json` com schema versionado.
- [ ] `domains/<dom>/events/subscribe/*.contract.json` listando ACLs necessárias.
- [ ] `domains/<dom>/acl/*.js` para cada subscrição cross-domain.
- [ ] `domains/<dom>/workflows/*.workflow.js` para cada state machine.
- [ ] `domains/<dom>/projections/*.js` populadas por handlers idempotentes.
- [ ] Migrations em `domains/<dom>/migrations/` + rollbacks.
- [ ] Capabilities `quality.* | safety.* | env.* | logistics.*` declaradas no workflow ABAC.
- [ ] Auditoria imutável aplicada às tabelas de evento do workflow.
- [ ] Tracing por `workflow_id`.
- [ ] `cognitive/domainAdapters/<dom>.js` exporta `get_facts`, `get_summary`, `get_recommendations_context`.
- [ ] Frontend lazy-route em `frontend/src/domains/<dom>/routes/`.
- [ ] Testes: workflow happy-path, workflow conflict (race), tenant isolation, event idempotency, replay safety.

Se algum item falhar, o domínio **não** entra em produção. Período.
