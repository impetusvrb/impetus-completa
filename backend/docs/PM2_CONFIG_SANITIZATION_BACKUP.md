# PM2_CONFIG_SANITIZATION_BACKUP

**FASE:** PM2-CONFIG-SANITIZATION-01 — Etapa 02  
**Data:** 2026-06-04  
**Destino:** `backend/backups/pm2-config-sanitization-01/`

---

## Artefactos

| Ficheiro | Descrição |
|----------|-----------|
| `dump.pm2` | Cópia de `~/.pm2/dump.pm2` (pré-sanitização) |
| `pm2-jlist.json` | `pm2 jlist` |
| `pm2-env-masked.txt` | `pm2 env 3` — sensíveis só com hash |
| `critical-var-hashes.txt` | Hashes dotenv vs PM2 das 11 variáveis |

---

## Hash pré-sanitização (`DB_PASSWORD`)

| Fonte | Hash (16 chars) |
|-------|-----------------|
| `backend/.env` | `02b874c2143de9b1` |
| PM2 runtime | `873cb24a6e3fcbd7` |

---

## Rollback

```bash
cp backend/backups/pm2-config-sanitization-01/dump.pm2 /root/.pm2/dump.pm2
pm2 resurrect
pm2 reload impetus-backend --update-env
```

**Nota:** Não apagar `dump.pm2` original — apenas substituir via cópia de backup se necessário.

---

## Veredito Etapa 02

**BACKUP_OK**
