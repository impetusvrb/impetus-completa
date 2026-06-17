# M1.9 — Pilot Execution Dry Run (Consolidated)

**Data:** 2026-06-16  
**Fase:** M1.9 — Pilot Execution Dry Run  
**Pré-requisito:** M1.8 `FOOD_BASE_GO_LIVE_READY` · M1.7 `M1_7_PILOT_READINESS_SIMULATION_COMPLETE`  
**Modo:** READ ONLY · Additive only · No schema changes · No domain creation · Truth Program · AIOI · TRI-AI · P0A–P0E preservados

---

## Tenant proxy

```json
{
  "company_id": "511f4819-fc48-479e-b11e-49ba4fb9c81b",
  "company_name": "Fresh & Fit Indústria de Alimentos Naturais Ltda",
  "mode": "pilot_proxy"
}
```

---

## Veredicto

```json
{
  "phase": "M1.9",
  "pass": true,
  "verdict": "PILOT_EXECUTION_READY"
}
```

---

## Critérios finais

```json
{
  "ceo_journey_complete": true,
  "cfo_journey_complete": true,
  "hr_journey_complete": true,
  "safety_journey_complete": true,
  "environment_journey_complete": true,
  "maintenance_journey_complete": true,
  "navigation_ready": true,
  "pilot_execution_ready": true
}
```

---

## Resumo executivo

M1.9 executa uma **simulação completa de onboarding e utilização** com o tenant real **Fresh & Fit** (`511f4819`). Diferente de M1.7 (validação platform-wide), M1.9 valida a experiência final **scoped ao tenant piloto** — login, jornadas por persona e navegação ≤3 passos.

| Cenário | Fluxo | Status | Evidência-chave (tenant) |
|---------|-------|--------|--------------------------|
| **CEO** | Login → Boardroom → Queue → Smart Summary → CEO Chat | ✅ READY | Utilizador CEO existente · boardroom activo · queue platform · chat ON |
| **CFO** | Login → Financial Leakage → AI Suggestions → Costs | ✅ READY | VIEW_FINANCIAL · 6 leakage reports · 100% com AI suggestion |
| **RH** | Login → HR Dashboard → Indicators → Reports | ✅ READY | VIEW_HR · 1 hr_indicators_snapshot · hr_native activo |
| **SST** | Workspace → Incidents → Insights | ✅ READY | 45 ai_incidents · safety operational runtime ON |
| **Ambiental** | Workspace → ESG → Executive ESG | ✅ READY | environment operational + executive runtime ON |
| **Manutenção** | MANUIA → Diagnostics → Work Orders | ✅ READY | ENABLE_MANUIA · maintenance cognitive runtime ON |
| **Navegação** | SST · Ambiental · RH · Financeiro · Executive · MANUIA | ✅ READY | 6 módulos · ≤2 passos cada (limite 3) |

---

## Evidências BD (Fresh & Fit)

| Recurso | Valor | Relevância |
|---------|-------|------------|
| Utilizador CEO | Juh rodrigues (`role=ceo`) | Cenário 1 — Login |
| `ai_incidents` | **45** | Cenário 4 — Incidents |
| `financial_leakage_reports` | **6** (100% AI suggestion) | Cenário 2 — Leakage + AI |
| `hr_indicators_snapshot` | **1** | Cenário 3 — Indicators |
| `aioi_executive_queue_snapshot` (tenant) | **0** | Tenant fora de `IMPETUS_AIOI_PILOT_TENANTS` |
| `aioi_executive_queue_snapshot` (platform) | **13.998+** | Queue UI acessível via snapshots globais |

---

## Notas operacionais

1. **AIOI pilot gap:** Fresh & Fit está em `IMPETUS_ACTION_RUNTIME_PILOT_TENANTS` mas **não** em `IMPETUS_AIOI_PILOT_TENANTS`. Snapshots executivos tenant-scoped ficam vazios até inclusão — a jornada CEO passa via queue platform + boardroom activo.
2. **Sem alterações de arquitectura:** Nenhum módulo novo, nenhum MES, nenhuma migração de schema.
3. **APIs read-only:** Todas as rotas são GET; o serviço não persiste dados.

---

## Artefactos

| Camada | Ficheiro |
|--------|----------|
| Serviço | `backend/src/services/audit/pilotExecutionDryRunService.js` |
| Rotas | `backend/src/routes/m1PilotExecutionRoutes.js` |
| Registo | `backend/src/server.js` → `/api/m1/pilot-execution` |
| Frontend API | `frontend/src/services/api.js` → `m1PilotExecution` |
| Widget | `WidgetAIOIScale.jsx` → secção **PILOT EXECUTION DRY RUN (M1.9)** |

---

## APIs

```
GET /api/m1/pilot-execution/status
GET /api/m1/pilot-execution/ceo
GET /api/m1/pilot-execution/cfo
GET /api/m1/pilot-execution/hr
GET /api/m1/pilot-execution/safety
GET /api/m1/pilot-execution/environment
GET /api/m1/pilot-execution/maintenance
GET /api/m1/pilot-execution/navigation
```

Todas requerem autenticação (`requireAuth`).

---

## Próximo passo recomendado

Para snapshots executivos tenant-scoped em produção piloto:

```bash
# Adicionar prefixo ao IMPETUS_AIOI_PILOT_TENANTS no .env
IMPETUS_AIOI_PILOT_TENANTS=511f4819,...
pm2 restart impetus-backend --update-env
```
