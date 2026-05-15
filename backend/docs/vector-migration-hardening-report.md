# Relatório — hardening de migrations vectorial (SAFE VECTOR MIGRATION CORRECTION)

**Data:** 2026-05-12 (UTC, aproximado à sessão de implementação).  
**Escopo:** congelamento da migration destrutiva, denylist permanente, descoberta de ficheiros `.legacy.sql`, documentação. **Sem** alteração a `manual_chunks`, runtime de retrieval, `ai.js`, `documentContext.js`, PM2 ou prompts.

---

## 1. Estado da migration antiga

| Item | Detalhe |
|------|---------|
| Nome original | `pgvector_semantic_search_migration.sql` (raiz de `src/models/`) |
| Estado actual | **Removida** do plano forward; conteúdo preservado com cabeçalho LEGACY em `src/models/_legacy/pgvector_semantic_search_migration.legacy.sql` |
| SQL contido | `CREATE EXTENSION vector`; `DROP COLUMN embedding`; `ADD COLUMN vector(1536)`; `CREATE INDEX ivfflat …` |
| Classificação | **DESTRUCTIVE**, **LEGACY**, **MANUAL_ONLY**, **REBUILD_REQUIRED** (conceito operacional) |

---

## 2. Protecções adicionadas

| Camada | Implementação |
|--------|----------------|
| **Descoberta** | `discover.js` — `listSqlFilesShallow` ignora ficheiros `*.legacy.sql` em `src/models/` e `migrations/`. |
| **Localização** | Ficheiro legado em `src/models/_legacy/` — **fora** da listagem shallow (só ficheiros directamente em `src/models/`). |
| **Runner** | `migrationSafetyPolicy.js` — `PERMANENT_MANUAL_ONLY_NAMES` inclui `pgvector_semantic_search_migration.sql` e `pgvector_semantic_search_migration.legacy.sql`. |
| **Execução** | `run-all-migrations.js` — antes de qualquer `executeOne`, se `permanent_manual_block`: **skip**, logs `[MIGRATION_BLOCKED]`, `[MIGRATION_LEGACY]`, `[MIGRATION_DESTRUCTIVE]` (modo `policy_hard_stop`), audit `recordAuditEvent`. |
| **Flag destrutiva** | Mesmo com `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true`, a denylist **impede** execução e adopção. |
| **Modo `--adopt`** | Mesma política — não regista como aplicada migrations na denylist. |
| **Plano / dry-run** | `printPlan` mostra tags `LEGACY`, `MANUAL_ONLY`, `BLOCKED_PERMANENTLY` e contador `permanent_manual_block` quando aplicável. |
| **Testes** | `scripts/migrations/tests.js` — **T11** valida denylist e ausência do ficheiro no forward. |

---

## 3. Riscos mitigados

- **Execução accidental** após alguém repor o ficheiro `.sql` na raiz de `src/models/` com o nome original ou `.legacy.sql` na raiz (bloqueio + exclusão `*.legacy.sql`).
- **Adopção falsa** de histórico sem SQL realmente corrido.
- **Falso sentimento de segurança** ao activar `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS` para outras migrations — pgvector legacy continua bloqueada.

---

## 4. Estratégia segura futura

Documentada em **`safe-vector-migration-strategy.md`** (blueprint: coluna nova, dual-read futuro, rebuild gradual, índice concurrent quando possível, swap, remoção tardia).

---

## 5. Dependências runtime

Listadas em **`semantic-runtime-dependencies.md`** (`documentContext`, `manuals`, `plcDataService`, `diagnostic`, `ai.js`, rotas admin/manuals).

---

## 6. Situação operacional actual

- **Semantic search:** inalterado pelo hardening (sem mudança de código de serviços).
- **Migrations restantes:** comportamento anterior preservado, com camada extra de segurança.
- **Produção:** sem DDL executado nesta tarefa.

---

## 7. Recomendação final

> **Semantic search mantido operacional; migration destrutiva congelada; evolução futura deverá ocorrer via migração assistida gradual** conforme o blueprint em `safe-vector-migration-strategy.md`.

---

## 8. Ficheiros tocados (lista)

- `backend/src/models/_legacy/pgvector_semantic_search_migration.legacy.sql` (novo)
- `backend/src/models/pgvector_semantic_search_migration.sql` (removido)
- `backend/scripts/migrations/discover.js`
- `backend/scripts/migrations/migrationSafetyPolicy.js` (novo)
- `backend/scripts/run-all-migrations.js`
- `backend/scripts/migrations/tests.js`
- `backend/docs/pgvector-semantic-search-audit.md` (nota no topo)
- `backend/docs/pgvector-legacy-migration-warning.md` (novo)
- `backend/docs/safe-vector-migration-strategy.md` (novo)
- `backend/docs/semantic-runtime-dependencies.md` (novo)
- `backend/docs/vector-migration-hardening-report.md` (este)

---

## 9. Verificação recomendada

```bash
cd backend && npm run migrate:dry
npm run migrate:test
```

Esperado: plano **sem** `pgvector_semantic_search_migration.sql`; testes **TESTS_PASSED**.
