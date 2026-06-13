# AIOI-P0C — Queue API Audit Report

**Data:** 2026-06-12  
**Fase:** ETAPA C.1  
**Modo:** OPERATIONAL ONLY · NO COGNITIVE ACTIVATION  

---

## 1. Endpoints Auditados

| Endpoint | Método | Auth | Status |
|----------|:------:|:----:|:------:|
| `GET /api/aioi/health` | GET | Público | ✅ Registrado |
| `GET /api/aioi/queue` | GET | requireAuth + requireCompanyActive | ✅ Operacional |
| `GET /api/aioi/queue/bundle` | GET | requireAuth + requireCompanyActive | ✅ Operacional |

**Registro no servidor:** `src/server.js` → `useRoute('/api/aioi', './routes/aioi/aioiQueueRoutes')`

---

## 2. Funcionamento

### `GET /api/aioi/queue`

**Fonte de dados:** `aioi_executive_queue_snapshot` (AUTHORITATIVE — ORG-1)  
**Proibido:** rebuilding F47, dual source, ranking paralelo  

**Resposta — fila com dados:**
```json
{
  "ok": true,
  "authority": "aioi",
  "source": "aioi_executive_queue_snapshot",
  "contract_version": "1.0.0",
  "empty": false,
  "snapshot_id": "<uuid>",
  "generated_at": "<timestamptz>",
  "item_count": 3,
  "items": [ ... ],
  "flags": { "IMPETUS_AIOI_ENABLED": false, "IMPETUS_AIOI_QUEUE_ACTIVE": false },
  "queue_active": false,
  "aioi_enabled": false
}
```

**Resposta — fila vazia (sem snapshot):**
```json
{
  "ok": true,
  "authority": "aioi",
  "source": "aioi_executive_queue_snapshot",
  "empty": true,
  "item_count": 0,
  "items": [],
  "message": "SNAPSHOT_NOT_MATERIALIZED"
}
```

---

## 3. Estrutura de Item da Fila

| Campo | Tipo | Obrigatório | Descrição |
|-------|------|:-----------:|-----------|
| `ioe_id` | UUID | ✅ | ID do IOE |
| `rank` | int | ✅ | Posição na fila (1-based) |
| `category` | text | ✅ | Categoria operacional |
| `source_type` | text | — | Tipo de fonte |
| `priority_band` | text | ✅ | critical/high/medium/low |
| `priority_score` | int | ✅ | Score 0–100 |
| `truth_state` | text | ✅ | Estado de verdade |
| `scores_provisional` | bool | — | Score baseado em dados parciais |
| `entity_type` | text | — | Tipo de entidade |
| `equipment_id` | UUID | — | Equipamento associado |
| `status` | text | ✅ | Estado do ciclo de vida |
| `sla_class` | text | ✅ | Classe SLA (CRITICAL_4H, HIGH_8H, etc.) |
| `due_at` | timestamp | — | Prazo SLA |
| `aging_hours` | float | — | Idade em horas |
| `breach_state` | text | ✅ | ON_TRACK/AT_RISK/BREACHED |
| `escalation_level` | int | — | Nível de escalonamento |
| `correlation_id` | text | — | ID de correlação |
| `created_at` | timestamp | — | Data de criação |

---

## 4. Paginação e Filtros

| Parâmetro | Padrão | Máximo | Validação |
|-----------|:------:|:------:|-----------|
| `limit` | 20 | 100 | `Math.min(Math.max(limit, 1), 100)` |

**Ordenação:** `priority_score DESC, created_at ASC` (soberana — backend)

---

## 5. Validação RLS e Multi-tenant

| Critério | Status |
|----------|:------:|
| `company_id` filtrado em todo acesso | ✅ |
| `set_config('app.current_company_id', ...)` antes de cada query | ✅ |
| RLS FORCE ativo em `aioi_executive_queue_snapshot` | ✅ |
| Controller extrai `company_id` de `req.user.company_id` | ✅ |
| Resposta com tenant B não contém dados do tenant A | ✅ (verificado) |

---

## 6. Serviços da Cadeia

```
aioiQueueRoutes.js
  └── aioiQueueController.js
        └── aioiQueueApiService.js
              ├── aioiExecutiveQueueSnapshotProjectionService.js
              │     └── industrial_operational_events (DB)
              │     └── aioi_executive_queue_snapshot (DB)
              ├── aioiExecutiveQueueReadModelService.js
              ├── aioiExecutiveQueueViewModelService.js
              └── aioiExecutiveQueueDashboardContract.js
```

---

## 7. Testes Executados

| Teste | Resultado |
|-------|:---------:|
| Queue com 3 IOEs (critical/high/medium) | ✅ PASS |
| Ordenação priority_score DESC | ✅ PASS |
| Estado vazio (sem snapshot) | ✅ PASS |
| Erro com companyId inválido | ✅ PASS |
| Isolamento de tenant | ✅ PASS |
| Campos obrigatórios no payload | ✅ PASS |
| Bundle (queue + read_model) | ✅ PASS |

---

## 8. Veredito

```
QUEUE_API_READY
```
