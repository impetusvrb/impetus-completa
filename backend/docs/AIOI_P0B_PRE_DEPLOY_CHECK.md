# AIOI-P0B — Pre-Deploy Check Report

**Data:** 2026-06-12  
**Fase:** ETAPA B.1  
**Modo:** CERTIFICATION FIRST · DATABASE ONLY · ADDITIVE ONLY  
**Runtime cognitivo:** DESATIVADO  

---

## 1. Checklist de Pré-Autorização (AIOI_P0_AUTHORIZATION)

| Pré-requisito | Status | Detalhe |
|---------------|:------:|---------|
| GOVERNANCE-01 certificado | ✅ | `AIOI_GOVERNANCE_PASS` — 2026-06-05 |
| P0 autorizado formalmente | ✅ | `P0_AUTHORIZED_WITH_RESTRICTIONS` |
| Riscos CRITICAL mitigados | ✅ | R-Q1, R-P1, R-E1, R-T3, G1, M1 — todos mitigados em política |
| Migrations auditadas (P0A) | ✅ | `AIOI_P0_MIGRATIONS_BLOCKED` → prontas para execução |
| R1: `AIOI_ENABLED=false` padrão | ✅ | Verificado em `aioiPilotFlags.js` |
| R2: `AUTO_EXECUTE_BAND=none` | ✅ | Default preservado |
| R4: RLS em IOE na migration | ✅ | `aioi_ioe_foundation_migration.sql` |
| R5: RLS em outbox na migration | ✅ | `aioi_outbox_foundation_migration.sql` |
| R6: UNIQUE idempotency_key | ✅ | Confirmado nas migrations |

---

## 2. Verificações de Ambiente

| Item | Resultado | Status |
|------|-----------|:------:|
| Conexão ao banco | Estabelecida | ✅ |
| Versão PostgreSQL | PostgreSQL 14.23 (140023) | ✅ |
| `gen_random_uuid()` | Disponível | ✅ |
| Schema `public` | Presente | ✅ |
| Extensão `pgcrypto` | Instalada | ✅ |
| Extensão `uuid-ossp` | Instalada | ✅ |
| `impetus_migration_history` | Existe (89 migrations) | ✅ |
| `impetus_migration_audit_log` | Existe | ✅ |
| RLS `current_setting` | Disponível | ✅ |
| Tabela `companies` | Existe | ✅ |
| Permissão CREATE TABLE | Concedida | ✅ |
| `tenantRlsRuntime.js` | Presente em `src/tenant-isolation/runtime/` | ✅ |
| AIOI tabelas pré-existentes | Nenhuma (ambiente limpo) | ✅ |

---

## 3. Verificação de Migrations

| Migration | Arquivo Presente | Tamanho | Idempotente | RLS Incluído |
|-----------|:---------------:|---------|:-----------:|:------------:|
| `aioi_ioe_foundation_migration.sql` | ✅ | 509 linhas | ✅ | ✅ |
| `aioi_outbox_foundation_migration.sql` | ✅ | 284 linhas | ✅ | ✅ |
| `aioi_org5_workflow_sla_migration.sql` | ✅ | 154 linhas | ✅ | ✅ |
| `aioi_persistence_hardening_migration.sql` | ✅ | 268 linhas | ✅ | ✅ |

---

## 4. Invariantes Confirmados

| Invariante | Valor |
|------------|-------|
| `runtime_enabled` | `false` |
| `runtime_active` | `false` |
| `runtime_authorized` | `false` |
| `cognitive_execution_allowed` | `false` |

---

## 5. Veredito

```
PRE_DEPLOY_READY
```

**Ambiente PostgreSQL 14.23 validado, todas as dependências presentes, migrations auditadas e prontas. Execução autorizada.**

---

**Próxima etapa:** ETAPA B.2 — Execução das migrations na ordem definida.
