# SEC-17 — Data Movement Analysis

## Tipos detectados

| Tipo | Indicadores |
|------|-------------|
| `mass_download` | requestCount ≥ 5000 |
| `sequential_anomaly` | ≥2000 requests + ≥5 endpoints |
| `repetitive_read` | ≥1000 requests, rate > 5/s |
| `automated_scraping` | UA bot/curl/python ou rate > 10/s |
| `chained_downloads` | ≥8 endpoints |
| `non_human_navigation` | rate > 3 + ≥4 endpoints |

## Output

Schema `data_movement_v1` com `movementScore`, `matchedAssets`, `ratePerSecond`.

## Ficheiro

`backend/src/securityExfiltrationDetection/engine/dataMovementAnalysisService.js`
