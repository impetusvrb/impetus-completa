# FIX-SUBSCRIPTION-UX-01 — Relatório de Remediação

**Data:** 2026-06-19  
**Origem:** [AUD_BILLING_NOTIF_01_REPORT.md](./AUD_BILLING_NOTIF_01_REPORT.md)  
**Modo:** implementação aditiva — backward compatible  
**Escopo:** alinhar Backend, Subscription, Companies e Frontend — **sem** billing notifications, Asaas, scheduler ou NC

---

## Resumo executivo

Corrigidas as inconsistências estruturais identificadas na auditoria AUD-BILLING-NOTIF-01, preparando o terreno para **BILLING-NOTIF-02** sem criar notificações proactivas.

| Critério | Estado |
|----------|--------|
| `GET /api/companies/me` | **Implementado** |
| `subscriptionRecipientResolver` | **Criado** (read-only) |
| `COMPANY_INACTIVE` alinhado | **Sim** |
| Banner overdue (Layout) | **Pronto** — frontend já consumia API correcta |
| Billing notifications | **Não criadas** |
| Asaas / webhooks / scheduler / NC | **Não alterados** |
| Testes | **10/10** |

```json
{
  "subscription_ux_consistent": true,
  "companies_me_available": true,
  "recipient_resolution_consistent": true,
  "company_inactive_aligned": true,
  "banner_overdue_working": true,
  "billing_notifications_created": false,
  "safe_for_billing_notif_02": true
}
```

---

## Causa raiz (recapitulação AUD-BILLING-NOTIF-01)

| Problema | Impacto |
|----------|---------|
| Frontend `companies.getMe()` → rota inexistente | Banner overdue nunca activava |
| `data_controller_*` vs `email_responsavel` | Destinatários financeiros inconsistentes entre código e BD |
| Frontend esperava `COMPANY_INACTIVE`; backend genérico 403 | Redirect para `/subscription-expired` não disparava |

---

## Artefactos criados

| Ficheiro | Função |
|----------|--------|
| `backend/src/services/subscription/subscriptionCompanyReader.js` | Leitura adaptativa de empresa (colunas modernas + legado via `information_schema`) |
| `backend/src/services/subscription/subscriptionRecipientResolver.js` | Resolver central `{ email, phone, source, name }` — somente leitura |
| `backend/src/services/subscription/subscriptionUxAuditService.js` | Agregador read-only para endpoint de auditoria |
| `backend/src/tests/audit/FIX_SUBSCRIPTION_UX_01.test.js` | 10 testes |

## Artefactos alterados

| Ficheiro | Alteração |
|----------|-----------|
| `backend/src/routes/companies.js` | `GET /me` com `requireAuth`, tenant-scoped, sem `requireCompanyActive` |
| `backend/src/middleware/multiTenant.js` | Emite `code: COMPANY_INACTIVE` + `redirect: /subscription-expired` quando `active !== true` |
| `backend/src/routes/audit.js` | `GET /api/audit/subscription-ux/status` |

## Não alterados (conforme escopo)

- `asaasService.js`, webhooks Asaas  
- `subscriptionGovernanceScheduler.js`  
- `notificationCenterService.js`, bridges NC-03  
- `frontend/src/components/Layout.jsx` (já correcto — só passou a ter backend)

---

## ETAPA 1 — `GET /api/companies/me`

**Rota:** `GET /api/companies/me`  
**Auth:** `requireAuth` — **sem** `requireCompanyActive` (utilizador com empresa inactiva/overdue pode consultar estado)

**Resposta:**

```json
{
  "ok": true,
  "company": {
    "id": "uuid",
    "name": "Empresa",
    "active": true,
    "subscription_status": "overdue",
    "subscription_plan": "profissional"
  }
}
```

**Implementação:** reutiliza `getCompanySubscriptionUxProfile()` de `subscriptionCompanyReader.js` — sem duplicar queries Asaas ou dashboard.

**Fluxo banner:**

```text
Layout.jsx → companies.getMe() → GET /api/companies/me
  → subscription_status === 'overdue'
  → setSubscriptionOverdue(true) → banner visível
```

---

## ETAPA 2 — `subscriptionRecipientResolver`

Prioridade de resolução (read-only):

| Campo | Prioridade | `source` |
|-------|------------|----------|
| Email | 1. `email_responsavel` | `email_responsavel` |
| Email | 2. `data_controller_email` | `data_controller_email` |
| Email | 3. `config.billing_email` | `config.billing_email` |
| Telefone | 1. `telefone_responsavel` | (com email: mantém source do email) |
| Telefone | 2. `data_controller_phone` | `data_controller_phone` |

**API:**

```javascript
resolveFromCompanyRow(row)  // pura — testável
resolveForCompany(companyId) // async — usa subscriptionCompanyReader
```

`subscriptionCompanyReader` detecta colunas disponíveis via `information_schema` (cache em memória) — funciona em BD com schema moderno ou legado.

---

## ETAPA 3 — `COMPANY_INACTIVE`

**Antes:** `403 { error: 'Empresa inativa ou não encontrada' }` — sem `code`.

**Depois** (quando `companies.active !== true` e `tenant_status` ainda ∈ `teste|ativo`):

```json
{
  "ok": false,
  "error": "Assinatura em atraso. Regularize o pagamento para continuar.",
  "code": "COMPANY_INACTIVE",
  "redirect": "/subscription-expired"
}
```

`TENANT_BLOCKED` mantido para `tenant_status` ∉ `teste|ativo`. RBAC, MFA e RLS **não alterados**.

Frontend `api.js` já tratava `COMPANY_INACTIVE` → redirect `/subscription-expired`.

---

## ETAPA 4 — Banner overdue

Validado por testes estáticos + contrato de payload:

- `Layout.jsx` chama `companies.getMe()` no mount  
- Condição: `r?.data?.company?.subscription_status === 'overdue'`  
- Backend agora devolve exactamente esse shape  

Sem alterações no frontend necessárias.

---

## ETAPA 5 — Auditoria runtime

**Endpoint:** `GET /api/audit/subscription-ux/status`  
**Auth:** `requireAuth` + `requireTenantAdminRole`

**Resposta:**

```json
{
  "ok": true,
  "companies_me_available": true,
  "subscription_status_available": true,
  "recipient_resolver_available": true,
  "company_inactive_code_aligned": true,
  "banner_ready": true
}
```

---

## ETAPA 6 — Testes

```bash
node backend/src/tests/audit/FIX_SUBSCRIPTION_UX_01.test.js
```

| Teste | Cobertura |
|-------|-----------|
| T1 | Rota `/companies/me` + shape subscription |
| T2–T3 | Resolver moderno + legado |
| T4–T5 | `COMPANY_INACTIVE` backend + frontend |
| T6–T7 | Banner payload overdue |
| T8 | Company reader |
| T9–T10 | Endpoint audit + flags |

**Resultado:** `{ "passed": 10, "failed": 0 }`

---

## Diagrama pós-fix

```text
                    ┌─────────────────────────┐
                    │   GET /companies/me     │
                    │   requireAuth only      │
                    └───────────┬─────────────┘
                                │
              subscriptionCompanyReader
                                │
                    ┌───────────▼─────────────┐
                    │ subscription_status     │
                    │ subscription_plan         │
                    └───────────┬─────────────┘
                                │
              Layout.jsx banner (overdue)
                                │
     requireCompanyActive ──────┼── active=false
                                │
                    code: COMPANY_INACTIVE
                    redirect: /subscription-expired

  subscriptionRecipientResolver (read-only, BILLING-NOTIF-02)
       email_responsavel → data_controller_* → config.billing_email
```

---

## Próxima fase

**BILLING-NOTIF-02** pode consumir:

- `subscriptionRecipientResolver.resolveForCompany(companyId)` para dias 3/5  
- `subscriptionCompanyReader.loadCompanyRow()` para ciclo de governança  
- Banner + redirect já funcionais para UX reactiva  

---

## Documentos relacionados

- [AUD_BILLING_NOTIF_01_REPORT.md](./AUD_BILLING_NOTIF_01_REPORT.md)
- [AUD_BILLING_NOTIF_01_EXEC_SUMMARY.md](./AUD_BILLING_NOTIF_01_EXEC_SUMMARY.md)
- [AUD_WORKERS_01_FIX_SUBSCRIPTION_REPORT.md](./AUD_WORKERS_01_FIX_SUBSCRIPTION_REPORT.md)
