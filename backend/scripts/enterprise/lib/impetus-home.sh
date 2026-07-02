#!/usr/bin/env bash
# IMPETUS Enterprise — resolução IMPETUS_HOME (CERT-ONPREM-DATA-01)
set -euo pipefail

if [[ -n "${IMPETUS_HOME:-}" ]]; then
  export IMPETUS_HOME="$(cd "$IMPETUS_HOME" && pwd)"
else
  SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
  REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"
  export IMPETUS_HOME="${IMPETUS_HOME:-/opt/impetus}"
  if [[ ! -d "$IMPETUS_HOME" ]]; then
    IMPETUS_HOME="$REPO_ROOT"
  fi
fi

export BACKEND_DIR="${BACKEND_DIR:-$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)}"
