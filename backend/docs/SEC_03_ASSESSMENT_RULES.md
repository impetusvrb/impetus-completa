# SEC-03 — Assessment Rules

## Origem

| Condição | Assessment |
|----------|------------|
| OPERATIONAL_ACCESS | Operador autorizado (Likely) |
| IP match AWS/Vultr/DO/GCP/Azure prefix | Cloud provider (Likely) |
| IP único | Origem IP única (Possible) |
| Múltiplos IPs | Campanha distribuída possível — actores indeterminados |

## Intenção

Derivada de `primaryAssessment` — sempre como hipótese, nunca conclusão.

## Campanha

| Similaridade histórica | Nível |
|------------------------|-------|
| ≥2 incidentes score ≥0.7 | Likely — mesma campanha provável |
| 1 forte ou ≥2 moderados | Possible — campanhas independentes possíveis |
| Sem histórico | Unknown — incidente isolado |

## Indicadores

CREDENTIAL_SCAN, ENUMERATION, RECONNAISSANCE, MASSIVE_404, ASSET_DISCOVERY, RATE_SPIKE, LONG_DURATION, PERSISTENCE, MULTI_WINDOW, KNOWN_SCANNER, CLOUD_PROVIDER, LEGITIMATE_CRAWLER, AUTHORIZED_OPERATOR

## Risk Level

Mapeado de severity SEC-02 + primaryAssessment — determinístico.
