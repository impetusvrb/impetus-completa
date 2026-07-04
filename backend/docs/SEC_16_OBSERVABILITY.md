# SEC-16 — Observabilidade

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `deception_plans` | Planos emitidos |
| `deception_candidates` | Cenários candidatos |
| `engagement_profiles` | Perfis de engagement |
| `fake_resource_recommendations` | Recursos falsos recomendados |
| `evidence_enrichment` | Enriquecimentos produzidos |
| `attacker_persistence` | Gauge persistência |
| `scanner_sophistication` | Gauge sofisticação |

## Endpoint

```
GET /api/audit/security-threat-deception
```

## Evidências

`backend/docs/evidence/sec-16/criteria.json`
