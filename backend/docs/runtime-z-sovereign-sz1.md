# SZ1 — Enterprise Sovereignty Consolidation

**IMPETUS · Runtime Z Sovereign Layer**
**Tipo:** Aditivo · Shadow-first · Rollback-safe · Reversível

---

## Princípio

> Não apagar motores. **Internalizar capacidades.**

O Runtime Z deixa de ser apenas o cérebro cognitivo: passa a coordenar **bootstrap, KPI, módulos, secções, identidade, composição, contexto, hidratação, fallback e resiliência** como **sub-runtimes internos** que **delegam** (não duplicam) para os serviços existentes do Motor A e da Engine V2.

Motor A e V2 **continuam vivos**. O acordo arquitectural muda: eles passam a ser invocados **através** do Runtime Z, não em paralelo.

---

## Arquitectura

```
backend/src/runtime-z-sovereign/
├── config/phaseSZ1FeatureFlags.js
├── bootstrap/
│   ├── zBootstrapRuntime.js              ← orquestrador equivalente ao legacyResponse
│   ├── zBootstrapPayloadBuilder.js
│   ├── zBootstrapValidationEngine.js
│   └── zBootstrapCompatibilityRuntime.js
├── kpi/
│   ├── zKpiRuntime.js                    ← internaliza dashboardKPIs
│   ├── zKpiAggregator.js
│   ├── zKpiNormalizationRuntime.js
│   └── zKpiFallbackRuntime.js
├── modules/zModuleAuthorityRuntime.js    ← wraps dashboardAccessService + governance
├── sections/zSectionRuntime.js           ← wraps dashboardVisibility
├── identity/zIdentityRuntime.js          ← internaliza V2 identityResolver
├── composition/zCompositionRuntime.js    ← internaliza V2 compositionEngine
├── context/
│   ├── zContextAssemblyRuntime.js
│   └── zContextPersonalizationRuntime.js
├── hydration/zHydrationRuntime.js
├── fallback/zFallbackRuntime.js          ← degradação NATIVA (não usa Motor A)
├── resilience/zResilienceRuntime.js      ← anti blank-screen
├── shadow/zShadowDiffRuntime.js          ← compara legacyResponse vs payload Z
├── promotion/zPromotionRuntime.js        ← stages tenant-based, sem auto
├── governance/zSovereigntyGovernanceRuntime.js
├── observability/zSovereignObservability.js
└── facade/zSovereignFacade.js            ← applySovereignZRuntime()
```

```
frontend/src/runtime-z-sovereign/
├── zDashboardContextRuntime.js   (opt-in; não substitui dashboardContextAdapter)
├── zLayoutRuntime.js
├── zWidgetHydrationRuntime.js
├── zOperationalContinuityRuntime.js
├── zCompatibilityRuntime.js      (encapsula Motor A + V2 no payload)
└── index.js
```

---

## Stages de promoção (`zPromotionRuntime`)

| Stage | Comportamento | Motor A | Engine V2 |
|-------|----------------|---------|-----------|
| `LEGACY_PRIMARY`              | Motor A sustenta tudo, Z não corre | primário | shadow C6 |
| `Z_SHADOW`                    | Z corre em paralelo, payload Z **não** entregue | primário | shadow C6 |
| `Z_ASSISTIVE`                 | Z enriquece (estado actual C0–C6) | primário | shadow |
| `Z_PRIMARY_WITH_A_FALLBACK`   | Z entrega payload, Motor A em standby síncrono | fallback | shadow |
| `Z_SOVEREIGN`                 | Z entrega payload sem invocar Motor A para bootstrap | compatibility | shadow |
| `LEGACY_COMPATIBILITY_ONLY`   | Motor A só corre para rollback/compatibility explícita | compatibility | shadow |

**Default produção:** `Z_SHADOW`. Promoção **sempre tenant-based**, **nunca automática**.

```env
IMPETUS_SZ1_DEFAULT_STAGE=Z_SHADOW
IMPETUS_SZ1_PROMOTED_TENANTS=          # CSV vazio = nenhum tenant promovido
IMPETUS_SZ1_PROMOTED_TENANT_STAGE=Z_ASSISTIVE
```

---

## Integração `/dashboard/me`

O bloco SZ1 corre **depois** de C6 (cognitive authority unification) e adiciona ao payload:

```json
{
  "runtime_z_sovereign": {
    "phase": "SZ1",
    "stage": "Z_SHADOW",
    "primary_runtime": "motor_a",
    "fallback_runtime": "runtime_z",
    "shadow_first": true,
    "bootstrap": { "delegated_to": [...], "sub_runtimes": {...}, "latency_ms": 238, "validation": {...}, "compatibility": {...} },
    "shadow_diff": { "divergence_score": 0.04, "compatibility_score": 0.96, "sovereignty_score": 0.85, "safe_to_promote": true },
    "hydration_plan_summary": { "total_widgets": 8, "tiers_used": {...}, "hydration_ms": 5 },
    "resilience": { "continuity_score": 1, "blank_screen_prevented": false, "checks": {...} },
    "governance": { "promotion_allowed": false, "compatibility_layer_active": true, "sovereignty_state": {...} },
    "metrics": { "z_sovereignty_score": 0.85, ... },
    "assembly_ms": 240,
    "invariants": { "motor_a_never_deleted": true, "engine_v2_never_deleted": true, "no_auto_promotion": true, ... },
    "auto_remediation": false,
    "auto_promotion": false,
    "motor_a_removed": false,
    "engine_v2_removed": false
  }
}
```

Em `Z_SHADOW` (default) o `legacyResponse` continua **byte-a-byte intacto** — Z só observa e mede.

---

## API soberana

`/api/runtime-z-sovereign/*` (autenticação obrigatória):

| Endpoint | Função |
|----------|--------|
| `GET  /bootstrap`       | Payload completo soberano (equivalente a `legacyResponse`) |
| `GET  /context`         | Assembly contextual (identity + composition + personalization) |
| `GET  /compose`         | Composição contextual (V2 internalizado) |
| `GET  /hydrate`         | Plano de hidratação |
| `GET  /fallback`        | Layout de degradação nativa Z |
| `GET  /shadow-diff`     | Diff Motor A vs Runtime Z |
| `GET  /validation`      | Validação do payload soberano |
| `GET  /promotion`       | Stage actual + lista de stages |
| `GET  /metrics`         | Snapshot de métricas |
| `POST /apply`           | Executa orquestração soberana com payload legacy injectado |

---

## Observabilidade (`[SOVEREIGN_Z]`)

| Métrica | Significado |
|---------|--------------|
| `z_sovereignty_score`              | Score combinado (compat + cobertura) |
| `z_bootstrap_latency_ms`           | Latência média do bootstrap Z |
| `z_hydration_latency_ms`           | Latência média da hidratação |
| `z_context_assembly_ms`            | Latência média do assembly |
| `z_fallback_activation_count`      | Quantas vezes o fallback nativo Z foi accionado |
| `z_blank_screen_prevention_count`  | Quantas vezes a resiliência preveniu ecrã vazio |
| `z_shadow_divergence_score`        | Divergência média Motor A vs Z |
| `z_runtime_continuity_score`       | Continuity score por request |
| `z_compatibility_score`            | Compatibilidade estrutural Motor A vs Z |
| `z_contextual_accuracy_score`      | Safety score do payload Z |

Eventos: `BOOTSTRAP_STARTED`, `BOOTSTRAP_COMPLETED`, `BOOTSTRAP_FAILED`, `SHADOW_DIVERGENCE_HIGH`, `STAGE_RESOLVED`, `SOVEREIGNTY_APPLIED`.

---

## Invariantes (`flags.invariants`)

| Invariante | Garantia |
|------------|----------|
| `motor_a_never_deleted`       | Motor A permanece como `supervised_fallback` |
| `engine_v2_never_deleted`     | V2 permanece em `retired_shadow_reference` |
| `rollback_always_available`   | Snapshots C2/C4/C6 preservados |
| `no_auto_promotion`           | Promoção só com flag explícita por tenant |
| `additive_only`               | Nada é removido do payload — apenas adicionado |
| `shadow_first`                | Default `Z_SHADOW` em todos os ambientes |
| `bounded_contexts_preserved`  | Domínios continuam isolados |
| `react_structurally_preserved`| App.jsx, routing e DS intactos |
| `design_system_preserved`     | DS Industrial 4.0 intacto |
| `no_monolithization`          | Z continua orquestrador de sub-runtimes |

---

## Caminho de promoção controlada (proposto, **não automático**)

1. **Hoje (Z_SHADOW):** correr e medir `z_shadow_divergence_score` por 1–2 semanas.
2. **Tenant piloto → Z_ASSISTIVE:** `IMPETUS_SZ1_PROMOTED_TENANTS=tenant_a` + `IMPETUS_SZ1_PROMOTED_TENANT_STAGE=Z_ASSISTIVE`.
3. **Z_PRIMARY_WITH_A_FALLBACK:** após divergence < 0.05 sustentado, promover stage. Motor A continua síncrono em standby.
4. **Z_SOVEREIGN:** após estabilização, Motor A só corre por rollback explícito. Código permanece.
5. **LEGACY_COMPATIBILITY_ONLY:** estado final desejado — não envolve apagar nada.

---

## Testes

```bash
npm run test:runtime-z-sovereign         # 50/50 PASS
npm run test:sovereign-bootstrap
npm run test:sovereign-shadow-diff
npm run test:sovereign-resilience
npm run test:sovereign-promotion
```

---

## Limitações conscientes

- O `applySovereignZRuntime` actual executa o bootstrap Z **em paralelo** ao Motor A original (overhead controlado). Em `Z_SHADOW`, a observação tem custo; pode ser reduzido com `IMPETUS_SZ1_SHADOW_SAMPLE_RATE`.
- `composeContextual` ainda delega para `compositionEngine` V2 — só na fase futura SZ2 será substituído por implementação nativa.
- O frontend `runtime-z-sovereign/` é **opt-in** e **não substitui** o `dashboardContextAdapter` actual. O `CentroComando` continua a usar o adapter existente; o novo runtime é uma camada paralela disponível para migração gradual.

---

## O que NÃO mudou

- `App.jsx`, routing React, design system, sidebar
- `dashboardContextAdapter.js` actual
- Motor A (`backend/src/services/dashboardKPIs.js`, `dashboardAccessService.js`, etc.)
- Engine V2 (`backend/src/dashboardEngineV2/**`)
- Rollback de C0–C6
- Bounded contexts, telemetry isolation, multi-domain coexistence

---

## Resumo executivo

> O Runtime Z passa a ser **sobreposto** ao ecossistema como kernel soberano observável e governado, **sem** apagar Motor A nem V2. Internaliza-os como sub-runtimes via `require()`. Nenhuma quebra. Reversível pelo `IMPETUS_SZ1_SOVEREIGNTY=off`.
