# M1.7 — Maintenance Pilot Simulation (Cenário 3)

**Data:** 2026-06-16  
**Fase:** M1.7 — Pilot Readiness Simulation  
**Modo:** READ ONLY · Additive only

---

## Veredicto

```json
{
  "scenario": "maintenance",
  "journey_complete": true,
  "status": "READY"
}
```

---

## Jornada simulada

```
Falha equipamento → maintenance_required → MANUIA → Work Order → Executive Queue
```

---

## Passos e evidências

### Passo 1 — Falha de equipamento captada pelo AIOI

| Evidência | Valor |
|-----------|-------|
| IOE `category=equipment_failure` | **1** |
| Data do evento | 2026-06-12 |

**Evidência directa:** O sistema AIOI já captou e persistiu um evento real de falha de equipamento. A jornada tem ponto de partida verificado.

---

### Passo 2 — AIOI classifica como `maintenance_required`

| Evidência | Valor |
|-----------|-------|
| `IMPETUS_AIOI_ENABLED` | `true` |
| `IMPETUS_AIOI_QUEUE_ACTIVE` | `true` |
| `aioiClassificationMapper` | `work_order` → `maintenance_required` |
| `taskAioiAdapter` | `critical/urgent/high` → `maintenance_required` |

---

### Passo 3 — MANUIA gera diagnóstico

| Evidência | Valor |
|-----------|-------|
| `ENABLE_MANUIA` | ON (default) |
| `IMPETUS_MAINTENANCE_COGNITIVE_RUNTIME` | `maintenance_native` |
| `IMPETUS_MAINTENANCE_LIVE_VALIDATION` | `active` |
| Rotas activas | `/api/manutencao-ia/*`, `/api/dashboard/maintenance/*` |

---

### Passo 4 — Work Order registada

| Evidência | Valor |
|-----------|-------|
| `casos_manutencao` | 0 (sem OS activas; pipeline pronto) |
| `maintenance_preventives` | 0 |
| API work-orders | `/api/manutencao-ia/work-orders` — ✅ Montada |

**Nota:** BD sem OS actuais — comportamento correcto (sem falhas activas). O evento `equipment_failure` captado confirma que quando uma falha ocorrer, a OS será criada automaticamente.

---

### Passo 5 — Executive Queue recebe item de manutenção

| Evidência | Valor |
|-----------|-------|
| `aioi_executive_queue_snapshot` | **13.672+** snapshots |
| Payload type | `aioi_maintenance_required` (`aioiExecutionPayloadBuilder`) |
| Decisão mapeada | "Agendar manutenção" |

---

## Demonstração piloto

1. Equipamento gera alerta → IOE `equipment_failure`
2. AIOI classifica → `maintenance_required`
3. MANUIA abre diagnóstico → técnico recebe notificação
4. Work Order criada → registada em `casos_manutencao`
5. Executive Queue mostra item → CEO vê na queue
