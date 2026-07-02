# Manual de Backup — IMPETUS Enterprise

## Comando

```bash
cd /var/www/impetus-completa/backend
./scripts/enterprise/backup-enterprise.sh
# ou: npm run enterprise:backup
```

## Conteúdo do backup

- `database.dump` — PostgreSQL (formato custom `-Fc`)
- `uploads.tar.gz`, `cognitive_data.tar.gz`, `licenses.tar.gz`, `certificates.tar.gz`
- `config.env` — cópia do `.env` activo
- `manifest.json` — SHA-256 de cada artefacto

## Destino

`${IMPETUS_HOME}/backups/backup_YYYYMMDD_HHMMSS/` ou `backend/backups/` em modo legado.

## Bases grandes (>2 GiB)

A partir de **CERT-ENTERPRISE-BACKUP-01**, o manifesto suporta dumps PostgreSQL **superiores a 2 GiB** (hash SHA-256 em streaming, sem carregar o ficheiro inteiro em memória).

## Reparar manifesto incompleto

Se `pg_dump` concluiu mas `manifest.json` falhou (backup legado NC-V006):

```bash
node scripts/enterprise/backup-enterprise.js --repair-manifest=/caminho/backup_YYYYMMDD_HHMMSS
```

Validar:

```bash
node scripts/enterprise/restore-enterprise.js --dry-run --backup=/caminho/backup_...
```

## Agendamento recomendado

Cron diário + execução obrigatória antes de cada update (`update-precheck.sh` → backup).

## Retenção

30 dias local; replica off-site conforme política INFRA-01.

## Referências

- `docs/CERT-ENTERPRISE-BACKUP-01.md`
- `docs/enterprise/MANUAL-RESTORE.md`
