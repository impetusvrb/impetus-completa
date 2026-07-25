# FORENSIC MANIFEST — 2026-07-13

**Generated:** 2026-07-13T15:42:24.114Z

**Disk:** /dev/sda1        97G   96G  982M 100% /

## Root Cause

Accumulation of PostgreSQL data (49G) + monolithic SQL checkpoint backup (19G) + apport Node.js OOM core dumps (11G)

## Growth Ranking

| SOURCE | SIZE | % | RISK | CLASS |
|---|---|---|---|---|
| /var/lib/postgresql | 49G | ~51% | HIGH | DATABASE_DATA |
| /var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql | 19G | ~20% | MEDIUM | DATABASE_BACKUP |
| /var/lib/apport/coredump | 11G | ~11% | HIGH | INCIDENT_EVIDENCE |
| /var/www/impetus-completa/backend/backups (other) | ~3G | ~3% | MEDIUM | SECURE_BACKUP |
| /var/log/journal | 809M | ~0.8% | MEDIUM | SYSTEM_LOG |
| /root/.cache | 2G | ~2% | LOW | CACHE |
| /var/www/RESTORE_TEST + duplicates | ~1.7G | ~1.7% | NONE | DUPLICATE |
| /root/.cursor-server | 957M | ~1% | MEDIUM | CURSOR_ARTIFACT |
| /root/.pm2/logs | 402M | ~0.4% | MEDIUM | PM2_LOG |

## Manifest Entries (138)

| PATH | SIZE | CLASS | SHA256 | INCIDENT |
|---|---|---|---|---|
| `/var/lib/postgresql` | 0.0M | DATABASE_DATA | … | - |
| `/var/www/impetus-completa/backend/backups` | 0.0M | UNKNOWN_REQUIRES_REVIEW | … | INCIDENT_20260702 |
| `/var/lib/apport/coredump` | 0.0M | INCIDENT_EVIDENCE | … | INCIDENT_20260713 |
| `/var/www/impetus-completa/backend/.env` | 0.0M | ACTIVE_RUNTIME | de236a6eff37ee12… | - |
| `/var/log/journal` | 0.0M | SYSTEM_LOG | … | - |
| `/var/log/nginx` | 0.0M | NGINX_LOG | … | INCIDENT_20260713 |
| `/root/.pm2/logs` | 0.0M | PM2_LOG | … | INCIDENT_20260713 |
| `/root/.cache` | 0.0M | CACHE | … | INCIDENT_20260702 |
| `/root/.cursor-server` | 0.0M | CURSOR_ARTIFACT | … | INCIDENT_20260713 |
| `/root/.npm` | 0.0M | DEPENDENCY_ARTIFACT | … | - |
| `/var/www/RESTORE_TEST` | 0.0M | DUPLICATE | … | - |
| `/var/www/_bk_untracked_2026-03-03-0321` | 0.0M | DUPLICATE | … | - |
| `/var/www/impetus-completa/impetus_complete` | 0.0M | DUPLICATE | … | - |
| `/var/www/impetus-completa/backend/docs/evidence` | 0.0M | UNKNOWN_REQUIRES_REVIEW | … | INCIDENT_20260713 |
| `/var/www/impetus-completa/backend/docs/evidence/security` | 0.0M | CERTIFICATION_EVIDENCE | … | INCIDENT_20260713 |
| `/var/crash` | 0.0M | UNKNOWN_REQUIRES_REVIEW | … | INCIDENT_20260713 |
| `/var/www/impetus-pre-rollback-2026-03-03-0546.tar.gz` | 146.7M | UNKNOWN_REQUIRES_REVIEW | 9dd8c1b26964fd1c… | - |
| `/var/www/backup_impetus_before_rollback_2026-03-05_0421.tar.gz` | 147.0M | UNKNOWN_REQUIRES_REVIEW | 40e70c1c0eb358dd… | - |
| `/var/www/impetus-completa/.git/objects/pack/pack-a17599a32b2de3eae5895e58b1668fabd62d9f67.pack` | 606.6M | UNKNOWN_REQUIRES_REVIEW | DEFERRED_LARGE_F… | - |
| `/var/www/impetus-completa/lipsync/Wav2Lip/checkpoints/wav2lip.pth` | 435.8M | UNKNOWN_REQUIRES_REVIEW | b78b681b68ad9fe6… | - |
| `/var/www/impetus-completa/backend/backups/backup_20260701_000949/database.dump` | 2.4G | SECURE_BACKUP | DEFERRED_LARGE_F… | - |
| `/var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql` | 19.7G | DATABASE_BACKUP | DEFERRED_LARGE_F… | - |
| `/var/www/impetus-backup-2026-03-03-0319.tar.gz` | 149.0M | UNKNOWN_REQUIRES_REVIEW | 64740e3e81148295… | - |
| `/var/lib/postgresql/14/main/base/150558/152255.5` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/150558/152255.6` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/150558/152255.8` | 827.6M | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/150558/152255.3` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/150558/152255.4` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/150558/152224` | 254.3M | DATABASE_DATA | f47b960d1af9b8a0… | - |
| `/var/lib/postgresql/14/main/base/150558/152255.7` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/150558/152255` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/150558/152255.2` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/150558/151222` | 271.2M | DATABASE_DATA | 97a6560699170651… | - |
| `/var/lib/postgresql/14/main/base/150558/152255.1` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/25491/77777` | 129.0M | DATABASE_DATA | 2351ce4d8ec92bc6… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.1` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.9` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74854` | 141.7M | DATABASE_DATA | abe40b7fbffb2b73… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74853` | 992.5M | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.15` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/25491/74837.8` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/78191` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74850` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.18` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74997.1` | 118.6M | DATABASE_DATA | 70ff2391b6cd479e… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.3` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74985.1` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/25491/74837.10` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74852` | 104.9M | DATABASE_DATA | 1a7db5db74e720f0… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.6` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/77784` | 218.6M | DATABASE_DATA | 62f930a684c83ff9… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/77701` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.5` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.14` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | - |
| `/var/lib/postgresql/14/main/base/25491/74997` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/78193` | 428.3M | DATABASE_DATA | 8452626b684b05e5… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.11` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.12` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74994` | 470.5M | DATABASE_DATA | e111e142ac29a33f… | INCIDENT_20260713 |
| `/var/lib/postgresql/14/main/base/25491/74837.4` | 1.1G | DATABASE_DATA | DEFERRED_LARGE_F… | INCIDENT_20260713 |

**Secret-bearing backups identified:** 40
**Active .env intact:** true
