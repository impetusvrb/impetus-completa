# Dashboard Engine V2 — Migração arquitectural aditiva

Este pacote é uma **camada aditiva** sobre os motores de dashboard existentes do
IMPETUS. Não substitui, não remove, não modifica os motores legados. A sua única
responsabilidade é **promover o motor por eixos (Motor B)** a primeiro cidadão,
correndo em paralelo com o motor textual (Motor A) sob feature flag, registando
o trace de cada decisão e expondo um único ponto de composição:

```
Frontend  ─►  /dashboard/me
                │
                ▼
   DashboardCompositionGateway  (este pacote)
                │
                ├─► Motor A (legado, normalizado)   ┐
                │                                   │
                ├─► Motor B (eixos, evoluído)       ├─► diff   ─►  trace
                │                                   │
                └─►  resposta final (controlada por flag)
```

## Entradas

- `req.user` (resultado de `validateSession`) — contém `role`, `job_title`,
  `functional_area`, `department`, `permissions`, `hierarchy_level`,
  `dashboard_profile`, `company_role_dashboard_hint`.

## Saída

A saída do gateway é uma **vista normalizada** (`NormalizedDashboard`) com:

```js
{
  engine: 'A' | 'B' | 'A_with_B_shadow',
  identity: {
    user_id, company_id, role_normalized,
    area, function_type, hierarchy_level,
    axes_priority: [...], capabilities: [...], scope
  },
  layout: { widgets: [{ id, label, position, axes, score, rationale }] },
  modules: { visible: [...], denied: [...] },
  explainability: {
    trace_id, primary_axis, axes,
    decisions: [{ widget, score, axes_overlap, capabilities_ok }],
    rationale: 'Texto humano de explicação'
  }
}
```

## Feature flags

- `IMPETUS_DASHBOARD_ENGINE_V2` — `off` (padrão), `shadow`, `on`.
  - `off`: gateway só executa Motor A. Comportamento idêntico ao actual.
  - `shadow`: executa A primário, B em paralelo (não-bloqueante), regista diff.
  - `on`: B é resposta primária, A roda em background como fallback.
- `IMPETUS_DASHBOARD_ENGINE_SHADOW` — controlo fino:
  - `true`: força modo shadow mesmo se `V2=off` (útil para auditoria).
  - `sample:0.1`: amostragem de 10% para reduzir custo em produção.
- `IMPETUS_DASHBOARD_ENGINE_LOG_LEVEL` — `info` | `debug` | `silent`.

Quando ambas estão ausentes, o sistema **comporta-se exactamente como hoje**.

## Observabilidade

Dois logs estruturados, em NDJSON sobre `stdout`:

- `[DASHBOARD_ENGINE_TRACE]` — trace de execução por request.
- `[DASHBOARD_ENGINE_DIFF]` — diferenças entre Motor A e Motor B (apenas em
  shadow/on).

## Compatibilidade

- Contrato de `/dashboard/me` permanece **byte-compatible** com o frontend.
  Campos novos são aditivos; nenhum existente é removido nem renomeado.
- Permissões e LGPD: o gateway NÃO altera `dashboardAccessService`. O Motor B
  evoluído passa a integrar capabilities de forma aditiva — o filtro original
  por `SENSITIVE_KPI_KEYS` continua a aplicar-se na rota legacy.
- Rollback: definir `IMPETUS_DASHBOARD_ENGINE_V2=off` e reiniciar o processo.
  Não é necessária migração ou rollback de dados — tudo é em memória.

## Estrutura

```
dashboardEngineV2/
  identity/
    identityResolver.js     # Identidade contextual derivada (sem DB)
    functionResolver.js     # decisao_estrategica/analise/supervisao/execucao/governanca
  axes/
    axesPriorityCatalog.js  # prioridade de eixos por (cargo, area, função)
    capabilitiesDeriver.js  # capabilities derivadas (sem alterar BD)
  composition/
    granularityPolicy.js    # políticas por função (consolidated/detailed/operational)
    widgetSelector.js       # buildWidgetSet V2 com capabilities + explainability
    compositionEngine.js    # orquestra fluxo unificado V2
  gateway/
    motorAdapter.js         # adapta Motor A para a forma normalizada
    diffAnalyzer.js         # compara outputs A vs B
    traceLogger.js          # logs estruturados [TRACE]/[DIFF]
    dashboardCompositionGateway.js  # ponto único, controlado por flags
  flags.js                  # parser canónico das feature flags
```

## Não-objectivos (Fase 1 desta migração)

- Não cria tabelas novas.
- Não altera o cadastro de utilizadores.
- Não muda permissões existentes.
- Não remove `LayoutPorCargo.js` no frontend.
- Não toca em `dashboardProfileResolver.js`, `dashboardProfiles.js`,
  `dashboardAccessService.js` ou `dashboardPersonalizadoService.js`.

Estes objectivos são reservados para fases posteriores (após shadow estabilizar
e DIFF mostrar paridade ≥ 95%).

---

## Fase 3 — Frontend Contextual + Observabilidade + Políticas

A Fase 3 é **aditiva** e foca em consolidar o Motor B no frontend e criar a
camada de observação/governança necessária à promoção futura.

### Adições principais

| Domínio | Componentes |
|---|---|
| Frontend | `frontend/src/features/dashboard/contextAdapter/` (`buildDashboardContext`, `useDashboardContext`) — preferência: `engine_v2` → `personalizado` → `LayoutPorCargo` (fallback Motor A). |
| Modo híbrido | `flags.js::resolveEngineDirectiveForUser({ area, functionType, company_id, user_id })` + flags `IMPETUS_ENGINE_V2_FINANCE`, `IMPETUS_ENGINE_V2_INDUSTRIAL`, `IMPETUS_ENGINE_V2_HR`, `IMPETUS_ENGINE_V2_STRATEGIC`, `IMPETUS_ENGINE_V2_ANALYSIS`, `IMPETUS_ENGINE_V2_SUPERVISION`, `IMPETUS_ENGINE_V2_EXECUTION`, `IMPETUS_ENGINE_V2_GOVERNANCE`, `IMPETUS_ENGINE_V2_BY_COMPANY`, `IMPETUS_ENGINE_V2_PERCENT`. |
| Observabilidade | `observability/dashboardDecisionTrace.js`, `observability/dashboardUsageTelemetry.js`, `observability/divergenceIntelligence.js`. Buffer circular em memória + agregações para cruzar decisão × uso real. |
| Políticas | `policies/policyCatalog.js` (declarativo) + `policies/dashboardPolicyEngine.js` (`augment_capabilities` / `allow` / `deny`, deny-overrides, audit trail). Políticas para CFO, Operador, Supervisor, RH BP, Segurança e Auditor. |
| Identity Audit | `audit/contextIdentityAudit.js` + `scripts/run-context-identity-audit.js`. Detecta `misclassified`, `no_area`, `capabilities_inconsistent`, `excess_access`, `underprivileged`, `unknown_permissions`. |
| ML preparatório | `learning/learningHooks.js`, `learning/feedbackLoop.js`, `learning/embeddings.js`. Hooks noop por defeito; pluggable. **Sem IA adaptativa nesta fase.** |
| Rotas Express | `POST /dashboard/v2/usage`, `GET /dashboard/v2/decision-trace`, `GET /dashboard/v2/divergence`, `POST /dashboard/v2/feedback`, `GET /dashboard/v2/identity-audit`. |
| Testes | `tests/dashboardEnginePhase3Scenarios.js` (57 cenários: flags, observabilidade, políticas, identity-audit, hooks, personas, compatibilidade). |

### Resultados

```
$ npm run test:dashboard-engine-v2          # Phase 1 — regressão
Resultado: 74 pass / 0 fail

$ npm run test:dashboard-engine-phase3      # Phase 3 — novo
Total: 57 passed | 0 failed
```

### Garantias

- `LayoutPorCargo` **não foi removido** — continua a ser fallback final.
- `dashboardProfileResolver`, `dashboardAccessService`,
  `dashboardPersonalizadoService` — intactos.
- `roleUtils.js` no frontend — intacto (ainda usado pelo menu lateral).
- Todas as rotas existentes mantêm contrato; novas rotas são `v2/*`.
- Decisão de motor é tomada **sempre no backend** (`dashboardCompositionGateway`).
- Política tem audit trail completa em `explainability.policy_audit`.

---

## Fase 4 — Context Governance Layer

A Fase 4 transforma o `CONTEXT_IDENTITY_AUDIT` numa **camada operacional de
governança contextual**. Mede a qualidade estrutural da identidade
organizacional, detecta riscos, sugere melhorias **não-automáticas**, regista
mudanças no tempo, e prepara terreno para inteligência organizacional futura.

### Componentes (todos READ-ONLY)

| Domínio | Componente |
|---|---|
| Score | `governance/integrityScoreService.js` — `OrganizationalContextIntegrityScore` (`scoreUser`, `scoreOrganization`, `scoreFromDatabase`). Produz `overall_score`, `contextual_integrity`, `security_integrity`, `hierarchy_integrity`, `identity_quality`, `lgpd_alignment`, `risk_level`, `confidence`, `findings`, `recommendations`, `by_user`, `by_department`, `by_area`. |
| Riscos | `governance/contextRiskEngine.js` — 10 detectores: `excess_privilege`, `underprivileged_critical_user`, `ambiguous_identity`, `orphan_permission`, `cross_area_inconsistency`, `hierarchy_anomaly`, `lgpd_exposure`, `context_mismatch`, `role_inflation`, `permission_accumulation_over_time`. Cada risco tem `risk_id`, `severity`, `affected_users`, `affected_areas`, `probable_causes`, `impact`, `recommendation`, `confidence`. |
| Recomendações | `governance/recommendationEngine.js` — sugestões `capability_grant`, `capability_revoke`, `role_review`, `area_normalization`, `hierarchy_realign`, `permission_migrate`, `lgpd_segregation`. Todas auditáveis, explicáveis, reversíveis e **não-destrutivas**. Nunca aplicadas automaticamente. |
| História | `governance/contextHistoryStore.js` — append-only, ring buffer (capacidade configurável). 8 eventos canónicos: `area_change`, `capability_change`, `function_change`, `hierarchy_change`, `integrity_score_change`, `policy_change`, `risk_emitted`, `recommendation_emitted`. Adapter externo opcional (PostgreSQL). |
| Capabilities | `governance/capabilityConsistencyAnalyzer.js` — gera `capability_map`, `matrix_cap_function_area` (capability × função × área), `coverage_by_function`, `dependencies`, detecta `unused`, `overpermissive`, `no_policy`, `redundant_pairs`, `conflicting_policies`. |
| Façade | `governance/governanceFacade.js` — orquestra os 5 services num `snapshotFromUsers`/`snapshotFromDatabase` e emite eventos para `learningHooks` + `contextHistoryStore`. |
| Learning hooks | `learning/learningHooks.js` (estendido) — novos hooks no-op: `onIntegrityScoreComputed`, `onRiskDetected`, `onRecommendationEmitted`, `onContextDrift`, `onAnomalyDetected`. Pluggable; sem IA adaptativa nesta fase. |
| Rotas Express | `GET /dashboard/v2/governance/snapshot`, `/integrity`, `/risks`, `/recommendations`, `/capabilities`, `/history`, `/score/:userId`. Todas exigem admin/auditor (`role=admin|ceo` ou `VIEW_AUDIT_LOGS` ou `dashboard_profile=audit_governance/admin`) e respeitam `IMPETUS_GOVERNANCE_ENABLED`. |
| Frontend | `frontend/src/features/governance/ContextGovernancePage.jsx` + `useGovernanceContext.js` — dashboard administrativo (DS Industrial 4.0): score multidimensional, riscos, recomendações, capabilities/policies, score por área, histórico. |
| Testes | `tests/governanceScenarios.js` — 43 asserts cobrindo personas (CFO, Dir.Industrial, Supervisor, Operador, RH BP, Safety, Auditor, Inconsistente Proposital), score, 10 detectores, recomendações, histórico, conflitos de policies, LGPD, façade. |

### Pesos do score

```
overall_score = 0.25·contextual + 0.25·security + 0.15·hierarchy + 0.20·identity + 0.15·lgpd
```

`risk_level` derivado: `low` (≥85), `warn` (≥70), `medium` (≥50), `high` (<50).

### Garantias

- Camada **READ-ONLY**. Nunca altera permissões, capabilities, hierarquia ou
  qualquer dado de cadastro. Apenas mede e relata.
- Recomendações sempre `requires_human_action: true`, `reversible: true`,
  `destructive: false`.
- Compatibilidade total: `IMPETUS_GOVERNANCE_ENABLED=false` desliga as rotas
  sem afectar o resto.
- Determinístico: mesmo input → mesmo score, mesmos `risk_id`/`recommendation.id`.
- Auditoria: cada snapshot regista eventos no `contextHistoryStore` com
  `scope` explícito (ex.: `company:co-1`).

### Resultado

```
$ npm run test:governance
Total: 43 passed | 0 failed
```

---

## Fase 5 — Live Dashboard Contextual Layer (silent promotion)

Migra a experiência principal dos utilizadores para o Motor B sob o painel
`LiveDashboardUnifiedPanel` **sem alterar o frontend visual**. O JSX, o CSS,
os tokens, as keys do JSON, a paleta — tudo permanece intocado. Apenas a
**origem dos widgets** muda, dentro do contrato existente.

### Componentes (todos no backend)

| Componente | Responsabilidade |
|---|---|
| `liveDashboardContextual/contextualDashboardResolver.js` | Recebe output do `composeDashboardV2` e produz widgets em formato `live_metric/pulse_level/personalization_note` (contrato legado). Devolve gaps contextuais e um `personalization_overlay`. |
| `liveDashboardContextual/contextualOverlay.js` | Aplica overlay ao `legacyState` em 4 modos: `legacy` (no-op), `shadow` (calcula só metadata), `enrich` (mantém widgets + adiciona gaps), `replace` (substitui `layout.widgets`). Sempre clona — nunca muta o legacy por referência. |
| `liveDashboardContextual/experienceValidator.js` | Veredicto `{ ok, score, critical_widget_missing, excess_information, hierarchy_breach, policy_breach, issues[] }`. Bloqueia promoção quando widgets críticos ausentes ou proibidos presentes. |
| `liveDashboardContextual/promotionGuard.js` | `decideMode(user)` — combina flags Phase 3 + circuit-breaker (taxa de falhas em janela móvel) + rollback manual `forceFallback(reason)` / `clearForceFallback()`. |
| `liveDashboardContextual/experienceTelemetry.js` | Buffer ring + adapter externo. `summary({ since, until, ... })` produz: `mode_breakdown`, `fallback_rate`, `validator_failure_rate`, `trust_score`, `widget_overlap_rate`, `latency` (p50/p95 legacy/contextual). |
| `liveDashboardContextual/index.js` | Façade `enhanceLiveStateWithContext(legacyState, user, opts)`. Único ponto de chamada — devolve `{ state, meta }`. **Nunca lança.** Em qualquer erro, devolve o legacy intocado. |

### Integração cirúrgica

`liveDashboardService.buildLiveStateForUser` recebe **3 linhas** novas:
1. `__legacyT0 = process.hrtime()` (medição);
2. captura do payload em `__legacyState` em vez de retorno direto;
3. chamada a `enhanceLiveStateWithContext(__legacyState, user, { kpiByKey, legacyLatencyMs })` no fim, em try/catch.

Tudo o resto da função permanece idêntico (mesmas queries, mesmos cálculos,
mesmos `gaps`, mesmo `intelligent_summary`, mesmas `signals`).

### Rotas administrativas (admin/auditor only)

| Rota | Função |
|---|---|
| `GET  /api/live-dashboard/context/state` | decisão atual + circuit breaker + summary 24h |
| `POST /api/live-dashboard/context/fallback` | `{ reason }` → activa rollback manual |
| `POST /api/live-dashboard/context/clear-fallback` | sai do rollback |
| `GET  /api/live-dashboard/context/telemetry` | telemetria recente (com filtros) |

### Flags de ambiente

```
IMPETUS_LIVE_DASHBOARD_MOTOR=                    # legacy|shadow|enrich|replace (vazio = segue Phase 3)
IMPETUS_LIVE_DASHBOARD_REPLACE_ON_ON=false       # quando Phase 3 disser 'on', requer este flag para 'replace'
IMPETUS_LIVE_PROMOTION_FAILURE_THRESHOLD=0.25    # taxa de falhas que abre o circuit breaker
IMPETUS_LIVE_PROMOTION_FAILURE_WINDOW=50         # janela móvel
IMPETUS_LIVE_PROMOTION_MIN_TRUST=60              # confiança mínima do validator
```

### Garantias absolutas

- **Frontend visual intocado.** Nenhum JSX, CSS, token, paleta ou componente
  React foi alterado. Os JSX consomem as mesmas keys do mesmo JSON.
- **Contrato externo preservado** — todas as 12 chaves (`ok`, `captured_at`,
  `intelligent_summary`, `signals`, `data_sources`, `alerts_preview`,
  `operational_events`, `layout`, `capabilities`, `orchestration`,
  `orchestration_stash_key`, `personalization`) permanecem.
- **Default seguro**: sem flag, modo é `legacy` → comportamento idêntico ao
  pré-Fase-5.
- **Rollback instantâneo**: `forceFallback()` faz a próxima chamada cair em
  `legacy` sem reiniciar processo.
- **Circuit-breaker**: ≥25% (configurável) de falhas do validator nas
  últimas 50 execuções → cai automaticamente para `shadow`.
- **Nunca lança**: qualquer erro no Motor B / overlay / validator devolve
  o `legacyState` original.

### Resultado

```
$ npm run test:live-dashboard-contextual
Total: 112 passed | 0 failed

$ npm run test:dashboard-engine-v2 && npm run test:dashboard-engine-phase3 && npm run test:governance
74 + 57 + 43 = 174 passed | 0 failed
```

Total acumulado em quatro fases: **286 testes verdes**.
