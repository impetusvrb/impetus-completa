# ENV_RECOVERY_RESTORE

**FASE:** ENV-RECOVERY-03 — Etapa 03-D  
**Data:** 2026-06-04

---

## Acção executada

```bash
cp -a backups/recovery_20260603_225426/backend.env backend/.env
```

**Origem exclusiva:** `backups/recovery_20260603_225426/backend.env`  
**Não utilizado:** `impetus_complete/`, `deploy_backups/`, outros backups antigos.

---

## Verificação pós-restore

| Check | Resultado |
|-------|-----------|
| Ficheiro existe | **Sim** |
| Permissões | `644` (`rw-r--r--`) |
| Proprietário | `root:root` |
| Legível pelo processo | **Sim** (`READABLE=OK`) |
| Tamanho | 42 082 B |
| mtime preservado | 2026-06-03 22:54:26 UTC (cópia `-a`) |

---

## Veredito Etapa 03-D

**RESTORE_OK** — Prosseguir teste BD (03-E) **antes** de `pm2 reload`.
