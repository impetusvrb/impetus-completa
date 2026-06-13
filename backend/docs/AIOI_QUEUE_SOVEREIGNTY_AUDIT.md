# AIOI_QUEUE_SOVEREIGNTY_AUDIT

**Fase:** AIOI-ORG-1 — Queue CEO Consolidation & Sovereignty Resolution  
**Etapa:** 1 — Inventário completo de filas executivas  
**Data:** 2026-06-09  
**Modo:** READ ONLY ANALYSIS + GOVERNANCE CONSOLIDATION (ADDITIVE ONLY)  
**Contexto:** P8 Runtime Stack 100% certificado; risco HIGH remanescente = Queue CEO dual-source (F47 + AIOI)

---

## 1. Escopo da Auditoria

Auditoria estática em `backend/` e `frontend/` para localizar:

- Queue CEO / Executive Queue
- F47 Queue (`operationalPrioritizationService`)
- AIOI Queue (declarada em governança; implementação parcial)
- Adapters, read models, APIs e dashboards relacionados

**Fora de escopo (domínio distinto):**

- `environment-telemetry/edge/queue` — fila de telemetria edge IIoT, não fila executiva CEO
- Filas internas de workers (`proacao_worker`, outbox genérico) — infraestrutura, não visão CEO

---

## 2. Inventário

| # | Fonte | Responsabilidade | Produtor | Consumidor | Prioridade | Soberano Atual |
|---|-------|------------------|----------|------------|------------|----------------|
| 1 | **F47 — `operationalPrioritizationService`** | Score PLC 0–100, ranking de equipamentos/eventos/padrões, fila operacional `priority_queue` | `buildOperationalPriorityPack()`, `buildOperationalPriorityQueue()`, `computePriorityScore()` | `cognitivePulseService`, `dashboard.js`, `dataRetrievalService`, `industrialTruthEnforcementService`, `plcChatGroundingService`, `plcOperationalIntelligenceService`, `plcAioiAdapter` | **LEGACY (interim)** — visão executiva de facto quando AIOI queue inativa | **F47** (soberano PLC score; não soberano fila CEO cross-domain) |
| 2 | **F47 Live Feed** — `buildLiveFeedPriorities()` | Eventos de feed cognitivo derivados do pack F47 | `operationalPrioritizationService.buildLiveFeedPriorities()` | `cognitivePulseService` (pulse packs / live feed CEO-adjacent) | LEGACY | F47 (derivado) |
| 3 | **AIOI Executive Queue** — `aioi_executive_queue_snapshot` | Fila canônica cross-domain do CEO (IOE materializado) | **Planeado:** queue engine P0.11 + snapshot writer | **Planeado:** `GET /api/aioi/queue`, UI CEO AIOI | **AUTHORITATIVE (alvo)** | **AIOI** (declarado em `AIOI_SOVEREIGNTY_MAP.md` §1) |
| 4 | **`GET /api/aioi/queue`** | API de leitura da fila executiva AIOI | — (rota **AUSENTE**) | — (consumidor **AUSENTE**) | AUTHORITATIVE (quando implementada) | AIOI |
| 5 | **`plcAioiAdapter`** | Transforma telemetria PLC → IOE; reutiliza score F47 | `plcAioiAdapter` (evidence `priority_pack_f47`) | `aioiEventIngestionService` → `industrial_operational_events` | MIRROR / INPUT | AIOI adapter; score soberano = F47 |
| 6 | **`aioiExecutivePriorityMatrixService`** | Matriz estratégica de domínios (governance, risco, custo, valor) | `getExecutivePriorityMatrix()` | `aioiExecutiveCommandReadModelService`, cockpit/command APIs | DERIVED — **não é fila CEO operacional** | AIOI read model |
| 7 | **`aioiBottleneckAnalysisService`** | Backlogs IOE (approval, execution, outcome, learning) | `getBottleneckSummary()`, `get*Backlog()` | `aioiExecutiveReadModelService` | DERIVED — gargalos IOE, não ranking CEO | AIOI read model |
| 8 | **`aioiExecutiveReadModelService`** | Read model executivo (snapshot + bottlenecks + cycle) | Agregação P2.x | Cockpit / portal APIs | DERIVED | AIOI |
| 9 | **`aioiExecutiveCommandReadModelService`** | Command intelligence (state + priority matrix + attention) | Agregação P2.9 | Cockpit command endpoints | DERIVED | AIOI |
| 10 | **`aioiCockpitRoutes`** (`/api/aioi/cockpit/*`) | Cockpit API read-only P5.0 | — | Frontend módulos executive-cockpit (gateway próprio) | READ MODEL — sem `/queue` | AIOI |
| 11 | **`dashboard.js`** — contextual pack | Injeta `priority_pack` e `operational_priority_queue` no dashboard | Rota dashboard (F47 pack via PLC intelligence) | Frontend dashboard legacy / APIs consumidoras | LEGACY exposure | F47 (via pack) |
| 12 | **`dataRetrievalService`** | Contexto RAG/chat com `operational_priority_queue` | Serviço de retrieval | Chat/assistente operacional | LEGACY exposure | F47 (via pack) |
| 13 | **`cognitivePulseService`** | Pulse packs com prioridades live feed | `buildOperationalPriorityPack` + `buildLiveFeedPriorities` | Feed cognitivo / dashboards pulse | LEGACY producer | F47 |
| 14 | **`industrialTruthEnforcementService`** | Truth grounding com `priority_pack` | `buildOperationalPriorityPack` (on-demand) | Enforcement de claims operacionais | LEGACY consumer | F47 input; Truth soberano separado |
| 15 | **`ExecutiveDashboard.jsx`** — painel "Prioridades Executivas" | Prioridades derivadas de KPIs (`alerts`, `proposals`, `insights`) | Construção local no componente | CEO UI (`/executive` ou rota equivalente) | DERIVED / UI-local — **não consome F47 nem AIOI queue** | Nenhum (KPI mirror) |
| 16 | **Frontend módulos AIOI P6–P8** | Foundation/runtime sem fila CEO dedicada | — | Providers P6–P8 | N/A — proibido `queue` em runtime P8 (certificação) | AIOI foundation only |
| 17 | **Edge queue** (`/environment-telemetry/edge/queue`) | Buffer telemetria ambiental edge | Edge agent / route | Environment telemetry UI | OUT OF SCOPE | Environment domain |

---

## 3. Evidências por Componente Crítico

### 3.1 F47 Queue (Legacy operacional)

| Atributo | Valor |
|----------|-------|
| Arquivo canónico | `backend/src/services/operationalPrioritizationService.js` |
| Funções exportadas | `buildOperationalPriorityQueue`, `buildOperationalPriorityPack`, `buildLiveFeedPriorities`, `computePriorityScore` |
| Formato fila | `{ queue[], top_equipment_id, queue_length, ordering: 'priority_score_desc' }` |
| Config pesos | `backend/src/config/priorityIntelligenceConfig.js` |
| Certificação F47 | `backend/scripts/phase47-priority-certification.js` |

### 3.2 AIOI Queue (Autoridade declarada — implementação parcial)

| Atributo | Valor |
|----------|-------|
| Declaração soberania | `AIOI_SOVEREIGNTY_MAP.md` §1 — Queue Global = AIOI |
| Tabela prevista | `aioi_executive_queue_snapshot` — **fora do escopo P0.1**; migration não encontrada |
| API prevista | `GET /api/aioi/queue` — **AUSENTE** em `aioiCockpitRoutes.js` |
| Flags previstas | `IMPETUS_AIOI_ENABLED`, `IMPETUS_AIOI_QUEUE_ACTIVE` — documentadas; **não presentes em código JS** |
| Adapter F47→IOE | `plcAioiAdapter.js` — `priority_pack_f47` em `evidence_refs` |

### 3.3 Read Models AIOI (não substituem fila CEO)

| Serviço | Natureza |
|---------|----------|
| `aioiExecutivePriorityMatrixService` | Domínios estratégicos (P2.4/P2.5) — não ranking equipamento |
| `aioiBottleneckAnalysisService` | Contagens backlog IOE por status — não fila priorizada CEO |

---

## 4. Mapa Produtor → Consumidor (F47)

```
plc_collected_data + F44/F45 bundles
        │
        ▼
operationalPrioritizationService.buildOperationalPriorityPack()
        │
        ├──► cognitivePulseService.buildLiveFeedPriorities()     [feed CEO-adjacent]
        ├──► dashboard.js → operational_priority_queue            [API dashboard]
        ├──► dataRetrievalService → operational_priority_queue    [RAG/chat]
        ├──► industrialTruthEnforcementService → priority_pack      [truth grounding]
        ├──► plcChatGroundingService → priority_pack              [chat PLC]
        ├──► plcOperationalIntelligenceService                    [intel pack]
        └──► plcAioiAdapter → IOE + evidence priority_pack_f47    [AIOI input]
```

---

## 5. Mapa Alvo (AIOI Queue — governança, não implementação ORG-1)

```
IOE (industrial_operational_events) + classificação/prioridade
        │
        ▼
[PLANEADO] aioi_executive_queue_snapshot
        │
        ├──► GET /api/aioi/queue (READ — CEO)
        └──► UI CEO única (quando IMPETUS_AIOI_QUEUE_ACTIVE=true)

F47 pack ──► INPUT ONLY (não exibido em paralelo — Q-04)
```

---

## 6. Achados da Auditoria

| ID | Achado | Severidade | Estado pós-ORG-1 |
|----|--------|------------|------------------|
| A-01 | Duas fontes potenciais CEO: F47 pack + AIOI queue declarada | HIGH | **RESOLVIDO por governança** — contrato de precedência ORG-1 |
| A-02 | `GET /api/aioi/queue` não implementada | MEDIUM | Aberto — fora escopo ORG-1 (sem runtime) |
| A-03 | Flags `IMPETUS_AIOI_*` só em docs | LOW | Aberto — ativação futura |
| A-04 | `ExecutiveDashboard` não usa F47 nem AIOI queue | INFO | Sem dual-display neste ecrã |
| A-05 | `aioiExecutivePriorityMatrix` pode ser confundido com fila CEO | MEDIUM | **Classificado DERIVED** na matriz ORG-1 |
| A-06 | Edge queue nome similar | LOW | **Excluído** — domínio environment |

---

## 7. Invariantes Preservados (verificação ORG-1)

| Invariante | Estado |
|------------|--------|
| Módulos P6 preservados | SIM — nenhuma alteração |
| Módulos P7 preservados | SIM — nenhuma alteração |
| Módulos P8.0–P8.6 preservados | SIM — nenhuma alteração |
| `runtime_enabled` | `false` |
| `runtime_active` | `false` |
| `runtime_authorized` | `false` |
| `cognitive_execution_allowed` | `false` |
| APIs consumidas atuais | Sem alteração |

---

*AIOI_QUEUE_SOVEREIGNTY_AUDIT — Etapa 1 AIOI-ORG-1 · READ ONLY · nenhum código operacional alterado.*
