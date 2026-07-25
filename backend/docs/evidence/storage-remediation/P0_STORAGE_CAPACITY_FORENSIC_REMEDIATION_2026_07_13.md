# P0 — STORAGE CAPACITY & FORENSIC PRESERVATION REMEDIATION

**Data:** 2026-07-13  
**Incidente correlacionado:** [P0_CLOUDFLARE_502_HOST_ERROR_2026_07_13.md](../security/P0_CLOUDFLARE_502_HOST_ERROR_2026_07_13.md)  
**Veredito:** `STORAGE_REMEDIATION_PARTIAL`  
**Estado forense:** `AWAITING_EXTERNAL_ARCHIVE_VALIDATION`

---

## 1. Respostas obrigatórias

| Pergunta | Resposta |
|----------|----------|
| **O que ocupava o disco?** | PostgreSQL 49G (51%), checkpoint SQL 19G (20%), apport OOM cores 11G (11%), outros backups ~3G, cache/duplicados ~4G, logs ~1G |
| **Causa raiz do 99%?** | Acumulação estrutural: BD live + backup monolítico 19G no mesmo volume + 5 core dumps Node.js (~2GB cada) de OOM Jul 11–13 |
| **Quanto espaço foi recuperado?** | **~3,6 GB** (980M → 4,6G disponíveis) |
| **Uso antes/depois?** | **100% → 96%** (96G → 93G usados) |
| **Alguma evidência apagada?** | **NÃO** — apenas CACHE, DUPLICATE e TEMPORARY aprovados em PRE_DELETE_MANIFEST |
| **Evidências preservadas?** | Sim — manifests SHA256, pacotes export, apport cores intactos, logs nginx/fail2ban/auth, PM2 logs, docs SEC/APPSEC |
| **Pacotes externos preparados?** | 3 pacotes em `export-staging/` + instruções para transferência directa de apport (11G) e checkpoint (19G) |
| **Backups .env identificados?** | **40 ficheiros** classificados SECRET_BEARING_BACKUP |
| **Backups com segredos?** | **SIM** — listados no FORENSIC_MANIFEST (conteúdo REDACTED) |
| **`.env` activo intacto?** | **SIM** — `/var/www/impetus-completa/backend/.env` (ACTIVE_RUNTIME, não removido) |
| **PostgreSQL estabilizou?** | **PARCIAL** — `pg_isready` OK; dados 49G intactos; risco ENOSPC reduzido mas não eliminado |
| **Pool estabilizou?** | **REQUIRES_FOLLOWUP** — backend health 200 mas latência ~2,9s |
| **Backend estabilizou?** | **PARCIAL** — PM2 online, 1 restart recente, sem OOM activo no momento |
| **Novo OOM?** | **NÃO** durante remediação |
| **Cursor Server?** | **NÃO TESTADO** — STORAGE_STABILIZED=false (96% > 85% meta) |
| **Lacuna forense irrecuperável?** | **PARCIAL** — lacuna nginx/PM2 stdout **08–11 UTC** documentada no P0 audit; logs comprimidos anteriores podem existir |
| **Red Team seguro retomar?** | **NÃO** — `RED_TEAM_RESUME_APPROVED=false` |

---

## 2. Inventário e classificação (Fase 1–2)

### Filesystem

```
Filesystem: /dev/sda1 ext4 97G
DISK_USAGE_BEFORE:  100% (986M avail)
DISK_USAGE_AFTER:   96%  (4.6G avail)
INODE_USAGE:        4%
```

### Ranking de consumo (% do espaço usado)

| SOURCE | SIZE | % USED | GROWTH RISK | CLASSIFICATION |
|--------|------|--------|-------------|----------------|
| `/var/lib/postgresql` | 49G | ~51% | HIGH | DATABASE_DATA — DO_NOT_TOUCH |
| `checkpoint_2026-06-26T1622.sql` | 19G | ~20% | MEDIUM | DATABASE_BACKUP — DO_NOT_TOUCH |
| `/var/lib/apport/coredump` | 11G | ~11% | HIGH | INCIDENT_EVIDENCE — DO_NOT_TOUCH |
| `backend/backups/` (outros) | ~3G | ~3% | MEDIUM | SECURE_BACKUP |
| `/root/.cache` (removido) | 2G | — | LOW | CACHE — DELETED |
| Duplicados (removidos) | ~1,7G | — | NONE | DUPLICATE — DELETED |
| `/var/log/journal` | 809M | ~0,8% | MEDIUM | SYSTEM_LOG — DO_NOT_TOUCH |
| `/root/.cursor-server` | 957M | ~1% | MEDIUM | CURSOR_ARTIFACT |
| `/root/.pm2/logs` | 402M | ~0,4% | MEDIUM | PM2_LOG — INCIDENT_EVIDENCE |

### Causa raiz vs contribuintes

**Causa raiz:** Volume único de 97G partilhado entre PostgreSQL live (49G), backup SQL monolítico (19G) e core dumps OOM (11G) — **82% do disco em 3 componentes**.

**Contribuintes:** OOM repetido gerando cores apport; ausência de externalização de backups; cache/duplicados legados (~4G).

**Agravantes:** ENOSPC → nginx/rsyslog falha escrita → lacuna logs 08–11 UTC → pool pressure → backend congelado → 502 Cloudflare.

---

## 3. Preservação forense (Fase 3–5)

### Artefactos gerados

| Ficheiro | Descrição |
|----------|-----------|
| `FORENSIC_MANIFEST_2026_07_13.json` | 138 entradas classificadas + SHA256 |
| `FORENSIC_MANIFEST_2026_07_13.md` | Resumo legível |
| `APPORT_CORE_SHA256_MANIFEST.txt` | SHA256 dos 5 core dumps (11G) |
| `PRE_DELETE_MANIFEST.json` | Itens removidos com justificação |
| `EXTERNAL_ARCHIVE_TRANSFER_MANIFEST.json` | Pacotes + instruções transferência |

### Pacotes preparados (VPS)

| Pacote | Ficheiro | Tamanho | SHA256 | Encrypted |
|--------|----------|---------|--------|-----------|
| A | `IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz` | 55K | `1c98ebbb…` | NO |
| A+ | `IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz` | 61M | `e0f4e208…` | NO |
| B | `IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz` | 1,3M | `5a2e372f…` | NO |
| C | `IMPETUS_SECRET_BACKUPS_2026.ENCRYPTED` | — | — | **STOP_SECRET_ARCHIVE_REQUIRES_HUMAN_KEY** |

**Localização:** `backend/docs/evidence/storage-remediation/export-staging/`

### Estado obrigatório

```
AWAITING_EXTERNAL_ARCHIVE_VALIDATION = true
```

**Não remover** apport cores, checkpoint SQL, backups .env ou evidências de incidente até confirmação humana `EXTERNAL_ARCHIVE_VALIDATED=true`.

---

## 4. Limpeza emergencial executada (Fase 7)

### PRE_DELETE_MANIFEST — itens removidos

| PATH | CLASS | SIZE | REASON |
|------|-------|------|--------|
| `/root/.cache` | CACHE | 2,0G | Regenerável |
| `/root/.npm/_cacache` | DEPENDENCY_ARTIFACT | 265M | Regenerável npm install |
| `/var/www/impetus-completa/impetus_complete` | DUPLICATE | 433M | Mirror legado; produção em backend/ |
| `/var/www/_bk_untracked_2026-03-03-0321` | DUPLICATE | 433M | Snapshot Mar/2026 não referenciado |
| `/var/www/RESTORE_TEST` | TEMPORARY | 809M | Sandbox teste Mar/2026 |

**Meta 85%:** **NÃO ATINGIDA** (96% actual). Requer externalização de apport (11G) + checkpoint (19G) após validação externa.

---

## 5. Revalidação operacional (Fase 10)

| Check | Resultado |
|-------|-----------|
| DISK | 96% — STORAGE_STABILIZED = **false** (meta ≤85%) |
| PostgreSQL | pg_isready OK — POSTGRESQL_STABILIZED = **partial** |
| PM2 | Todos online — BACKEND_STABILIZED = **partial** |
| Backend /health | HTTP 200, **2,9s** — POOL_REQUIRES_FOLLOWUP = **true** |
| Frontend :3000 | HTTP 200 |
| Admin :5174 | HTTP 200 |
| nginx | active |
| ENOSPC novos | Não observados durante remediação |
| OOM novos | Não observados |

---

## 6. Cursor Server (Fase 11)

```
STORAGE_STABILIZED = false (96% > 85%)
CURSOR_SERVER = NOT_RETESTED
Previous failure classification = PROBABLY_ENOSPC_RELATED (per P0 audit correlation)
Recommendation = Execute P0_CURSOR_SERVER_502_CORRELATION after disk <= 85%
```

---

## 7. Storage Exhaustion Protection (Fase 9 — proposta mínima)

### Alertas recomendados

| Threshold | Nível | Acção |
|-----------|-------|-------|
| 70% | INFO | Notificação operador |
| 80% | HIGH | Revisão consumo + bloqueio novos backups locais |
| 90% | CRITICAL | Parar Red Team; iniciar externalização |
| 95% | EMERGENCY | Apenas limpeza CACHE aprovada; escalar humano |

### Política de retenção distinta

| Categoria | Retenção | Destino |
|-----------|----------|---------|
| NORMAL_OPERATION_LOG | 14d rotate + compress | Local |
| SECURITY_LOG | 90d + archive | Local + external trimestral |
| INCIDENT_LOG | Até EXTERNAL_ARCHIVE_VALIDATED | External 1TB |
| FORENSIC_EVIDENCE | Permanente até externalizado | External 1TB |
| CERTIFICATION_EVIDENCE | Permanente | External 1TB |
| DATABASE_BACKUP | Max 1 full local; rest external | External 1TB |
| APPORT_CORE | Hash + external; purge local pós-validação | External |

### Controlos mínimos

- `logrotate` nginx/PM2 com compressão (já parcialmente activo)
- Desactivar apport para Node.js em produção OU quota `/var/lib/apport` com alerta
- Backups SQL >1G → externalização obrigatória, não no volume raiz
- Cron semanal `df -h` + alerta webhook

---

## 8. Instruções transferência externa (Wellington/Gustavo)

```bash
# 1. Pacotes pequenos (manifests + certs + PM2 logs)
scp -r root@VPS:/var/www/impetus-completa/backend/docs/evidence/storage-remediation/export-staging/ ./IMPETUS_EXPORT/

# 2. Core dumps OOM (11G) — transferência directa
scp root@VPS:/var/lib/apport/coredump/* ./IMPETUS_EXPORT/apport_cores/

# 3. Checkpoint SQL (19G)
scp root@VPS:/var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql ./IMPETUS_EXPORT/

# 4. Validar SHA256 no pen drive 1TB
sha256sum -c SHA256SUMS.txt

# 5. Confirmar explicitamente
EXTERNAL_ARCHIVE_VALIDATED=true
```

Para **Pacote C** (backups .env): fornecer chave de encriptação humana antes de criar `IMPETUS_SECRET_BACKUPS_2026.ENCRYPTED`.

---

## 9. Veredito final

```
STORAGE_REMEDIATION_SUCCESS     = false
STORAGE_REMEDIATION_PARTIAL     = true
STORAGE_REMEDIATION_BLOCKED     = false
FORENSIC_PRESERVATION_AT_RISK   = false (preservado; aguarda externalização)

RED_TEAM_RESUME_APPROVED        = false
```

### Próximos passos obrigatórios

1. Transferir apport + checkpoint + pacotes para armazenamento 1TB externo
2. Confirmar `EXTERNAL_ARCHIVE_VALIDATED=true`
3. Só então: remover apport cores (11G) e avaliar checkpoint SQL (19G) no VPS
4. Fornecer chave humana para Pacote C encriptado
5. Executar `P0_CURSOR_SERVER_502_CORRELATION` após disco ≤85%
6. Investigar latência backend/pool (2,9s health)

---

*P0 Storage Remediation — IMPETUS — 2026-07-13*  
*Nenhuma evidência forense de incidente foi destruída nesta operação.*
