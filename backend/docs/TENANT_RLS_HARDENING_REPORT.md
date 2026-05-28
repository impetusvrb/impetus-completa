# RLS + Multi-tenant Hardening — Relatório PROMPT 18

**Data:** 2026-05-27  
**Roadmap:** T2.3 RLS PostgreSQL · T2.4 Fuzzing multi-tenant · D27  
**Estado:** `IMPETUS_RLS_MODE=audit` — políticas preparadas; RLS **não** enforced na BD até `on`

---

## 1. Objetivo

Defesa em profundidade contra vazamento cross-tenant com:

- Registry de tabelas + funções PostgreSQL `impetus_tenant_row_visible()`
- Contexto de sessão `app.current_company_id` por request
- Fuzzing suite automatizada
- Simulação de ataques cross-tenant
- Painel admin de governança

---

## 2. Modos

| Modo | BD RLS | `db.query` wrapper | Fuzz no boot |
|------|--------|-------------------|--------------|
| `off` | Desactivado | Off | Off |
| `shadow` | Registry only | Off | Opcional |
| `audit` | Funções OK; ENABLE off | Off | **Sim** |
| `on` | ENABLE + POLICY | **Sim** (piloto) | Sim |

---

## 3. Tabelas no registry (12)

`users`, `ai_interaction_traces`, `ai_hallucination_assessments`, `sz4_operational_persistence_records`, `z_conversation_message_index`, `tenant_federation_providers`, `federation_identity_links`, `federation_login_traces`, `tenant_mfa_policies`, `user_mfa_enrollments`, `mfa_audit_events`, `mfa_challenges`

Coluna tenant: `company_id` ou `tenant_id` conforme tabela.

---

## 4. Flags

```env
IMPETUS_RLS_ENABLED=true
IMPETUS_RLS_MODE=audit
IMPETUS_RLS_PILOT_TENANTS=21dd3cee-2efa-4936-908f-9ff1ba04e2a3
IMPETUS_TENANT_FUZZ_ENABLED=true
IMPETUS_TENANT_CHAOS_ENABLED=true
```

**Rollback instantâneo:**

```bash
IMPETUS_RLS_ENABLED=false
IMPETUS_RLS_MODE=off
pm2 restart impetus-backend --update-env
```

**Promoção `on`:**

```bash
IMPETUS_RLS_MODE=on
# ou POST /api/admin/runtime/tenant-rls/activate
pm2 restart impetus-backend --update-env
```

---

## 5. Rotas

| Rota | Uso |
|------|-----|
| `GET /api/admin/runtime/tenant-rls` | Dashboard registry + diagnostics |
| `POST /api/admin/runtime/tenant-rls/fuzz` | Fuzz manual |
| `POST /api/admin/runtime/tenant-rls/chaos` | Attack simulation |
| `POST /api/admin/runtime/tenant-rls/activate` | ENABLE RLS (on) |
| `POST /api/admin/runtime/tenant-rls/deactivate` | Rollback policies |
| `GET /api/internal/tenant-rls/*` | Ops interno |

---

## 6. Integração

- `db/index.js` — wrapper RLS só em modo `on` + tenant piloto + ALS
- `middleware/auth.js` — define `AsyncLocalStorage` tenant após login
- Boot — schema + fuzz + `tenant_rls_boot` em `audit_logs`

---

## 7. Riscos

| Risco | Mitigação |
|-------|-----------|
| Performance (transacção/query em on) | Piloto único; expandir após métricas |
| Migrations sem bypass | `queryBypass()` + `app.bypass_rls=true` |
| Tabelas sem company_id | Fora do registry até migração |

---

## 8. Verificação

```bash
node tests/tenant-isolation/runTenantIsolationSuite.js
node scripts/verify-tenant-rls-evidence.js
node scripts/apply-tenant-rls-pilot.js
```

---

*Próximo na trilha: PROMPT 19 — MQTT Real*
