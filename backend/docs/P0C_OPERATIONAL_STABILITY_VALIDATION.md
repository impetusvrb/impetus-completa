# P0C — Operational Stability Validation

**Gerado:** 2026-06-15T15:30:22.336Z

```json
{
  "pm2": {
    "found": true,
    "status": "online",
    "restarts": 366,
    "unstable_restarts": 0,
    "uptime_ms": 373721,
    "uptime_hours": 0.1,
    "memory_bytes": 0,
    "cpu_pct": 0
  },
  "queue_health": {
    "validated": true,
    "edge_queue_pending": 0,
    "workflow_by_status": [
      {
        "status": "completed",
        "cnt": 1
      },
      {
        "status": "running",
        "cnt": 5
      }
    ],
    "queue_healthy": true
  },
  "critical_failures": 0,
  "platform_stable": true
}
```

## Critério

```json
{
  "critical_failures": 0,
  "platform_stable": true
}
```
