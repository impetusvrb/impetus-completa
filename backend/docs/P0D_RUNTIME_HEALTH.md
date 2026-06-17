# P0D — Runtime Health

**Gerado:** 2026-06-15T15:31:03.994Z

```json
{
  "pm2": {
    "found": true,
    "status": "online",
    "restarts": 366,
    "unstable_restarts": 0,
    "uptime_ms": 415468,
    "uptime_hours": 0.1,
    "memory_bytes": 0,
    "cpu_pct": 0
  },
  "workers": {
    "outbox": {
      "worker_enabled": true,
      "aioi_enabled": true,
      "worker_running": false,
      "scheduler_active": false,
      "shutting_down": false,
      "cycle_in_progress": false,
      "run_count": 0,
      "last_run": null,
      "last_error": null,
      "interval_ms": 30000,
      "batch_size": 10,
      "pilot_tenants": [
        "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
        "ffd94fb8-79f4-4a38-af21-fe596adfffb5"
      ],
      "pilot_config_ok": true,
      "pilot_config_errors": []
    },
    "continuous": {
      "layer": "AIOI_CONTINUOUS_WORKER",
      "worker_enabled": true,
      "continuous_runtime_flag": true,
      "aioi_enabled": true,
      "worker_running": false,
      "scheduler_active": false,
      "shutting_down": false,
      "cycle_in_progress": false,
      "run_count": 0,
      "started_at": null,
      "last_run": null,
      "last_error": null,
      "interval_ms": 30000,
      "batch_size": 10,
      "pilot_tenants": [
        "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
        "ffd94fb8-79f4-4a38-af21-fe596adfffb5"
      ],
      "pilot_config_ok": true,
      "activation_flags": {
        "IMPETUS_AIOI_REGISTRY_ACTIVE": false,
        "IMPETUS_AIOI_PARALLEL_TENANT_EXECUTION": false,
        "IMPETUS_AIOI_OWNERSHIP_RUNTIME_ACTIVE": false,
        "IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE": false,
        "IMPETUS_AIOI_WORKER_COUNT": 1,
        "IMPETUS_AIOI_WORKER_ID": 0,
        "rollback_instant": true
      },
      "tenant_source": "IMPETUS_AIOI_PILOT_TENANTS",
      "registry_active": false,
      "fallback_used": false,
      "ownership_runtime": {
        "active": false,
        "worker_count": 1,
        "distributed": false,
        "shard_count": 1,
        "worker_id": 0,
        "owned_shards": [
          0
        ],
        "shards": [
          {
            "shard_id": 0,
            "worker_id": 0,
            "tenants": [
              "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
              "ffd94fb8-79f4-4a38-af21-fe596adfffb5"
            ]
          }
        ],
        "deterministic": true
      },
      "distributed_runtime": {
        "IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE": false,
        "IMPETUS_AIOI_WORKER_COUNT": 1,
        "IMPETUS_AIOI_WORKER_ID": 0,
        "distributed": false,
        "rollback": "Set IMPETUS_AIOI_DISTRIBUTED_RUNTIME_ACTIVE=false"
      },
      "soak_metrics": {
        "events_processed": 0,
        "duplicates": 0,
        "failed": 0,
        "ownership_conflicts": 0,
        "lease_conflicts": 0,
        "cycles": 0,
        "started_at": null,
        "mode": "MEC-SOAK-equivalent"
      },
      "runtime_invariants": {
        "runtime_enabled": false,
        "runtime_active": false,
        "runtime_authorized": false,
        "cognitive_execution_allowed": false,
        "auto_execute_band": "none"
      },
      "metrics_summary": {
        "layer": "AIOI_RUNTIME_METRICS",
        "cycle_count": 0,
        "ingested_events": 0,
        "classified_events": 0,
        "projected_snapshots": 0,
        "latency_p50": 0,
        "latency_p95": 0,
        "latency_p99": 0
      }
    },
    "advisory_lock_keys": {
      "outbox_worker": 8820202606,
      "continuous_worker": 8820202607
    }
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
  "workers_ok": false,
  "runtime_health_ok": true,
  "memory_bytes": 0,
  "cpu_pct": 0
}
```

## Critério

```json
{
  "runtime_health_ok": true
}
```
