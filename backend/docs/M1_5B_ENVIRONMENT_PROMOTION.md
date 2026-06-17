# M1.5B.2 — Environment Promotion (Ambiental / ESG)

**Data:** 2026-06-15  
**Fase:** M1.5B — Shadow → Full Promotion  
**Modo:** Additive only · Truth Program · Runtime AIOI · P0A–P0E · TRI-AI preservados  
**Backup pré-promoção:** `backend/.env.backup_pre_m1_5b_20260615_205044`

---

## Veredicto

```json
{
  "phase": "M1.5B.2",
  "domain": "environment",
  "promoted": true,
  "verdict": "ENVIRONMENT_FULL_PROMOTION_COMPLETE"
}
```

---

## 1. Promoção aplicada

| Variável (spec M1.5B) | Valor spec | Valor canónico aplicado | Motivo |
|----------------------|------------|-------------------------|--------|
| `IMPETUS_ENVIRONMENT_ACTIVATION_STAGE` | `full` | **`full`** | `environmentActivationRolloutEngine.js` |
| `IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE` | `false` | **`false`** | Publicação definitiva desbloqueada |
| `IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME` | `production_native` | **`environmental_native`** | `phaseP1EnvironmentalFeatureFlags.js` |
| `IMPETUS_ENVIRONMENTAL_LIVE_VALIDATION` | `production_native` | **`active`** | P1 aceita `shadow`, `on`, `active` |

**Runtime auxiliares (preservados, todos ON):**

| Flag | Valor |
|------|-------|
| `IMPETUS_ENVIRONMENT_NAVIGATION_RUNTIME_ENABLED` | `true` |
| `IMPETUS_ENVIRONMENT_PUBLICATION_RUNTIME_ENABLED` | `true` |
| `IMPETUS_ENVIRONMENT_OPERATIONAL_RUNTIME_ENABLED` | `true` |
| `IMPETUS_ENVIRONMENT_GOVERNANCE_RUNTIME_ENABLED` | `true` |
| `IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED` | `true` |
| `IMPETUS_ENVIRONMENT_COGNITIVE_RUNTIME_ENABLED` | `true` |
| `IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED` | `true` |
| `IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT` | `on` |

**Acção:** `pm2 restart impetus-backend --update-env` executado.

---

## 2. Validação runtime pós-promoção

```json
{
  "activation_stage": "full",
  "publication_shadow_mode": false,
  "allows_definitive_publication": true,
  "cognitive_runtime_active": true,
  "cognitive_runtime_shadow": false,
  "live_validation_enabled": true,
  "live_validation_mode": "active",
  "health_checks": {
    "domain": "environment",
    "readiness": { "ready": true, "reasons": [] },
    "definitive_publication": true,
    "flags": {
      "navigation": true,
      "publication": true,
      "operational": true,
      "rollout_shadow": false,
      "audience_preview": true
    },
    "rollout": { "stage": "full", "index": 6, "total": 7, "rollback_safe": true }
  }
}
```

**Nota:** `audience_preview: true` é flag interna de rollout — não bloqueia publicação definitiva quando `definitive_publication: true`.

---

## 3. Validações por dimensão

### 3.1 Telemetria

| Componente | Estado |
|------------|--------|
| `IMPETUS_ENVIRONMENT_TELEMETRY_RUNTIME_ENABLED` | `true` |
| MQTT / OPC-UA / Modbus / Edge (`mode=on`) | ✅ Preservado (P0) |
| Eventos catálogo telemetria | ✅ 8 tipos `environment.telemetry.*` |

### 3.2 Eventos ambientais

**38 eventos** no catálogo backbone, incluindo:

- `environment.emission.snapshot`, `environment.emission.alert_triggered`
- `environment.water.threshold_exceeded`, `environment.waste.shipment`
- `environment.telemetry.sample_ingested`, `environment.telemetry.threshold_exceeded`
- `environment.environmental.incident_opened`

### 3.3 Cockpit ESG

- `IMPETUS_ENVIRONMENTAL_NATIVE_COCKPIT=on`
- `isEnvironmentalNativeCockpitPilot()` → true
- UI: 90 ficheiros `frontend/src/domains/environment/`

### 3.4 Executive ESG

- `/api/environment-executive/*` montada
- `IMPETUS_ENVIRONMENT_EXECUTIVE_RUNTIME_ENABLED=true`

### 3.5 Publicação cognitiva

- `isEnvironmentalCognitiveRuntimeActive()` → **true**
- `isEnvironmentalCognitiveRuntimeShadow()` → **false**
- `isEnvironmentalLiveValidationEnabled()` → **true**

### 3.6 APIs

9 rotas registadas em `server.js`: navigation, activation, operational, governance, operational-validation, telemetry, cognitive, executive, pilot-rollout.

---

## 4. Testes automatizados

```
environment-publication-activation: 5 passed, 0 failed
```

Script: `backend/src/tests/environment-publication-activation/environmentPublicationActivationScenarios.js`  
(Cenários incluem validação de lógica shadow — código path preservado para rollback.)

---

## 5. Rollback

```bash
cp backend/.env.backup_pre_m1_5b_20260615_205044 backend/.env
pm2 restart impetus-backend --update-env
```

---

## 6. Notas

- Duplicata de `IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=full` no `.env` — ambas actualizadas para `full`.
- Telemetria PLC activa para pilot tenant `21dd3cee` (find fish alimentos).
- Nenhum schema alterado. Nenhum código removido.
