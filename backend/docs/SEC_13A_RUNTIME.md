# SEC-13A — Runtime

## Procedimento por etapa

```bash
cp backend/.env backend/.env.pre-sec13a-step-N-$(date +%s)
# Alterar UMA flag SEC-XX
pm2 restart impetus-backend --update-env
curl -H "Authorization: Bearer $TOKEN" /api/audit/security-operational-promotion
# Aguardar minObservationMinutes
```

## Componentes

| Ficheiro | Função |
|----------|--------|
| `securityPromotionRuntime.js` | Detecta activos, valida ordem |
| `promotionOperationalDashboard.js` | Dashboard consolidado |
| `operationalValidationEngine.js` | Health, memória, CPU, rollback test |
| `promotionSequencer.js` | Sequência strict |
| `operationalValidationReport.js` | Antes/durante/depois |

---

*AUTO_ACTIVATION=false — activação manual operador.*
