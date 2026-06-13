# AIOI-P0A — Migration Audit Report

**Data:** 2026-06-12  
**Modo:** READ ONLY · AUDIT ONLY · CERTIFICATION FIRST  
**Runtime cognitivo:** DESATIVADO  

---

## 1. Resumo Executivo

| Métrica | Valor |
|---------|-------|
| Migrations encontradas no repositório | **4** |
| Migrations aplicadas no banco | **0** |
| Migrations faltantes (esperadas não existentes) | **1** (`aioi_decisions`) |
| Tabelas esperadas pelo P0 | **6** |
| Tabelas existentes no BD | **0** |
| ENUMs AIOI no BD | **0** |
| **Bloqueante para operação P0** | **SIM** |

---

## 2. Inventário de Migrations

### Migration 1: `aioi_ioe_foundation_migration.sql`

```json
{
  "migration_name": "aioi_ioe_foundation_migration.sql",
  "migration_found": true,
  "migration_applied": false,
  "lines": 509,
  "tables_expected": ["industrial_operational_events"],
  "tables_found": [],
  "rls_defined": true,
  "unique_constraints": ["UNIQUE(company_id, idempotency_key)"],
  "blocking": true,
  "notes": "Tabela canónica IOE — base de toda a operação AIOI. RLS + idempotência definidos. Pré-requisito para todas as outras migrations."
}
```

### Migration 2: `aioi_outbox_foundation_migration.sql`

```json
{
  "migration_name": "aioi_outbox_foundation_migration.sql",
  "migration_found": true,
  "migration_applied": false,
  "lines": 284,
  "tables_expected": ["aioi_outbox"],
  "tables_found": [],
  "rls_defined": true,
  "unique_constraints": ["UNIQUE(idempotency_key)"],
  "blocking": true,
  "notes": "Event bus P0. Worker depende desta tabela. Depende de 'industrial_operational_events' existir."
}
```

### Migration 3: `aioi_persistence_hardening_migration.sql`

```json
{
  "migration_name": "aioi_persistence_hardening_migration.sql",
  "migration_found": true,
  "migration_applied": false,
  "lines": 268,
  "tables_expected": ["aioi_audit_events", "aioi_metrics_snapshots", "aioi_processing_history"],
  "tables_found": [],
  "rls_defined": true,
  "unique_constraints": ["UNIQUE(company_id, correlation_id, event_type)", "UNIQUE(company_id, idempotency_key) x2"],
  "blocking": false,
  "notes": "Auditoria e métricas. Não bloqueia fila P0, mas bloqueia telemetria completa (P2+)."
}
```

### Migration 4: `aioi_org5_workflow_sla_migration.sql`

```json
{
  "migration_name": "aioi_org5_workflow_sla_migration.sql",
  "migration_found": true,
  "migration_applied": false,
  "lines": 154,
  "tables_expected": ["aioi_executive_queue_snapshot"],
  "tables_found": [],
  "rls_defined": true,
  "unique_constraints": ["UNIQUE(idempotency_key)"],
  "blocking": true,
  "notes": "Snapshot CEO Queue + colunas SLA em IOE. ALTER TABLE depende de 'industrial_operational_events'."
}
```

### Migration 5 (esperada, não existente): `aioi_decisions`

```json
{
  "migration_name": "aioi_decisions_migration.sql",
  "migration_found": false,
  "migration_applied": false,
  "tables_expected": ["aioi_decisions"],
  "tables_found": [],
  "blocking": false,
  "notes": "Referenciada na documentação (ARCHITECTURE_TARGET_IMPLEMENTATION_PLAN). Decision engine P1 — não bloqueia P0."
}
```

---

## 3. Matriz de Divergência

| Migration | Encontrada | Aplicada | Bloqueante P0 |
|-----------|:----------:|:--------:|:-------------:|
| `aioi_ioe_foundation_migration.sql` | ✅ | ❌ | **SIM** |
| `aioi_outbox_foundation_migration.sql` | ✅ | ❌ | **SIM** |
| `aioi_persistence_hardening_migration.sql` | ✅ | ❌ | Não (P2+) |
| `aioi_org5_workflow_sla_migration.sql` | ✅ | ❌ | **SIM** |
| `aioi_decisions_migration.sql` (esperada) | ❌ | ❌ | Não (P1) |

---

## 4. Tabelas Esperadas vs Existentes

| Tabela | Esperada | Existe no BD | Migration |
|--------|:--------:|:------------:|-----------|
| `industrial_operational_events` | ✅ | ❌ | `aioi_ioe_foundation_migration.sql` |
| `aioi_outbox` | ✅ | ❌ | `aioi_outbox_foundation_migration.sql` |
| `aioi_audit_events` | ✅ | ❌ | `aioi_persistence_hardening_migration.sql` |
| `aioi_metrics_snapshots` | ✅ | ❌ | `aioi_persistence_hardening_migration.sql` |
| `aioi_processing_history` | ✅ | ❌ | `aioi_persistence_hardening_migration.sql` |
| `aioi_executive_queue_snapshot` | ✅ | ❌ | `aioi_org5_workflow_sla_migration.sql` |
| `aioi_decisions` | ✅ (P1) | ❌ | Não criada |

---

## 5. Ordem de Execução Obrigatória

As migrations possuem dependências e devem ser executadas nesta ordem:

```
1. aioi_ioe_foundation_migration.sql        (tabela base — tudo depende)
2. aioi_outbox_foundation_migration.sql      (FK → industrial_operational_events)
3. aioi_org5_workflow_sla_migration.sql      (ALTER TABLE IOE + snapshot)
4. aioi_persistence_hardening_migration.sql  (tabelas auxiliares)
```

---

## 6. Verificação de Integridade das Migrations

| Critério | IOE | Outbox | Persistence | ORG5 |
|----------|:---:|:------:|:-----------:|:----:|
| Idempotente (`IF NOT EXISTS`) | ✅ | ✅ | ✅ | ✅ |
| RLS definido | ✅ | ✅ | ✅ | ✅ |
| UNIQUE constraints | ✅ | ✅ | ✅ | ✅ |
| Auto-verificação (RAISE) | ✅ | ✅ | ✅ | ✅ |
| Sem side-effects operacionais | ✅ | ✅ | ✅ | ✅ |
| Sem inserção de dados | ✅ | ✅ | ✅ | ✅ |

---

## 7. Contexto — Histórico de Migrations do BD

| Últimas migrations aplicadas | Status |
|------------------------------|--------|
| `organizational_identity_engine_migration.sql` | success |
| `impetus_quality_universal_runtime_migration.sql` | success |
| `wave7_industrial_governance_migration.sql` | success |
| `wave3_storage_temporal_foundation_migration.sql` | success |
| `industrial_event_backbone_migration.sql` | success |

**Nenhuma migration AIOI** aparece no histórico (`impetus_migration_history`).

---

## 8. Veredito

```
AIOI_P0_MIGRATIONS_BLOCKED
```

**Motivo:** As 4 migrations AIOI existem como ficheiros SQL válidos e completos, mas **nenhuma foi aplicada** no banco de dados de produção. As tabelas `industrial_operational_events`, `aioi_outbox` e `aioi_executive_queue_snapshot` são **pré-requisitos bloqueantes** para a operação P0.

---

## 9. Ações Recomendadas (sem execução)

| # | Ação | Prioridade | Risco |
|---|------|-----------|-------|
| 1 | Aplicar `aioi_ioe_foundation_migration.sql` | CRÍTICO | Baixo (idempotente, additive only) |
| 2 | Aplicar `aioi_outbox_foundation_migration.sql` | CRÍTICO | Baixo |
| 3 | Aplicar `aioi_org5_workflow_sla_migration.sql` | CRÍTICO | Baixo |
| 4 | Aplicar `aioi_persistence_hardening_migration.sql` | MÉDIO | Baixo |
| 5 | Criar migration `aioi_decisions` | BAIXO (P1) | Não bloqueia P0 |
| 6 | Adicionar entradas no `impetus_migration_history` | MÉDIO | Rastreabilidade |

---

## 10. Invariantes Preservados

| Invariante | Valor |
|------------|-------|
| `runtime_enabled` | `false` |
| `runtime_active` | `false` |
| `runtime_authorized` | `false` |
| `cognitive_execution_allowed` | `false` |
| GOVERNANCE-01 | Intacto |
| ORG-1..5 | Intactos |
| P1..P16 | Intactos |

---

**Assinatura:** AIOI-P0A Migration Audit  
**Resultado:** `AIOI_P0_MIGRATIONS_BLOCKED`
