# M1.10 — Food Base Pilot Provisioning & Controlled Go-Live

**Data:** 2026-06-16  
**Fase:** M1.10 — Food Base Pilot Provisioning & Controlled Go-Live  
**Pré-requisitos:** M1.5B → M1.9 completos  
**Modo:** Additive only · No data loss · Truth Program · AIOI · TRI-AI preservados  
**Encerra:** Ciclo M1

---

## Veredicto

```json
{
  "phase": "M1.10",
  "pass": true,
  "verdict": "FOOD_BASE_PILOT_ACTIVE"
}
```

---

## Critérios finais

```json
{
  "tenant_created": true,
  "security_enabled": true,
  "pilot_lists_enabled": true,
  "executive_go_live": true,
  "domains_go_live": true,
  "tenant_scoped_aioi": true,
  "foodbase_api_live": true,
  "food_base_pilot_active": true
}
```

---

## Etapa 1 — Decisão de Tenant

```json
{
  "tenant_strategy_defined": true,
  "strategy": "promote_existing",
  "company_id": "511f4819-fc48-479e-b11e-49ba4fb9c81b",
  "company_name": "Fresh & Fit Indústria de Alimentos Naturais Ltda",
  "pilot_program_alias": "Food Base Pilot"
}
```

**Racional:** Food Base (Opção A) não existe na BD. Fresh & Fit foi validado em M1.9 com dados operacionais reais (45 incidentes, 6 leakage reports, CEO activo). Promover o tenant existente evita perda de dados e acelera go-live controlado.

Opção A (`POST /api/companies`) permanece disponível para provisioning futuro.

---

## Etapa 2 — Provisionamento

| Critério | Estado | Evidência |
|----------|--------|-----------|
| `tenant_created` | ✅ | Empresa activa na BD |
| `tenant_active` | ✅ | `active=true` |
| Admin/CEO | ✅ | Utilizadores `ceo`/`diretor`/`admin` presentes |

---

## Etapa 3 — Pilot Lists

Tenant `511f4819` adicionado (additive) a:

| Lista | Estado |
|-------|--------|
| `IMPETUS_AIOI_PILOT_TENANTS` | ✅ (3/3 máx.) |
| `IMPETUS_RLS_PILOT_TENANTS` | ✅ |
| `IMPETUS_MFA_PILOT_TENANTS` | ✅ |
| `IMPETUS_FEDERATION_PILOT_TENANTS` | ✅ |
| `IMPETUS_ACTION_RUNTIME_PILOT_TENANTS` | ✅ (já presente) |
| `IMPETUS_WORKFLOW_ENGINE_PILOT_TENANTS` | ✅ (já presente) |

`pm2 restart impetus-backend --update-env` executado.

---

## Etapa 4 — Perfis

```json
{
  "ceo": true,
  "cfo": true,
  "rh_manager": true,
  "maintenance_manager": true,
  "safety_manager": true,
  "environment_manager": true,
  "production_manager": true
}
```

---

## Etapa 5 — Executive Go-Live

Fluxo CEO validado: Login → Boardroom → Executive Queue → Smart Summary → CEO Chat.

---

## Etapa 6 — Domain Go-Live

```json
{
  "safety_go_live": true,
  "environment_go_live": true,
  "hr_go_live": true,
  "financial_go_live": true,
  "maintenance_go_live": true
}
```

---

## Etapa 7 — AIOI Tenant Validation

Snapshot tenant-scoped projectado (additive):

```
snapshot_id: 45fa5ca3-2f70-4e50-b442-67b74a266344
company_id: 511f4819-fc48-479e-b11e-49ba4fb9c81b
item_count: 0 (IOE tenant=0; pipeline activo)
```

```json
{
  "tenant_scoped_executive_queue": true,
  "tenant_scoped_snapshots": true,
  "tenant_scoped_insights": true
}
```

Insights tenant-scoped via `financial_leakage_reports` com AI suggestion (6 relatórios).

---

## Etapa 8 — Food Base API

`GET /api/m1/foodbase/status` → **401** (rota live, auth required)  
Readiness M1.8: `FOOD_BASE_GO_LIVE_READY`

---

## Artefactos

| Camada | Ficheiro |
|--------|----------|
| Serviço | `backend/src/services/audit/foodBasePilotProvisioningService.js` |
| Rotas | `backend/src/routes/m1FoodBasePilotRoutes.js` |
| Registo | `backend/src/server.js` → `/api/m1/foodbase-pilot` |
| Frontend API | `frontend/src/services/api.js` → `m1FoodBasePilot` |
| Widget | `WidgetAIOIScale.jsx` → **FOOD BASE PILOT GO-LIVE (M1.10)** |
| Config | `backend/.env` — pilot lists actualizadas |

---

## APIs M1.10

```
GET /api/m1/foodbase-pilot/status
GET /api/m1/foodbase-pilot/strategy
GET /api/m1/foodbase-pilot/provisioning
GET /api/m1/foodbase-pilot/pilot-lists
GET /api/m1/foodbase-pilot/profiles
GET /api/m1/foodbase-pilot/executive
GET /api/m1/foodbase-pilot/domains
GET /api/m1/foodbase-pilot/aioi
GET /api/m1/foodbase-pilot/foodbase-api
```

---

## Sequência autorizada pós-M1

```text
M1.10 Food Base Pilot Active  ← concluído
↓
Pilot Operation Window (7–30 dias)
↓
M2 MES Operational
↓
M3 Logistics Operational
↓
M4 Analytics Operational
```

---

## Notas

- **MES / Logistics / Analytics:** não implementados nesta fase (conforme spec).
- **Ciclo M1 encerrado** com tenant piloto real em produção controlada.
- Janela piloto recomendada: 7–30 dias de operação monitorizada antes de M2.
