#!/usr/bin/env bash
# IMPETUS-BACKEND-STABILITY-P0-002/003 — soak monitor (non-interfering)
# Methodology v2: no full COUNT(*) on industrial_event_outbox per sample.
set -euo pipefail
EVIDENCE="/var/www/impetus-completa/backend/docs/evidence/backend-stability-p0-002"
SAMPLES="$EVIDENCE/samples"
INTERVAL_SEC="${SOAK_INTERVAL_SEC:-300}"
# Original T0 window preserved when resuming after methodology fix
SOAK_T0_EPOCH="${SOAK_T0_EPOCH:-$(date -d '2026-07-14 13:27:05 UTC' +%s 2>/dev/null || echo 0)}"
END_EPOCH="${SOAK_END_EPOCH:-$(( SOAK_T0_EPOCH + ${SOAK_DURATION_SEC:-14400} ))}"
SAMPLE_N="${SOAK_SAMPLE_OFFSET:-0}"
METHODOLOGY="${SOAK_METHODOLOGY:-v2_non_interfering}"

log() { echo "[soak-monitor] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

# Cheap pending count — uses partial index idx_industrial_outbox_status_next
outbox_pending_exact() {
  sudo -u postgres psql -d impetus_db -tAc \
    "SELECT count(*) FROM industrial_event_outbox WHERE status='pending';" 2>/dev/null | tr -d ' ' || echo "na"
}

# PostgreSQL estimate — NOT exact row count by status
outbox_table_estimate() {
  sudo -u postgres psql -d impetus_db -tAc \
    "SELECT n_live_tup FROM pg_stat_user_tables WHERE relname='industrial_event_outbox';" 2>/dev/null | tr -d ' ' || echo "na"
}

# Controlled exact count — only at checkpoints (hour boundaries)
outbox_delivered_exact() {
  sudo -u postgres psql -d impetus_db -tAc \
    "SELECT count(*) FROM industrial_event_outbox WHERE status='delivered';" 2>/dev/null | tr -d ' ' || echo "na"
}

should_run_checkpoint() {
  local now_min=$(( $(date +%s) / 60 ))
  local t0_min=$(( SOAK_T0_EPOCH / 60 ))
  local elapsed_min=$(( now_min - t0_min ))
  # Checkpoint at T0 and each full hour elapsed (0, 60, 120, 180, 240 min)
  [ $(( elapsed_min % 60 )) -le 5 ] || [ "$elapsed_min" -lt 3 ]
}

archive_log_since_t0() {
  local logf="/root/.pm2/logs/impetus-backend-out.log"
  [ -f "$logf" ] || { echo "[]"; return; }
  # Parse INDUSTRIAL_ARCHIVE JSON lines since soak T0 (best-effort)
  awk '/\[INDUSTRIAL_ARCHIVE\]/{print}' "$logf" | tail -20 | while read -r line; do
    echo "$line" | sed 's/^\[INDUSTRIAL_ARCHIVE\] //'
  done | node -e "
    let d=''; process.stdin.on('data',c=>d+=c);
    process.stdin.on('end',()=>{
      const rows=d.trim().split('\n').filter(Boolean);
      const parsed=[];
      for (const r of rows) { try { parsed.push(JSON.parse(r)); } catch(e){} }
      const totalArchived=parsed.reduce((a,x)=>a+(x.archived||0),0);
      const totalDeleted=parsed.reduce((a,x)=>a+(x.deleted||0),0);
      console.log(JSON.stringify({cycles_observed:parsed.length,total_archived_logged:totalArchived,total_deleted_logged:totalDeleted,recent:parsed.slice(-5)}));
    });
  " 2>/dev/null || echo '{"error":"archive_log_parse"}'
}

collect_sample() {
  SAMPLE_N=$((SAMPLE_N + 1))
  local ts out checkpoint="false"
  ts=$(date -u +%Y-%m-%dT%H:%M:%SZ)
  out="$SAMPLES/sample-$(printf '%04d' "$SAMPLE_N")-${ts//:/-}.json"

  local pid rss restarts uptime_sec
  pid=$(pm2 pid impetus-backend 2>/dev/null || echo "0")
  restarts=$(pm2 jlist 2>/dev/null | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const a=JSON.parse(d);const b=a.find(x=>x.name==='impetus-backend');
      console.log(b?.pm2_env?.restart_time??0);}catch(e){console.log(0);}
    });" 2>/dev/null || echo "0")
  uptime_sec=$(pm2 jlist 2>/dev/null | node -e "
    let d='';process.stdin.on('data',c=>d+=c);process.stdin.on('end',()=>{
      try{const a=JSON.parse(d);const b=a.find(x=>x.name==='impetus-backend');
      console.log(Math.floor((Date.now()-(b?.pm2_env?.pm_uptime||Date.now()))/1000));}catch(e){console.log(0);}
    });" 2>/dev/null || echo "0")

  if [ -n "$pid" ] && [ "$pid" != "0" ] && [ -r "/proc/$pid/status" ]; then
    rss=$(awk '/VmRSS/{print $2}' "/proc/$pid/status" 2>/dev/null || echo "0")
  else
    rss="0"
  fi

  local health_code health_time bot_code bot_time
  local t_before t_after
  t_before=$(date +%s%3N)
  health_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4000/api/health 2>/dev/null || echo "000")
  health_time=$(curl -s -o /dev/null -w '%{time_total}' --max-time 5 http://127.0.0.1:4000/api/health 2>/dev/null || echo "0")
  bot_code=$(curl -s -o /dev/null -w '%{http_code}' --max-time 5 http://127.0.0.1:4000/api/impetus-admin/auth/bot-config 2>/dev/null || echo "000")
  bot_time=$(curl -s -o /dev/null -w '%{time_total}' --max-time 5 http://127.0.0.1:4000/api/impetus-admin/auth/bot-config 2>/dev/null || echo "0")
  t_after=$(date +%s%3N)
  local sample_collect_ms=$(( t_after - t_before ))

  local df_used df_avail load mem_avail swap_used
  df_used=$(df -h / | awk 'NR==2{print $5}')
  df_avail=$(df -h / | awk 'NR==2{print $4}')
  load=$(uptime | awk -F'load average:' '{print $2}' | xargs)
  mem_avail=$(free -m | awk '/^Mem:/{print $7}')
  swap_used=$(free -m | awk '/^Swap:/{print $3}')

  local pg_active pg_idle pg_iit pg_total pool_stats
  pg_active=$(sudo -u postgres psql -d impetus_db -tAc "SELECT count(*) FROM pg_stat_activity WHERE datname='impetus_db' AND state='active';" 2>/dev/null | tr -d ' ' || echo "na")
  pg_idle=$(sudo -u postgres psql -d impetus_db -tAc "SELECT count(*) FROM pg_stat_activity WHERE datname='impetus_db' AND state='idle';" 2>/dev/null | tr -d ' ' || echo "na")
  pg_iit=$(sudo -u postgres psql -d impetus_db -tAc "SELECT count(*) FROM pg_stat_activity WHERE datname='impetus_db' AND state='idle in transaction';" 2>/dev/null | tr -d ' ' || echo "na")
  pg_total=$(sudo -u postgres psql -d impetus_db -tAc "SELECT count(*) FROM pg_stat_activity WHERE datname='impetus_db';" 2>/dev/null | tr -d ' ' || echo "na")

  pool_stats=$(cd /var/www/impetus-completa/backend && node -e "
    require('./src/config/loadEnv').loadImpetusEnv();
    const db=require('./src/db');
    console.log(JSON.stringify(db.getPoolStats()));
  " 2>/dev/null || echo '{"error":"pool_unavailable"}')

  local outbox_pending outbox_table_est outbox_delivered_exact_val="null"
  local delivered_count_type="ESTIMATED_COUNT"
  outbox_pending=$(outbox_pending_exact)
  outbox_table_est=$(outbox_table_estimate)

  if should_run_checkpoint; then
    checkpoint="true"
    outbox_delivered_exact_val=$(outbox_delivered_exact)
    delivered_count_type="EXACT_COUNT"
  fi

  local archive_metrics
  archive_metrics=$(archive_log_since_t0)

  local oom_count
  oom_count=$(grep -c 'JavaScript heap out of memory' /root/.pm2/logs/impetus-backend-error.log 2>/dev/null || echo "0")

  cat > "$out" <<EOF
{
  "sample": $SAMPLE_N,
  "timestamp_utc": "$ts",
  "methodology": "$METHODOLOGY",
  "checkpoint": $checkpoint,
  "sample_collect_ms": $sample_collect_ms,
  "pm2": {"pid": "$pid", "restarts": $restarts, "uptime_sec": $uptime_sec, "rss_kb": $rss},
  "http": {
    "health": {"status": $health_code, "time_s": $health_time},
    "bot_config": {"status": $bot_code, "time_s": $bot_time}
  },
  "host": {"disk_used_pct": "$df_used", "disk_avail": "$df_avail", "load_avg": "$load", "mem_avail_mb": $mem_avail, "swap_used_mb": $swap_used},
  "postgresql": {"active": "$pg_active", "idle": "$pg_idle", "idle_in_tx": "$pg_iit", "total": "$pg_total"},
  "pool": $pool_stats,
  "outbox": {
    "pending_count": "$outbox_pending",
    "pending_count_type": "EXACT_COUNT",
    "table_live_estimate": "$outbox_table_est",
    "table_live_estimate_type": "ESTIMATED_COUNT",
    "delivered_exact_checkpoint": $([ "$checkpoint" = "true" ] && echo "\"$outbox_delivered_exact_val\"" || echo "null"),
    "delivered_count_type": "$delivered_count_type"
  },
  "archive_log_derived": $archive_metrics,
  "oom_log_total": $oom_count
}
EOF
  log "sample $SAMPLE_N written $(basename "$out") methodology=$METHODOLOGY checkpoint=$checkpoint collect_ms=$sample_collect_ms health=$health_code bot=$bot_code pending=$outbox_pending est=$outbox_table_est"
}

log "RESUME methodology=$METHODOLOGY end_epoch=$END_EPOCH sample_offset=$SAMPLE_N interval=${INTERVAL_SEC}s"
while [ "$(date +%s)" -lt "$END_EPOCH" ]; do
  collect_sample
  [ "$(date +%s)" -lt "$END_EPOCH" ] || break
  sleep "$INTERVAL_SEC"
done
log "END samples=$SAMPLE_N methodology=$METHODOLOGY"
echo "$SAMPLE_N" > "$EVIDENCE/soak-sample-count.txt"
date -u +%Y-%m-%dT%H:%M:%SZ > "$EVIDENCE/soak-end.txt"
