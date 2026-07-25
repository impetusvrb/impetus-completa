# P0 — EXTERNAL ARCHIVE VALIDATION REPORT

**Data:** 2026-07-13  
**Operação:** Externalização forense + liberação controlada de armazenamento  
**Referências:** P0_CLOUDFLARE_502, P0_STORAGE_CAPACITY_FORENSIC_REMEDIATION  

---

## Veredito executivo

```
FORENSIC_ARCHIVE_VALIDATED   = FALSE
EXTERNAL_ARCHIVE_VALIDATED   = FALSE
DISK_RECOVERY_COMPLETE       = FALSE
READY_FOR_RED_TEAM           = FALSE
```

**Motivo:** Pen drive 1TB **não detectado** na VPS. Cópia, validação cruzada e remoção controlada **não executadas**. Todos os artefactos originais permanecem intactos na VPS.

---

## Fase 1 — Detecção pen drive

| Campo | Valor |
|-------|-------|
| PEN_DRIVE_DETECTED | **NO** |
| Dispositivos block | `sda` (100G QEMU HARDDISK — disco VPS) |
| USB externo | Nenhum (`sdb`, etc. ausentes) |
| `/media/` | Vazio |
| `/mnt/` | Vazio |
| sr0 | DVD-ROM ISO (não utilizável como destino) |

**Nota:** O armazenamento 1TB está no computador autorizado do operador, conforme governança anterior. A VPS não tem acesso directo ao pen drive.

---

## Fase 2 — Espaço necessário vs disponível

| Item | Tamanho |
|------|---------|
| Pacotes A + A+ + B | ~62M |
| Core dumps (5×) | ~11G |
| Checkpoint SQL | 19G |
| Manifests | <5M |
| **Total estimado** | **~30G** |
| Espaço livre VPS (para staging) | 4,5G |
| Pen drive | **N/A — não montado** |

---

## Fase 3 — Cópia

```
COPY_EXECUTED = NO
COPY_METHOD   = BLOCKED (no external mount)
```

**Preparado para execução** via script: `backend/scripts/p0-external-archive-run.sh`

---

## Fase 4 — Validação criptográfica (origem VPS — completa)

Todos os hashes de **origem** calculados. Destino = N/A (cópia não realizada).

| Arquivo | SHA256 origem | SHA256 destino | MATCH |
|---------|---------------|----------------|-------|
| IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz | `1c98ebbb7fa1be5bc29f94b8be00c1a14f5004cd8a0abb9dfe6553e0e3e17b36` | — | **PENDING** |
| IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz | `e0f4e2080fc5ee8f4a6acc02c7684a09102de29a61906513b1c1078992bf7fd6` | — | **PENDING** |
| IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz | `5a2e372f99966fe54f6b4e59cd0b1631b96f6f01b5db5fe63dbfa515d211b848` | — | **PENDING** |
| core…1117038…50429709 | `fe8f81cae4ba02c2aa2207847f8ac652a8e994f15abf11baaeeb45a0a44f4e2e` | — | **PENDING** |
| core…1264763…57180497 | `0974572fcbc9be309df5f5882f49c5f0a2c195d458635d73a04486510ec0d1c7` | — | **PENDING** |
| core…1294484…59135010 | `49848113785be1337d01757b4ba6fe79277b4b6ac6b7a9c30f418c12c7fb42e0` | — | **PENDING** |
| core…1364633…62894624 | `4da331b53a02df706e2afd8c5041014a703a98107d23337b3cee28fcbdf8c3ef` | — | **PENDING** |
| core…1389545…64866468 | `261bc1d00b0bf75259177b8e3eb66467fc3fbc36f1614c43a260bed77cd318cb` | — | **PENDING** |
| checkpoint_2026-06-26T1622.sql | `0880756b31aa8387f0f59fe9abb3722a1181b59377caeceb2a981ebd5b0cdf9d` | — | **PENDING** |

Manifesto completo: `SOURCE_SHA256_COMPLETE_MANIFEST.txt`

---

## Fase 5 — Chain of Custody

Documento gerado: `CHAIN_OF_CUSTODY_2026_07.md`  
Estado: **PENDING** — transferência não iniciada

---

## Fase 6 — Verificação

```
EXTERNAL_ARCHIVE_VALIDATED = FALSE
Operação interrompida conforme protocolo (sem 100% MATCH no destino)
```

---

## Fase 7 — Remoção controlada

```
DELETION_EXECUTED = NO
Motivo: EXTERNAL_ARCHIVE_VALIDATED ≠ TRUE
```

**Nenhum ficheiro forense removido da VPS.**

---

## Fase 8 — Estado operacional pós-auditoria

| Check | Resultado |
|-------|-----------|
| Disco `/` | **96%** (93G/97G, 4,5G livres) — inalterado |
| PostgreSQL | `pg_isready` OK |
| PM2 | 10 apps online |
| Backend /health | HTTP **200**, latência **21,5s** ⚠️ |
| ENOSPC novos | Não observados durante operação |
| OOM novos | Não observados |
| Serviços reiniciados | **NÃO** (conforme instrução) |

---

## Instruções para concluir a externalização

### Opção A — Pen drive ligado directamente à VPS

```bash
# 1. Ligar pen drive; verificar dispositivo
lsblk

# 2. Montar (exemplo — ajustar dispositivo/partição)
mkdir -p /media/impetus
mount /dev/sdX1 /media/impetus   # NÃO formatar automaticamente

# 3. Executar cópia + validação
/var/www/impetus-completa/backend/scripts/p0-external-archive-run.sh /media/impetus

# 4. Se 100% MATCH, após confirmação humana:
/var/www/impetus-completa/backend/scripts/p0-external-archive-run.sh /media/impetus --delete-approved
```

### Opção B — Transferência via computador autorizado (recomendado)

```bash
# No computador autorizado (com pen drive 1TB montado):

DEST=./IMPETUS_FORENSIC_2026_07_13
mkdir -p "$DEST"/{packages,apport_coredump,postgresql,manifests}

# Pacotes + manifests
scp -r root@VPS:/var/www/impetus-completa/backend/docs/evidence/storage-remediation/export-staging/* "$DEST/packages/"
scp -r root@VPS:/var/www/impetus-completa/backend/docs/evidence/storage-remediation/*.txt "$DEST/manifests/"
scp -r root@VPS:/var/www/impetus-completa/backend/docs/evidence/storage-remediation/*.json "$DEST/manifests/"
scp -r root@VPS:/var/www/impetus-completa/backend/docs/evidence/storage-remediation/*.md "$DEST/manifests/"

# Core dumps (~11G — demorado)
scp root@VPS:/var/lib/apport/coredump/* "$DEST/apport_coredump/"

# Checkpoint (~19G — demorado)
scp root@VPS:/var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql "$DEST/postgresql/"

# Validar hashes no destino
cd "$DEST"
sha256sum -c manifests/SOURCE_SHA256_COMPLETE_MANIFEST.txt

# Copiar para pen drive 1TB; recalcular SHA256 no pen drive
# Confirmar: EXTERNAL_ARCHIVE_VALIDATED=true
# Só então autorizar remoção na VPS (Opção A passo 4)
```

---

## Status final

| Flag | Valor |
|------|-------|
| FORENSIC_ARCHIVE_VALIDATED | **FALSE** |
| DISK_RECOVERY_COMPLETE | **FALSE** |
| READY_FOR_RED_TEAM | **FALSE** |
| Evidências apagadas | **NONE** |
| Cadeia de custódia | Preparada; transferência pendente |
| Espaço a libertar pós-validação | **~30G** (checkpoint + apport + pacotes) |

### Bloqueadores para Red Team

1. Externalização não concluída
2. Disco ainda 96%
3. Backend /health com latência 21,5s (pool/performance follow-up)

---

*P0 External Archive Validation — IMPETUS — 2026-07-13*
