# M1.8 — Maintenance Onboarding Journey (Food Base Prospective)

**Data:** 2026-06-16

---

## Veredicto

```json
{
  "maintenance_onboarding_complete": true,
  "maintenance_ready": true,
  "status": "READY"
}
```

---

## Jornada simulada

```
Maintenance Login → MANUIA → Work Orders → Executive Queue
```

| Passo | Evidência |
|-------|-----------|
| Maintenance Login | Role mapping coordenador/gerente |
| MANUIA | `maintenance_native` + `/api/manutencao-ia/*` |
| Work Orders | API work-orders pronta |
| Executive Queue | **13.672+** snapshots; 1 IOE `equipment_failure` captado |
