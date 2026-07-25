#!/usr/bin/env bash
# IMPETUS — Auditoria 6h + bloqueio preventivo UFW de scanners
set -euo pipefail

HOURS="${1:-6}"
REPORT="/tmp/impetus-audit-$(date +%Y%m%d-%H%M%S).json"
SINCE=$(date -u -d "${HOURS} hours ago" '+%d/%b/%Y:%H')

# Ranges confiáveis IMPETUS (nunca bloquear)
TRUSTED_REGEX='^(127\.0\.0\.1|::1|170\.246\.|186\.225\.|2804:2484:|2804:2980:)'

# IPs históricos confirmados como scanners (não Cloudflare proxy)
HISTORICAL_SCANNERS=(
  "35.236.156.112"   # GCP .git mass scan
  "91.92.241.196"    # .git HEAD/config
  "52.234.3.19"      # .env/.git/.aws/terraform mass scan
  "34.174.144.217"   # scanner GCP
  "170.64.137.227"   # .git/config Jul/03
  "195.178.110.199"  # TLM-Audit-Scanner
  "3.19.29.56"       # .env Silvy-style Jul/03
  "216.238.69.243"
  "35.153.53.215"
  "27.79.3.161"
  "171.231.186.160"
  "134.122.102.174"
)

SCAN_PATTERN='(\.env|\.git|docker-compose|\.aws|wp-config|/server\.js|/actuator|terraform|TLM-Audit|Silvy|scanner)'

echo "=== Auditoria IMPETUS — últimas ${HOURS}h (desde ${SINCE} UTC) ==="

# Colectar logs do período
TMPLOG=$(mktemp)
for f in /var/log/nginx/impetus-access.log /var/log/nginx/access.log; do
  [ -f "$f" ] && awk -v s="[$SINCE" '$4 >= s' "$f" >> "$TMPLOG" 2>/dev/null || true
done

EXTERNAL=$(grep -vE "$TRUSTED_REGEX" "$TMPLOG" 2>/dev/null | wc -l | tr -d ' ' || true)
EXTERNAL=${EXTERNAL:-0}
SCANS=$(grep -vE "$TRUSTED_REGEX" "$TMPLOG" 2>/dev/null | grep -iE "$SCAN_PATTERN" 2>/dev/null || true)
if [ -z "$SCANS" ]; then SCAN_COUNT=0; else SCAN_COUNT=$(echo "$SCANS" | wc -l | tr -d ' '); fi

echo "Tráfego externo (não confiável): $EXTERNAL linhas"
echo "Probes sensíveis: $SCAN_COUNT"

# IPs de scan no período (5+ hits = bloquear)
NEW_BLOCK=()
if [ "$SCAN_COUNT" -gt 0 ]; then
  while read -r count ip; do
    [ -z "$ip" ] && continue
    if [ "$count" -ge 5 ]; then
      NEW_BLOCK+=("$ip")
      echo "  SCANNER detectado: $ip ($count probes)"
    fi
  done < <(echo "$SCANS" | awk '{print $1}' | sort | uniq -c | sort -rn)
fi

# Bloquear históricos + novos
BLOCKED=()
ALREADY=()

block_ip() {
  local ip="$1"
  local reason="$2"
  if ufw status | grep -qF "$ip"; then
    ALREADY+=("$ip")
    return 0
  fi
  if ufw deny from "$ip" comment "$reason" >/dev/null 2>&1; then
    BLOCKED+=("$ip")
    echo "  UFW DENY: $ip ($reason)"
    # fail2ban ban directo se jail activo
    fail2ban-client set impetus-nginx-scan banip "$ip" 2>/dev/null || true
  fi
}

echo ""
echo "--- Bloqueio preventivo UFW ---"
for ip in "${HISTORICAL_SCANNERS[@]}"; do
  block_ip "$ip" "IMPETUS scanner historical"
done
for ip in "${NEW_BLOCK[@]:-}"; do
  block_ip "$ip" "IMPETUS scanner audit $(date +%Y-%m-%d)"
done

# SSH falhas 6h
SSH_FAIL=$(journalctl -u ssh --since "${HOURS} hours ago" 2>/dev/null | grep -ciE 'Failed|Invalid' || true)
SSH_FAIL=${SSH_FAIL:-0}

# fail2ban status
F2B=$(fail2ban-client status impetus-nginx-scan 2>/dev/null | grep -E 'Currently banned|Total banned' | tr '\n' ' ' || echo "n/a")

# Conexões activas
ACTIVE_SSH=$(ss -tn state established '( sport = :22 )' 2>/dev/null | grep -v "127.0.0.1" | awk '{print $5}' | cut -d: -f1 | sort -u | tr '\n' ' ' || echo "none")

VERDICT="CLEAR"
if [ "$SCAN_COUNT" -gt 0 ] || [ "$SSH_FAIL" -gt 0 ]; then
  VERDICT="ATTACK_DETECTED"
fi

BLOCKED_JSON="[]"
if [ "${#BLOCKED[@]}" -gt 0 ]; then
  BLOCKED_JSON="[\"$(printf '%s","' "${BLOCKED[@]}" | sed 's/","$//')\"]"
fi

cat > "$REPORT" <<EOF
{
  "auditedAt": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "windowHours": $HOURS,
  "sinceUtc": "$SINCE",
  "externalLines": $EXTERNAL,
  "sensitiveProbes": $SCAN_COUNT,
  "sshFailures": $SSH_FAIL,
  "newBlocked": $BLOCKED_JSON,
  "activeSshPeers": "$ACTIVE_SSH",
  "fail2ban": "$F2B",
  "verdict": "$VERDICT"
}
EOF

echo ""
echo "--- Resumo ---"
echo "SSH falhas: $SSH_FAIL"
echo "fail2ban: $F2B"
echo "SSH activo: $ACTIVE_SSH"
echo "Novos bloqueios UFW: ${#BLOCKED[@]}"
echo "Verdict: $VERDICT"
echo "Relatório: $REPORT"

rm -f "$TMPLOG"

# Garantir fail2ban activo
systemctl is-active fail2ban >/dev/null 2>&1 || systemctl start fail2ban

exit 0
