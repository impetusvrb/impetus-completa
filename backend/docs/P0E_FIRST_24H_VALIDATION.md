# P0E — First 24h Validation

**Gerado:** 2026-06-15T15:31:37.285Z

```json
{
  "window_hours": 24,
  "ioe_total": 13156,
  "ioe_per_hour": 548.2,
  "deliveries_total": 13155,
  "deliveries_per_hour": 548.1,
  "hourly_ioe": [
    {
      "hour": "2026-06-12T22:00:00.000Z",
      "cnt": 13100
    },
    {
      "hour": "2026-06-12T21:00:00.000Z",
      "cnt": 31
    },
    {
      "hour": "2026-06-12T20:00:00.000Z",
      "cnt": 10
    },
    {
      "hour": "2026-06-12T18:00:00.000Z",
      "cnt": 4
    },
    {
      "hour": "2026-06-12T17:00:00.000Z",
      "cnt": 6
    },
    {
      "hour": "2026-06-12T15:00:00.000Z",
      "cnt": 4
    },
    {
      "hour": "2026-06-12T04:00:00.000Z",
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
    "restarts": 366,
    "unstable_restarts": 0,
    "uptime_hours": 0.1,
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
