# FIN-STAB-001 — Navigation Certification

## Rotas oficiais

| Rota | Uso |
|------|-----|
| `/app/finance` | Hub |
| `/app/finance/costs` | Custos industriais |
| `/app/finance/leakage` | Mapa de vazamentos |
| `/app/finance/billing` | Nexus Billing / Wallet / Ledger |

## Legacy → Redirect

| Legacy | Destino |
|--------|---------|
| `/app/centro-custos-industriais` | `/app/finance/costs` |
| `/app/mapa-vazamento-financeiro` | `/app/finance/leakage` |
| `/app/admin/nexusia-custos` | `/app/finance/billing` |

## Menu e deep-links

- Sidebar: label **Finance** → `/app/finance`
- Contextual `financial_intelligence` → **Finance** / `/app/finance`
- CenterWidget / CC widgets → rotas oficiais `/app/finance/*`

## Mapeamento visible_modules

`/app/finance*` → `financial_intelligence`, com permissão também se `operational` / `cost_center` / `losses_map` (FIN-STAB-001 — evita Hub a desaparecer).
