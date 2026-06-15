# P0A — Operational Observation

**Gerado:** 2026-06-14T22:44:59.797Z  
**Janela:** 1h

---

## Métricas observacionais (P0A.4)

```json
{
  "events_per_hour": {
    "ioe": 0,
    "outbox": 0,
    "plc_telemetry": 360
  },
  "events_per_tenant": [],
  "outbox_delivery": {
    "window_total": 0,
    "delivered": 0,
    "delivery_rate_pct": null
  },
  "workflow_activity": {
    "by_status": [
      {
        "status": "running",
        "cnt": 5
      },
      {
        "status": "completed",
        "cnt": 1
      }
    ],
    "running": 5,
    "completed": 1,
    "workflow_rate_per_hour": null
  },
  "ceo_activity": {
    "traces_last_window": 0
  },
  "ia_activity": {
    "by_module": [],
    "total_last_window": 0
  },
  "active_tenants_24h": 0
}
```

## Dashboard metrics

```json
{
  "ioe_per_hour": 0,
  "outbox_delivery_rate_pct": null,
  "active_tenants": 0,
  "plc_telemetry_rate_per_hour": 360,
  "workflow_running": 5,
  "queue_health": "edge_pending_check_via_readiness"
}
```

---

*Modo observacional read-only.*
