# Telemetry Health Report (Fase 40-C)

**Função:** `computeTelemetryHealthScore(companyId, windowHours)`  
**Objectivo:** Avaliar **qualidade da coleta**, não produção.

---

## Escala auditável

| Score | Label | Critério (mediana gap entre leituras) |
|-------|-------|--------------------------------------|
| 100 | `coleta_continua` | ≤ 20 s (2× intervalo esperado 10 s) |
| 75 | `gaps_moderados` | ≤ 60 s |
| 50 | `gaps_frequentes` | ≤ 300 s |
| 25 | `coleta_degradada` | > 300 s |
| 0 | `sem_telemetria` | Sem leituras na janela |

Score global = média ponderada por `telemetry_points` por equipamento.

---

## Implementação SQL

- CTE `ordered` com `LAG(collected_at)` por `equipment_id`
- `percentile_cont(0.5)` dos gaps em segundos
- Sem alteração de tabelas

---

## Tenant piloto (2026-06-01)

| Equipamento | Mediana gap | Score |
|-------------|-------------|-------|
| LAB-EQ-001 | 10,0 s | 100 |

**Label global:** `coleta_continua`

---

## Uso no chat

Injectado no bloco PLC como `Saúde telemetria (0–100)` — IA pode citar o valor sem inferir eficiência fabril.
