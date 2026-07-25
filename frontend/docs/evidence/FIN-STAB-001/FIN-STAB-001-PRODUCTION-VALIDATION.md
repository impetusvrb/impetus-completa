# FIN-STAB-001 — Production Validation

## Checklist técnico

| Área | Validação | Evidência |
|------|-----------|-----------|
| Páginas | Hub, costs, leakage montados sob `/app/finance` | App.jsx + tests |
| KPIs | Dados reais via serviços existentes (sem mock) | charts-real-data rule |
| Empty states | Mensagens técnicas mono (páginas reutilizadas) | páginas costs/leakage |
| Erros | Gates Navigate + FinanceBillingGate | layouts |
| Observabilidade | CustomEvent `impetus:finance` | financeObservability.js |

## Cenários CFO (métrica de sucesso)

| # | Cenário | Path |
|---|---------|------|
| 1 | Entrar no Hub Finance | `/app/finance` |
| 2 | Abrir Custos | `/app/finance/costs` |
| 3 | Abrir Leakage | `/app/finance/leakage` |
| 4 | Retornar ao Hub | breadcrumb / back Finance |
| 5 | Acessar pelo menu | label Finance → `/app/finance` |

Catálogo: `finStab001CertificationCatalog.js` → `FIN_STAB_001_CFO_JOURNEYS`

## Comando

```bash
cd frontend && npm run test:fin-stab-001
```
