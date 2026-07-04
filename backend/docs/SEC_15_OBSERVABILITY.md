# SEC-15 — Observabilidade

## Métricas

| Métrica | Descrição |
|---------|-----------|
| `scanner_detections` | Fingerprints de scanner |
| `enumeration_attempts` | Tentativas de enumeração |
| `surface_profiles` | Perfis de superfície gerados |
| `scanner_confidence` | Gauge última confiança |
| `enumeration_confidence` | Gauge última confiança enum |
| `recommended_surface_changes` | Planos emitidos |
| `anti_scanner_reports` | Relatórios completos |

## Endpoint

```
GET /api/audit/security-anti-scanner
```

## Evidências

`backend/docs/evidence/sec-15/criteria.json`
