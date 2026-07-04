# SEC-17 — Observabilidade

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `exfiltration_candidates` | Candidatos a exfiltração |
| `protected_assets` | Ativos registados |
| `suspicious_asset_access` | Acessos anómalos |
| `scraping_patterns` | Padrões de scraping |
| `download_profiles` | Perfis de download massivo |
| `evidence_strength` | Gauge força evidência |
| `asset_exposure` | Exposição de ativos CRITICAL |
| `data_protection_plans` | Planos emitidos |

## Endpoint

```
GET /api/audit/security-exfiltration
```

## Evidências

`backend/docs/evidence/sec-17/criteria.json`
