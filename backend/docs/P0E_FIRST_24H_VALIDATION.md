# P0E — First 24h Validation

**Gerado:** 2026-06-26T16:39:55.377Z

```json
{
  "window_hours": 24,
  "ioe_total": 16,
  "ioe_per_hour": 0.7,
  "deliveries_total": 0,
  "deliveries_per_hour": 0,
  "hourly_ioe": [
    {
      "hour": "2026-06-26T16:00:00.000Z",
      "cnt": 5
    },
    {
      "hour": "2026-06-26T15:00:00.000Z",
      "cnt": 3
    },
    {
      "hour": "2026-06-26T02:00:00.000Z",
      "cnt": 6
    },
    {
      "hour": "2026-06-25T16:00:00.000Z",
      "cnt": 1
    },
    {
      "hour": "2026-06-25T14:00:00.000Z",
      "cnt": 1
    }
  ],
  "backlog_pending": 0,
  "failed_total": 0,
  "retries_in_window": 0,
  "workers": {
    "outbox_running": false,
    "continuous_running": false
  },
  "pm2": {
    "found": true,
    "status": "online",
    "restarts": 496,
    "unstable_restarts": 0,
    "uptime_hours": 0,
    "memory_bytes": 0,
    "cpu_pct": 0
  },
  "first_24h_stable": true
}
```

## Critério

```json
{
  "first_24h_stable": true
}
```
