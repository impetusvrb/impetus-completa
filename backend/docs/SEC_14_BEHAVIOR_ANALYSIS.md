# SEC-14 — Behavior Analysis Engine

## Objectivo

Detectar e classificar padrões de comportamento hostil a partir de incidentes certificados SEC-02.

## Tipos detectados

| Tipo | Origem típica |
|------|---------------|
| `credential_scanning` | CREDENTIAL_SCAN |
| `enumeration` | PATH_ENUMERATION, API_ENUMERATION |
| `aggressive_crawling` | requestCount ≥ 5000 |
| `distributed_scan` | uniqueIps ≥ 5 |
| `repeated_probing` | tags recurrence, RECONNAISSANCE |
| `brute_force` | BRUTEFORCE |
| `endpoint_discovery` | API_PROBE, API_ENUMERATION |
| `suspicious_rate` | taxa > 10 req/s |

## Output por incidente

```json
{
  "incidentId": "inc-ab-1",
  "behaviors": ["credential_scanning", "aggressive_crawling"],
  "behaviorScore": 0.65,
  "requestCount": 12000,
  "rate": 3.33
}
```

## behaviorScore

Agregado normalizado 0–1 baseado em:
- Quantidade de tipos detectados
- Volume de requests
- Taxa de acesso

## Integração

- Input: incidentes SEC-02 (open + closed)
- Output: profiles consumidos por Fingerprint e Recommendation engines
- Métrica: `behavior_profiles`

## Ficheiro

`backend/src/securityAdaptiveBlocking/engine/behaviorAnalysisService.js`
