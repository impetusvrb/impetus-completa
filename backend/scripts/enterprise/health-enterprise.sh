#!/usr/bin/env bash
set -euo pipefail
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/impetus-home.sh"
cd "$BACKEND_DIR"
exec node scripts/enterprise/health-enterprise.js "$@"
