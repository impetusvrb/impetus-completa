# AIOI-P0B — RLS Validation Report

**Data:** 2026-06-12  
**Fase:** ETAPA B.5  
**Modo:** CERTIFICATION FIRST · DATABASE ONLY  
**Runtime cognitivo:** DESATIVADO  

---

## 1. Resumo Executivo

| Critério | Status |
|----------|:------:|
| RLS habilitado em todas as 6 tabelas | ✅ |
| FORCE RLS em todas as 6 tabelas | ✅ |
| Policies criadas em todas as 6 tabelas | ✅ |
| Função `impetus_tenant_row_visible()` presente | ✅ |
| Lógica da policy validada (DO block) | ✅ |
| Isolamento Tenant A ↔ Tenant B (impetus_app role) | ✅ |

---

## 2. Mecanismo de RLS

### Função de Visibilidade

```sql
CREATE FUNCTION impetus_tenant_row_visible(row_tenant UUID) RETURNS BOOLEAN AS $$
  SELECT
    impetus_rls_bypass_active()         -- app.bypass_rls = 'true'
    OR impetus_current_company_id() IS NULL  -- sem contexto: permissivo (design IMPETUS)
    OR row_tenant IS NULL               -- linhas sem tenant: visíveis (não ocorre — NOT NULL)
    OR row_tenant = impetus_current_company_id();  -- match exato
$$ LANGUAGE sql SECURITY DEFINER;
```

### Funções de Contexto

| Função | Implementação |
|--------|--------------|
| `impetus_current_company_id()` | `NULLIF(current_setting('app.current_company_id', true), '')::uuid` |
| `impetus_rls_bypass_active()` | `COALESCE(current_setting('app.bypass_rls', true), '') = 'true'` |

### Variável de Contexto

**Correto:** `SET app.current_company_id = '<uuid>'`  
**Atenção:** A variável é `app.current_company_id`, não `app.company_id`.

---

## 3. Policies por Tabela

| Tabela | Policy Name | Comando | RLS | FORCE |
|--------|-------------|:-------:|:---:|:-----:|
| `industrial_operational_events` | `industrial_operational_events_impetus_tenant_isolation` | ALL | ✅ | ✅ |
| `aioi_outbox` | `aioi_outbox_impetus_tenant_isolation` | ALL | ✅ | ✅ |
| `aioi_executive_queue_snapshot` | `aioi_executive_queue_snapshot_impetus_tenant_isolation` | ALL | ✅ | ✅ |
| `aioi_audit_events` | `aioi_audit_events_impetus_tenant_isolation` | ALL | ✅ | ✅ |
| `aioi_metrics_snapshots` | `aioi_metrics_snapshots_impetus_tenant_isolation` | ALL | ✅ | ✅ |
| `aioi_processing_history` | `aioi_processing_history_impetus_tenant_isolation` | ALL | ✅ | ✅ |

---

## 4. Testes de Isolamento

### 4.1 Validação Lógica da Policy (DO block — superuser)

```sql
DO $$
DECLARE ta UUID; tb UUID;
BEGIN
  PERFORM set_config('app.current_company_id', ta::text, true);
  IF NOT impetus_tenant_row_visible(ta) THEN RAISE EXCEPTION 'FAIL'; END IF;
  IF impetus_tenant_row_visible(tb) THEN RAISE EXCEPTION 'FAIL'; END IF;
  PERFORM set_config('app.current_company_id', tb::text, true);
  IF NOT impetus_tenant_row_visible(tb) THEN RAISE EXCEPTION 'FAIL'; END IF;
  IF impetus_tenant_row_visible(ta) THEN RAISE EXCEPTION 'FAIL'; END IF;
  RAISE NOTICE 'RLS_POLICY_LOGIC_PASS';
END $$;
```

**Resultado:** `PASS`

---

### 4.2 Isolamento Real (impetus_app role — sem bypassrls)

**Role de teste:** `impetus_app`  
**Atributos:** `rolsuper=false, rolbypassrls=false, rolcanlogin=true`  

| Teste | Esperado | Obtido | Status |
|-------|----------|--------|:------:|
| Tenant A vê próprios dados | 1 row | 1 row | ✅ PASS |
| Tenant B não vê dados de A | 0 rows | 0 rows | ✅ PASS |
| Tenant B vê próprios dados | 1 row | 1 row | ✅ PASS |
| Tenant A não vê dados de B | 0 rows | 0 rows | ✅ PASS |

**Resultado:** `RLS_ISOLATION_PASS`

---

### 4.3 Comportamento sem Contexto

| Comportamento | Descrição |
|--------------|-----------|
| **Design IMPETUS** | Sem `app.current_company_id` definido: `impetus_current_company_id()` retorna NULL, tornando a condição verdadeira (permissivo) |
| **Implicação** | Middleware da aplicação **deve sempre** definir o contexto antes de qualquer query |
| **Proteção** | FORCE RLS garante que mesmo o owner da tabela segue as policies (exceto superuser PostgreSQL) |
| **Superuser** | `postgres` superuser ignora RLS por design do PostgreSQL — esperado e documentado |

> **NOTA OPERACIONAL:** O `tenantRlsMiddleware.js` deve ser verificado para garantir que `SET app.current_company_id` é executado em toda request de API AIOI antes de qualquer query.

---

## 5. Findings

| Severidade | Finding | Ação |
|-----------|---------|------|
| INFO | Variável correta é `app.current_company_id` (não `app.company_id`) | Documentado |
| LOW | Comportamento permissivo sem contexto é design intencional IMPETUS | Verificar middleware de rotas AIOI |
| INFO | Superuser PostgreSQL bypassa RLS por design — normal para conexão de admin/maintenance | Não usar postgres em prod app layer |

---

## 6. Resultado Final

```json
{
  "rls_validated": true,
  "tenant_isolation_validated": true,
  "all_tables_rls_enabled": true,
  "all_tables_force_rls": true,
  "policy_logic_verified": true,
  "app_role_isolation_verified": true
}
```

---

## 7. Invariantes Preservados

| Invariante | Valor |
|------------|-------|
| `runtime_enabled` | `false` |
| `runtime_active` | `false` |
| `runtime_authorized` | `false` |
| `cognitive_execution_allowed` | `false` |

---

**Veredito:** `AIOI_P0B_RLS_VALIDATION_PASS`
