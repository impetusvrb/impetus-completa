# M1.5B.4 — Maintenance Promotion (Manutenção / MANUIA)

**Data:** 2026-06-15  
**Fase:** M1.5B — Shadow → Full Promotion  
**Modo:** Additive only · Truth Program · Runtime AIOI · P0A–P0E · TRI-AI preservados  
**Backup pré-promoção:** `backend/.env.backup_pre_m1_5b_20260615_205044`

---

## Veredicto

```json
{
  "phase": "M1.5B.4",
  "domain": "maintenance",
  "promoted": true,
  "verdict": "MAINTENANCE_FULL_PROMOTION_COMPLETE"
}
```

---

## 1. Promoção aplicada

| Variável (spec M1.5B) | Valor spec | Valor canónico aplicado | Motivo |
|----------------------|------------|-------------------------|--------|
| `IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME` | `production_native` | **`maintenance_native`** | `phaseZM1FeatureFlags.js` |
| `IMPETUS_MAINTENANCE_LIVE_VALIDATION` | `production_native` | **`active`** | ZM1 aceita `shadow`, `on`, `active` |

**Runtime auxiliares preservados:**

| Flag | Valor |
|------|-------|
| `IMPETUS_MAINTENANCE_NATIVE_COCKPIT` | `on` |
| `ENABLE_MANUIA` | *(ausente = default ON)* |

**Acção:** `pm2 restart impetus-backend --update-env` executado.

---

## 2. Validação runtime pós-promoção

```json
{
  "cognitive_runtime_active": true,
  "cognitive_runtime_shadow": false,
  "live_validation_enabled": true,
  "maintenance_native_cockpit": "on"
}
```

**Fonte:** `phaseZM1FeatureFlags.js`

---

## 3. Validações por dimensão

### 3.1 MANUIA

| Componente | Estado |
|------------|--------|
| `ENABLE_MANUIA !== 'false'` | ✅ Activo (default) |
| `/api/manutencao-ia/*` | ✅ Montada (401 sem token) |
| Rotas: máquinas, sensores, sessões, inbox, work-orders | ✅ Registadas |

Fallback desactivado — rota real activa, não `manuiaDisabledFallback`.

### 3.2 Dashboard Maintenance

| Rota | Estado |
|------|--------|
| `/api/dashboard/maintenance/summary` | ✅ |
| `/api/dashboard/maintenance/cards` | ✅ |
| `/api/dashboard/maintenance/my-tasks` | ✅ |

Serviço: `dashboardMaintenanceService.js`

### 3.3 Ordens de serviço

Tabelas BD (M1.5A):

- `maintenance_preventives`
- `casos_manutencao`
- `machine_human_interventions`

UI: dashboard manutenção + TPM + live assistance.

### 3.4 Classificação `maintenance_required`

Integração AIOI confirmada em código:

| Ficheiro | Mapeamento |
|----------|------------|
| `aioiClassificationEngine.js` | `maintenance_required` → band MEDIUM |
| `aioiClassificationMapper.js` | `work_order` → `maintenance_required` |
| `aioiExecutionPayloadBuilder.js` | payload `aioi_maintenance_required` |
| `aioiDecisionPayloadBuilder.js` | decisão "Agendar manutenção" |
| `taskAioiAdapter.js` | critical/urgent/high → `maintenance_required` |

IOE actual com categoria `maintenance_required`: **0** (sem eventos operacionais recentes; classificador pronto).

### 3.5 TRI-AI

MANUIA usa providers IA para diagnóstico — TRI-AI global UP.

---

## 4. Rollback

```bash
cp backend/.env.backup_pre_m1_5b_20260615_205044 backend/.env
pm2 restart impetus-backend --update-env
```

---

## 5. Notas

- Arquitectura legacy (`manutencao-ia` + dashboard) — sem `domains/maintenance/` bounded context (conforme M1.5A).
- Promoção afecta **recomendações cognitivas autónomas**, não o registo manual de OS.
- Nenhum schema alterado. Nenhum código removido.
