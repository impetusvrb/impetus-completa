#!/bin/bash
# P0 — External Forensic Archive: copy + validate + optional controlled deletion
# IMPETUS — Run ONLY when external storage is available
# Usage:
#   Phase A (USB on VPS):  ./p0-external-archive-run.sh /media/impetus/IMPETUS_FORENSIC
#   Phase B (after 100% hash match): ./p0-external-archive-run.sh /media/impetus/IMPETUS_FORENSIC --delete-approved

set -euo pipefail

BASE="/var/www/impetus-completa/backend/docs/evidence/storage-remediation"
EXPORT="$BASE/export-staging"
STAGING_SRC="$BASE"
DELETE_MODE="${2:-}"

if [[ $# -lt 1 ]]; then
  echo "USAGE: $0 <DEST_MOUNT_PATH> [--delete-approved]"
  echo "  DEST must be mounted external storage with >=35G free"
  exit 1
fi

DEST="$1"
TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
LOG="$BASE/EXTERNAL_ARCHIVE_RUN_${TIMESTAMP//:/}.log"

exec > >(tee -a "$LOG") 2>&1

echo "=== P0 EXTERNAL ARCHIVE RUN $TIMESTAMP ==="
echo "DEST=$DEST"

# FASE 1 — Detect pen drive
if [[ ! -d "$DEST" ]]; then
  echo "ERROR: DEST not found: $DEST"
  exit 2
fi

DEST_DEV=$(findmnt -n -o SOURCE --target "$DEST" 2>/dev/null || echo "UNKNOWN")
DEST_UUID=$(findmnt -n -o UUID --target "$DEST" 2>/dev/null || blkid -s UUID -o value "$DEST_DEV" 2>/dev/null || echo "UNKNOWN")
DEST_FSTYPE=$(findmnt -n -o FSTYPE --target "$DEST" 2>/dev/null || echo "UNKNOWN")
DEST_SIZE=$(df -h "$DEST" | tail -1 | awk '{print $2}')
DEST_AVAIL=$(df -h "$DEST" | tail -1 | awk '{print $4}')
DEST_USED=$(df -h "$DEST" | tail -1 | awk '{print $5}')

echo "DEVICE=$DEST_DEV UUID=$DEST_UUID FSTYPE=$DEST_FSTYPE SIZE=$DEST_SIZE AVAIL=$DEST_AVAIL USED=$DEST_USED"

# FASE 2 — Space check (~32G required)
REQUIRED_GB=32
AVAIL_KB=$(df -k "$DEST" | tail -1 | awk '{print $4}')
if [[ "$AVAIL_KB" -lt $((REQUIRED_GB * 1024 * 1024)) ]]; then
  echo "ERROR: Insufficient space on DEST. Need ~${REQUIRED_GB}G, have $(($AVAIL_KB / 1024 / 1024))G"
  exit 3
fi

# FASE 3 — Copy preserving metadata
DEST_ROOT="$DEST/IMPETUS_FORENSIC_2026_07_13"
mkdir -p "$DEST_ROOT"/{packages,apport_coredump,postgresql,manifests}

echo "--- Copying packages ---"
rsync -aH --info=progress2 \
  "$EXPORT/IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz" \
  "$EXPORT/IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz" \
  "$EXPORT/IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz" \
  "$DEST_ROOT/packages/"

echo "--- Copying apport cores ---"
rsync -aH --info=progress2 /var/lib/apport/coredump/ "$DEST_ROOT/apport_coredump/"

echo "--- Copying checkpoint SQL ---"
rsync -aH --info=progress2 \
  /var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql \
  "$DEST_ROOT/postgresql/"

echo "--- Copying manifests ---"
rsync -aH \
  "$BASE/FORENSIC_MANIFEST_2026_07_13.json" \
  "$BASE/FORENSIC_MANIFEST_2026_07_13.md" \
  "$BASE/APPORT_CORE_SHA256_MANIFEST.txt" \
  "$BASE/EXTERNAL_ARCHIVE_TRANSFER_MANIFEST.json" \
  "$BASE/PRE_DELETE_MANIFEST.json" \
  "$BASE/P0_STORAGE_CAPACITY_FORENSIC_REMEDIATION_2026_07_13.md" \
  "$BASE/SOURCE_SHA256_COMPLETE_MANIFEST.txt" \
  "$DEST_ROOT/manifests/" 2>/dev/null || true

# FASE 4 — Hash validation
VALIDATION="$BASE/HASH_VALIDATION_${TIMESTAMP//:/}.json"
echo "[" > "$VALIDATION"
FIRST=1
FAIL=0

validate_file() {
  local src="$1" dst="$2"
  local src_hash dst_hash
  src_hash=$(sha256sum "$src" | awk '{print $1}')
  dst_hash=$(sha256sum "$dst" | awk '{print $1}')
  local match="true"
  [[ "$src_hash" == "$dst_hash" ]] || match="false"
  [[ "$match" == "true" ]] || FAIL=1
  [[ $FIRST -eq 1 ]] || echo "," >> "$VALIDATION"
  FIRST=0
  cat >> "$VALIDATION" <<EOF
  {"file":"$(basename "$dst")","source":"$src","dest":"$dst","sha256_source":"$src_hash","sha256_dest":"$dst_hash","match":$match}
EOF
  echo "VALIDATE $(basename "$dst"): MATCH=$match"
}

validate_file "$EXPORT/IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz" "$DEST_ROOT/packages/IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz"
validate_file "$EXPORT/IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz" "$DEST_ROOT/packages/IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz"
validate_file "$EXPORT/IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz" "$DEST_ROOT/packages/IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz"

for core in /var/lib/apport/coredump/*; do
  [[ -f "$core" ]] || continue
  validate_file "$core" "$DEST_ROOT/apport_coredump/$(basename "$core")"
done

validate_file \
  /var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql \
  "$DEST_ROOT/postgresql/checkpoint_2026-06-26T1622.sql"

echo "]" >> "$VALIDATION"

# FASE 6 — Verdict
if [[ "$FAIL" -ne 0 ]]; then
  echo "EXTERNAL_ARCHIVE_VALIDATED=false"
  echo "ABORT: Hash mismatch detected. Do NOT delete VPS originals."
  exit 4
fi

echo "EXTERNAL_ARCHIVE_VALIDATED=true"
sync

# FASE 7 — Controlled deletion (opt-in)
if [[ "$DELETE_MODE" == "--delete-approved" ]]; then
  echo "--- PRE-DELETE DISK ---"
  df -h /
  echo "--- Removing approved items ONLY ---"
  rm -f /var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql
  rm -f /var/lib/apport/coredump/*
  rm -f "$EXPORT/IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz" \
        "$EXPORT/IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz" \
        "$EXPORT/IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz"
  echo "--- POST-DELETE DISK ---"
  df -h /
  echo "CONTROLLED_DELETION_COMPLETE=true"
else
  echo "SKIP_DELETE: run with --delete-approved after human confirmation"
fi

echo "=== RUN COMPLETE ==="
