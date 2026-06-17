# M1.15 — AIOI Worker Health Investigation

**Data:** 2026-06-16  
**Modo:** READ ONLY

---

## Resultado

```json
{
  "worker_operational": true,
  "degraded_state_real": false,
  "root_cause_identified": true
}
```

---

## Observação M1.11

M1.11 reportou:

```json
{
  "worker_running": false,
  "status": "DEGRADED"
}
```

via `aioiOperationalHealthService.getHealthSnapshot()` durante audit em **processo Node isolado**.

---

## Validação runtime PM2 (2026-06-16)

| Endpoint | worker_running | status | outbox_pending | dlq |
|----------|----------------|--------|----------------|-----|
| `GET /api/aioi/health` | **true** | **HEALTHY** | 0 | 0 |
| `GET /api/aioi/runtime/health` | **true** (continuous) | **RUNNING** | 0 | 0 |

**Config activa:**

| Flag | Valor |
|------|-------|
| `IMPETUS_AIOI_ENABLED` | true |
| `IMPETUS_AIOI_QUEUE_ACTIVE` | true |
| `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED` | true |
| `IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED` | true |
| `IMPETUS_AIOI_PILOT_TENANTS` | 3 tenants (incl. `511f4819`) |

---

## Causa raiz

**Isolamento de contexto de medição** — não falha operacional real.

1. `aioiOutboxWorkerService.startWorker()` é invocado apenas no boot de `server.js` (processo PM2 `impetus-backend`)
2. Scripts/audits M1.x carregam o módulo num processo **sem** boot de workers → `getWorkerStatus().worker_running === false`
3. `aioiOperationalHealthService` marca `DEGRADED` quando `OUTBOX_WORKER_ENABLED && !worker_running`
4. M1.11 classifica AIOI como operacional mesmo em DEGRADED (enabled + queue active) — alerta é **falso positivo** fora do PM2

**Componentes verificados:**

| Componente | Estado PM2 |
|------------|------------|
| Queue active | ✅ |
| Outbox worker | ✅ RUNNING |
| Continuous worker | ✅ RUNNING (run_count 160+) |
| Scheduler / interval | ✅ activo |
| Outbox pending/failed | 0 / 0 |
| DLQ | 0 |

---

## Remediação (M1.16)

1. Audits M1.x devem consultar `GET /api/aioi/health` (PM2) ou detectar `process.env.PM2_HOME`
2. Documentar que `worker_running=false` em subprocess ≠ degradación real
3. Opcional: health probe que distingue "worker disabled" vs "worker not booted in this process"
