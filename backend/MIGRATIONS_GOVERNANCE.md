# IMPETUS — Migration Governance (Hardening)

> Sistema de migrations enterprise-grade: forward-only, auditável, reversível com governança, e protegido contra execuções destrutivas acidentais.

---

## 1. Resumo do modelo

```
backend/
├── migrations/
│   ├── *_migration.sql                       (forward only — corre por npm run migrate)
│   └── _rollback/                            (NUNCA corre automaticamente)
│       └── tenant_admins_rollback.sql
│
├── src/models/
│   ├── *_migration.sql                       (forward only — corre por npm run migrate)
│   └── _rollback/                            (NUNCA corre automaticamente)
│       └── manuia_rollback.sql
│
└── scripts/
    ├── migrations/
    │   ├── parser.js          # SQL splitter robusto (dollar-quote / strings / comments aware)
    │   ├── classifier.js      # Detector estático de destrutividade (DROP TABLE, TRUNCATE…)
    │   ├── discover.js        # Descoberta segura: filtra rollbacks por nome/pasta
    │   ├── history.js         # Gestão de impetus_migration_history + audit log
    │   └── tests.js           # Bateria de 10 cenários obrigatórios
    ├── run-all-migrations.js  # Runner FORWARD (entry point npm run migrate)
    └── run-rollback.js        # Runner ROLLBACK (gated, explícito, auditado)
```

---

## 2. Comandos disponíveis

| Comando | Descrição | Impacto |
|---|---|---|
| `npm run migrate` | Forward-only com plano + execução | Aplica migrations não registadas |
| `npm run migrate:dry` | Mostra plano completo sem executar | **zero** |
| `npm run migrate:status` | Histórico das últimas 100 migrations | **zero** |
| `npm run migrate:adopt` | Marca migrations forward existentes como aplicadas | grava `impetus_migration_history` (sem SQL) |
| `npm run migrate:rollback -- --list` | Lista rollbacks disponíveis | **zero** |
| `npm run migrate:rollback -- --name=X.sql --dry-run` | Mostra plano de rollback | **zero** |
| `npm run migrate:rollback -- --name=X.sql --yes-i-understand` | Executa rollback (exige `IMPETUS_ALLOW_ROLLBACK=true`) | DESTRUTIVO |
| `npm run migrate:test` | Bateria de 10 cenários obrigatórios | **zero** |

---

## 3. Variáveis de ambiente

| Variável | Defeito | Efeito |
|---|---|---|
| `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS` | `false` | Permite migrations forward marcadas `destructive` (DROP TABLE, DROP COLUMN, TRUNCATE, DELETE sem WHERE…) |
| `IMPETUS_ALLOW_ROLLBACK` | `false` | Habilita o runner `run-rollback.js` |
| `IMPETUS_MIGRATION_ACTOR` | `${USER}@${HOST}` | Identifica o autor para auditoria (ex.: `ci-deploy`, `pm2-prod`) |

> Estas flags **não devem** ficar persistidas no `.env` de produção. Ativar apenas no shell, durante a janela de execução planeada.

---

## 4. Schema do bookkeeping

### `impetus_migration_history`

| Coluna | Descrição |
|---|---|
| `id` | BIGSERIAL PK |
| `source` | `src/models` ou `migrations` |
| `name` | nome do ficheiro |
| `checksum_sha256` | sha256 hex do conteúdo |
| `status` | `success` / `failed` / `skipped` / `rollback` |
| `category` | `safe` / `low` / `destructive` |
| `destructive_flags` | JSONB com flags detectadas |
| `rollback_available` | TRUE se há rollback correspondente em `_rollback/` |
| `duration_ms` | duração em ms |
| `executed_by` | actor |
| `error_message` | preenchido se falha |
| `executed_at` | timestamp |

Index único parcial **`status='success'`** garante que cada `(source, name)` é aplicado **no máximo uma vez** com sucesso.

### `impetus_migration_audit_log` (append-only)

Auditoria de TODAS as acções: `forward` / `rollback` / `dry_run` / `blocked`. Inclui detalhes (`reason`, `error_message`, etc.).

---

## 5. Regras imutáveis (não desactiváveis por flag)

1. **Ficheiros em pasta `_rollback/`** (em qualquer profundidade) — nunca executados pelo runner forward.
2. **Ficheiros `*_rollback.sql`** — nunca executados pelo runner forward.
3. **Ficheiros `rollback_*.sql`** — nunca executados pelo runner forward.
4. **Migrations destrutivas** — só correm com `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true`.
5. **Rollbacks** — só correm via `run-rollback.js` com `IMPETUS_ALLOW_ROLLBACK=true` E `--yes-i-understand`.
6. **Migration já aplicada** — nunca reaplicada (verificação por `(source, name)` na `impetus_migration_history`).

---

## 6. Logs estruturados

Todos os runners emitem JSON parseable para ingest:

```
[MIGRATION_DISCOVERED]      { source, name, category, checksum }
[MIGRATION_EXECUTED]        { source, name, status, duration_ms, applied, skipped_idempotent }
[MIGRATION_ALREADY_APPLIED] { source, name, checksum }
[MIGRATION_ADOPTED]         { source, name, checksum }
[MIGRATION_BLOCKED]         { source, name, reason, flags }
[DESTRUCTIVE_MIGRATION_DETECTED] { source, name, flags }
[ROLLBACK_REQUESTED]        { name, dry_run, confirmed, actor, ts }
[ROLLBACK_BLOCKED]          { reason, hint, actor }
[ROLLBACK_EXECUTED]         { name, status, applied, duration_ms, actor }
```

---

## 7. Rollback procedure (governance)

> Apenas para emergências. Execução é registada em `impetus_migration_audit_log` para sempre.

```bash
# 1. Listar rollbacks disponíveis
npm run migrate:rollback -- --list

# 2. Plan-only
npm run migrate:rollback -- --name=tenant_admins_rollback.sql --dry-run

# 3. Activar a flag de execução (apenas no shell — nunca no .env)
export IMPETUS_ALLOW_ROLLBACK=true

# 4. Executar com confirmação textual
npm run migrate:rollback -- --name=tenant_admins_rollback.sql --yes-i-understand

# 5. Confirmar registo
npm run migrate:status | head -5
```

### Cenários de bloqueio (todos com exit-code 2 e `[ROLLBACK_BLOCKED]`)

| Faltou | Reason emitida |
|---|---|
| `--name=` | `missing_name` |
| `IMPETUS_ALLOW_ROLLBACK=true` | `flag_not_set` |
| `--yes-i-understand` (e não é dry-run) | `not_confirmed` |
| ficheiro fora de `_rollback/` | `not_in_rollback_folder` |

---

## 8. Adopção retroactiva (one-shot, primeira instalação)

Para ambientes onde as migrations já correram em produção antes da introdução do bookkeeping:

```bash
npm run migrate:adopt
```

- Regista todas as migrations forward não-destrutivas como `success` (sem executar SQL).
- Migrations destrutivas continuam bloqueadas até revisão manual.
- A partir desse momento, `npm run migrate` torna-se **idempotente**: só roda migrations futuras.

---

## 9. Compatibilidade

- **`start.sh`** continua a chamar `npm run migrate` no arranque — comportamento preservado, agora seguro.
- **`tenant_admins`** e **`support_recovery_operations`** intactas (validado por `migrate:test` T09/T10).
- **Migrations idempotentes legítimas** (`DROP CONSTRAINT IF EXISTS … ADD CONSTRAINT`, `DROP TRIGGER IF EXISTS`, etc.) classificadas como `low` — correm normalmente.
- **Convenção de nomenclatura:** ficheiros `*.legacy.sql` são excluídos do forward; a migration pgvector legada foi movida para `src/models/_legacy/` com sufixo `.legacy.sql` (ver `docs/vector-migration-hardening-report.md`).

---

## 10. Cenários cobertos pelos testes (`npm run migrate:test`)

| # | Cenário | Estado |
|---|---|---|
| T01 | Rollback NÃO corre automaticamente | ✓ |
| T02 | `*_rollback.sql` / `rollback_*.sql` / pasta `_rollback/` ignorados | ✓ |
| T03 | `impetus_migration_history` CRUD + checksum | ✓ |
| T04 | Migration já executada não reaplica (UNIQUE parcial) | ✓ |
| T05 | Dry-run não executa SQL real | ✓ |
| T06 | Migration destrutiva bloqueada sem flag | ✓ |
| T07 | Forward migration funciona com parser robusto (dollar-quote, comments, strings) | ✓ |
| T08 | Ordem `MIGRATIONS_ORDER` + alfabético respeitada | ✓ |
| T09 | Produção íntegra (`tenant_admins`, `support_recovery_operations`, `impetus_migration_history` existem) | ✓ |
| T10 | Tenant governance intacta (≥1 primary admin activo) | ✓ |
| T11 | Denylist permanente pgvector legacy + `*.legacy.sql` fora do forward | ✓ |

---

## 11. Histórico de adopção (snapshot inicial)

- **Adoptadas:** 81 migrations forward (74 em `src/models/`, 7 em `migrations/`)
- **Bloqueadas / congeladas:** migration legada pgvector — fora do plano forward + denylist permanente no runner; ver `docs/vector-migration-hardening-report.md`
- **Em `_rollback/` (não auto-executáveis):**
  - `migrations/_rollback/tenant_admins_rollback.sql`
  - `src/models/_rollback/manuia_rollback.sql`
- **Bookkeeping:** `impetus_migration_history` inicializada
- **Tenant governance:** 3/3 empresas com primary admin activo (validado)
