# M1.16 — Critical Remediation & M1 Closure

**Data:** 2026-06-16  
**Pré-requisito:** M1.15 `M1_15_CRITICAL_FINDINGS_IDENTIFIED`  
**Modo:** Remediação additive · documentada

---

## Veredicto

```json
{
  "phase": "M1.16",
  "pass": true,
  "verdict": "M1_PLATFORM_FULLY_OPERATIONAL"
}
```

---

## Critérios finais

```json
{
  "financial_rbac_unified": true,
  "financial_empty_responses_eliminated": true,
  "production_runtime_promoted": true,
  "quality_bridge_promoted": true,
  "all_m1_findings_closed": true,
  "regression_validation_passed": true
}
```

---

## Etapa 1 — Financial RBAC Unification

**Alterações:**
- `backend/src/middleware/authorize.js` — fonte única: `roles + role_permissions` (primário) + `users.permissions[]` (complementar)
- `backend/src/middleware/auth.js` — `hydrateUserPermissions()` em cada request autenticado
- `dashboardChartDataService.userCanSeeFinancialValues` — alinhado a permissões efectivas

**Validação Fresh Fit:**

| Perfil | VIEW_FINANCIAL |
|--------|----------------|
| CEO | ✅ |
| Diretor | ✅ |
| Gerente | ✅ |
| Supervisor | ❌ |
| Colaborador | ❌ |

---

## Etapa 2 — Truth-Safe Financial Denial

**Alterações:**
- `promptFirewall.js` — campo `reply` em todos os bloqueios
- `authorize.buildTruthSafePermissionDenial()` — payload canónico
- `POST /api/dashboard/chat` e `chat-multimodal` — 403 com `reply` + `industrial_truth.permission_denied`

**Resultado:** zero cenários F48 com `reply` vazio.

---

## Etapa 3 — Production Live Validation (ZP1)

**Certificação:** `runProductionLiveValidationTests.js` — **39/39 PASS**

**Promoção `.env`:**
```
IMPETUS_PRODUCTION_LIVE_VALIDATION=active
```

---

## Etapa 4 — Quality Cockpit Bridge (Z19/Z20)

**Certificação:**
- Z19: `runCognitiveCompositionTests.js` — **22/22 PASS**
- Z20: `runQualityEngineBridgeTests.js` — **13/13 PASS**

**Fix additive:** `cognitiveRuntimeFacade.js` — payload consumidor imutável em `shadow_only` (metadados no report)

**Promoção `.env`:**
```
IMPETUS_QUALITY_COCKPIT_PILOT=active
IMPETUS_QUALITY_ENGINE_BRIDGE=active
```

**Flags:** `phaseZ19FeatureFlags.js` / `phaseZ20FeatureFlags.js` — alias `active` → `on`

---

## Etapa 5 — Regression

Ver [M1_16_REGRESSION_VALIDATION.md](./M1_16_REGRESSION_VALIDATION.md)

---

## Artefactos

| Tipo | Path |
|------|------|
| Serviço | `backend/src/services/audit/m1CriticalRemediationService.js` |
| Rotas | `backend/src/routes/m1CriticalRemediationRoutes.js` |
| APIs | `GET /api/m1/critical-remediation/*` |

**PM2:** `pm2 reload impetus-backend --update-env` após alteração `.env`

---

## Sequência autorizada

```
M1.16 Critical Remediation ✅
    ↓
M1 Final Certification
    ↓
M2 MES Operational
```

---

## Preservação

Truth Program · AIOI · TRI-AI · P0A–P0E · Multi-tenant · RLS · MFA · Federation — **preservados**
