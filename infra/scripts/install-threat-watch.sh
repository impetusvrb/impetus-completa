#!/bin/bash
# Instala threat-watch em /usr/local/bin e cron */2
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/../.." && pwd)"
install -m 0755 "$ROOT/infra/scripts/impetus-threat-watch.sh" /usr/local/bin/impetus-threat-watch.sh
install -m 0755 "$ROOT/infra/scripts/impetus-breach-lockdown-engine.sh" /usr/local/bin/impetus-breach-lockdown-engine.sh
install -m 0755 "$ROOT/infra/scripts/impetus-emergency-lockdown.sh" /usr/local/bin/impetus-emergency-lockdown.sh
install -m 0755 "$ROOT/infra/scripts/impetus-emergency-restore.sh" /usr/local/bin/impetus-emergency-restore.sh
mkdir -p /etc/impetus /var/lib/impetus/incidents /var/lib/impetus/lockdown /var/lib/impetus/breach-watch
if [[ ! -f /etc/impetus/threat-watch.env ]]; then
  install -m 0600 "$ROOT/infra/security/threat-watch.env.example" /etc/impetus/threat-watch.env
  echo "Criado /etc/impetus/threat-watch.env — configure WhatsApp antes de depender dos alertas."
fi
CRON_LINE='*/2 * * * * /usr/local/bin/impetus-threat-watch.sh >> /var/log/impetus-threat-watch.log 2>&1'
(crontab -l 2>/dev/null | grep -v impetus-threat-watch; echo "$CRON_LINE") | crontab -
touch /var/log/impetus-threat-watch.log
echo "OK — threat-watch a cada 2 min. Log: /var/log/impetus-threat-watch.log"
echo "Incidentes: /var/lib/impetus/incidents/latest.json"
