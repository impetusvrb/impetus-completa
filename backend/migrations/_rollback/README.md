# Rollbacks — IMPETUS

> **REGRA ABSOLUTA:** ficheiros nesta pasta **nunca** são executados pelo runner forward (`npm run migrate`).
> A sua execução exige passos explícitos e auditados (ver fim deste documento).

## Convenção de nomenclatura aceite (qualquer uma das três)

1. `*_rollback.sql`
2. `rollback_*.sql`
3. Qualquer ficheiro dentro de uma pasta `_rollback/` (em qualquer profundidade)

O `discover.js` filtra todas estas formas; `run-all-migrations.js` recusa‑se a tocar nelas mesmo que sejam passadas como argumento explícito.

## Como executar um rollback (em emergência apenas)

```bash
# 1) Activar a flag explícita no ambiente do shell (NUNCA persistir no .env de produção)
export IMPETUS_ALLOW_ROLLBACK=true

# 2) Confirmar dry-run primeiro
node backend/scripts/run-rollback.js --name=<ficheiro_rollback.sql> --dry-run

# 3) Executar com confirmação textual
node backend/scripts/run-rollback.js --name=<ficheiro_rollback.sql> --yes-i-understand
```

O script:

- Verifica que o ficheiro existe **dentro** de `_rollback/`
- Recusa‑se a executar se `IMPETUS_ALLOW_ROLLBACK !== 'true'`
- Recusa‑se a executar sem `--yes-i-understand`
- Grava em `impetus_migration_history` com `status='rollback'`, `executed_by`, checksum
- Emite logs estruturados `[ROLLBACK_REQUESTED]`, `[ROLLBACK_BLOCKED]`, `[ROLLBACK_EXECUTED]`

## Inventário actual

| Ficheiro | Alvo | Reverte | Risco se executado em produção activa |
|---|---|---|---|
| `tenant_admins_rollback.sql` | `tenant_admins` | Phase 1 — governança tenant | **CRÍTICO** — destrói toda a separação admin × operação |

> Para o rollback do ManuIA ver `backend/src/models/_rollback/manuia_rollback.sql` (mesmas regras aplicam‑se).
