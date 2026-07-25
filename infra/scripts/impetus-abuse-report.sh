#!/bin/bash
# IMPETUS OPS — Gera CSV de IPs para abuse reports (HTTP probes + SSH brute).
# Uso: impetus-abuse-report.sh [dias_retro] [ficheiro_saida]
set -euo pipefail

DAYS="${1:-45}"
OUT="${2:-}"
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
REPORT_DIR="$ROOT/backend/docs/security/abuse-reports"
TS=$(date -u +%Y%m%dT%H%M%SZ)
OUT="${OUT:-$REPORT_DIR/abuse-report-${TS}.csv}"

NGINX_DIR="/var/log/nginx"
mapfile -t NGINX_LOGS < <(find "$NGINX_DIR" -maxdepth 1 \( -name 'impetus-access.log*' -o -name 'access.log*' \) -type f 2>/dev/null | sort -u)
if [[ ${#NGINX_LOGS[@]} -eq 0 ]]; then
  NGINX_LOGS=(/var/log/nginx/impetus-access.log /var/log/nginx/access.log)
fi
AUTH_LOG="${IMPETUS_AUTH_LOG:-/var/log/auth.log}"
TRUSTED_CIDRS="${IMPETUS_TRUSTED_CIDRS:-170.246.0.0/16,186.225.0.0/16}"

mkdir -p "$REPORT_DIR"

python3 - "$DAYS" "$OUT" "$AUTH_LOG" "$TRUSTED_CIDRS" "${NGINX_LOGS[@]}" <<'PY'
import csv, gzip, ipaddress, os, re, sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

days = int(sys.argv[1])
out_path = sys.argv[2]
auth_log = sys.argv[3]
trusted_raw = sys.argv[4].split(',')
nginx_logs = sys.argv[5:]

PROBE_RE = re.compile(
    r'(/\.env|/\.git|/wp-admin|/wp-login|/phpmyadmin|/\.aws/|/actuator/|'
    r'/shell|/cmd|/\.vscode/|/vendor/phpunit|/xmlrpc\.php|/\.DS_Store|/admin\.php|/cgi-bin/)',
    re.I
)
SCANNER_UA_RE = re.compile(
    r'(nikto|sqlmap|masscan|zgrab|acunetix|nessus|OpenVAS|dirbuster|gobuster|ffuf|'
    r'nmap|Nuclei|Silvy X Ran|python-requests/|Go-http-client|zgrab|curl/7\.)',
    re.I
)
COMBINED_RE = re.compile(
    r'^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) [^"]*" (\d+)'
)
IMPETUS_RE = re.compile(
    r'^(\S+) \S+ \S+ \[([^\]]+)\] "(\S+) (\S+) [^"]*" (\d+)'
)

def parse_trusted():
    nets = []
    for c in trusted_raw:
        c = c.strip()
        if not c:
            continue
        try:
            if '/' in c:
                nets.append(ipaddress.ip_network(c, strict=False))
            elif c.endswith('.*'):
                # legacy wildcard — skip strict match
                nets.append(c)
        except ValueError:
            pass
    return nets

TRUSTED = parse_trusted()

def is_trusted(ip):
    if ip.startswith('127.') or ip == '::1':
        return True
    if ip.startswith('170.246.') or ip.startswith('186.225.'):
        return True
    try:
        addr = ipaddress.ip_address(ip)
        for n in TRUSTED:
            if isinstance(n, ipaddress._BaseNetwork) and addr in n:
                return True
    except ValueError:
        pass
    return False

def parse_nginx_date(s):
    # 04/Jul/2026:04:55:25 +0000
    try:
        return datetime.strptime(s.split()[0], '%d/%b/%Y:%H:%M:%S').replace(tzinfo=timezone.utc)
    except ValueError:
        return None

cutoff = datetime.now(timezone.utc) - timedelta(days=days)

# ip -> category -> stats
stats = defaultdict(lambda: defaultdict(lambda: {
    'count': 0, 'first': None, 'last': None, 'samples': []
}))

def bump(ip, cat, ts, sample):
    if is_trusted(ip):
        return
    b = stats[ip][cat]
    b['count'] += 1
    if b['first'] is None or ts < b['first']:
        b['first'] = ts
    if b['last'] is None or ts > b['last']:
        b['last'] = ts
    if len(b['samples']) < 3 and sample not in b['samples']:
        b['samples'].append(sample[:200])

def read_nginx(path):
    if not os.path.isfile(path):
        return
    opener = gzip.open if path.endswith('.gz') else open
    mode = 'rt' if path.endswith('.gz') else 'r'
    try:
        with opener(path, mode, errors='replace') as f:
            for line in f:
                m = COMBINED_RE.match(line) or IMPETUS_RE.match(line)
                if not m:
                    continue
                ip, dt_s, method, path_req, status = m.groups()
                ts = parse_nginx_date(dt_s)
                if ts and ts < cutoff:
                    continue
                ua = ''
                parts = line.split('"')
                if len(parts) >= 6:
                    ua = parts[5]
                if PROBE_RE.search(path_req):
                    bump(ip, 'http_probe', ts or datetime.now(timezone.utc), f'{method} {path_req} {status}')
                elif SCANNER_UA_RE.search(ua):
                    bump(ip, 'scanner_ua', ts or datetime.now(timezone.utc), f'{method} {path_req} ua={ua[:80]}')
    except Exception as e:
        print(f'WARN nginx {path}: {e}', file=sys.stderr)

for p in nginx_logs:
    read_nginx(p)
    if p.endswith('.1') and os.path.isfile(p + '.gz'):
        read_nginx(p + '.gz')

# SSH brute from auth.log + rotated
auth_files = [auth_log]
for i in range(1, 15):
    gz = f'{auth_log}.{i}.gz'
    if os.path.isfile(gz):
        auth_files.append(gz)

ssh_re = re.compile(r'Failed password|Invalid user')
ip_re = re.compile(r' from (\S+) port')

for af in auth_files:
    if not os.path.isfile(af):
        continue
    opener = gzip.open if af.endswith('.gz') else open
    mode = 'rt' if af.endswith('.gz') else 'r'
    try:
        with opener(af, mode, errors='replace') as f:
            for line in f:
                if not ssh_re.search(line):
                    continue
                im = ip_re.search(line)
                if not im:
                    continue
                ip = im.group(1)
                bump(ip, 'ssh_brute', datetime.now(timezone.utc), line.strip()[:180])
    except Exception as e:
        print(f'WARN auth {af}: {e}', file=sys.stderr)

# UFW status (best effort)
ufw_banned = set()
try:
    import subprocess
    r = subprocess.run(['ufw', 'status', 'numbered'], capture_output=True, text=True, timeout=15)
    for line in r.stdout.splitlines():
        if 'DENY' in line and 'Anywhere' in line:
            tok = line.split()[-1] if line.split() else ''
            if re.match(r'^\d+\.\d+\.\d+\.\d+$', tok):
                ufw_banned.add(tok)
except Exception:
    pass

rows = []
for ip, cats in stats.items():
    for cat, b in cats.items():
        if b['count'] == 0:
            continue
        rows.append({
            'ip': ip,
            'category': cat,
            'event_count': b['count'],
            'first_seen_utc': b['first'].isoformat() if b['first'] else '',
            'last_seen_utc': b['last'].isoformat() if b['last'] else '',
            'sample_detail': ' | '.join(b['samples']),
            'ufw_banned': 'yes' if ip in ufw_banned else 'no',
            'abuse_report_hint': 'whois + abuse@ISP; incluir timestamps UTC e logs nginx/auth',
        })

rows.sort(key=lambda r: (-r['event_count'], r['ip']))

with open(out_path, 'w', newline='', encoding='utf-8') as f:
    w = csv.DictWriter(f, fieldnames=list(rows[0].keys()) if rows else [
        'ip','category','event_count','first_seen_utc','last_seen_utc',
        'sample_detail','ufw_banned','abuse_report_hint'
    ])
    w.writeheader()
    w.writerows(rows)

summary = {
    'generated_utc': datetime.now(timezone.utc).isoformat(),
    'window_days': days,
    'unique_ips': len(stats),
    'rows': len(rows),
    'by_category': {},
    'output': out_path,
}
for r in rows:
    summary['by_category'][r['category']] = summary['by_category'].get(r['category'], 0) + 1

import json
print(json.dumps(summary, indent=2))
PY

echo "CSV → $OUT"
wc -l "$OUT" 2>/dev/null || true
