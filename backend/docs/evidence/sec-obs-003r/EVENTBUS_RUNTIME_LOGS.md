# EVENTBUS_RUNTIME_LOGS

**Emitido em:** 2026-07-23 20:01 UTC  
**Fase:** SEC-OBS-003R  

---

## Reload Log (JSON)

```json
{
  "reload_at": "2026-07-23T19:59:48.702484+00:00",
  "pre_pid": 3180185,
  "post_pid": 3181502,
  "pid_changed": true,
  "status": "online",
  "pre_restarts": 27,
  "post_restarts": 28,
  "eventbus_sha256": "e29db70ccf4d7a21130f0ab2e0382f3ac4b4055b2462157241e23f9ef4dade71",
  "eventbus_has_buildDedupKey": true,
  "eventbus_has_INT_DEDUP_001": true
}
```

---

## Runtime Validation Log

```
[2026-07-23T20:01:06.077Z] [PASS] eventbus_buildDedupKey_loaded
[2026-07-23T20:01:06.079Z] [PASS] eventbus_key_strategy_active
[2026-07-23T20:01:07.250Z] [PASS] chown_user_uid: count=1
[2026-07-23T20:01:07.255Z] [PASS] chgrp_group_gid: count=1
[2026-07-23T20:01:07.267Z] [PASS] chown_user_group_simultaneous: count=2 attrs=["UID","GID"] dedup=0
[2026-07-23T20:01:07.267Z] [PASS] pipeline_correlation_processed: processed=4 persisted=4
[2026-07-23T20:01:07.267Z] [PASS] pipeline_state_store_updated: last=INTEGRITY_OWNER_CHANGED
[2026-07-23T20:01:07.269Z] [PASS] pipeline_dashboard_consumer_intact
[2026-07-23T20:01:07.269Z] [PASS] repeat_within_window_blocked: received=0 dedup_delta=2
[2026-07-23T20:01:07.271Z] [PASS] repeat_after_window_allowed: count=2
[2026-07-23T20:01:07.271Z] [PASS] window_expiry_allows_identical
[2026-07-23T20:01:07.272Z] [PASS] regression_hash: types=["INTEGRITY_HASH_CHANGED"]
[2026-07-23T20:01:07.276Z] [PASS] regression_chmod
[2026-07-23T20:01:07.277Z] [PASS] regression_delete
[2026-07-23T20:01:07.277Z] [PASS] regression_restore_clean: ghost=0
[2026-07-23T20:01:07.291Z] [PASS] regression_auditd_rules
[2026-07-23T20:01:08.395Z] [PASS] regression_medium_hash
[2026-07-23T20:01:08.395Z] [PASS] live_sensor_watch: mode=WATCH
[2026-07-23T20:01:08.411Z] [PASS] backend_health_200: http=200

```

---

## Estado Produção Pós-Reload

```json
{
  "mode": "WATCH",
  "sensor_active": true,
  "violations": 10,
  "baseline_id": null,
  "note": "2 violations=INT-LIM-001 drift pending BASELINE-003"
}
```

---

## Nota

As 2 violations em produção (`INT-C-010`, `INT-M-003`) são drift legítimo da INT-LIM-001 (regras auditd) e serão consolidadas em SEC-BASELINE-003. Não constituem regressão da INT-DEDUP-001.
