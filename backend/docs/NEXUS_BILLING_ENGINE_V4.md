# Nexus Billing Engine v4.0 — IMPETUS Enterprise

**Estado:** Fase 1 implementada (fundação) · **2026-07-02**

## Missão

Motor financeiro **multi-tenant** único para cobrança de todas as IAs da plataforma. Uma API Key IMPETUS (OpenAI, futuro Gemini/Claude) — cobrança **sempre** pela carteira da empresa autenticada (`walletId` + `companyId`).

## Regra máxima

> Nenhum módulo altera saldo directamente. Toda movimentação passa pelo **Nexus Billing Engine**.

## O que já existia

| Componente | Função |
|------------|--------|
| `billingTokenService` | Medição `token_usage` + fatura mensal Asaas |
| `nexusWalletService` | Carteira pré-paga + Stripe + `nexus_wallet_ledger` |
| `NexusIACustos.jsx` | UI admin (tokens + carteira) |

Problema: **dois sistemas paralelos**, sem ledger enterprise único, sem validação obrigatória de contexto.

## O que foi criado (Fase 1)

| Artefacto | Descrição |
|-----------|-----------|
| `billing_ledger` | Ledger append-only (nunca UPDATE/DELETE) |
| `wallet_id` | ID único por empresa em `nexus_company_wallets` |
| `billing_gateway_config` | Credenciais gateways só super-admin IMPETUS |
| `nexusBillingEngine/` | Serviço canónico: contexto, preço, cobrança transaccional |
| `NEXUS_BILLING_ENGINE_V4=true` | Activa motor; senão legacy mantém-se |

### Fluxo de cobrança (v4)

```
IA chamada → resolveBillingContext (tenant/company/wallet/user/requestId)
         → BEGIN
         → idempotência request_id
         → LOCK carteira FOR UPDATE
         → validar wallet ∈ company
         → INSERT billing_ledger
         → débito nexus_company_wallets
         → espelho nexus_wallet_ledger + token_usage
         → COMMIT
```

### Identificação obrigatória

`tenantId`, `companyId`, `workspaceId`, `walletId`, `userId`, `requestId` — ausência **cancela** e regista log.

Na IMPETUS: `tenantId = companyId = workspaceId` (isolamento por empresa).

## Activar em produção

```bash
# backend/.env
NEXUS_CREDIT_WALLET=true
NEXUS_WALLET_ENFORCE=true          # bloqueia IA sem saldo
NEXUS_BILLING_ENGINE_V4=true       # motor v4
STRIPE_SECRET_KEY=...
STRIPE_WEBHOOK_SECRET_NEXUS=...
```

```bash
cd backend && node scripts/run-all-migrations.js
pm2 restart impetus-backend --update-env
```

### Testes

```bash
node backend/src/tests/nexusBillingEngineIsolationTest.js
```

### APIs novas

| Método | Rota | Descrição |
|--------|------|-----------|
| GET | `/api/admin/nexus-wallet/billing-engine/dashboard` | Saldo + consumo hoje/mês (só empresa autenticada) |
| GET | `/api/admin/nexus-wallet/billing-ledger` | Extrato `billing_ledger` |

## Roadmap (fases seguintes)

| Fase | Entrega |
|------|---------|
| **2** | Pré-check unificado em voz, Gemini, D-ID, realtime WS |
| **3** | Recargas com ledger `credit` + painel gateways super-admin |
| **4** | Dashboard UI v4 (extrato, dept, alertas, auto-recarga) |
| **5** | Testes concorrência + certificação multi-tenant |
| **6** | RLS PostgreSQL + auditoria IP/UA em todas as rotas IA |

## Certificação (critérios da missão)

- [x] Ledger append-only `billing_ledger`
- [x] Isolamento `company_id` + validação cross-tenant
- [x] Transacção atómica débito + ledger
- [x] Idempotência `request_id`
- [ ] 100% rotas IA instrumentadas
- [ ] Saldo = soma ledger (reconciliação automática)
- [ ] Testes de carga concorrente
- [ ] UI enterprise completa

## Nota sobre a captura de ecrã

A mensagem *"Carteira desactivada neste ambiente"* desaparece quando `NEXUS_CREDIT_WALLET=true` no `.env` do backend e o processo é reiniciado com `--update-env`.
