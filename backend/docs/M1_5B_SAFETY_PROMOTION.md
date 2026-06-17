# M1.5B.1 — Safety Promotion (SST)

**Data:** 2026-06-15  
**Fase:** M1.5B — Shadow → Full Promotion  
**Modo:** Additive only · Truth Program · Runtime AIOI · P0A–P0E · TRI-AI preservados  
**Backup pré-promoção:** `backend/.env.backup_pre_m1_5b_20260615_205044`

---

## Veredicto

```json
{
  "phase": "M1.5B.1",
  "domain": "safety",
  "promoted": true,
  "verdict": "SAFETY_FULL_PROMOTION_COMPLETE"
}
```

---

## 1. Promoção aplicada

| Variável (spec M1.5B) | Valor spec | Valor canónico aplicado | Motivo |
|----------------------|------------|-------------------------|--------|
| `IMPETUS_SAFETY_ACTIVATION_STAGE` | `full` | **`full`** | Aceite por `safetyActivationRolloutEngine.js` |
| `IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE` | `false` | **`false`** | Publicação definitiva desbloqueada |
| `IMPETUS_SAFETY_COGNITIVE_RUNTIME` | `production_native` | **`safety_native`** | `phaseZ25FeatureFlags.js` reconhece `safety_native`, não `production_native` |

**Runtime auxiliares (já ON, preservados):**

| Flag | Valor |
|------|-------|
| `IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED` | `true` |
| `IMPETUS_SAFETY_NAVIGATION_RUNTIME_ENABLED` | `true` |
| `IMPETUS_SAFETY_PUBLICATION_RUNTIME_ENABLED` | `true` |
| `IMPETUS_SAFETY_GOVERNANCE_RUNTIME_ENABLED` | `true` |
| `IMPETUS_SST_NATIVE_COCKPIT` | `on` |

**Acção operacional:** `pm2 restart impetus-backend --update-env` executado. Backend `status: ok`, TRI-AI UP.

---

## 2. Validação runtime pós-promoção

```json
{
  "activation_stage": "full",
  "publication_shadow_mode": false,
  "allows_definitive_publication": true,
  "cognitive_runtime_active": true,
  "cognitive_runtime_shadow": false,
  "health_checks": {
    "domain": "safety",
    "readiness": { "ready": true, "reasons": [] },
    "definitive_publication": true,
    "flags": {
      "navigation": true,
      "publication": true,
      "operational": true,
      "rollout_shadow": false,
      "audience_preview": false
    },
    "rollout": { "stage": "full", "index": 5, "total": 6, "rollback_safe": true }
  }
}
```

**Fonte:** `safetyActivationRolloutEngine`, `phaseZ25FeatureFlags`, `safetyPublicationHealthService.runSafeActivationChecks()`.

---

## 3. Validações por dimensão

### 3.1 APIs SST

| Rota | Estado | Nota |
|------|--------|------|
| `/api/safety-operational/*` | ✅ Montada | 401 sem token — rota activa |
| `/api/safety-governance/*` | ✅ Montada | |
| `/api/safety-telemetry/*` | ✅ Montada | |
| `/api/safety-cognitive/*` | ✅ Montada | |
| `/api/safety-rollout/*` | ✅ Montada | |
| `/api/safety-navigation/*` | ✅ Montada | |
| `/api/safety-activation/*` | ✅ Montada | |
| `/api/safety-operational-validation/*` | ✅ Montada | |

### 3.2 Eventos backbone

Catálogo `industrialEventCatalog.js`:

- `safety.permit.issued` (critical)
- `safety.loto.applied` (critical)
- `safety.incident.reported` (critical)

Integração AIOI: classificação `safety_incident` em `aioiClassificationEngine.js`.

### 3.3 Publicação cognitiva

- `allowsDefinitivePublication(full, false)` → **true**
- `isSafetyCognitiveRuntimeActive()` → **true**
- `isSafetyCognitiveRuntimeShadow()` → **false**

### 3.4 Integração TRI-AI

`/api/health` pós-restart: OpenAI ✓ · Anthropic ✓ · Google Vertex ✓

### 3.5 Cockpit SST

- `IMPETUS_SST_NATIVE_COCKPIT=on`
- `isSstNativeCockpitPilot()` → true
- UI: 30 ficheiros em `frontend/src/domains/safety/` (auditoria M1.5A)

---

## 4. Testes automatizados

```
safety-publication-activation: 4 passed, 0 failed
```

Script: `backend/src/tests/safety-publication-activation/safetyPublicationActivationScenarios.js`

---

## 5. Rollback

Restaurar backup e reiniciar:

```bash
cp backend/.env.backup_pre_m1_5b_20260615_205044 backend/.env
pm2 restart impetus-backend --update-env
```

---

## 6. Notas

- Nenhum schema alterado. Nenhum código removido.
- IOE com categoria `safety_incident` = 0 na BD actual (dados operacionais ainda não gerados pós-promoção; pipeline AIOI activo).
- Tenant Food Base: ver `M1_5B_SHADOW_TO_FULL_PROMOTION.md` § Food Base readiness.
