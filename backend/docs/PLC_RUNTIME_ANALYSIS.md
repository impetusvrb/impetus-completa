# PLC Runtime Analysis (Fase 40-B)

**Fonte:** `plc_collected_data` (read-only)  
**Serviço:** `plcOperationalIntelligenceService.buildEquipmentOperationalSummaries()`

---

## Modelo por `equipment_id`

| Campo | Descrição |
|-------|-----------|
| `first_seen` | `MIN(collected_at)` na janela (24 h default) |
| `last_seen` | `MAX(collected_at)` na janela |
| `telemetry_points` | `COUNT(*)` de leituras |
| `estimated_runtime_hours` | Estimativa auditável (não é OEE nem produção) |
| `alarm_frequency` | `alarm_readings / telemetry_points` |
| `telemetry_coverage` | Razão pontos reais vs esperado (~10 s) |
| `is_active_recent` | Leitura nos últimos 15 min |

---

## Algoritmo `estimated_runtime_hours`

1. Se existem leituras `status` ∈ {running, run, active, on}:  
   `running_points × 10 s / 3600`, limitado à janela.
2. Senão, com `span = last_seen − first_seen` e `points > 1`:  
   `min(janela_h, span_h × coverage)`.
3. Caso pontual: `points × 10 s / 3600`.

**Limitação declarada:** mede tempo com amostragem observada, não horas de produção certificadas.

---

## Exemplo tenant piloto (LAB-EQ-001)

| Métrica | Valor |
|---------|-------|
| Janela | 24 h |
| Pontos | 8637 |
| Runtime estimado | 23,99 h |
| Cobertura | 1,0 |
| Mediana gap | ~10 s |

---

## Proibido neste modelo

OEE, performance industrial, qualidade %, MTBF/MTTR, volumes de produção.
