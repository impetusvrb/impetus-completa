# Rollbacks (legado em src/models) — IMPETUS

> **REGRA ABSOLUTA:** ficheiros nesta pasta **nunca** são executados pelo runner forward (`npm run migrate`).
> Vide `backend/migrations/_rollback/README.md` para o procedimento de execução governado.

## Inventário actual

| Ficheiro | Alvo | Reverte | Risco se executado em produção activa |
|---|---|---|---|
| `manuia_rollback.sql` | tabelas `manuia_*` | Módulo ManuIA completo (DROP CASCADE × 7) | **CRÍTICO** — perda total de dados ManuIA, work orders desligados |
