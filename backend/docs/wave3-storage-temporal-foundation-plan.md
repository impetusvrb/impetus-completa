# WAVE 3 — Plano de Evolução Storage & Temporal

> Preparação para densidade industrial. **Não** converte tabelas legadas nem activa hypertables em produção.

## 1. Objetivo

Fundar governança de storage (particionamento, retenção, tiers, Timescale opt-in, cold storage, telemetria isolada) sem alterar `eventos_empresa`, `operational_alerts`, `ai_decision_logs` nem outras tabelas críticas existentes.

## 2. Tabelas candidatas (análise)

| Tabela legada | Padrão de acesso | Volume esperado | Estratégia futura | WAVE 3 |
|---------------|------------------|-----------------|-------------------|--------|
| `eventos_empresa` | `company_id` + `created_at` DESC | Alto | Partição mensal por `created_at` | Só registo em `impetus_storage_table_registry` |
| `operational_alerts` | company + open + created | Médio | Partição mensal | Registo + índice futuro documentado |
| `ai_decision_logs` | trace_id, company, created | Alto (imutável) | Append-only; arquivo frio > 365d | Registo tier `audit`; **sem ALTER** |
| `ai_interaction_traces` | company + module + created | Alto | Partição mensal | Registo |
| `system_metrics` | metric_key + created | Médio-alto | Hypertable Timescale (nova série) | Nova tabela `telemetry_timeseries_v1` |
| `cognitive_event_backbone` | event_type + created | Médio | Partição semanal | Registo |
| `industrial_event_outbox` | status + next_attempt | Médio | Retenção curta + arquivo | Registo |
| `industrial_event_dlq` | company + created | Baixo-médio | Retenção 90d | Registo |

## 3. Estratégia de particionamento

| Perfil | Chave | Granularidade | Quando aplicar |
|--------|-------|---------------|----------------|
| `telemetry` | `recorded_at` | semanal → mensal | Após W3 gate em staging |
| `operational_events` | `created_at` | mensal | Fase futura (nova tabela ou migração offline) |
| `audit_immutable` | `created_at` | mensal + arquivo | Nunca DROP; só detach/archive |

**WAVE 3:** apenas `industrial_telemetry_samples` (tabela **nova**) com `PARTITION BY RANGE (recorded_at)` e partição `DEFAULT`.

`IMPETUS_PARTITIONING_STRATEGY`: `none` | `weekly` | `monthly` (governa **só** tabelas novas).

## 4. Estratégia Timescale

- `IMPETUS_TIMESCALE_ENABLED=false` (default).
- `IMPETUS_TIMESCALE_PREPARE_EXTENSION=false` — se `true` em staging, migration pode `CREATE EXTENSION IF NOT EXISTS timescaledb` (opcional, isolado).
- Registo em `impetus_timescale_readiness` — estado: `unavailable` | `extension_ready` | `hypertable_eligible`.
- **Nenhum** `create_hypertable()` automático nesta wave.
- Candidatos hypertable futuros: `telemetry_timeseries_v1`, `industrial_metric_rollups_v1`.

## 5. Retention policies (declarativas)

| Perfil | Hot | Warm | Cold | Notas |
|--------|-----|------|------|-------|
| `telemetry` | 7d | 90d | 365d | amostragem/agregação |
| `operational` | 30d | 180d | 730d | eventos operacionais |
| `audit` | 90d | 365d | 7y | imutável; arquivo só cópia |
| `workflow` | 14d | 90d | 365d | outbox/DLQ |
| `default` | 30d | 180d | 365d | fallback |

Persistidas em `impetus_retention_policy` — workers de purge **não** activos (flag off).

## 6. Cold storage architecture

- Manifestos em `impetus_cold_storage_manifest` (path lógico, checksum, tier, `company_id` opcional).
- Formatos previstos: Parquet/NDJSON em object storage (S3-compat).
- `IMPETUS_COLD_STORAGE_ENABLED=false` — sem workers; só schema + API.

## 7. Compression planning

| Tier | Método Postgres | Método Timescale | Activar |
|------|-----------------|------------------|---------|
| Hot | sem compressão | — | agora (default) |
| Warm | — | `compress_segmentby=company_id` | pós-PoC |
| Cold | arquivo externo | — | worker futuro |

Registo em `impetus_compression_plan` (documentação executável, sem `ALTER` legado).

## 8. Telemetry isolation strategy

- Tráfego de telemetria industrial → **apenas** `telemetry_timeseries_v1` e `industrial_telemetry_samples`.
- Legado `system_metrics` permanece; dual-write opcional futuro via flag.
- Domínios isolados: `quality`, `safety`, `environment`, `logistics`, `platform`.

## 9. Storage tiering preparation

Tiers: `hot` | `warm` | `cold` | `archive` em `impetus_storage_tier`.
Atribuições lógicas em `impetus_storage_table_registry` (sem mover dados).

## 10. Rollback plan

1. `IMPETUS_STORAGE_V3_ENABLED=false` — runtime inerte.
2. Tabelas novas permanecem vazias; podem ser ignoradas.
3. Drop controlado (futuro): apenas tabelas `impetus_*` / `telemetry_*` / `industrial_telemetry_*` criadas nesta wave.
4. Nenhum rollback de tabelas legadas necessário.

## 11. Storage impact analysis

| Área | Impacto WAVE 3 |
|------|----------------|
| Disco | +schema vazio (~MB); partições DEFAULT vazias |
| WAL | Negligível (sem backfill) |
| Autovacuum | Sem mudança em legado |
| Connections | Sem pools novos |

## 12. Backup impact analysis

- Backup full: +metadados pequenos.
- PITR: sem mudança de comportamento legado.
- Restore: tabelas novas restauram com o cluster; sem dependência crítica.

## 13. Query impact analysis

- Legado: **zero** mudança de planos.
- Novas tabelas: não referenciadas por código de produção até flags futuras.
- Risco futuro: particionamento exige `recorded_at` em predicates — documentado.

## 14. Gate W3→W4

- Registry completo com ≥ 8 candidatos.
- PoC staging: inserts em `industrial_telemetry_samples` 7 dias sem regressão.
- Timescale extension testada em staging (opcional).
- Plano de retenção aprovado por ops.

## 15. Módulos entregues

Ver `backend/src/storage/` e migration `wave3_storage_temporal_foundation_migration.sql`.
