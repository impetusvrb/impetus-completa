# P0D — Runtime Stabilization

**Gerado:** 2026-06-15T15:31:03.994Z

## P0D.2 — Early flow

```json
{
  "window_minutes": 60,
  "new_ioe_count": 0,
  "new_ioe_detected": false,
  "events_per_tenant": [],
  "new_outbox_items": 0,
  "new_outbox_deliveries": 0,
  "new_outbox_delivery_detected": false,
  "first_ioe_at": null,
  "first_delivery_at": null
}
```

## P0D.3 — Stabilization (24h)

```json
{
  "window_hours": 24,
  "ioe_in_window": 0,
  "outbox_in_window": 0,
  "throughput_ioe_per_hour": 0,
  "backlog_pending": 0,
  "failed_total": 0,
  "retries_in_window": 0,
  "hourly_ioe": [],
  "runtime_stable": true
}
```

## Critério

```json
{
  "new_ioe_detected": false,
  "new_outbox_delivery_detected": false,
  "runtime_stable": true
}
```
