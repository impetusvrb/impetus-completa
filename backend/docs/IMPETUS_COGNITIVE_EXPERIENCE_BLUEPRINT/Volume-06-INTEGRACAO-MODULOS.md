# Volume VI — Integração entre Módulos
## ICEB v1.0 · Domínios, MQTT, ERP, AIOI

---

## 6.1 Mapa de domínios nativos

| Domínio | Rota FE | API base | Cenário CERT |
|---------|---------|----------|--------------|
| Quality | `/app/quality/operational` | `/api/quality-intelligence` | NC → CAPA |
| SST | `/app/safety/operational` | `/api/safety-operational` | Incidente lifecycle |
| ESG | `/app/environment/operational` | `/api/environment-operational` | Emissão/resíduo |
| Logistics | `/app/logistics/operational` | logistics routes | — |
| ManuIA | `/app/manutencao/manuia` | `/api/manutencao-ia` | Diagnóstico → OS |
| RH | Pulse + HR modules | `/api/hr-*` | — |
| Financeiro | centros de custo | `/api/costs` | — |
| TPM | dashboard maintenance | `/api/dashboard/maintenance` | Preventiva lifecycle |

**Fonte:** `FUNCTIONAL_MATRIX.json` · `certifiedScenarios`

---

## 6.2 Integrações industriais

| Integração | Estado default | Flag / nota |
|------------|----------------|-------------|
| MQTT | OFF típico | `industrial-mqtt` |
| OPC-UA | OFF | config tenant |
| PLC Collector | AB parcial | `plcCollector.js` |
| MES/ERP | serviço bridge | `mesErpIntegrationService.js` |
| Edge | roadmap | Volume X |

**Classificação honesta (AB):** documentar flags OFF por defeito — não descrever como telemetria live universal.

---

## 6.3 Event Governance → AIOI

```
Evento domínio (SST, Quality, …)
    → operationalAlertsService / workflow engines
    → event-governance audit
    → AIOI correlation (se habilitado)
```

Cenário CERT #10: Correlação → Insight → Escalonamento.

---

## 6.4 Módulos contextual (menu)

27 módulos em `moduleRegistry.js` — fichas etapas **413–439** em `fichas/modulos/`.

Governança: `moduleAccessGovernanceEngine` + `domainRegistry.js` (`executive.denied_modules`).

---

## 6.5 Outbox e consistência

Serviços com padrão outbox documentados em `BACKEND_INVENTORY` — endpoints etapas **463–1060**.

---

*Volume VI · ICEB v1.0 · 2026-06-30*
