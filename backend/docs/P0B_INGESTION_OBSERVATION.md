# P0B — Ingestion Observation

**Gerado:** 2026-06-14T23:23:46.093Z

---

## Métricas (P0B.2)

```json
{
  "observation_window_days": 7,
  "events_per_hour": 0,
  "events_per_day": 0,
  "events_in_window": 13156,
  "events_per_tenant": [
    {
      "company_id": "ffd94fb8-79f4-4a38-af21-fe596adfffb5",
      "cnt": 13125
    },
    {
      "company_id": "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
      "cnt": 30
    },
    {
      "company_id": "60c76fe6-f4f4-4872-a669-4acd73cae396",
      "cnt": 1
    }
  ],
  "active_tenants": 3,
  "outbox_delivery_rate_pct": 100,
  "outbox_failed": 0,
  "outbox_pending": 0,
  "outbox_in_window": 13155,
  "edge_queue_pending": 0,
  "plc_telemetry_per_hour": 359,
  "plc_telemetry_per_day": 8639,
  "last_ioe_at": "2026-06-12T22:32:24.100Z",
  "hours_since_last_ioe": 48.9,
  "workers_env": {
    "outbox_worker_enabled": false,
    "continuous_runtime_enabled": false,
    "event_pipeline_enabled": false
  },
  "interruption_detected": false,
  "interruption_type": "ioe_paused_workers_disabled_by_config",
  "ingestion_healthy": true,
  "data_loss": 0
}
```

## Critério

```json
{
  "ingestion_healthy": true,
  "data_loss": 0
}
```

---

*industrial_operational_events · aioi_outbox · plc_collected_data*
