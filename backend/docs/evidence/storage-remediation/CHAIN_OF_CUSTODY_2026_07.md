# CHAIN OF CUSTODY — IMPETUS Forensic External Archive

**Document ID:** CHAIN_OF_CUSTODY_2026_07  
**Status:** **PREPARED_FOR_DOWNLOAD — External transfer pending**  
**Classification:** FORENSIC / INCIDENT P0  
**Last updated:** 2026-07-13T16:28:00Z  

---

## Custody record (current)

| Field | Value |
|-------|-------|
| **DATA** | 2026-07-13 |
| **HORA UTC** | 16:28 |
| **OPERADOR** | P0 automated preparation; manual transfer by Wellington/Gustavo |
| **STATUS** | PREPARED_FOR_DOWNLOAD |
| **ORIGEM** | VPS IMPETUS — `/dev/sda1` UUID `2fe3afcd-f945-40fc-bd99-74d9689a0e2d` |
| **HASH** | 9/9 critical artifacts SHA256 verified at origin (re-validation 16:27 UTC) |
| **DESTINO intermédio** | **Notebook autorizado** (Windows — pasta staging local) |
| **DESTINO final** | **Pen Drive 1TB — `E:\IMPETUS_FORENSIC_ARCHIVE\`** (conectado ao notebook) |
| **VALIDAÇÃO origem** | OK — 9/9 SHA256 verificados na VPS |
| **VALIDAÇÃO destino** | **PENDENTE** — operador deve executar `validate-impetus-forensic.ps1` |
| **EXTERNAL_ARCHIVE_VALIDATED** | **FALSE** (até validação no E:) |
| **DELETION_AUTHORIZED** | **FALSE** |

---

## 1. Transfer intent

| Field | Value |
|-------|-------|
| **Date (UTC)** | 2026-07-13 |
| **Origin** | VPS IMPETUS — `/dev/sda1` UUID `2fe3afcd-f945-40fc-bd99-74d9689a0e2d` |
| **Destination** | External 1TB storage — **NOT MOUNTED on VPS at audit time** |
| **Operator** | Automated P0 remediation + human validation required |
| **Purpose** | Preserve incident evidence before controlled VPS deletion |

---

## 2. Volume to transfer (~32G)

| Item | Path (VPS) | Size | SHA256 status |
|------|------------|------|---------------|
| Pacote A | `export-staging/IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz` | 55K | `1c98ebbb…` ✓ |
| Pacote A+ | `export-staging/IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz` | 61M | `e0f4e208…` ✓ |
| Pacote B | `export-staging/IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz` | 1,3M | `5a2e372f…` ✓ |
| Core dump 1 | `apport/coredump/core…1117038…` | 2,3G | `fe8f81ca…` ✓ |
| Core dump 2 | `apport/coredump/core…1264763…` | 2,2G | `0974572f…` ✓ |
| Core dump 3 | `apport/coredump/core…1294484…` | 2,0G | `49848113…` ✓ |
| Core dump 4 | `apport/coredump/core…1364633…` | 2,3G | `4da331b5…` ✓ |
| Core dump 5 | `apport/coredump/core…1389545…` | 2,1G | `261bc1d0…` ✓ |
| Checkpoint SQL | `backend/backups/checkpoint_2026-06-26T1622.sql` | 19G | **PENDING** (hash in progress) |
| Manifests | `storage-remediation/*` | <5M | Included in packages |

---

## 3. Pen drive detection (Fase 1 — 2026-07-13T16:09Z)

```
PEN_DRIVE_DETECTED     = NO
VPS_BLOCK_DEVICES      = sda (100G QEMU HARDDISK only)
USB_STORAGE            = none
/media/                = empty
/mnt/                  = empty
sr0                    = QEMU DVD-ROM (ISO, not storage target)
```

**Conclusão:** O pen drive 1TB referenciado na governança está no computador autorizado do operador, **não ligado à VPS**. A cópia directa na VPS **não pôde ser executada**.

---

## 4. Custody chain states

| State | Timestamp | Action | Hash verified |
|-------|-----------|--------|---------------|
| INVENTORY | 2026-07-13 ~15:45 UTC | FORENSIC_MANIFEST created | Partial |
| STAGING | 2026-07-13 ~15:43 UTC | Export packages A/A+/B created on VPS | Yes (source) |
| TRANSFER | — | **NOT EXECUTED** — no external mount | — |
| VALIDATION | — | **NOT EXECUTED** | — |
| VPS_DELETION | — | **BLOCKED** | — |

---

## 5. Validation requirement

```
EXTERNAL_ARCHIVE_VALIDATED = FALSE (as of 2026-07-13T16:10Z)
```

Custody transfer completes only when:

1. All files copied to external storage
2. SHA256 destination = SHA256 source for **100%** of items
3. Human operator confirms `EXTERNAL_ARCHIVE_VALIDATED=true`

---

## 6. Approved deletion scope (Fase 7 — ONLY after validation)

- `checkpoint_2026-06-26T1622.sql`
- `/var/lib/apport/coredump/*`
- Export packages in `export-staging/` (copies; manifests remain in repo)

**Never delete:** PostgreSQL live, `.env` active, certification docs in repo, PM2/nginx logs on VPS.

---

## 7. Operator attestation (to be signed after transfer)

```
I confirm that all items listed in SOURCE_SHA256_COMPLETE_MANIFEST.txt
were copied to external storage UUID: _______________
and SHA256 validation returned MATCH=TRUE for all files.

Signed: _________________________  Date: ___________
```

---

*Chain of Custody — IMPETUS P0 — 2026-07-13*
