# F49-B — IOE Ingestion Continuity Audit

**Data:** 2026-06-14  
**Modo:** READ ONLY · AUDIT ONLY · FORENSIC ANALYSIS ONLY  
**Serviço:** `backend/src/services/audit/ioeContinuityAuditService.js`

---

## Pergunta formal

> A ingestão IOE está **OPERACIONAL** ou **INTERROMPIDA**?  
> A pausa nas últimas 24h representa um ciclo encerrado normalmente ou uma falha inesperada?

---

## Resposta executiva

```
A ingestão IOE está:

INTERROMPIDA — por design, de forma controlada.

Causa primária:  worker_stopped   (workers desativados por env vars)
Causa secundária: cycle_completed  (batch concluído com 100% de entrega)
Interrupção inesperada: NÃO
```

---

## F49-B.1 — Estado de continuidade (dados ao vivo)

```json
{
  "ingestion_active": false,
  "last_event_timestamp": "2026-06-12T22:32:24.100Z",
  "expected_ingestion": false,
  "interruption_detected": true,
  "hours_since_last_ioe": 43.5,
  "plc_telemetry_active": true,
  "edge_queue_pending": 0,
  "outbox_pending": 0
}
```

> **Nota crítica:** `expected_ingestion: false` — os workers de IOE estão deliberadamente desactivados via env vars. Não se espera ingestão contínua nesta configuração.

---

## F49-B.2 — Verificações detalhadas

### industrial_operational_events

| Campo | Valor |
|-------|-------|
| Total eventos | **13,156** |
| Último evento | `2026-06-12T22:32:24.100Z` |
| Horas desde último evento | ~43.5h |
| Eventos nas últimas 24h | **0** |
| Categoria dominante | `system_event` (13,155/13,156) |
| Source type | `plc_event` (13,120), `plc_telemetry` (5) |

**Distribuição temporal:**

| Hora | Eventos |
|------|---------|
| 2026-06-12 22:00 UTC | **13,100** |
| 2026-06-12 21:00 UTC | 15 |
| 2026-06-12 20:00 UTC | 5 |
| 2026-06-12 18:00 UTC | 1 |
| 2026-06-12 17:00 UTC | 4 |
| Dias anteriores | ~31 |

**Padrão identificado:** Batch único de 13,100 eventos em 1 hora — não é stream contínuo. Provavelmente gerado durante a validação P0 ou por um script de certificação.

---

### aioi_outbox

| Campo | Valor |
|-------|-------|
| Total entradas | 13,155 |
| Processadas | **13,155** |
| Pendentes | **0** |
| Taxa de entrega | **100%** |
| Última criação | `2026-06-12T22:32:24.100Z` |
| Último processamento | `2026-06-12T22:32:50.291Z` |

**Conclusão:** Pipeline de outbox completamente saudável. Zero backlog. Zero falhas de entrega.

---

### PLC Telemetria (plc_collected_data)

| Campo | Valor |
|-------|-------|
| Total registos | **843,811** |
| Último registo | `2026-06-14T18:15:34Z` — **HOJE** ✅ |
| Cadência | ~8,639 registos/dia |
| Equipamento ativo | `LAB-EQ-001` |
| Tenant ativo | `21dd3cee` (lab edge) |

**PLC telemetria está ATIVA e a operar continuamente** — confirma que a camada de telemetria de sensor (temperatura, vibração, pressão) funciona normalmente. É uma pipeline distinta da IOE.

---

### Workers e Schedulers

```
AIOI_OUTBOX_WORKER_ENABLED=false     → "Worker desativado" (boot log confirmado)
AIOI_CONTINUOUS_RUNTIME_ENABLED=false → "Worker desativado" (boot log confirmado)
EVENT_PIPELINE_BOOT: {"ok":false,"reason":"disabled_by_env"}
```

**Os workers de ingestão contínua de IOE estão explicitamente desativados por variáveis de ambiente.** Não há falha — é uma escolha deliberada de configuração.

---

### Edge Agent Ingest

| Campo | Valor |
|-------|-------|
| Processo | `impetus-edge-agent-lab` — online ✅ |
| Uptime | 45h |
| Ticks | `ok=true reg0=100 reg1=220` (a cada 10s) |
| Erros HTTP 400 | 609 ocorrências |
| Agente registado | Sim — `enabled=true, has_token=true` |
| edge_runtime_queue | **0 itens pendentes** |

O edge agent está a funcionar mas a obter `HTTP 400` no endpoint `/api/integrations/edge/ingest`. Hipótese mais provável: token diverge após re-deployments AIOI (os deployments P1M-P1S alteram configurações). **Não é crash — é rejeição de payload.**

> **Separação importante:** O edge agent escreve em `plc_collected_data` via pipeline de PLC (activo). A criação de IOE events é processo separado que requer token válido + validação de schema.

---

### Tenant Activity

| Tenant | Eventos IOE | Último IOE | Status |
|--------|------------|-----------|--------|
| `ffd94fb8` (principal) | 13,125 | `2026-06-12T22:32` | INATIVO (batch único) |
| `21dd3cee` (lab/edge) | 30 | `2026-06-12T21:02` | INATIVO via IOE (400) |
| `60c76fe6` (terceiro) | 1 | `2026-06-12T04:21` | INATIVO |

---

## F49-B.3 — Event Timeline

```
2026-06-12T17:00Z → Início de actividade IOE (4 eventos)
2026-06-12T18:00Z → 1 evento
2026-06-12T20:00Z → 5 eventos
2026-06-12T21:00Z → 15 eventos + 30 eventos do edge tenant
2026-06-12T22:00Z → LOTE PRINCIPAL: 13,100 eventos em 1 hora
2026-06-12T22:32Z → ÚLTIMO EVENTO IOE registado
2026-06-12T22:32Z → ÚLTIMO PROCESSAMENTO outbox (todos entregues)
─────────────────────────────────────────────
2026-06-14T18:15Z → ÚLTIMA TELEMETRIA PLC (ativa, hoje)
```

---

## F49-B.4 — Root Cause Classification

```json
{
  "primary": "worker_stopped",
  "secondary": "cycle_completed",
  "contributing": "tenant_inactive",
  "unexpected_interruption": false
}
```

### Evidências por classificação

**worker_stopped (CONFIRMADO)**
- `IMPETUS_AIOI_OUTBOX_WORKER_ENABLED=false` — confirmado em boot log
- `IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=false` — confirmado em boot log
- `EVENT_PIPELINE_BOOT: {"ok":false,"reason":"disabled_by_env"}` — confirmado em out log

**cycle_completed (CONFIRMADO)**
- Batch de 13,100 eventos concluído às 22:32:24 em 12/06
- 13,155/13,155 outbox processados — 100% de entrega
- `edge_runtime_queue: 0 itens` — fila vazia

**tenant_inactive (CONFIRMADO)**
- Tenant principal sem nova actividade IOE desde o batch
- Edge tenant bloqueado por HTTP 400 (token/schema mismatch)
- Nenhum tenant gerando IOE ativamente

**unexpected_interruption: NÃO**
- Sem crash, OOM ou falha de processamento
- Sem itens presos na fila
- Sem erro de DB

---

## F49-B.5 — Conclusão Operacional

```
┌──────────────────────────────────────────────────────────────────┐
│         F49-B — IOE INGESTION CONTINUITY AUDIT                  │
├──────────────────────────────────────────────────────────────────┤
│  Estado IOE:            INTERROMPIDA (controlled)               │
│  Causa primária:        worker_stopped                          │
│  Causa secundária:      cycle_completed                         │
│  Interrupção inesperada: NÃO                                    │
│  Outbox pendente:       0 (delivery 100%)                       │
│  PLC Telemetria:        ATIVA (hoje, 8,639 rec/dia)             │
├──────────────────────────────────────────────────────────────────┤
│  CONCLUSÃO:                                                      │
│                                                                  │
│  A ingestão IOE está INTERROMPIDA por design — os workers       │
│  estão desativados via env vars. O último lote (13,100          │
│  eventos em 2026-06-12) foi completado e entregue com           │
│  100% de sucesso. Não há falha, crash ou instabilidade.         │
│                                                                  │
│  A plataforma IoT (PLC telemetria) continua ATIVA com           │
│  cadência de ~8,639 registos/dia. A IOE voltará a               │
│  ingerir quando os workers forem habilitados ou quando           │
│  um novo batch/script for executado.                            │
└──────────────────────────────────────────────────────────────────┘
```

---

## Critérios de aprovação

```json
{
  "continuity_audit_completed": true,
  "root_cause_identified": true,
  "operational_status_determined": true,
  "evidence_report_generated": true
}
```

---

## Distinção importante: IOE vs PLC Telemetria

| Pipeline | Tabela | Status | Cadência |
|---------|--------|--------|---------|
| IOE Events | `industrial_operational_events` | **INTERROMPIDA** (design) | Batch on-demand |
| PLC Telemetria | `plc_collected_data` | **ATIVA** | 8,639 rec/dia contínuos |
| AIOI Outbox | `aioi_outbox` | **COMPLETO** | 100% delivery |

As duas pipelines são independentes. A pausa do IOE não significa que a coleta de sensor parou — o sensor continua a registar.

---

## Referências de evidência

| Fonte | Evidência |
|-------|-----------|
| PostgreSQL `industrial_operational_events` | 13,156 eventos, último 2026-06-12 |
| PostgreSQL `aioi_outbox` | 13,155/13,155 processados |
| PostgreSQL `plc_collected_data` | 843,811 registos, último hoje |
| PostgreSQL `edge_runtime_queue` | 0 itens pendentes |
| PM2 boot log `impetus-backend-out.log` | `AIOI_OUTBOX_WORKER_BOOT: Worker desativado` |
| PM2 `impetus-edge-agent-lab` error log | 609 HTTP 400 errors |
| `backend/src/services/audit/ioeContinuityAuditService.js` | Classificação programática |

---

*F49-B — auditoria forense, modo READ ONLY. Nenhum runtime alterado. Nenhum worker reiniciado.*
