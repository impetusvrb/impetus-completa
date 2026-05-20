# Fase E — Cognitive Governance Foundation (Implementação)

## Arquitetura criada

```
policyEngine/
 ├── config/cognitiveFeatureFlags.js
 ├── policies/safeMinimalPolicy.js
 ├── policyPrecedenceResolver.js      # DENY → DOMAIN → RBAC → EXPLICIT → IA → UX
 ├── cognitiveEnvelopeResolver.js     # cognitive_envelope
 ├── contentExposurePolicyEngine.js
 ├── unifiedExposureResolver.js       # resolveContentExposure()
 ├── policyDecisionLogger.js
 └── index.js

security/
 └── contextExposureSanitizer.js      # pré-IA

frontend/
 ├── policyEngine/safeMinimalPolicy.js
 └── hooks/useDashboardVisibility.js  # failsafe minimal
```

## Fluxo

```
Utilizador autenticado
    ↓
resolveContentExposure(user)     [flag IMPETUS_COGNITIVE_POLICY_ENGINE=on]
    ├─ dashboardProfileResolver (legacy)
    ├─ domainAuthority (deny modules)
    ├─ dashboardAccessService (RBAC)
    ├─ dashboardVisibility (explicit sections)
    ├─ policyPrecedenceResolver (deny wins)
    └─ cognitiveEnvelopeResolver [flag ENVELOPE=on]
    ↓
GET /dashboard/me → campo aditivo content_exposure
    ↓
secureContextBuilder → contextExposureSanitizer [flag SANITIZER=on]
    ↓
IA (dentro do envelope — nunca expande)
```

## Precedência

1. **DENY** — explícito / isolamento
2. **DOMAIN AUTHORITY** — `blocked_modules`, inheritance
3. **RBAC** — `dashboardAccessService`
4. **EXPLICIT POLICY** — `dashboard_visibility_config` sections
5. **IA CONTEXTUAL** — só dentro do envelope (futuro)
6. **UX** — ordem/apresentação

## Riscos mitigados

| Risco | Mitigação |
|-------|-----------|
| Fail-open UI | SAFE_MINIMAL + failsafe on |
| Rota visibility ausente | GET `/dashboard/visibility` |
| Contexto bruto na IA | Sanitizer (opt-in) |
| Autoridade plural | Unified resolver (opt-in) |
| IA expande privilégios | deny-first; envelope `ai_inference_scope` |

## Pontos não resolvidos (próximas fases)

- Chat/KPIs/smart-summary ainda não consultam `sections` directamente
- `DashboardInteligente` não consome `content_exposure` do `/me` (sem alteração UX nesta fase)
- Policy engine unificado com `dashboardPolicyEngine` widgets
- Editor admin de policy / HITL
- Tenant overrides cognitivos

## Rollback

```bash
IMPETUS_COGNITIVE_POLICY_ENGINE=off
IMPETUS_COGNITIVE_ENVELOPE=off
IMPETUS_CONTEXT_SANITIZER=off
# Manter failsafe:
IMPETUS_FAILSAFE_GOVERNANCE=on
pm2 reload impetus-backend --update-env
```

Frontend failsafe independente: `VITE_IMPETUS_FAILSAFE_GOVERNANCE=off` restaura comportamento legado de secções iniciais (não recomendado).

## Testes

```bash
cd backend
npm run test:cognitive-governance
npm run test:safety-environmental-isolation
npm run test:domain-contextual-regression
```

Snapshots: `backend/tests/cognitive-governance/snapshots/*.json`

## Maturity assessment

| Dimensão | Nível |
|----------|-------|
| Foundation layer | **Implementada** (flags off) |
| Fail-safe | **Produção-ready** (on) |
| Unified exposure | **Beta** (flag on) |
| Chat alignment | **Parcial** (sanitizer opt-in) |
| ISO 42001 demonstrability | **Melhoria incremental** |

## Limitações atuais

- Com `IMPETUS_COGNITIVE_POLICY_ENGINE=off`, comportamento legacy **byte-a-byte** em `visible_modules` e `sections`.
- Envelope só materializa com `IMPETUS_COGNITIVE_ENVELOPE=on`.
- Sanitizer não reescreve strings de contexto livre — apenas objetos `context_pack` / `metrics`.
