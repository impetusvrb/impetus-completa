# AIOI-P1K — Rollout Registry

**Data:** 2026-06-13  
**Camada:** `AIOI_PRODUCTION_ROLLOUT_REGISTRY`  
**Veredito:** `AIOI_P1K_ENTERPRISE_DEPLOYMENT_GOVERNANCE_PASS`

---

## Serviço

`backend/src/services/aioi/runtime/aioiProductionRolloutRegistryService.js`

Registro in-memory (ring buffer 200 entradas):

| Função | Descrição |
|--------|-----------|
| `registerRollout()` | Regista rollout (sem executar) |
| `registerRollback()` | Regista rollback (sem executar) |
| `registerRolloutAttempt()` | Regista tentativa |
| `getRolloutHistory()` | Histórico |
| `getRolloutStatus()` | Status consolidado |

---

## Simulação certificada

```json
{
  "rollout_registered": true,
  "rollback_registered": true,
  "rollouts_registered": 1,
  "rollbacks_registered": 1
}
```

Cada entrada inclui `executed: false` e nota `registry_only`.

---

## API

```
GET /api/aioi/production/rollouts
```
