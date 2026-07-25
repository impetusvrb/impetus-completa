# P0 — EXTERNAL TRANSFER VALIDATION REPORT
## VPS → Notebook → Pen Drive (E:)

**Data preparação:** 2026-07-13  
**Fluxo:** VPS → Notebook autorizado → `E:\IMPETUS_FORENSIC_ARCHIVE\`  
**Operador:** Wellington/Gustavo (transferência manual)  

---

## Status actual

```
TRANSFER_PHASE              = PREPARED — awaiting manual execution on notebook
EXTERNAL_ARCHIVE_VALIDATED  = FALSE  (pending operator validation)
DELETION_AUTHORIZED         = FALSE
VPS_EVIDENCE_REMOVED        = NO
NOTEBOOK_VALIDATION         = PENDING
PENDRIVE_VALIDATION         = PENDING
```

> **Nota:** O Cursor/VPS não tem acesso ao notebook nem à unidade `E:`.  
> A validação final só pode ser marcada `TRUE` após o operador executar  
> `validate-impetus-forensic.ps1` no notebook e no pen drive.

---

## Artefactos preparados na VPS (origem intacta)

| Verificação | Resultado |
|-------------|-----------|
| Hashes origem (9 críticos) | **VALID** (re-verificados 2026-07-13) |
| Evidências removidas | **NONE** |
| Disco VPS | 96% (4,5G livres) |
| Serviços alterados | **NONE** |

---

## Inventário para transferência

### Prioridade ALTA (~30 GB)

| Ficheiro | VPS path | SHA256 |
|----------|----------|--------|
| checkpoint_2026-06-26T1622.sql | `/var/www/impetus-completa/backend/backups/` | `0880756b31aa8387f0f59fe9abb3722a1181b59377caeceb2a981ebd5b0cdf9d` |
| core…1117038…50429709 | `/var/lib/apport/coredump/` | `fe8f81cae4ba02c2aa2207847f8ac652a8e994f15abf11baaeeb45a0a44f4e2e` |
| core…1264763…57180497 | `/var/lib/apport/coredump/` | `0974572fcbc9be309df5f5882f49c5f0a2c195d458635d73a04486510ec0d1c7` |
| core…1294484…59135010 | `/var/lib/apport/coredump/` | `49848113785be1337d01757b4ba6fe79277b4b6ac6b7a9c30f418c12c7fb42e0` |
| core…1364633…62894624 | `/var/lib/apport/coredump/` | `4da331b53a02df706e2afd8c5041014a703a98107d23337b3cee28fcbdf8c3ef` |
| core…1389545…64866468 | `/var/lib/apport/coredump/` | `261bc1d00b0bf75259177b8e3eb66467fc3fbc36f1614c43a260bed77cd318cb` |

### Prioridade MÉDIA (~468 MB)

| Ficheiro | VPS path | SHA256 |
|----------|----------|--------|
| IMPETUS_FORENSIC_PM2_LOGS_2026_07.tar.gz | `…/export-staging/` | `e0f4e2080fc5ee8f4a6acc02c7684a09102de29a61906513b1c1078992bf7fd6` |
| IMPETUS_SECURITY_CERTIFICATIONS_2026.tar.gz | `…/export-staging/` | `5a2e372f99966fe54f6b4e59cd0b1631b96f6f01b5db5fe63dbfa515d211b848` |
| PM2 logs (directório) | `/root/.pm2/logs/` | ~406M — validar integridade por tarball ou ficheiro |

### Prioridade BAIXA

Manifests, Chain of Custody, relatórios P0 — ver `P0_TRANSFER_GUIDE_VPS_NOTEBOOK_PENDRIVE.md`

---

## Procedimento (operador)

### Passo 1 — Transferir Manifests primeiro

Download para notebook: `SOURCE_SHA256_COMPLETE_MANIFEST.txt` + `validate-impetus-forensic.ps1`

### Passo 2 — VPS → Notebook

SFTP/SCP conforme guia. Pasta sugerida: `C:\IMPETUS_TRANSFER_STAGING\`

### Passo 3 — Validar notebook

```powershell
.\validate-impetus-forensic.ps1 -Path "C:\IMPETUS_TRANSFER_STAGING"
```

### Passo 4 — Notebook → Pen drive

```powershell
robocopy "C:\IMPETUS_TRANSFER_STAGING" "E:\IMPETUS_FORENSIC_ARCHIVE" /E /COPY:DAT /DCOPY:DAT
```

### Passo 5 — Validar pen drive

```powershell
.\validate-impetus-forensic.ps1 -Path "E:\IMPETUS_FORENSIC_ARCHIVE"
```

---

## Tabela de validação (preencher após transferência)

| Ficheiro | SHA origem | SHA notebook | SHA E: | MATCH |
|----------|------------|--------------|--------|-------|
| checkpoint SQL | 0880756b… | _pendente_ | _pendente_ | — |
| core 1117038 | fe8f81ca… | _pendente_ | _pendente_ | — |
| core 1264763 | 0974572f… | _pendente_ | _pendente_ | — |
| core 1294484 | 49848113… | _pendente_ | _pendente_ | — |
| core 1364633 | 4da331b5… | _pendente_ | _pendente_ | — |
| core 1389545 | 261bc1d0… | _pendente_ | _pendente_ | — |
| PM2 tarball | e0f4e208… | _pendente_ | _pendente_ | — |
| Cert tarball | 5a2e372f… | _pendente_ | _pendente_ | — |
| Forensic tarball | 1c98ebbb… | _pendente_ | _pendente_ | — |

---

## Confirmação do operador (preencher após conclusão)

```
Data conclusão transferência: _______________
Hora (UTC-3): _______________
Responsável: _______________
Notebook validação: PASS / FAIL
Pen drive (E:) validação: PASS / FAIL
EXTERNAL_ARCHIVE_VALIDATED: TRUE / FALSE
DELETION_AUTHORIZED: FALSE (ciclo separado)
Observações: _______________
```

---

## Cadeia de custódia (actualizada)

| Campo | Valor |
|-------|-------|
| **Origem** | VPS UUID `2fe3afcd-f945-40fc-bd99-74d9689a0e2d` |
| **Destino intermédio** | Notebook autorizado (pendente) |
| **Destino final** | Pen Drive 1TB — `E:\IMPETUS_FORENSIC_ARCHIVE\` (pendente) |
| **Validação SHA256 origem** | OK (9/9) |
| **Validação SHA256 destino** | PENDENTE |
| **Operador** | Wellington/Gustavo |
| **Data/Hora preparação** | 2026-07-13 |

---

## Documentação de apoio

| Documento | Path VPS |
|-----------|----------|
| Guia transferência | `P0_TRANSFER_GUIDE_VPS_NOTEBOOK_PENDRIVE.md` |
| Script validação Windows | `validate-impetus-forensic.ps1` |
| Manifesto SHA256 | `SOURCE_SHA256_COMPLETE_MANIFEST.txt` |
| Chain of Custody | `CHAIN_OF_CUSTODY_2026_07.md` |

---

## Critério de encerramento

```
EXTERNAL_ARCHIVE_VALIDATED = TRUE   ← somente após Passo 5 PASS
DELETION_AUTHORIZED        = FALSE ← permanece até ciclo separado
VPS files removed          = NONE
```

Próximo ciclo (após TRUE): liberação controlada de ~30G na VPS — **autorização separada**.

---

*P0 External Transfer Validation — IMPETUS — 2026-07-13*
