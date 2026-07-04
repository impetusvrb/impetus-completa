# SEC-01 — Enterprise Security Observatory

**Fase:** SEC-01  
**Modo:** Observacional only — zero auto-response  
**Feature flag:** `SECURITY_OBSERVATORY=false` (default)

---

## Propósito

Camada oficial de **observabilidade e inteligência de segurança** do IMPETUS.

Responde ao padrão identificado no relatório operacional (~23.000 tentativas / 3 horas): scanners automatizados, enumeração, reconhecimento — **Internet background noise** com IMPETUS no radar de varredura contínua.

**Não bloqueia. Não bane. Não reinicia. Não altera runtime de negócio.**

---

## Componentes

| Componente | Path |
|------------|------|
| Observatory Runtime | `backend/src/securityObservatory/observatory/` |
| Event DTO | `backend/src/securityObservatory/dto/securityEventDto.js` |
| Dashboard DTO | `backend/src/securityObservatory/dto/securityDashboardDto.js` |
| Event Bus | `backend/src/securityObservatory/bus/securityEventBus.js` |
| Metrics (agregado) | `backend/src/securityObservatory/metrics/securityMetricsStore.js` |
| Classifier | `backend/src/securityObservatory/classification/securityClassifier.js` |
| Timeline | `backend/src/securityObservatory/timeline/securityTimeline.js` |
| Middleware | `backend/src/securityObservatory/middleware/securityObservatoryMiddleware.js` |
| Nginx ingest | `backend/src/securityObservatory/ingest/nginxLogIngestor.js` |

---

## Activação

```bash
# .env ou PM2 --update-env
SECURITY_OBSERVATORY=true
SECURITY_OBSERVATORY_WINDOW_MS=60000   # agregação 1 min (default)
```

Reiniciar backend após activar. **OFF por defeito** — zero overhead significativo.

---

## Endpoint audit

```
GET /api/audit/security-observatory
Authorization: Bearer <tenant_admin>
```

---

## Agregação (requisito escalabilidade)

**Não armazena cada request.** Consolida por janela temporal + IP + path:

- Buckets rotativos (max 5000 default)
- Timeline com marcos (ex.: 23:04, 02:05)
- Top origins/paths/UA/classifications

Import batch nginx: `ingest.ingestNginxLines(lines)`.

---

## Referências

- SECURITY-BASELINE-01
- HARDENING-01
- FORENSICS-EXFILTRATION-01
