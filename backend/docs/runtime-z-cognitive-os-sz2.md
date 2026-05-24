# SZ2 — Runtime Z Cognitive Operating System

`Tipo: additive-only · shadow-first · assistive-only · rollback-safe · bounded-context-safe`

## Objectivo

Evoluir o Runtime Z (já soberano administrativo em SZ1) para soberano
**cognitivo operacional**: memória persistente, continuidade de intenção,
raciocínio industrial stateful, inferência contextual, fusão multi-domain
e camada de acções **preparadas** (nunca executadas).

## O que esta fase NÃO implementa

- IA autónoma
- Auto-enforcement / auto-decision / auto-intervenção / auto-promotion
- Execução directa (PLC, automação industrial, publicação automática)

## O que esta fase implementa

- Memória operacional contextual persistente (`memory/`)
- Continuidade conversacional, de workflow e operacional (`continuity/`)
- Raciocínio industrial heurístico stateful (`reasoning/`)
- Inferência contextual (turno, urgência, risco, cross-domain) (`context/`)
- PreparedActions (comunicado, lista de confirmação, escalonamento, tarefa,
  assistência de workflow) — sempre **assistive_only** (`actions/`)
- Cognição (estado, intenção, atenção, awareness, fusão, narrativa)
  (`cognition/`)
- Orquestração canónica (`orchestration/zCognitiveOrchestrator`)
- Observabilidade (`observability/`) + Governance (`governance/`) + Shadow
  diff (`shadow/`) + Resiliência (`resilience/`)

## Estrutura

```
backend/src/runtime-z-cognitive-os/
├── config/                      # flags + governance + shadow sampling
├── memory/                      # OMR + conversation/workflow/incident/task/entity + index + retention
├── continuity/                  # intent + conversation + workflow + operational + implicit
├── reasoning/                   # criticality + priority + impact + escalation + stateful + industrial + decision
├── context/                     # temporal + shift + urgency + risk + operational + workflow + cross-domain + inference
├── actions/                     # PreparedAction kernel + communication + confirmation + task + escalation + workflow + simulation + assistive-exec
├── cognition/                   # state + intent + attention + awareness + fusion + narrative
├── orchestration/               # orchestrator + memory fusion + context assembly + reasoning fusion + operational pipeline
├── observability/               # runtime + accuracy + continuity + reasoning + awareness metrics
├── governance/                  # human authority + autonomy protection + assistive-only + cognitive governance
├── shadow/                      # operational diff + reasoning comparison + context accuracy
├── resilience/                  # cognitive fallback + context recovery + memory integrity
└── facade/zCognitiveOperatingSystemFacade.js
```

## Stages (sempre manuais, nunca auto-promote)

| Stage                        | Significado                                                                  |
| ---------------------------- | ---------------------------------------------------------------------------- |
| `LEGACY_COGNITIVE`           | SZ2 não corre; comportamento actual mantido                                  |
| `Z_COGNITIVE_SHADOW` (def.)  | SZ2 corre em paralelo, observa e emite métricas; não influencia respostas    |
| `Z_CONTEXT_ASSISTIVE`        | Frontend pode usar narrativa + continuidade para enriquecer UI               |
| `Z_OPERATIONAL_ASSISTIVE`    | PreparedActions ficam visíveis para revisão humana                           |
| `Z_STATEFUL_REASONING`       | Trace stateful longo entre interacções                                       |
| `Z_COGNITIVE_SOVEREIGN`      | Z é fonte primária do contexto cognitivo (Motor A e V2 mantidos como base)   |

## API — `/api/runtime-z-cognitive-os/*`

Todos os endpoints exigem `requireAuth` e são tenant-aware.

| Método | Endpoint              | Descrição                                                  |
| ------ | --------------------- | ---------------------------------------------------------- |
| GET    | `/`                   | Stage do tenant + invariantes                              |
| GET    | `/memory`             | Snapshot da memória operacional                            |
| GET    | `/continuity`         | Continuidade conversacional/workflow/operacional           |
| GET    | `/reasoning`          | Raciocínio industrial (criticidade, prioridade, impacto)   |
| GET    | `/context`            | Inferência contextual (temporal, turno, urgência, risco)   |
| GET    | `/actions`            | PreparedActions assistive (auto-execução bloqueada)        |
| GET    | `/cognition`          | Intent + atenção + awareness + fusão + narrativa           |
| GET    | `/observability`      | Métricas e eventos cognitivos                              |
| GET    | `/shadow-diff`        | Comparação shadow Z vs hints legacy                        |
| GET    | `/validation`         | Stage + governance + métricas                              |
| POST   | `/apply`              | Executa a façade com payload custom                        |
| POST   | `/ingest/conversation`| Regista turn conversacional                                |
| POST   | `/ingest/incident`    | Regista incidente                                          |
| POST   | `/ingest/task`        | Regista tarefa                                             |
| POST   | `/ingest/workflow`    | Regista workflow                                           |
| POST   | `/ingest/entity`      | Regista entidade (activo, evento, NR…)                     |

## Integração `/dashboard/me`

Additive: após SZ1, o `dashboard.js` invoca a façade SZ2 e anexa
`legacyResponse.runtime_z_cognitive_os` ao payload. Nada existente é
removido ou substituído.

## Frontend opt-in

```js
import {
  ZOperationalContextPanel,
  ZContinuityInsightsPanel,
  ZOperationalReasoningPanel,
  ZWorkflowInferencePanel,
  ZOperationalMemoryPanel,
  ZAssistiveActionsPanel,
  ZIndustrialAwarenessPanel,
  ZOperationalNarrativePanel,
  useCognitiveOsData
} from '../runtime-z-cognitive-os';

// payload = dashboardResponse.runtime_z_cognitive_os
<ZOperationalContextPanel payload={payload} />
```

Os painéis usam **DS Industrial 4.0** (tokens cyan / mono / radius ≤ 4px,
sem branco/material). Não há `JSON.stringify`, dumps debug, placeholders.

## Invariantes

```json
{
  "assistive_only": true,
  "auto_execution": false,
  "auto_enforcement": false,
  "auto_promotion": false,
  "plc_control": false,
  "human_authority_preserved": true,
  "rollback_safe": true,
  "shadow_first": true,
  "bounded_contexts_preserved": true,
  "motor_a_never_deleted": true,
  "engine_v2_never_deleted": true,
  "tenant_isolation_required": true,
  "no_monolithization": true
}
```

## Variáveis de ambiente

```
IMPETUS_SZ2_COGNITIVE_OS=on
IMPETUS_SZ2_MEMORY=on
IMPETUS_SZ2_CONTINUITY=on
IMPETUS_SZ2_REASONING=on
IMPETUS_SZ2_CONTEXT=on
IMPETUS_SZ2_ACTIONS=on
IMPETUS_SZ2_COGNITION=on
IMPETUS_SZ2_ORCHESTRATION=on
IMPETUS_SZ2_OBSERVABILITY=on
IMPETUS_SZ2_GOVERNANCE=on
IMPETUS_SZ2_SHADOW_DIFF=on
IMPETUS_SZ2_RESILIENCE=on
IMPETUS_SZ2_API=on
IMPETUS_SZ2_PERSISTENCE=off
IMPETUS_SZ2_DEFAULT_STAGE=Z_COGNITIVE_SHADOW
IMPETUS_SZ2_PROMOTED_TENANTS=
IMPETUS_SZ2_PROMOTED_TENANT_STAGE=Z_CONTEXT_ASSISTIVE
IMPETUS_SZ2_SHADOW_SAMPLE_RATE=1
IMPETUS_SZ2_MEMORY_RETENTION_MIN=1440
IMPETUS_SZ2_MEMORY_MAX_ENTRIES=500
```

## Testes (73/73 PASS)

```
npm run test:runtime-z-cognitive-os
npm run test:z-operational-memory
npm run test:z-intent-continuity
npm run test:z-industrial-reasoning
npm run test:z-contextual-inference
npm run test:z-workflow-persistence
npm run test:z-operational-actions
npm run test:z-stateful-reasoning
npm run test:z-cognitive-shadow
npm run test:z-contextual-naturalness
npm run test:z-operational-assistive
npm run test:z-cross-domain-cognition
npm run test:z-memory-integrity
npm run test:z-cognitive-governance
npm run test:z-human-authority-protection
```

Todos os scripts apontam para `tests/runtime-z-cognitive-os/runCognitiveOsTests.js`.

## Exemplo: continuidade de intenção (problema descrito)

1. Cliente regista um turn conversacional:
   ```
   POST /api/runtime-z-cognitive-os/ingest/conversation
   { "message": "Haverá treinamento NR12 dia 20.", "intent": "plan_training" }
   ```
2. Cliente envia mensagem curta imperativa:
   ```
   GET /api/runtime-z-cognitive-os/continuity?message=Envie%20o%20comunicado%20e%20gere%20lista%20de%20confirmacao
   ```
3. Resposta inclui:
   ```jsonc
   {
     "inherited_context": {
       "from_turn_id": "...",
       "summary": "Haverá treinamento NR12 dia 20.",
       "anchors": ["comunicado", "confirmacao", "treinamento"]
     },
     "continuation_score": 0.8
   }
   ```
4. `/actions` devolve `communication_prepared` e
   `confirmation_tracking_prepared` — **assistive_only**, com
   `required_approvals` e `auto_execution: false`.

Nada é enviado / publicado / escalado sem aprovação humana explícita.

## Rollback

- Desligar `IMPETUS_SZ2_COGNITIVE_OS=off` → facade devolve `{ skipped: true }`
- Remover apenas o bloco `try { sz2.applyCognitiveOperatingSystem… }` em
  `routes/dashboard.js` reverte totalmente o efeito sobre `/dashboard/me`.
- Motor A, Engine V2 e SZ1 não são tocados.
