#!/usr/bin/env bash
# IMPETUS — Allowlist de IPs para plataformaimpetus.com
# Só IPs autorizados veem o software; clientes novos = adicionar IP antes.
#
# Uso:
#   sudo bash infra/scripts/impetus-authorized-ip.sh list
#   sudo bash infra/scripts/impetus-authorized-ip.sh add 201.55.10.50 "Cliente XYZ"
#   sudo bash infra/scripts/impetus-authorized-ip.sh remove 201.55.10.50
#   sudo bash infra/scripts/impetus-authorized-ip.sh apply
#   sudo bash infra/scripts/impetus-authorized-ip.sh on|off|status
set -euo pipefail

REPO_ROOT="${REPO_ROOT:-/var/www/impetus-completa}"
IPS_FILE="${IMPETUS_AUTHORIZED_IPS_FILE:-/etc/impetus/authorized-ips.txt}"
NGINX_SNIPPET="${IMPETUS_AUTHORIZED_NGINX_SNIPPET:-/etc/nginx/snippets/impetus-ip-allowlist.conf}"
NGINX_SITE="${IMPETUS_NGINX_SITE:-/etc/nginx/sites-enabled/impetus}"
DENIED_HTML_DST="/var/www/impetus-denied/index.html"
DENIED_HTML_SRC="$REPO_ROOT/infra/nginx/static/impetus-access-denied.html"
MARKER="# IMPETUS_IP_ALLOWLIST"
SNIPPET_SRC="$REPO_ROOT/infra/nginx/snippets/impetus-ip-allowlist-wrapper.conf"

log() { echo "[impetus-ip] $*"; }

require_root() {
  [[ "$(id -u)" -eq 0 ]] || { echo "Execute como root (sudo)"; exit 1; }
}

bootstrap_ips_file() {
  install -d -m 0750 /etc/impetus
  if [[ ! -f "$IPS_FILE" ]]; then
    if [[ -f "$REPO_ROOT/infra/security/authorized-ips.txt" ]]; then
      cp "$REPO_ROOT/infra/security/authorized-ips.txt" "$IPS_FILE"
    else
      cp "$REPO_ROOT/infra/security/authorized-ips.txt.example" "$IPS_FILE"
    fi
    chmod 0640 "$IPS_FILE"
    log "Criado $IPS_FILE"
  fi
}

validate_ip_or_cidr() {
  local entry="$1"
  python3 - "$entry" <<'PY'
import ipaddress, sys
raw = sys.argv[1].strip()
try:
    if "/" in raw:
        ipaddress.ip_network(raw, strict=False)
    else:
        ipaddress.ip_address(raw)
    sys.exit(0)
except ValueError:
    sys.exit(1)
PY
}

parse_ips() {
  grep -vE '^\s*#|^\s*$' "$IPS_FILE" | awk '{print $1}'
}

generate_nginx_snippet() {
  bootstrap_ips_file
  install -d /etc/nginx/snippets
  {
    echo "# Gerado por impetus-authorized-ip.sh — não editar manualmente"
    echo "# Fonte: $IPS_FILE"
    echo "# $(date -u +%Y-%m-%dT%H:%M:%SZ)"
    while IFS= read -r cidr; do
      [[ -z "$cidr" ]] && continue
      echo "allow $cidr;"
    done < <(parse_ips)
    echo "deny all;"
  } > "$NGINX_SNIPPET"
  chmod 0644 "$NGINX_SNIPPET"
  log "Snippet nginx: $NGINX_SNIPPET ($(parse_ips | wc -l) entradas)"
}

install_denied_page() {
  install -d -m 0755 /var/www/impetus-denied
  install -m 0644 "$DENIED_HTML_SRC" "$DENIED_HTML_DST"
}

enable_nginx() {
  install -m 0644 "$SNIPPET_SRC" /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf
  install_denied_page
  generate_nginx_snippet
  if grep -qE '^\s*include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;' "$NGINX_SITE" 2>/dev/null; then
    log "Allowlist já activa em nginx"
    return
  fi
  if grep -q "$MARKER" "$NGINX_SITE" 2>/dev/null; then
    sed -i "s|^[[:space:]]*# include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;|    include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;|" "$NGINX_SITE"
    log "Allowlist activada (include descomentado)"
    return
  fi
  if ! grep -q 'include /etc/nginx/cloudflare-real-ip.conf' "$NGINX_SITE"; then
    echo "ERRO: cloudflare-real-ip.conf não encontrado em $NGINX_SITE"
    exit 1
  fi
  sed -i "/include \/etc\/nginx\/cloudflare-real-ip.conf;/a\\    $MARKER\\n    include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;" "$NGINX_SITE"
  log "Allowlist activada em $NGINX_SITE"
}

disable_nginx() {
  if [[ -f "$NGINX_SITE" ]]; then
    sed -i "s|^[[:space:]]*include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;|    # include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;|" "$NGINX_SITE"
  fi
  log "Allowlist desactivada"
}

reload_nginx() {
  nginx -t
  systemctl reload nginx
  log "nginx reload OK"
}

cmd_list() {
  bootstrap_ips_file
  echo "IPs autorizados ($IPS_FILE):"
  echo "────────────────────────────────────────"
  grep -vE '^\s*$' "$IPS_FILE" | sed 's/^/  /'
  echo "────────────────────────────────────────"
  parse_ips | wc -l | xargs echo "Total CIDRs/IPs:"
}

cmd_add() {
  require_root
  local ip="${1:-}" note="${2:-}"
  [[ -z "$ip" ]] && { echo "Uso: add <IP|CIDR> [nota]"; exit 1; }
  validate_ip_or_cidr "$ip" || { echo "IP/CIDR inválido: $ip"; exit 1; }
  bootstrap_ips_file
  if parse_ips | grep -Fxq "$ip"; then
    log "Já autorizado: $ip"
    exit 0
  fi
  {
    echo ""
    if [[ -n "$note" ]]; then
      echo "$ip          # $note"
    else
      echo "$ip"
    fi
  } >> "$IPS_FILE"
  log "Adicionado: $ip ${note:+( $note )}"
  generate_nginx_snippet
  if grep -qE '^\s*include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;' "$NGINX_SITE" 2>/dev/null; then
    reload_nginx
  fi
}

cmd_remove() {
  require_root
  local ip="${1:-}"
  [[ -z "$ip" ]] && { echo "Uso: remove <IP|CIDR>"; exit 1; }
  bootstrap_ips_file
  if ! parse_ips | grep -Fxq "$ip"; then
    log "Não encontrado: $ip"
    exit 1
  fi
  local tmp
  tmp=$(mktemp)
  grep -vE "^[[:space:]]*${ip//\//\\/}[[:space:]]" "$IPS_FILE" > "$tmp" || true
  mv "$tmp" "$IPS_FILE"
  log "Removido: $ip"
  generate_nginx_snippet
  if grep -qE '^\s*include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;' "$NGINX_SITE" 2>/dev/null; then
    reload_nginx
  fi
}

cmd_apply() {
  require_root
  generate_nginx_snippet
  install_denied_page
  if grep -qE '^\s*include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;' "$NGINX_SITE" 2>/dev/null; then
    reload_nginx
  else
    log "Allowlist não activa — use: $0 on"
  fi
}

cmd_status() {
  bootstrap_ips_file
  if grep -qE '^\s*include /etc/nginx/snippets/impetus-ip-allowlist-wrapper.conf;' "$NGINX_SITE" 2>/dev/null; then
    echo "Estado: ACTIVO (só IPs autorizados acedem ao site)"
  else
    echo "Estado: INACTIVO (site público via Cloudflare)"
  fi
  echo "Ficheiro: $IPS_FILE"
  parse_ips | wc -l | xargs echo "Entradas:"
}

cmd_on() {
  require_root
  enable_nginx
  reload_nginx
  cmd_status
}

cmd_off() {
  require_root
  disable_nginx
  reload_nginx
  cmd_status
}

main() {
  local cmd="${1:-status}"
  shift || true
  case "$cmd" in
    list|ls) cmd_list ;;
    add) cmd_add "$@" ;;
    remove|rm|del) cmd_remove "$@" ;;
    apply) cmd_apply ;;
    on|enable) cmd_on ;;
    off|disable) cmd_off ;;
    status) cmd_status ;;
    *)
      echo "Comandos: list | add <ip> [nota] | remove <ip> | apply | on | off | status"
      exit 1
      ;;
  esac
}

main "$@"
