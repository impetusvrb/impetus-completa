# ADR-005 — Event Backbone como Núcleo Permanente

**Status:** Aceite  
**Data:** 2026-06-30  
**Certificação:** CERT-ONPREM-ARCHITECTURE-01  
**Relacionado:** ADR-001, ADR-004

---

## Contexto

O Event Backbone industrial (WAVE 1+2) e o outbox AIOI implementam publicação, retenção, archive e lifecycle de eventos operacionais em PostgreSQL nativo — sem Kafka, RabbitMQ ou Redis obrigatório. Pulse Cognitivo estende-se via `eventIngestion`. A auditoria forense confirmou soberania on-prem do backbone.

---

## Problema

Deve o Event Backbone ser simplificado, desactivado ou substituído em Enterprise On-Premise para reduzir complexidade?

---

## Decisão

**Manter Event Backbone como núcleo permanente** da arquitectura Enterprise:

- Outbox PostgreSQL (`industrial_event_outbox`, `aioi_outbox`)
- Retention lifecycle (modo shadow default; purge nunca automático)
- Archive e schedulers internos ao processo Node/PM2
- Particionamento por `company_id` preservado
- Flags conservadoras recomendadas no runbook Enterprise (shadow → on gradual)

---

## Consequências

### Positivas

- Pulse, AIOI, domínios operacionais e workflow continuam integrados
- Sem dependência de message broker externo
- DR e backup unificados com PostgreSQL

### Negativas

- Schedulers single-instance (não cluster-aware sem trabalho futuro)
- Produção SaaS actual com backbone `on` — runbook Enterprise deve documentar flags

### Recomendação INFRA-01

- Default Enterprise: `IMPETUS_INDUSTRIAL_BACKBONE_MODE=shadow` até validação
- Prometheus opcional para observabilidade de outbox

---

## Alternativas descartadas

| Alternativa | Motivo da rejeição |
|-------------|-------------------|
| Desactivar backbone em Enterprise | Quebra integração Pulse/AIOI/workflow |
| Migrar para Kafka/Rabbit | Dependência infra extra; contrário a P0 AIOI |
| Redis como bus | Não implementado; plano futuro apenas |
| Eventos só in-process | Perde durabilidade e audit trail |

---

## Referências

- `backend/src/eventPipeline/`
- `backend/migrations/aioi_outbox_foundation_migration.sql`
- `backend/docs/EVENT_BACKBONE_RETENTION_POLICY.md`
- CERT-ONPREM-FORENSICS-01, Parte 6
