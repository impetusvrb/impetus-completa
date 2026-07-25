# P0 — GUIA DE TRANSFERÊNCIA FORENSE
## VPS → Notebook Autorizado → Pen Drive (E:)

**Data:** 2026-07-13  
**Fluxo:** `VPS` → `Notebook (pasta temporária)` → `E:\IMPETUS_FORENSIC_ARCHIVE\`  
**EXTERNAL_ARCHIVE_VALIDATED:** pendente até validação SHA256 no pen drive  
**DELETION_AUTHORIZED:** **FALSE** — nenhuma remoção na VPS nesta fase  

---

## Pré-requisitos no notebook

- Espaço livre local temporário: **≥35 GB** (para cópia intermédia antes do pen drive)
- Pen drive `E:` com espaço livre: **≥35 GB**
- Cliente SFTP/SCP de preferência (WinSCP, FileZilla, VS Code Remote SSH, etc.)
- PowerShell para validação SHA256

---

## Estrutura recomendada

### Pasta temporária no notebook (exemplo)

```
C:\IMPETUS_TRANSFER_STAGING\
├── Checkpoint\
├── CoreDumps\
├── Logs\
├── Security\
├── Reports\
└── Manifests\
```

### Destino final no pen drive

```
E:\IMPETUS_FORENSIC_ARCHIVE\
├── Checkpoint\
├── CoreDumps\
├── Logs\
├── Security\
├── Reports\
└── Manifests\
```

---

## ETAPA 1 — Lista definitiva de transferência

### Prioridade ALTA (~30 GB)

| # | Origem VPS | Tamanho | SHA256 | Destino notebook | Destino E: |
|---|------------|---------|--------|------------------|------------|
| 1 | `/var/www/impetus-completa/backend/backups/checkpoint_2026-06-26T1622.sql` | 19G | `0880756b31aa8387f0f59fe9abb3722a1181b59377caeceb2a981ebd5b0cdf9d` | `Checkpoint\checkpoint_2026-06-26T1622.sql` | `E:\IMPETUS_FORENSIC_ARCHIVE\Checkpoint\` |
| 2 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1117038.50429709` | 2,3G | `fe8f81cae4ba02c2aa2207847f8ac652a8e994f15abf11baaeeb45a0a44f4e2e` | `CoreDumps\` | `E:\IMPETUS_FORENSIC_ARCHIVE\CoreDumps\` |
| 3 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1264763.57180497` | 2,2G | `0974572fcbc9be309df5f5882f49c5f0a2c195d458635d73a04486510ec0d1c7` | `CoreDumps\` | `E:\IMPETUS_FORENSIC_ARCHIVE\CoreDumps\` |
| 4 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1294484.59135010` | 2,0G | `49848113785be1337d01757b4ba6fe79277b4b6ac6b7a9c30f418c12c7fb42e0` | `CoreDumps\` | `E:\IMPETUS_FORENSIC_ARCHIVE\CoreDumps\` |
| 5 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1364633.62894624` | 2,3G | `4da331b53a02df706e2afd8c5041014a703a98107d23337b3cee28fcbdf8c3ef` | `CoreDumps\` | `E:\IMPETUS_FORENSIC_ARCHIVE\CoreDumps\` |
| 6 | `/var/lib/apport/coredump/core._usr_bin_node.0.c2c91690-dade-4dba-ad0e-c9d72f5fa11a.1389545.64866468` | 2,1G | `261bc1d00b0bf75259177b8e3eb66467fc3fbc36f1614c43a260bed77cd318cb` | `CoreDumps\` | `E:\IMPETUS_FORENSIC_ARCHIVE\CoreDumps\` |

### Prioridade MÉDIA (~468 MB)

| # | Origem VPS | Tamanho | SHA256 | Destino |
|---|------------|---------|--------|---------|
| 7 | `…/export-staging/IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz` | 61M | `e0f4e2080fc5ee8f4a6acc02c7684a09102de29a61906513b1c1078992bf7fd6` | `Logs\` |
| 8 | `…/export-staging/IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz` | 1,3M | `5a2e372f99966fe54f6b4e59cd0b1631b96f6f01b5db5fe63dbfa515d211b848` | `Security\` |
| 9 | `/root/.pm2/logs/` (directório completo) | ~406M | *validar ficheiros individuais ou tarball PM2* | `Logs\pm2_raw\` |

**Base path export-staging:**  
`/var/www/impetus-completa/backend/docs/evidence/storage-remediation/export-staging/`

### Prioridade BAIXA (~100 KB + documentação)

| # | Origem VPS | Destino |
|---|------------|---------|
| 10 | `…/export-staging/IMPETUS_FORENSIC_EVIDENCE_2026_07.tar.gz` | `Reports\` — SHA: `1c98ebbb…` |
| 11 | `…/storage-remediation/SOURCE_SHA256_COMPLETE_MANIFEST.txt` | `Manifests\` |
| 12 | `…/storage-remediation/FORENSIC_MANIFEST_2026_07_13.json` | `Manifests\` |
| 13 | `…/storage-remediation/FORENSIC_MANIFEST_2026_07_13.md` | `Manifests\` |
| 14 | `…/storage-remediation/APPORT_CORE_SHA256_MANIFEST.txt` | `Manifests\` |
| 15 | `…/storage-remediation/CHAIN_OF_CUSTODY_2026_07.md` | `Manifests\` |
| 16 | `…/storage-remediation/EXTERNAL_ARCHIVE_TRANSFER_MANIFEST.json` | `Manifests\` |
| 17 | `…/storage-remediation/P0_*.md` (todos) | `Reports\` |
| 18 | `…/evidence/security/P0_CLOUDFLARE_502_HOST_ERROR_2026_07_13.md` | `Reports\` |

**Base path storage-remediation:**  
`/var/www/impetus-completa/backend/docs/evidence/storage-remediation/`

---

## ETAPA 2 — Download VPS → Notebook

Utilizar o cliente SFTP/SCP de preferência. Para cada ficheiro:

1. Navegar ao **caminho de origem na VPS** (tabela acima)
2. Transferir para a pasta temporária local correspondente
3. **Não alterar** nomes de ficheiros (preservar integridade forense)
4. Transferir **Prioridade Alta primeiro** (maior volume; validar antes de prosseguir)

**Ordem sugerida:**
1. Manifests + Reports (Baixa) — obter `SOURCE_SHA256_COMPLETE_MANIFEST.txt` primeiro
2. Pacotes Média (62M)
3. Core dumps (11G total — ~5 ficheiros)
4. Checkpoint SQL (19G — último ou overnight)

---

## ETAPA 3 — Validação local (notebook)

Após download, executar no PowerShell (como Administrador se necessário):

```powershell
cd C:\IMPETUS_TRANSFER_STAGING
# Copiar validate-impetus-forensic.ps1 para esta pasta (ver ficheiro no repositório VPS)
.\validate-impetus-forensic.ps1 -Path "C:\IMPETUS_TRANSFER_STAGING"
```

**Critério:** todos os 9 ficheiros críticos com `MATCH = TRUE`.

Se **qualquer** divergência → `EXTERNAL_ARCHIVE_VALIDATED = FALSE` → **interromper** → re-transferir ficheiro afectado.

---

## ETAPA 4 — Cópia Notebook → Pen Drive (E:)

**Somente após validação local OK:**

```powershell
# Criar estrutura no pen drive
New-Item -ItemType Directory -Force -Path "E:\IMPETUS_FORENSIC_ARCHIVE\Checkpoint"
New-Item -ItemType Directory -Force -Path "E:\IMPETUS_FORENSIC_ARCHIVE\CoreDumps"
New-Item -ItemType Directory -Force -Path "E:\IMPETUS_FORENSIC_ARCHIVE\Logs"
New-Item -ItemType Directory -Force -Path "E:\IMPETUS_FORENSIC_ARCHIVE\Security"
New-Item -ItemType Directory -Force -Path "E:\IMPETUS_FORENSIC_ARCHIVE\Reports"
New-Item -ItemType Directory -Force -Path "E:\IMPETUS_FORENSIC_ARCHIVE\Manifests"

# Copiar (preserva timestamps com robocopy)
robocopy "C:\IMPETUS_TRANSFER_STAGING" "E:\IMPETUS_FORENSIC_ARCHIVE" /E /COPY:DAT /DCOPY:DAT /R:2 /W:5
```

---

## ETAPA 5 — Validação final (pen drive E:)

```powershell
.\validate-impetus-forensic.ps1 -Path "E:\IMPETUS_FORENSIC_ARCHIVE"
```

**Somente se 100% MATCH:**

```
EXTERNAL_ARCHIVE_VALIDATED = TRUE
DELETION_AUTHORIZED        = FALSE  (aguardar ciclo separado)
```

Registar no relatório `P0_EXTERNAL_TRANSFER_VALIDATION_2026_07_13.md` secção "Confirmação do Operador".

---

## Ficheiros auxiliares (VPS)

| Ficheiro | Localização VPS |
|----------|-----------------|
| Manifesto SHA256 | `backend/docs/evidence/storage-remediation/SOURCE_SHA256_COMPLETE_MANIFEST.txt` |
| Script validação Windows | `backend/docs/evidence/storage-remediation/validate-impetus-forensic.ps1` |
| Este guia | `backend/docs/evidence/storage-remediation/P0_TRANSFER_GUIDE_VPS_NOTEBOOK_PENDRIVE.md` |

**Transferir Manifests (Prioridade Baixa) antes de iniciar validação.**

---

*Guia P0 — IMPETUS — 2026-07-13*
