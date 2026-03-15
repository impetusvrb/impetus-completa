# Backup dos arquivos app.js e server.js

Backup criado em caso de necessidade futura.

## Arquivos

| Arquivo | Descrição |
|---------|-----------|
| `app.js.original` | Versão original (antes da deleção) recuperada do git `4a2aa4a^` |
| `server.js.original` | Versão original (antes da deleção) recuperada do git `4a2aa4a^` |
| `app.js.current` | Versão atual em uso (com safeRequire e resiliência) |
| `server.js.current` | Versão atual em uso (restaurada, sem conflitos de merge) |

## Restaurar versão original

```bash
cp backup_deleted_files/app.js.original src/app.js
cp backup_deleted_files/server.js.original src/server.js
```

## Restaurar versão atual

```bash
cp backup_deleted_files/app.js.current src/app.js
cp backup_deleted_files/server.js.current src/server.js
```
