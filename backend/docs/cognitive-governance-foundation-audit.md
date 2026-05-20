# Auditoria — Cognitive Governance Foundation (Fase E)

**Data:** 2026-05-19  
**Escopo:** mapeamento read-only + fundação additive (sem alteração visual)

---

## [CRITICAL]

| ID | Local | Problema | Leakage / Risco | Mitigação Fase E |
|----|-------|----------|-----------------|------------------|
| C1 | `frontend/src/hooks/useDashboardVisibility.js` | `.catch(() => setSections(ALL_TRUE))` | Fail-open: todas as secções `true` em erro HTTP | `SAFE_MINIMAL_SECTIONS` + log `COGNITIVE_FAILSAFE_TRIGGERED` |
| C2 | `GET /api/dashboard/visibility` | Rota **ausente** em `dashboard.js` | Config admin ineficaz no Dashboard Inteligente | Rota `GET /dashboard/visibility` criada |
| C3 | `DashboardInteligente.jsx` | Ignora `sections` de `/dashboard/me` | Dupla fonte; hook pode divergir do backend | Rota corrigida; `content_exposure` aditivo em `/me` |
| C4 | `POST /dashboard/chat` | `retrieveContextualData(operational_overview)` sem `sections` | KPIs/alertas via IA mesmo com UI negada | `contextExposureSanitizer` (flag `IMPETUS_CONTEXT_SANITIZER`) |
| C5 | Múltiplos entrypoints | Sem autoridade única de exposição | Vazamento cognitivo cross-canal | `resolveContentExposure()` (flag `IMPETUS_COGNITIVE_POLICY_ENGINE`) |

---

## [HIGH]

| ID | Local | Problema | Mitigação |
|----|-------|----------|-----------|
| H1 | `secureContextBuilder.js` | Filtra FIN/HR/STRATEGIC, não `sections` | Sanitizer + envelope |
| H2 | `dataRetrievalService.js` | Sem `hierarchy_level` / sections | Envelope + sanitizer no pack |
| H3 | `dashboardAccessService` vs `dashboardVisibility` | Camadas paralelas | `policyPrecedenceResolver` deny-first |
| H4 | `domainAuthority` vs visibility | Módulos governados vs secções UI | Precedência: domain antes de UX |
| H5 | `dashboardPolicyEngine` (V2) | Widgets separados de sections | Unificação futura via `content_exposure` |
| H6 | `contextualModules` | Pode enriquecer módulos (flagged) | Não expande quando policy engine nega |

---

## [MEDIUM]

| ID | Local | Nota |
|----|-------|------|
| M1 | `cognitiveOrchestrator.js` | Até 3× `retrieveContextualData` — contexto amplo |
| M2 | `chatAIService.js` / consolidated | Fallback legacy com contexto operacional |
| M3 | `liveDashboardContextual` | `applyPolicies` V2 — não lê sections |
| M4 | `eventPipelineAuthorityService` | Shadow default — routing cognitivo |
| M5 | `useVisibleModules.js` | Path-based; independente de sections |

---

## [LOW]

| ID | Local | Nota |
|----|-------|------|
| L1 | Admin `CompanyAdminSettings` | Persiste DB; agora rota expõe |
| L2 | CEO/Diretor `hierarchy 0-1` | Sempre full sections (by design) |
| L3 | Observabilidade cognitiva | In-memory traces V2 |

---

## Entrypoints cognitivos mapeados

```
JWT
 ├─ GET /dashboard/me          → profile + modules + sections + [content_exposure]
 ├─ GET /dashboard/visibility  → sections UI (NOVO)
 ├─ GET /dashboard/kpis        → perfil + scope (sem sections)
 ├─ GET /dashboard/smart-summary
 ├─ POST /dashboard/chat       → dataRetrieval + secureContextBuilder
 ├─ live-dashboard/state       → Engine V2 policies
 └─ contextualModules          → enhanceVisibleModules (flag off default)

Resolvers:
 ├─ dashboardProfileResolver
 ├─ domainAuthorityResolver
 ├─ moduleInheritanceGuard
 ├─ dashboardAccessService
 ├─ dashboardVisibility
 ├─ hierarchicalFilter
 ├─ dashboardPolicyEngine
 └─ resolveContentExposure (NOVO, flag off default)
```

---

## Fail-open / bypass identificados

| Padrão | Onde | Estado pós-Fase E |
|--------|------|-------------------|
| ALL_TRUE em catch | `useDashboardVisibility` | **Corrigido** (failsafe minimal) |
| Rota 404 → catch | visibility API | **Corrigido** (rota existe) |
| Chat sem sections | `/dashboard/chat` | Sanitizer opt-in |
| IA expande módulos | contextualModules replace | Domain authority + deny |
| Admin tenant ≠ engineering runtime | Fase D guard | Mantido |

---

## Onde IA recebe contexto bruto

- `dataRetrievalService.retrieveContextualData`
- `documentContext.buildAIContext`
- `voiceRealtimeContextService`
- `cognitiveOrchestrator` multi-intent packs

**Regra Fase E:** `contextExposureSanitizer` remove chaves técnicas/cross-domain antes do pack (quando flag on).

---

## Compatibilidade Fases B/C/D

| Fase | Impacto |
|------|---------|
| B — functional axis | Preservado; envelope usa `functional_axis` |
| C — domain authority | Precedência layer `domain_authority` |
| D — safety/environmental | Testes SST mantidos; deny modules herdados |

---

## Flags

| Flag | Default |
|------|---------|
| `IMPETUS_COGNITIVE_POLICY_ENGINE` | off |
| `IMPETUS_COGNITIVE_ENVELOPE` | off |
| `IMPETUS_CONTEXT_SANITIZER` | off |
| `IMPETUS_FAILSAFE_GOVERNANCE` | on |
| `VITE_IMPETUS_FAILSAFE_GOVERNANCE` | on (frontend) |
