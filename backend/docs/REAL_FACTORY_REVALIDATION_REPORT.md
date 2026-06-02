# Real Factory Revalidation — Pós-Fase 39

**Data:** 2026-06-01  
**Script:** `backend/scripts/phase39-grounding-revalidation.js`  
**Resultado:** **6/6 PASS**

---

## Tenants

| Tenant | ID | Estado esperado | Obtido |
|--------|-----|-----------------|--------|
| find fish alimentos | `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` | `telemetry_only` | ✓ |
| Fresh & Fit (empty factory) | `511f4819-fc48-479e-b11e-49ba4fb9c81b` | `tenant_empty` | ✓ |

---

## Critérios de sucesso F39

| # | Critério | Resultado |
|---|----------|-----------|
| 1 | `tenant_empty` não aparece com PLC activo | ✓ |
| 2 | `telemetry_only` correcto | ✓ |
| 3 | IA reconhece telemetria | ✓ |
| 4 | Sem KPI inventado (OEE % fabricado) | ✓ |
| 5 | Tenant vazio real mantém `tenant_empty` | ✓ REG-01 |
| 6 | Evidence binding FULL | ✓ `telemetry_only: true`, `plc_collected_data` |
| 7 | Truth enforcement inalterado nas regras | ✓ |
| 8 | Hallucination inalterado | ✓ |

---

## Amostra RF-01 (excerpt)

> Não é possível calcular o OEE… falta de cadastro MES… telemetria do equipamento **LAB-EQ-001** está ativa… alarme "ok"…

**Antes F39:** «sistema vazio», «não há máquinas cadastradas» sem mencionar PLC.

---

## Evidence (RF-01)

```json
{
  "source_table": "plc_collected_data",
  "confidence": "snapshot_backed",
  "data_state": "telemetry_only",
  "telemetry_only": true
}
```

---

## Notas

- Contagens de leituras (ex.: 8637) vêm do **snapshot PLC autorizado** injectado — não são KPIs inventados.
- OEE completo continua **indisponível** (correcto — Fase 38 feasibility).
- `pm2 reload impetus-backend` necessário após deploy para validação HTTP.

---

## Veredito

**Real factory revalidation — PASS**  
**Grounding operacional — REMEDIATED** (falso `tenant_empty` eliminado para PLC activo).
