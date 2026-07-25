# OPM-008 — Decision Trace Model

**Fase:** OPM-008  
**Fonte canónica:** `clDecisionTrace.js`

---

## Cadeia de rastreabilidade

```
Recommendation
        ↓
Evidence
        ↓
Metrics
        ↓
Events
        ↓
Operational Contracts
```

---

## Estrutura do trace

```json
{
  "recommendation": {
    "id": "...",
    "title": "...",
    "priority": "high|medium|low",
    "confidence": 0.85,
    "impact": "high|medium|low",
    "action": "advisory"
  },
  "evidence": [{ "type": "metric", "key": "...", "value": "..." }],
  "metrics": {
    "healthScore": 70,
    "riskScore": 30,
    "openQueues": 12,
    "criticalCapacity": 1
  },
  "events": [
    { "domain": "receiving", "count": 5, "source": "GET /v1/receiving" }
  ],
  "contracts": ["OPM-GOV-001", "OPM-007", "WMS-003 v1"],
  "modulesInvolved": ["picking", "transfers"]
}
```

---

## Tipos de acção

| action | Descrição |
|--------|-----------|
| `advisory` | Recomendação cognitiva — decisão humana |
| `predictive_advisory` | Insight preditivo — sem prescrição automática |

---

## Auditabilidade

- Cada abertura de recomendação emite `COGNITIVE_TRACE_VIEWED`
- Trace serializado no painel lateral `ClDecisionTracePanel`
- Export CSV/Excel/PDF inclui origem e confiança

---

## Sem dependências inversas

OPM-007 e módulos operacionais **não importam** OPM-008. Consumo unidireccional garantido.
