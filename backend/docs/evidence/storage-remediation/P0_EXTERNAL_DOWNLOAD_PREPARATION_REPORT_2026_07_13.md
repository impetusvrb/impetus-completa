# P0 — EXTERNAL DOWNLOAD PREPARATION REPORT

**Data:** 2026-07-13T16:28:00Z  
**Operador:** Cursor P0 remediation (preparação automatizada)  
**Classificação:** FORENSIC / READ-ONLY  
**Referências:** P0_CLOUDFLARE_502, P0_STORAGE_CAPACITY, SOURCE_SHA256_COMPLETE_MANIFEST  

---

## Veredito

```
OPERATION_MODE              = READ_ONLY
EVIDENCE_MODIFIED           = NO
EVIDENCE_DELETED            = NO
ORIGIN_HASHES_REVALIDATED   = YES (9/9 MATCH)
EXTERNAL_ARCHIVE_VALIDATED  = FALSE
DELETION_AUTHORIZED         = FALSE
READY_FOR_RED_TEAM          = FALSE
NEXT_STEP                   = MANUAL_DOWNLOAD_BY_AUTHORIZED_OPERATOR
```

---

## Etapa 1 — Inventário Final

Todos os artefactos confirmados presentes na VPS em **2026-07-13T16:24Z**.

### Prioridade ALTA (~30G — transferência obrigatória)

| # | Caminho completo | Tamanho | Data (mtime) | SHA256 | Classificação |
|---|------------------|---------|--------------|--------|---------------|
| 1 | `/var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql` | **19G** | 2026-06-26 16:29 | `0880756b31aa8387f0f59fe9abb3722a1181b59377caeceb2a981ebd5b0cdf9d` | DATABASE_BACKUP |
| 2 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1117038.50429709` | **2,3G** | 2026-07-11 14:17 | `fe8f81cae4ba02c2aa2207847f8ac652a8e994f15abf11baaeeb45a0a44f4e2e` | INCIDENT_EVIDENCE |
| 3 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1264763.57180497` | **2,2G** | 2026-07-12 10:27 | `0974572fcbc9be309df5f5882f49c5f0a2c195d458635d73a04486510ec0d1c7` | INCIDENT_EVIDENCE |
| 4 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1294484.59135010` | **2,0G** | 2026-07-12 14:51 | `49848113785be1337d01757b4ba6fe79277b4b6ac6b7a9c30f418c12c7fb42e0` | INCIDENT_EVIDENCE |
| 5 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1364633.62894624` | **2,3G** | 2026-07-13 00:52 | `4da331b53a02df706e2afd8c5041014a703a98107d23337b3cee28fcbdf8c3ef` | INCIDENT_EVIDENCE |
| 6 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1389545.64866468` | **2,1G** | 2026-07-13 07:48 | `261bc1d00b0bf75259177b8e3eb66467fc3fbc36f1614c43a260bed77cd318cb` | INCIDENT_EVIDENCE |

**Subtotal Prioridade Alta:** ~29,9G

### Prioridade MÉDIA (~62M — pacotes forenses e certificações)

| # | Caminho completo | Tamanho | Data | SHA256 | Classificação |
|---|------------------|---------|------|--------|---------------|
| 7 | `/var/www/impetus-completa/backend/docs/evidence/storage-remediation/export-staging/IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz` | **61M** | 2026-07-13 15:43 | `e0f4e2080fc5ee8f4a6acc02c7684a09102de29a61906513b1c1078992bf7fd6` | INCIDENT_EVIDENCE |
| 8 | `/var/www/impetus-completa/backend/docs/evidence/storage-remediation/export-staging/IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz` | **1,3M** | 2026-07-13 15:43 | `5a2e372f99966fe54f6b4e59cd0b1631b96f6f01b5db5fe63dbfa515d211b848` | CERTIFICATION_EVIDENCE |
| 9 | `/root/.pm2/logs/` (directório completo) | **~402M** | variável | *Ver PM2 logs individuais* | PM2_LOG / INCIDENT_EVIDENCE |

### Prioridade BAIXA (~90K — manifests e documentação)

| # | Caminho completo | Tamanho | Data | SHA256 | Classificação |
|---|------------------|---------|------|--------|---------------|
| 10 | `…/export-staging/IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz` | **55K** | 2026-07-13 15:43 | `1c98ebbb7fa1be5bc29f94b8be00c1a14f5004cd8a0abb9dfe6553e0e3e17b36` | INCIDENT_EVIDENCE |
| 11 | `…/storage-remediation/SOURCE_SHA256_COMPLETE_MANIFEST.txt` | **1,6K** | 2026-07-13 16:13 | *(manifesto de referência)* | FORENSIC_MANIFEST |
| 12 | `…/storage-remediation/FORENSIC_MANIFEST_2026_07_13.json` | **73K** | 2026-07-13 15:42 | `a validar pós-download` | FORENSIC_MANIFEST |
| 13 | `…/storage-remediation/FORENSIC_MANIFEST_2026_07_13.md` | **7,3K** | 2026-07-13 15:42 | — | FORENSIC_MANIFEST |
| 14 | `…/storage-remediation/APPORT_CORE_SHA256_MANIFEST.txt` | **1,3K** | 2026-07-13 15:45 | — | FORENSIC_MANIFEST |
| 15 | `…/storage-remediation/CHAIN_OF_CUSTODY_2026_07.md` | **3,5K** | 2026-07-13 16:28 | — | FORENSIC_MANIFEST |
| 16 | `…/storage-remediation/EXTERNAL_ARCHIVE_TRANSFER_MANIFEST.json` | **3,5K** | 2026-07-13 15:44 | — | FORENSIC_MANIFEST |
| 17 | `…/storage-remediation/P0_STORAGE_CAPACITY_FORENSIC_REMEDIATION_2026_07_13.md` | **9,3K** | 2026-07-13 15:45 | — | INCIDENT_EVIDENCE |
| 18 | `…/storage-remediation/P0_EXTERNAL_ARCHIVE_VALIDATION_2026_07_13.md` | **6,2K** | 2026-07-13 16:13 | — | INCIDENT_EVIDENCE |
| 19 | `…/evidence/security/P0_CLOUDFLARE_502_HOST_ERROR_2026_07_13.md` | **16K** | 2026-07-13 12:56 | — | INCIDENT_EVIDENCE |
| 20 | `/var/log/nginx/impetus-access.log` | variável | activo | — | NGINX_LOG |
| 21 | `/var/log/nginx/error.log` | variável | activo | — | NGINX_LOG |
| 22 | `/var/log/fail2ban.log` | variável | activo | — | SECURITY_LOG |

**Base path abreviada:** `/var/www/impetus-completa/backend/docs/evidence/`

---

## Etapa 2 — Lista Definitiva para Download (Operador Autorizado)

### Onde encontrar cada ficheiro na VPS

```
PRIORIDADE ALTA (transferir primeiro — ~30G)
├── /var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql
└── /var/lib/apport/coredump/
    ├── core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1117038.50429709
    ├── core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1264763.57180497
    ├── core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1294484.59135010
    ├── core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1364633.62894624
    └── core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1389545.64866468

PRIORIDADE MÉDIA (~464M)
├── /var/www/impetus-completa/backend/docs/evidence/storage-remediation/export-staging/
│   ├── IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz
│   └── IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz
└── /root/.pm2/logs/   (directório completo)

PRIORIDADE BAIXA (~90K + logs activos)
├── /var/www/impetus-completa/backend/docs/evidence/storage-remediation/
│   ├── SOURCE_SHA256_COMPLETE_MANIFEST.txt   ← usar para validação pós-download
│   ├── FORENSIC_MANIFEST_2026_07_13.json
│   ├── FORENSIC_MANIFEST_2026_07_13.md
│   ├── APPORT_CORE_SHA256_MANIFEST.txt
│   ├── CHAIN_OF_CUSTODY_2026_07.md
│   ├── EXTERNAL_ARCHIVE_TRANSFER_MANIFEST.json
│   ├── export-staging/IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz
│   └── (todos os relatórios P0 *.md)
├── /var/www/impetus-completa/backend/docs/evidence/security/
│   └── P0_CLOUDFLARE_502_HOST_ERROR_2026_07_13.md
└── /var/log/nginx/ + /var/log/fail2ban.log  (opcional — logs activos)
```

### Validação pós-download (operador)

1. Transferir ficheiros da VPS para computador autorizado
2. Copiar para pen drive 1TB
3. Executar `sha256sum` em cada ficheiro no destino
4. Comparar com `SOURCE_SHA256_COMPLETE_MANIFEST.txt` (itens 1–8 da tabela Alta+Média pacotes)
5. Se **100% MATCH** → registar `EXTERNAL_ARCHIVE_VALIDATED=true`
6. **Só então** autorizar remoção controlada na VPS (ciclo posterior)

---

## Etapa 3 — Cadeia de Custódia (actualizada)

| Campo | Valor |
|-------|-------|
| **DATA** | 2026-07-13 |
| **HORA UTC** | 16:28 |
| **OPERADOR** | Preparação P0 automatizada; transferência pendente Wellington/Gustavo |
| **STATUS** | **PREPARED_FOR_DOWNLOAD** |
| **ORIGEM** | VPS UUID `2fe3afcd-f945-40fc-bd99-74d9689a0e2d` — `/dev/sda1` |
| **HASH** | 9/9 artefactos críticos com SHA256 validado em origem (re-verificação 16:27 UTC) |
| **DESTINO** | **PENDENTE** — pen drive 1TB via computador autorizado |
| **VALIDAÇÃO** | **PENDENTE** — aguarda download + sha256sum no destino |
| **EXTERNAL_ARCHIVE_VALIDATED** | **FALSE** |
| **DELETION_AUTHORIZED** | **FALSE** |

Ver: `CHAIN_OF_CUSTODY_2026_07.md`

---

## Etapa 4 — Estado dos Serviços (leitura — 16:24 UTC)

| Serviço | Estado | Detalhe |
|---------|--------|---------|
| **PM2** | online | 10 apps; `impetus-backend` uptime ~115s, **2 restarts** |
| **PostgreSQL** | OK | `pg_isready` accepting; 11 conexões (4 active, 7 idle) |
| **nginx** | active | systemctl active |
| **Backend /health** | HTTP 200 | **1,64–1,85s** (3 amostras; melhor que 21,5s reportado anteriormente) |
| **Disco /** | **96%** | 93G/97G usados, 4,5G livres |
| **CPU load** | 0,56 / 1,54 / 1,48 | Moderado |
| **Memória** | 1573M used / 7936M total | 5915M available |
| **Swap** | 0 | Sem swap configurado |

**Nenhum serviço foi reiniciado ou alterado durante esta operação.**

---

## Etapa 5 — Diagnóstico Preliminar da Latência /health

### Observação temporal

| Momento | Latência /health | Contexto |
|---------|------------------|----------|
| Auditoria anterior (~16:09 UTC) | **~21,5s** | Disco 96%; possível contenção I/O |
| Esta auditoria (~16:24 UTC) | **~1,6–1,8s** | Backend reiniciado há ~2 min (PID novo) |

A latência de 21,5s foi **transitória**, não permanente no momento actual.

### Causas prováveis identificadas (documentação — sem correcção)

| Factor | Evidência | Impacto provável |
|--------|-----------|------------------|
| **Pressão disco 96%** | ENOSPC histórico; PostgreSQL + apport + checkpoint no mesmo volume | I/O wait elevado; queries `DataFileRead` observadas |
| **Pool PostgreSQL** | Logs `[DB][POOL_PRESSURE] waitingCount:3` (actual); histórico **20/0/30+** no incidente | Timeouts em boot e health checks |
| **Consultas lentas** | `pg_stat_activity`: `SELECT MIN(created_at) FROM industrial_event_outbox` com `wait_event=DataFileRead` | Health depende de checks DB |
| **OOM residual** | 5 core dumps Jul 11–13; backend 2 restarts PM2 | Reinícios causam latência pós-boot |
| **Contenção I/O durante auditoria** | `sha256sum` de 11G cores consumiu 79% CPU durante verificação | Falso positivo de latência se medido em paralelo |
| **PostgreSQL 49G** | BD grande no volume quase cheio | Autovacuum/checkpoint I/O competem com app |
| **Sem swap** | Swap=0 | OOM sem degradação gradual |

### Conclusão latência

```
LATENCY_STATUS        = IMPROVED_BUT_ELEVATED (1.6s vs sub-second target)
LATENCY_21S           = LIKELY_TRANSIENT (incident + I/O contention)
ROOT_LATENCY_FACTORS  = disk_pressure + db_io + pool_history + oom_restarts
CORRECTION_APPLIED    = NONE (per scope)
FOLLOWUP_REQUIRED     = YES (after disk recovery)
```

---

## Critérios de Aceitação

| Critério | Resultado |
|----------|-----------|
| Nenhuma evidência modificada | **PASS** |
| Nenhum ficheiro removido | **PASS** |
| Hashes origem válidos | **PASS** (9/9 re-verificados) |
| Caminhos documentados | **PASS** |
| Cadeia de custódia íntegra | **PASS** |
| Próxima etapa manual documentada | **PASS** |

---

## Próximo ciclo (após operador humano)

```
1. Download manual → computador autorizado
2. Cópia → pen drive 1TB
3. sha256sum validação 100% MATCH
4. EXTERNAL_ARCHIVE_VALIDATED = true
5. Remoção controlada VPS (~30G) — ciclo separado autorizado
6. Reavaliar disco ≤85%, latência /health, OOM
7. Só então: READY_FOR_RED_TEAM reavaliação
```

---

*P0 External Download Preparation — IMPETUS — 2026-07-13*  
*Operação READ-ONLY — nenhuma evidência alterada ou removida.*
