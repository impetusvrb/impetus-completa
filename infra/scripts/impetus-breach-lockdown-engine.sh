#!/bin/bash
# IMPETUS — Motor de lockdown por invasão multi-camada.
# Sourced por impetus-threat-watch.sh ou executado standalone.
set -euo pipefail

BREACH_DIR="${IMPETUS_BREACH_STATE_DIR:-/var/lib/impetus/breach-watch}"
LAYER_DIR="$BREACH_DIR/layers"
LOCKDOWN_SCRIPT="${IMPETUS_LOCKDOWN_SCRIPT:-/usr/local/bin/impetus-emergency-lockdown.sh}"
AUTO_LOCKDOWN="${IMPETUS_AUTO_LOCKDOWN_ENABLED:-false}"
LAYER_WINDOW_SEC="${IMPETUS_BREACH_LAYER_WINDOW_SEC:-900}"
MIN_LAYERS="${IMPETUS_BREACH_MIN_LAYERS:-2}"
LOG="${IMPETUS_THREAT_LOG:-/var/log/impetus-threat-watch.log}"

mkdir -p "$LAYER_DIR"

breach_log() {
  echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] BREACH $*" | tee -a "$LOG"
}

breach_is_locked() {
  [[ -f /var/lib/impetus/lockdown/active.json ]]
}

# IPs da equipa — nunca lockdown (Gustavo Next, Welligton celular IPv4/IPv6)
breach_is_trusted_ip() {
  if declare -F is_trusted_ip >/dev/null 2>&1; then
    is_trusted_ip "$1" && return 0
  fi
  local ip="$1"
  [[ "$ip" == "127.0.0.1" || "$ip" == "::1" ]] && return 0
  [[ "$ip" == 170.246.* ]] && return 0
  [[ "$ip" == 186.225.* ]] && return 0
  [[ "$ip" == 2804:2484:* ]] && return 0
  [[ "$ip" == 2804:2980:* ]] && return 0
  return 1
}

breach_mark_layer() {
  local ip="$1" layer="$2" detail="${3:-}"
  [[ -z "$ip" || "$ip" == "multi" ]] && return 0
  breach_is_locked && return 0
  local f="$LAYER_DIR/${ip//[:]/_}"
  local now
  now=$(date +%s)
  echo "${now}|${layer}|${detail}" >> "$f"
  # manter só janela recente
  local cutoff=$((now - LAYER_WINDOW_SEC))
  local tmp
  tmp=$(mktemp)
  while IFS='|' read -r ts lay det; do
    [[ -z "$ts" ]] && continue
    (( ts >= cutoff )) && echo "${ts}|${lay}|${det}"
  done < "$f" > "$tmp" 2>/dev/null || true
  mv "$tmp" "$f"
}

breach_count_distinct_layers() {
  local ip="$1"
  local f="$LAYER_DIR/${ip//[:]/_}"
  [[ ! -f "$f" ]] && echo 0 && return
  cut -d'|' -f2 "$f" 2>/dev/null | sort -u | wc -l | tr -d ' '
}

breach_trigger_lockdown() {
  local reason="$1" detail="$2" ip="${3:-}"
  [[ "$AUTO_LOCKDOWN" != "true" ]] && return 0
  breach_is_locked && return 0
  if [[ -n "$ip" && "$ip" != "multi" ]] && breach_is_trusted_ip "$ip"; then
    breach_log "SKIP LOCKDOWN $reason — IP equipa confiável $ip"
    return 0
  fi
  breach_log "LOCKDOWN TRIGGER $reason IP=$ip — $detail"
  if [[ -x "$LOCKDOWN_SCRIPT" ]]; then
    bash "$LOCKDOWN_SCRIPT" "$reason" "$detail"
  elif [[ -f /var/www/impetus-completa/infra/scripts/impetus-emergency-lockdown.sh ]]; then
    bash /var/www/impetus-completa/infra/scripts/impetus-emergency-lockdown.sh "$reason" "$detail"
  else
    breach_log "ERRO lockdown script ausente"
  fi
}

# Analisa linha nginx — invasão ou camadas
breach_analyze_nginx() {
  local ip="$1" method="$2" path="$3" status="$4" ua="${5:-}"
  breach_is_locked && return 0
  [[ -z "$ip" ]] && return 0

  local probe_re='(/\.env|/\.git|/wp-admin|/wp-login|/phpmyadmin|/\.aws/|/actuator/|/shell|/\.vscode/|/vendor/phpunit|/\.DS_Store)'
  local auth_path_re='(/api/auth/login|/api/impetus-admin/auth/login)'

  # Invasão: ficheiro sensível devolveu 200
  if echo "$path" | grep -qiE "$probe_re"; then
    if [[ "$status" == "200" || "$status" == "206" ]]; then
      breach_trigger_lockdown "INVASION_SENSITIVE_200" "IP $ip obteve HTTP $status em $path" "$ip"
      return 0
    fi
    breach_mark_layer "$ip" "perimeter_probe" "$path status $status"
  fi

  if echo "$ua" | grep -qiE '(nikto|sqlmap|masscan|acunetix|nessus|dirbuster|gobuster|ffuf|nmap)'; then
    breach_mark_layer "$ip" "scanner_ua" "$path"
  fi

  # Login com sucesso após actividade maliciosa na mesma IP
  if [[ "$method" == "POST" ]] && echo "$path" | grep -qE "$auth_path_re"; then
    if [[ "$status" == "200" ]]; then
      local layers
      layers=$(breach_count_distinct_layers "$ip")
      if (( layers >= 1 )); then
        breach_trigger_lockdown "AUTH_SUCCESS_AFTER_BREACH" "IP $ip login HTTP 200 apos $layers camada(s) hostil" "$ip"
        return 0
      fi
    elif [[ "$status" == "401" || "$status" == "403" ]]; then
      breach_mark_layer "$ip" "auth_fail" "$path"
    fi
  fi

  # Multi-camada: 2+ tipos de ameaça distintos na janela
  local distinct
  distinct=$(breach_count_distinct_layers "$ip")
  if (( distinct >= MIN_LAYERS )); then
    breach_trigger_lockdown "MULTI_LAYER_BREACH" "IP $ip — $distinct camadas de ataque em ${LAYER_WINDOW_SEC}s" "$ip"
  fi
}

# SSH crítico + probe na mesma janela (IPs diferentes — ataque distribuído leve)
breach_note_critical_event() {
  local category="$1" ip="$2"
  [[ "$category" == "SSH_BRUTE_FORCE" ]] && echo "$(date +%s)|ssh_critical" >> "$BREACH_DIR/recent_critical.log"
  [[ "$category" == "HTTP_CREDENTIAL_PROBE" || "$category" == "SCANNER_UA" ]] && \
    breach_mark_layer "$ip" "perimeter_probe" "$category"
}

breach_evaluate_global_combo() {
  breach_is_locked && return 0
  [[ ! -f "$BREACH_DIR/recent_critical.log" ]] && return 0
  local now cutoff
  now=$(date +%s)
  cutoff=$((now - 600))
  local tmp
  tmp=$(mktemp)
  while IFS='|' read -r ts tag; do
    [[ -z "$ts" ]] && continue
    (( ts >= cutoff )) && echo "${ts}|${tag}"
  done < "$BREACH_DIR/recent_critical.log" > "$tmp" 2>/dev/null || true
  mv "$tmp" "$BREACH_DIR/recent_critical.log"

  local ssh_n probe_n
  ssh_n=$(grep -c ssh_critical "$BREACH_DIR/recent_critical.log" 2>/dev/null || echo 0)
  probe_n=$(find "$LAYER_DIR" -type f 2>/dev/null | wc -l | tr -d ' ')

  if (( ssh_n >= 1 && probe_n >= 3 )); then
    breach_trigger_lockdown "DISTRIBUTED_MULTI_LAYER" "SSH critico + $probe_n IPs com probes na rede" "multi"
  fi
}

breach_scan_admin_db() {
  breach_is_locked && return 0
  [[ "$AUTO_LOCKDOWN" != "true" ]] && return 0
  local repo="${IMPETUS_REPO:-/var/www/impetus-completa}"
  [[ ! -f "$repo/backend/.env" ]] && return 0

  local out
  out=$(cd "$repo/backend" && node -r dotenv/config -e "
    const db=require('./src/db');
    (async()=>{
      const r=await db.query(\`
        SELECT l2.ip::text AS ip, count(l1.id)::int AS fails
        FROM admin_logs l1
        JOIN admin_logs l2 ON l2.ip = l1.ip AND l2.acao = 'login'
          AND l2.created_at > l1.created_at
          AND l2.created_at > NOW() - INTERVAL '15 minutes'
        WHERE l1.acao IN ('login_falhou','login_bloqueado_bot')
          AND l1.created_at > NOW() - INTERVAL '30 minutes'
          AND l1.ip IS NOT NULL AND l1.ip <> ''
        GROUP BY l2.ip
        HAVING count(l1.id) >= 3
        LIMIT 10
      \`);
      for (const row of r.rows) console.log(row.ip);
      process.exit(0);
    })().catch(()=>process.exit(0));
  " dotenv_config_path="$repo/backend/.env" 2>/dev/null || true)

  while IFS= read -r ip; do
    [[ -z "$ip" ]] && continue
    breach_is_trusted_ip "$ip" && continue
    breach_trigger_lockdown "ADMIN_LOGIN_AFTER_FAILS" "Painel: login OK apos falhas do IP $ip" "$ip"
  done <<< "$out"
}
