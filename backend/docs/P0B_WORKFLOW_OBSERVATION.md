# P0B — Workflow Observation

**Gerado:** 2026-06-14T23:23:46.093Z

---

## Métricas (P0B.3)

```json
{
  "observation_window_days": 7,
  "total_instances": 6,
  "executed": 6,
  "completed": 1,
  "running": 5,
  "cancelled": 0,
  "failed": 0,
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
  "window_activity": [],
  "hitl": {
    "approved": 4,
    "pending": 0,
    "queue": [
      {
        "status": "approved",
        "cnt": 4
      }
    ]
  },
  "workflow_health": true,
  "unexpected_failures": 0
}
```

## Critério

```json
{
  "workflow_health": true,
  "unexpected_failures": 0
}
```

---

*HITL via ai_action_approval_queue — sem bypass.*
