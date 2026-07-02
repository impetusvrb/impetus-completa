# Manual de Restore — IMPETUS Enterprise

## Pré-requisitos

- Backup validado com manifesto
- Janela de manutenção
- Backup pré-restore do estado actual

## Dry-run

```bash
./scripts/enterprise/restore-enterprise.sh \
  --backup=/opt/impetus/backups/backup_20260630_120000 \
  --dry-run
```

## Restore completo

```bash
./scripts/enterprise/restore-enterprise.sh \
  --backup=/caminho/backup \
  --yes
```

## Restore parcial

```bash
./scripts/enterprise/restore-enterprise.sh \
  --backup=/caminho/backup \
  --only=config,uploads \
  --yes
```

## Pós-restore

```bash
./scripts/enterprise/verify-enterprise.sh
./scripts/enterprise/health-enterprise.sh
pm2 restart impetus-backend impetus-frontend --update-env
```

**Nunca** restaura sem confirmação explícita (`--yes` ou prompt interactivo).
