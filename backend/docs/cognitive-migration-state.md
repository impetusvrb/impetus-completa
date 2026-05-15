# Estado das migrations cognitivas — IMPETUS

**Data (UTC):** 2026-05-12T17:40Z  
**Ferramenta:** `node scripts/run-all-migrations.js` (forward-only, histórico `impetus_migration_history`).

## 1. Inventário de ficheiros SQL cognitivos em `backend/migrations/`

| Ficheiro | Finalidade resumida |
|----------|---------------------|
| `cognitive_calibration_events_migration.sql` | Eventos de calibração |
| `cognitive_consensus_events_migration.sql` | Eventos de consenso |
| `cognitive_drift_events_migration.sql` | Eventos de drift |
| `cognitive_event_store_migration.sql` | Store de eventos cognitivos |
| `cognitive_safety_events_migration.sql` | Eventos de safety |
| `cognitive_stability_events_migration.sql` | Eventos de estabilidade / CSI |
| `cognitive_event_backbone_migration.sql` | Tabela backbone persistente (`cognitive_event_backbone`) |

**Modelos legados:** `src/models/cognitive_council_migration.sql` e `system_metrics_migration.sql` fazem parte da ordem histórica e constam no histórico como aplicados.

## 2. Resultado `npm run migrate:status` (amostra)

- Histórico com dezenas de entradas `success` em `migrations/` e `src/models/`, incluindo todas as cognitivas listadas acima **excepto** a necessidade de reexecutar backbone após descoberta — ver secção 3.
- Entradas marcadas como adoptadas no passado (`[adopted]`) indicam reconciliação com histórico real.

## 3. Execução desta consolidação (`npm run migrate` sem dry-run)

| Métrica | Valor |
|---------|--------|
| Executadas nesta corrida | **1** |
| Já aplicadas (skip) | 81 |
| Bloqueadas (destrutivas sem flag) | **1** |
| Falhas | **0** |

**Migration aplicada:** `migrations/cognitive_event_backbone_migration.sql`  
- Cria `cognitive_event_backbone` + índices (CREATE IF NOT EXISTS / idempotente).

**Migration bloqueada (intencional, seguro):**

- **Actualização (hardening):** o SQL legado foi movido para `src/models/_legacy/pgvector_semantic_search_migration.legacy.sql`, retirado do plano forward, e existe **denylist permanente** no runner (`migrationSafetyPolicy.js`) — **não executável** nem com `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS=true`. Ver `vector-migration-hardening-report.md`.
- Historicamente: classificada como **destructive** (`DROP_COLUMN`).

## 4. Duplicidade e ordem

- O runner impõe ordem canónica (`MIGRATIONS_ORDER` + descoberta) e deduplica por `(source, name, checksum)` no histórico.
- Não foram detectadas falhas de checksum nem migrations parcialmente falhadas nesta execução.

## 5. Tabelas e índices (backbone)

A migration de backbone adiciona:

- Tabela `cognitive_event_backbone` (UUID, `event_type`, `trace_id`, `company_id`, `payload` JSONB, `metadata` JSONB, `created_at`, `is_critical`, …).
- Índices por `company_id`, `trace_id`, `event_type`, `created_at DESC`.

## 6. Ficheiro `migration-failure-report.md`

**Não gerado** — nenhuma migration falhou na execução forward.

---

*Sem segredos. Para auditoria completa do histórico, correr `npm run migrate:status` no servidor com acesso à BD.*
