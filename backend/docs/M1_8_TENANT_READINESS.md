# M1.8 — Tenant Readiness (Food Base Prospective)

**Data:** 2026-06-16  
**Fase:** M1.8 — Food Base Onboarding & Go-Live Readiness  
**Modo:** READ ONLY · SIMULATION ONLY · NO DATABASE WRITES

---

## Identificador virtual (audit-only)

```json
{
  "simulated_company_id": "foodbase-prospective-tenant",
  "company_name": "Food Base",
  "tenant_mode": "prospective_simulation",
  "food_base_exists_in_db": false
}
```

> Este ID **nunca** é persistido em BD, `.env` ou pilot lists.

---

## Veredicto

```json
{
  "company_id_defined": true,
  "tenant_creation_path_exists": true,
  "tenant_activation_path_exists": true,
  "tenant_ready": true,
  "status": "READY"
}
```

---

## Evidências

| Dimensão | Estado | Detalhe |
|----------|--------|---------|
| Food Base na BD | ❌ Ausente | `companies` não contém "Food Base" |
| ID prospectivo definido | ✅ | `foodbase-prospective-tenant` (audit only) |
| Path de criação | ✅ | `POST /api/companies` — cria empresa + admin CEO |
| Path de activação | ✅ | `/api/onboarding/*` — onboarding empresa/utilizador |
| Tenants de referência | ✅ | find fish (`21dd3cee`), Fresh & Fit (`511f4819`) |

---

## Acção pós-M1.8 (fora do escopo desta fase)

1. `POST /api/companies` com `name: "Food Base"`
2. Obter UUID real gerado
3. Adicionar UUID a `*_PILOT_TENANTS` no `.env`
4. `pm2 restart impetus-backend --update-env`
