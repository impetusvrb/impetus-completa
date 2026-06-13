# AIOI_QUEUE_API_SPECIFICATION

**Fase:** AIOI-ORG-5 — Workflow & SLA Readiness  
**Data:** 2026-06-10  
**Endpoint:** `GET /api/aioi/queue`

---

## 1. Declaração

API READ ONLY da fila executiva CEO. **Single Source of Truth** conforme ORG-1.

**Autoridade:** `aioi_executive_queue_snapshot` exclusivamente.

---

## 2. Endpoint

```
GET /api/aioi/queue
Authorization: Bearer token (requireAuth + requireCompanyActive)
Query params:
  limit  — número máximo de items (default 20, max 100)
```

**Endpoint adicional (bundle):**
```
GET /api/aioi/queue/bundle
→ queue + read_model + view_model
```

---

## 3. Regras Obrigatórias (ORG-1)

| Regra | Enforcement |
|-------|-------------|
| Q-01 Single Source | Apenas snapshot AIOI |
| Q-04 Sem dual display | API nunca merge F47 |
| Sem F47 rebuild | Proibido `buildOperationalPriorityPack/Queue` |
| Sem ranking paralelo | Ordenação do snapshot materializado |
| Estado vazio controlado | `SNAPSHOT_NOT_MATERIALIZED` quando ausente |

---

## 4. Resposta — Snapshot Presente

```json
{
  "ok": true,
  "authority": "aioi",
  "source": "aioi_executive_queue_snapshot",
  "contract_version": "1.0.0",
  "empty": false,
  "snapshot_id": "uuid",
  "generated_at": "2026-06-10T12:00:00.000Z",
  "item_count": 3,
  "items": [
    {
      "ioe_id": "uuid",
      "rank": 1,
      "category": "equipment_failure",
      "priority_band": "critical",
      "priority_score": 85,
      "truth_state": "telemetry_only",
      "status": "triaged",
      "sla_class": "CRITICAL_4H",
      "breach_state": "ON_TRACK",
      "escalation_level": "LEVEL_0"
    }
  ],
  "flags": {
    "IMPETUS_AIOI_ENABLED": false,
    "IMPETUS_AIOI_QUEUE_ACTIVE": false
  },
  "queue_active": false,
  "aioi_enabled": false
}
```

---

## 5. Resposta — Snapshot Ausente

```json
{
  "ok": true,
  "authority": "aioi",
  "source": "aioi_executive_queue_snapshot",
  "contract_version": "1.0.0",
  "empty": true,
  "item_count": 0,
  "items": [],
  "message": "SNAPSHOT_NOT_MATERIALIZED",
  "flags": { ... }
}
```

**Nunca** reconstruir fila a partir do F47 neste endpoint.

---

## 6. Implementação

| Componente | Caminho |
|------------|---------|
| Route | `routes/aioi/aioiQueueRoutes.js` |
| Controller | `controllers/aioi/aioiQueueController.js` |
| Service | `services/aioi/aioiQueueApiService.js` |
| Snapshot | `services/aioi/aioiExecutiveQueueSnapshotProjectionService.js` |
| Read Model | `services/aioi/aioiExecutiveQueueReadModelService.js` |
| View Model | `services/aioi/aioiExecutiveQueueViewModelService.js` |
| Contract | `services/aioi/aioiExecutiveQueueDashboardContract.js` |

---

## 7. Proibições

- `operationalPrioritizationService.buildOperationalPriorityQueue` neste path
- Merge F47 + AIOI items
- LLM rerank
- Runtime cognitivo

---

*AIOI_QUEUE_API_SPECIFICATION — ORG-5.*
