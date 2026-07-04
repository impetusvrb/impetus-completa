# SEC-02 — Enterprise Security Correlation Engine

**Fase:** SEC-02  
**Modo:** Observacional only — zero auto-response  
**Feature flag:** `SECURITY_CORRELATION_ENGINE=false` (default)

---

## Propósito

Transformar milhares de eventos agregados (SEC-01) em **incidentes únicos** com contexto, severidade, risk score e timeline — diferenciando monitor de **SOC Enterprise**.

Exemplo: **23.000 requests → 1 incidente** com fases 23:04→02:05.

---

## Activação

```bash
SECURITY_OBSERVATORY=true          # fonte de eventos
SECURITY_CORRELATION_ENGINE=true   # correlação

pm2 restart impetus-backend --update-env
```

SEC-02 subscreve o Event Bus do SEC-01 automaticamente.

---

## Endpoint

```
GET /api/audit/security-incidents
Authorization: Bearer <tenant_admin>
```

---

## Componentes

| Componente | Path |
|------------|------|
| Correlation Engine | `backend/src/securityCorrelation/engine/` |
| Incident DTO | `backend/src/securityCorrelation/dto/securityIncidentDto.js` |
| Incident Store | `backend/src/securityCorrelation/store/incidentStore.js` |
| Severity / Risk | `engine/severityCalculator.js`, `riskScoreCalculator.js` |
| Summary / Timeline | `engine/incidentSummaryBuilder.js` |

---

## Referências

- SECURITY-BASELINE-01
- SEC-01 Observatory
- Relatório Gustavo (~23k / 3h)
