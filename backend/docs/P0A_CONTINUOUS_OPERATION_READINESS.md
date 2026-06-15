# P0A — Continuous Operation Readiness

**Gerado:** 2026-06-14T22:44:59.584Z  
**Modo:** READ ONLY · VALIDATION ONLY  
**Veredicto:** `CONTINUOUS_OPERATION_ACTIVATION_READY`

---

## Resumo

```json
{
  "activation_ready": true,
  "blocking_issues": 0,
  "continuous_runtime_ready": true
}
```

## Pré-condições

```json
{
  "db": {
    "available": true
  },
  "core_tables": {
    "validated": true,
    "tables_checked": [
      "industrial_operational_events",
      "aioi_outbox",
      "plc_collected_data",
      "edge_runtime_queue"
    ],
    "missing": []
  },
  "pm2": {
    "found": true,
    "status": "online",
    "restarts": 363,
    "created_at": "2026-06-10T14:36:01.582Z"
  },
  "tenant_isolation": {
    "validated": true,
    "aioi_enabled": false,
    "pilot_tenants": [],
    "pilot_tenants_count": 0,
    "rls_enabled": true,
    "rls_mode": "on",
    "tenant_isolation": "company_id scoped operations + RLS flags readable"
  }
}
```

## Workers & leases

```json
{
  "workers": {
    "env": {
      "outbox_worker_enabled": false,
      "continuous_ingestion_enabled": false,
      "event_pipeline_env_enabled": false,
      "aioi_enabled": false
    },
    "boot_log": {
      "event_pipeline_boot_ok": false,
      "outbox_worker_boot_active": false,
      "continuous_worker_boot_active": false
    },
    "in_process_status": {
      "outbox": {
        "worker_enabled": false,
        "aioi_enabled": false,
        "worker_running": false,
        "scheduler_active": false,
        "shutting_down": false,
        "cycle_in_progress": false,
        "run_count": 0,
        "last_run": null,
        "last_error": null,
        "interval_ms": 30000,
        "batch_size": 10,
        "pilot_tenants": [],
        "pilot_config_ok": true,
        "pilot_config_errors": []
      },
      "continuous": {
        "layer": "AIOI_CONTINUOUS_WORKER",
        "worker_enabled": false,
        "continuous_runtime_flag": false,
        "aioi_enabled": false,
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
        "pilot_tenants": [],
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
              "tenants": []
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
    "live_runtime": {
      "api_reachable": true,
      "continuous_worker_enabled": false,
      "continuous_worker_running": false,
      "worker_status": "IDLE",
      "run_count": 0,
      "last_run_at": null,
      "outbox_pending": 0,
      "outbox_failed": 0
    }
  },
  "leases": {
    "mechanism": "PostgreSQL advisory lock (single-instance)",
    "keys": {
      "outbox_worker": 8820202606,
      "continuous_worker": 8820202607
    },
    "validated": true
  },
  "scheduler": {
    "validated": true,
    "outbox_interval_ms": 30000,
    "continuous_interval_ms": 30000,
    "outbox_batch_size": 10,
    "scheduler_mode": "setInterval controlled (advisory lock single-instance)"
  }
}
```

## Pipeline PLC & Outbox

```json
{
  "pipeline_plc": {
    "validated": true,
    "plc_telemetry_active": true,
    "records_last_hour": 360,
    "total_records": 845470,
    "last_collected_at": "2026-06-14T22:44:54.930Z"
  },
  "outbox": {
    "validated": true,
    "total": 13155,
    "delivered": 13155,
    "pending": 0,
    "failed": 0,
    "delivery_rate_pct": 100,
    "last_processed_at": "2026-06-12T22:32:50.291Z",
    "healthy": true
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
  }
}
```

## Activation gaps (operador)

- Workers desactivados por env (passo operador: IMPETUS_AIOI_OUTBOX_WORKER_ENABLED + CONTINUOUS_RUNTIME)
- EVENT_PIPELINE desactivado ou boot não ok (passo operador: IMPETUS_EVENT_PIPELINE_ENABLED + restart manual)
- Continuous worker não em execução (esperado até activação manual pós-restart)

---

*P0A.1/P0A.2 — validação read-only. Sem activação automática.*
