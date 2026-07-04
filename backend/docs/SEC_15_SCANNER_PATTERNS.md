# SEC-15 — Scanner Patterns

## Padrões detectados

| Padrão | Indicadores |
|--------|-------------|
| `credential_scanner` | CREDENTIAL_SCAN, BRUTEFORCE |
| `directory_brute_force` | PATH_ENUMERATION |
| `endpoint_enumeration` | API_PROBE, múltiplos endpoints |
| `mass_404` | requestCount ≥ 3000 + ≥5 endpoints |
| `source_discovery` | /.env, /.git, docker-compose, backup |
| `aggressive_bot` | UA bot/scanner, volume alto |
| `distributed_scanner` | uniqueIps ≥ 5 |
| `framework_fingerprinting` | swagger, graphql, actuator, wp- |

## Output `scanner_fingerprint_v1`

- `patterns[]`, `primaryIp`, `userAgent`
- `endpointSample`, `requestCount`
- Disclaimer: não identifica pessoa

## Attack patterns agregados

CREDENTIAL_SCANNING · DISTRIBUTED_RECONNAISSANCE · SURFACE_ENUMERATION · FRAMEWORK_FINGERPRINTING · MASS_PROBING · API_DISCOVERY · AUTOMATED_SCAN

## Ficheiro

`backend/src/securityAntiScanner/engine/scannerFingerprintService.js`
