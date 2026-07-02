# PULSE_ARCHITECTURE_CONTRACT.md

**Versão:** 1.0.0 (CERT-PULSE-05)  
**Status:** Núcleo cognitivo congelado — desenvolvimento estrutural encerrado

---

## Declaração oficial

> **O Pulse RH está arquiteturalmente concluído.**  
> Evoluções futuras deverão ocorrer **exclusivamente** através da adição de novos eventos ao ecossistema IMPETUS, **sem alteração do núcleo cognitivo**.

---

## Responsabilidades do Pulse Cognitivo

| Responsabilidade | Descrição |
|------------------|-----------|
| Percepção humana | Agregar sinais de módulos via `perceptionLayer` |
| Correlação | `humanCorrelationEngine` — nunca conclusão por sinal isolado |
| Índice | `indexCalculator` — 9 dimensões, pesos congelados (CERT-04) |
| Estado | `stateEngine` — inferência assistiva, não rótulo definitivo |
| Ingestão | `eventIngestion` — **único ponto de extensão** |
| Memória | `organizationalMemoryService` — consultiva, não altera índices |
| Calibração | `calibration/*` — validação e confiabilidade |
| Governança | HITL, LGPD, explainability, auditoria |

---

## Limites (o que o Pulse NÃO faz)

- Não substitui decisão humana
- Não rotula colaboradores de forma definitiva
- Não altera pesos automaticamente
- Não recebe integrações dedicadas por módulo (pós CERT-05)
- Não cria novos tipos de campanha via desenvolvimento Pulse
- Não prevê o futuro — apenas histórico semelhante (memória)

---

## Entradas aceitas

### Via `eventIngestion.ingestHumanEvent(companyId, event)`

Campos mínimos: `event_type`, opcionalmente `user_id`, `operational_team_member_id`, `payload`, `event_source`.

Tipos monitorados (`constants.EVENT_TYPES`):

`tpm_recorded`, `proacao_submitted`, `intelligent_registration`, `training_completed`, `role_changed`, `sector_changed`, `hierarchy_changed`, `recognition`, `quality_event`, `sst_incident`, `near_miss`, `communication`, `os_completed`, `pulse_self_evaluation`, `pulse_supervisor_perception`, `reconciliation_scan`, entre outros documentados em CERT-02.

### Via ecossistema (CERT-03)

- Hooks diretos (`ecosystemHooks`) — fire-and-forget
- Middleware HTTP (`ecosystemMiddleware`) — rotas WRITE `/api/*`

**Regra pós CERT-05:** novos módulos devem usar **apenas** `eventIngestion` (ou hooks que delegam a ele).

---

## Eventos rejeitados / ignorados silenciosamente

- Eventos sem `company_id`
- Eventos com `IMPETUS_PULSE_COGNITIVE=off`
- Tipos desconhecidos são registrados mas podem não disparar recálculo sem sujeito
- Eventos que falham no hook **nunca** propagam erro ao módulo origem

---

## Saídas

| Saída | Consumidor |
|-------|------------|
| `pulse_cognitive_index` | Dashboard RH, APIs `/hr/*` |
| `pulse_cognitive_aggregate_index` | Visões por escopo |
| `pulse_cognitive_insights` | RH, calibração, memória |
| `pulse_organizational_memory` | Consulta histórica semelhante |
| Métricas `pulse_*` | `observabilityService` |
| Auditoria | `pulse_cognitive_audit_log` |

---

## Pontos de extensão permitidos

1. **`eventIngestion.ingestHumanEvent`** — adicionar novos `event_type` e processamento em `perceptionLayer` (sem alterar pesos)
2. **`ecosystemHooks` / middleware** — bridge para módulos legados (delega a ingestão)
3. **Memória organizacional** — registrar decisões humanas e outcomes (`POST /hr/memory/outcome`)
4. **Novos sinais externos** — Gêmeo Digital, ERP, MES, ESG → eventos normalizados

---

## Pontos de extensão proibidos

- Alterar pesos em `indexCalculator` / `constants.DIMENSIONS`
- Criar novos índices cognitivos paralelos
- Novas APIs em `/api/pulse/*` legado
- Novos dashboards operacionais específicos Pulse
- Integrações dedicadas bypassando `eventIngestion`

---

## Certificações aplicadas

| CERT | Escopo |
|------|--------|
| CERT-PULSE-02 | Arquitetura cognitiva |
| CERT-PULSE-03 | Integração ecossistema |
| CERT-PULSE-04 | Calibração e confiabilidade |
| CERT-PULSE-05 | Memória organizacional e encerramento |

---

## Fluxo de evolução futura

```
Novo módulo IMPETUS (ERP, MES, Gêmeo Digital, ESG…)
        ↓
  Normalização de evento
        ↓
  eventIngestion.ingestHumanEvent()
        ↓
  perceptionLayer → indexCalculator → stateEngine
        ↓
  organizationalMemory (consulta histórica)
        ↓
  RH / decisão humana
```

---

## Flags de ambiente

| Flag | Efeito |
|------|--------|
| `IMPETUS_PULSE_COGNITIVE=off` | Desliga hooks e ingestão |
| `IMPETUS_PULSE_SCHEDULER=off` | Desliga scheduler campanhas |
| `IMPETUS_PULSE_MEMORY=off` | Desliga captura de memória (consulta permanece) |

---

## Critérios de aceite (CERT-PULSE-05)

```json
{
  "legacy_preserved": true,
  "architecture_preserved": true,
  "pulse_completed": true,
  "organizational_memory_available": true,
  "historical_similarity_enabled": true,
  "recommendations_evidence_based": true,
  "event_ingestion_is_single_extension_point": true,
  "human_in_the_loop_preserved": true,
  "lgpd_preserved": true,
  "explainability_preserved": true,
  "no_new_business_modules": true,
  "no_new_indexes": true,
  "no_permission_changes": true,
  "no_api_breaking_changes": true,
  "regressions_detected": 0
}
```
