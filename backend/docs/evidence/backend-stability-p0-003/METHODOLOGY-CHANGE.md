# Methodology change — soak monitor (Phase 0 gate)

**Timestamp UTC:** 2026-07-14T13:39:30Z

## Finding

`soak-monitor.sh` v1 executed on every 5-minute sample:

```sql
SELECT count(*) FROM industrial_event_outbox WHERE status='delivered';
SELECT count(*) FROM industrial_event_outbox WHERE status='pending';
```

Evidence:
- Sample 1: ~44s collection window (delivered=10691173)
- Sample 2: ~53s collection window (delivered=10692656)
- Table: ~28 GB, ~10.7M delivered rows
- Indexes: no efficient path for COUNT delivered-only (pending uses partial index)

**Impact estimate v1:** up to ~48 heavy scans over 4h if every sample ran full COUNT on delivered.

## Action taken

| Item | Decision |
|---|---|
| Full COUNT delivered every 5 min | **STOPPED** |
| Other metrics (PM2, HTTP, pool, pg_stat_activity) | **PRESERVED** |
| Pending COUNT | **KEPT** — EXACT_COUNT via partial index (fast) |
| Table row trend | `pg_stat_user_tables.n_live_tup` — **ESTIMATED_COUNT** |
| Delivered exact | **EXACT_COUNT** only at hour checkpoints |
| Archive progress | **ARCHIVE_LOG_DERIVED** from `[INDUSTRIAL_ARCHIVE]` logs |
| Backend restart | **NO** |
| Soak T0/end window | **NOT RESET** (T0=13:27:05Z, end=17:27:05Z) |

## Sample classification for P0-003

| Samples | Methodology | Notes |
|---------|-------------|-------|
| 0001–0002 | `v1_interfering` | EXACT_COUNT delivered; may have added PG load |
| 0003+ | `v2_non_interfering` | No heavy delivered COUNT between checkpoints |

## Production code

**No production code changed.** Monitor script only.
