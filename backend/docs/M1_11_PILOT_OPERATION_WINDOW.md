# M1.11 — Pilot Operation Window (Consolidated)

**Data:** 2026-06-16  
**Fase:** M1.11 — Pilot Operation Window  
**Pré-requisito:** M1.10 `FOOD_BASE_PILOT_ACTIVE`  
**Modo:** READ ONLY · No mock · No data generation · Truth Program · AIOI · TRI-AI preservados

---

## Tenant piloto

```json
{
  "company_id": "511f4819-fc48-479e-b11e-49ba4fb9c81b",
  "company_name": "Fresh & Fit Indústria de Alimentos Naturais Ltda",
  "pilot_alias": "Food Base Pilot"
}
```

---

## Veredicto

```json
{
  "phase": "M1.11",
  "pass": false,
  "verdict": "PILOT_OPERATION_WINDOW_PARTIAL"
}
```

---

## Critérios finais

```json
{
  "executive_operational": true,
  "financial_operational": true,
  "hr_operational": true,
  "safety_operational": true,
  "environment_operational": false,
  "maintenance_operational": false,
  "tenant_activity_confirmed": true,
  "runtime_health_confirmed": true,
  "pilot_operation_window_complete": false
}
```

**5/8 critérios** · Blockers: `environment_operational`, `maintenance_operational`

---

## Resumo por domínio

| Domínio | Status | Evidência-chave |
|---------|--------|-----------------|
| **Executive** | OPERATIONAL | 65 snapshots/7d · 310 smart_summary · 18 CEO chat traces |
| **Financial** | OPERATIONAL | 6 leakage + AI · 6 users VIEW_FINANCIAL activos |
| **HR** | OPERATIONAL | 1 hr snapshot · 6 users VIEW_HR activos |
| **Safety** | OPERATIONAL | 45 ai_incidents (histórico) |
| **Environment** | PARTIAL | 0 IOE/telemetria tenant-scoped |
| **Maintenance** | PARTIAL | 0 IOE/casos manutenção tenant-scoped |
| **Tenant Activity** | OPERATIONAL | 12 users · 429 traces · 4 exec · 7 ops |
| **Runtime Health** | OPERATIONAL | TRI-AI UP · Truth · AIOI enabled |

---

## Gate M2

```json
{
  "m2_gate": {
    "authorized": false,
    "requires": "pilot_operation_window_complete=true",
    "next_phase": null
  }
}
```

**M2 MES Operational** permanece **bloqueado** até utilização operacional contínua em Ambiental e Manutenção.

---

## Janela de observação

| Parâmetro | Valor |
|-----------|-------|
| `M1_11_OPERATION_WINDOW_DAYS` | 30 (default) |
| `M1_11_RECENT_WINDOW_DAYS` | 7 (default) |

Recomendação: operar piloto **7–30 dias**, recolher eventos ambientais e de manutenção tenant-scoped, re-executar `GET /api/m1/pilot-operation/status`.

---

## Artefactos

| Camada | Ficheiro |
|--------|----------|
| Serviço | `backend/src/services/audit/pilotOperationWindowService.js` |
| Rotas | `backend/src/routes/m1PilotOperationRoutes.js` |
| API | `GET /api/m1/pilot-operation/*` |
| Widget | **PILOT OPERATION WINDOW (M1.11)** |

---

## Sequência

```text
M1.10 Food Base Pilot Active          ✅
M1.11 Pilot Operation Window          ⏳ PARTIAL (5/8)
  ↓ (quando complete)
M2 MES Operational                    🔒 GATE FECHADO
```

---

## Invariantes

Truth Program · AIOI · TRI-AI · P0A–P0E · Multi-tenant · RLS · MFA · Federation — **preservados**. Sem alteração de schemas. Sem dados artificiais.
