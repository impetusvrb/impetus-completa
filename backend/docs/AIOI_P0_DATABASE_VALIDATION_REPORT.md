# AIOI-P0A — Database Validation Report

**Data:** 2026-06-12  
**Modo:** READ ONLY · AUDIT ONLY · CERTIFICATION FIRST  
**Runtime cognitivo:** DESATIVADO  

---

## 1. Database Summary

| Item | Status |
|------|--------|
| Banco de dados | PostgreSQL (conectado, operacional) |
| Total de tabelas no schema public | 336 |
| Tabelas AIOI existentes | **0** |
| ENUMs AIOI existentes | **0** |
| Migrations AIOI aplicadas | **0** |
| Tabelas relacionadas (legacy) | 3 (`app_impetus_outbox`, `industrial_event_outbox`, `industrial_lgpd_classification`) |
| Tracking de migrations | `impetus_migration_history` (operacional) |
| Estado geral AIOI no BD | **NÃO PROVISIONADO** |

---

## 2. Table Validation

### 2.1 `industrial_operational_events`

| Atributo | Estado |
|----------|--------|
| **Exists** | ❌ NÃO EXISTE |
| **Migration disponível** | ✅ `aioi_ioe_foundation_migration.sql` (509 linhas) |
| **Colunas definidas** | 43 colunas (ver spec) |
| **Indexes definidos** | ~8 (priority_score, occurred_at, equipment, sector, etc.) |
| **Constraints definidos** | PK + UNIQUE(company_id, idempotency_key) + CHECK em scores |
| **RLS definido** | ✅ ENABLE + FORCE + policy tenant isolation |
| **FK Integrity** | company_id referencial; equipment_id/sector_id opcionais |
| **Issues** | **CRITICAL: tabela não existe no BD** |

#### Colunas esperadas (resumo)

| Coluna | Tipo | Nullable | Default |
|--------|------|:--------:|---------|
| `id` | UUID | NOT NULL | `gen_random_uuid()` |
| `company_id` | UUID | NOT NULL | — |
| `tenant_key` | TEXT | NOT NULL | — |
| `idempotency_key` | TEXT | NOT NULL | — |
| `correlation_id` | TEXT | NOT NULL | — |
| `source_type` | TEXT | NOT NULL | — |
| `category` | TEXT | NOT NULL | — |
| `status` | TEXT | NOT NULL | `'open'` |
| `truth_state` | TEXT | NOT NULL | `'provisional'` |
| `priority_band` | TEXT | NOT NULL | `'low'` |
| `priority_score` | SMALLINT | NOT NULL | `0` |
| `scores_provisional` | BOOLEAN | NOT NULL | `true` |
| `score_attention` | SMALLINT | NULL | — (CHECK 0–100) |
| `score_risk` | SMALLINT | NULL | — (CHECK 0–100) |
| `entity_type` | TEXT | NOT NULL | — |
| `entity_id` | UUID | NULL | — |
| `equipment_id` | UUID | NULL | — |
| `sector_id` | UUID | NULL | — |
| `assigned_role_id` | UUID | NULL | — |
| `hierarchy_level` | SMALLINT | NULL | — (CHECK 0–8) |
| `audience_key` | TEXT | NOT NULL | `'ceo'` |
| `escalation_level` | SMALLINT | NOT NULL | `0` |
| `evidence_refs` | JSONB | NOT NULL | `'[]'` |
| `decision_type` | TEXT | NULL | — |
| `decision_payload` | JSONB | NULL | — |
| `created_at` | TIMESTAMPTZ | NOT NULL | `now()` |
| `updated_at` | TIMESTAMPTZ | NOT NULL | `now()` |

---

### 2.2 `aioi_outbox`

| Atributo | Estado |
|----------|--------|
| **Exists** | ❌ NÃO EXISTE |
| **Migration disponível** | ✅ `aioi_outbox_foundation_migration.sql` (284 linhas) |
| **Indexes definidos** | 6 (pending, processing, failed, ioe_id, correlation, lag) |
| **Constraints definidos** | PK + UNIQUE(idempotency_key) |
| **RLS definido** | ✅ ENABLE + FORCE + policy tenant isolation |
| **FK Integrity** | `ioe_id` → `industrial_operational_events.id` |
| **Issues** | **CRITICAL: tabela não existe no BD** |

---

### 2.3 `aioi_audit_events`

| Atributo | Estado |
|----------|--------|
| **Exists** | ❌ NÃO EXISTE |
| **Migration disponível** | ✅ `aioi_persistence_hardening_migration.sql` |
| **Constraints definidos** | UNIQUE(company_id, correlation_id, event_type) |
| **RLS definido** | ✅ |
| **Issues** | **MEDIUM: não bloqueia P0, necessário para auditoria P2+** |

---

### 2.4 `aioi_metrics_snapshots`

| Atributo | Estado |
|----------|--------|
| **Exists** | ❌ NÃO EXISTE |
| **Migration disponível** | ✅ `aioi_persistence_hardening_migration.sql` |
| **Constraints definidos** | UNIQUE(company_id, idempotency_key) |
| **RLS definido** | ✅ |
| **Issues** | **MEDIUM: necessário para telemetria operacional** |

---

### 2.5 `aioi_processing_history`

| Atributo | Estado |
|----------|--------|
| **Exists** | ❌ NÃO EXISTE |
| **Migration disponível** | ✅ `aioi_persistence_hardening_migration.sql` |
| **Constraints definidos** | UNIQUE(company_id, idempotency_key) |
| **RLS definido** | ✅ |
| **Issues** | **MEDIUM: necessário para lifecycle tracking** |

---

### 2.6 `aioi_executive_queue_snapshot`

| Atributo | Estado |
|----------|--------|
| **Exists** | ❌ NÃO EXISTE |
| **Migration disponível** | ✅ `aioi_org5_workflow_sla_migration.sql` |
| **Constraints definidos** | UNIQUE(idempotency_key) |
| **RLS definido** | ✅ ENABLE + FORCE |
| **Issues** | **HIGH: necessário para CEO Queue Widget** |

---

### 2.7 `aioi_decisions`

| Atributo | Estado |
|----------|--------|
| **Exists** | ❌ NÃO EXISTE |
| **Migration disponível** | ❌ NÃO CRIADA |
| **Spec** | Referenciada em `AIOI_ARCHITECTURE_TARGET_IMPLEMENTATION_PLAN.md` |
| **Issues** | **LOW: P1 — não bloqueia P0** |

---

## 3. Findings

### CRITICAL

| # | Finding | Impacto |
|---|---------|---------|
| C-01 | **Nenhuma tabela AIOI existe no BD** | Toda a operação P0 bloqueada |
| C-02 | **Nenhuma migration AIOI foi executada** | Serviços com dependência de BD não funcionam |
| C-03 | **Worker outbox sem tabela** | `aioiOutboxWorkerService` falhará se ativado |

### HIGH

| # | Finding | Impacto |
|---|---------|---------|
| H-01 | Queue API retornará erro sem tabela IOE | CEO Queue inoperante |
| H-02 | Adapters não podem persistir IOE | Ingestão impossível |
| H-03 | Snapshot projection sem tabela | Executive dashboard vazio |

### MEDIUM

| # | Finding | Impacto |
|---|---------|---------|
| M-01 | Tabelas de auditoria ausentes | Telemetria P2+ inoperante |
| M-02 | Histórico de processamento ausente | Lifecycle tracking impossível |
| M-03 | ENUMs não criados (CHECK constraints inline) | Aceite — validação via application layer |

### LOW

| # | Finding | Impacto |
|---|---------|---------|
| L-01 | Migration `aioi_decisions` não existe | P1 — não impacta P0 |
| L-02 | Tabelas legacy similares existem (`industrial_event_outbox`) | Coexistência documentada — sem conflito |

---

## 4. Infraestrutura Existente (Positivo)

| Item | Estado | Relevância |
|------|--------|------------|
| `impetus_migration_history` | ✅ Operacional | Tracking de execução |
| PostgreSQL `gen_random_uuid()` | ✅ Disponível | UUIDs para IOE |
| RLS infrastructure | ✅ Operacional | Padrão já usado em 30+ tabelas |
| `industrial_event_outbox` (legacy W2) | ✅ Existe | Bridge futura AIOI ↔ W2 |
| 336 tabelas existentes operacionais | ✅ BD estável | Não há conflitos de namespace |

---

## 5. Recommended Actions

**NÃO EXECUTAR** — apenas documentar:

| # | Ação Recomendada | Prioridade | Pré-requisito |
|---|-----------------|-----------|---------------|
| 1 | Executar `aioi_ioe_foundation_migration.sql` em ambiente de staging | CRÍTICO | Backup + janela de manutenção |
| 2 | Verificar auto-validação (RAISE NOTICE PASS) | CRÍTICO | Após #1 |
| 3 | Executar `aioi_outbox_foundation_migration.sql` | CRÍTICO | #1 concluída |
| 4 | Executar `aioi_org5_workflow_sla_migration.sql` | CRÍTICO | #1 concluída |
| 5 | Executar `aioi_persistence_hardening_migration.sql` | MÉDIO | #1 concluída |
| 6 | Registar em `impetus_migration_history` | MÉDIO | Após cada execução |
| 7 | Validar RLS com `tenantFuzzSuite` estendido | ALTO | Após #1–#5 |
| 8 | Smoke test: INSERT + SELECT com company_id filter | ALTO | Após #7 |
| 9 | Ativar `IMPETUS_AIOI_ENABLED=true` em 1 tenant piloto | MÉDIO | Após #8 + 24h observação |
| 10 | Criar migration `aioi_decisions` para P1 | BAIXO | Quando P1 iniciar |

---

## 6. Análise de Segurança

| Aspecto | Avaliação |
|---------|-----------|
| RLS definido em todas as migrations | ✅ Correto |
| FORCE ROW LEVEL SECURITY | ✅ Em todas |
| Política por `company_id = current_setting('app.company_id')` | ✅ Padrão IMPETUS |
| UNIQUE constraints para idempotência | ✅ Em todas |
| Sem INSERT de dados nas migrations | ✅ Correto |
| Migrations idempotentes (`IF NOT EXISTS`) | ✅ Seguro para re-execução |

---

## 7. Compatibilidade com Stack Existente

| Componente | Compatível | Notas |
|-----------|:----------:|-------|
| `db/index.js` (pool) | ✅ | Mesmo pool para queries AIOI |
| `tenantRlsRuntime.js` | ✅ | `SET app.company_id` antes de queries |
| `impetus_migration_history` | ✅ | Tracking compatível |
| PM2 ecosystem | ✅ | Worker pode ser adicionado |
| Sequelize (ORM existente) | ⚠️ | AIOI usa SQL directo — sem conflito |

---

## 8. Veredito

```
AIOI_P0_DATABASE: NOT_PROVISIONED
```

**Estado:** As migrations SQL estão **bem escritas, completas, idempotentes e seguras**, mas **nenhuma foi aplicada** no banco de dados. O AIOI está arquitecturalmente pronto ao nível de código, mas **operacionalmente inerte** ao nível de dados.

**Para tornar o AIOI operacional:** aplicar as 4 migrations na ordem documentada (§5), validar RLS, e ativar flags progressivamente.

---

## 9. Invariantes Preservados

| Invariante | Valor |
|------------|-------|
| `runtime_enabled` | `false` |
| `runtime_active` | `false` |
| `runtime_authorized` | `false` |
| `cognitive_execution_allowed` | `false` |
| GOVERNANCE-01 | Intacto |
| ORG-1..5 | Intactos |
| P1..P16 | Intactos |
| Nenhuma alteração funcional | ✅ |

---

**Assinatura:** AIOI-P0A Database Validation  
**Resultado:** `AIOI_P0_DATABASE: NOT_PROVISIONED`
