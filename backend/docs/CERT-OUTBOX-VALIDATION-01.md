# CERT-OUTBOX-VALIDATION-01 — Validação Operacional da Remediação de `sample_ingested`

**Data:** 2026-06-30  
**Tipo:** Validação Operacional / Certificação de Arquitetura  
**Prioridade:** Alta  
**Pré-requisitos:** [CERT-OUTBOX-FORENSICS-01](./CERT-OUTBOX-FORENSICS-01.md), [CERT-OUTBOX-DEPENDENCY-01](./CERT-OUTBOX-DEPENDENCY-01.md)  
**Status:** CERTIFICADO — mecanismo de validação implementado (modo `legacy` por defeito)

---

## Objetivo

Validar em produção, de forma **controlada, reversível e observável**, que `environment.telemetry.sample_ingested` pode deixar de alimentar o `industrial_event_outbox` **sem regressões** — antes de qualquer `CERT-OUTBOX-REMEDIATION-01`.

---

## Feature Flag

| Variável | Defeito | Valores |
|----------|---------|---------|
| `IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE` | **`legacy`** | `legacy` \| `shadow` \| `selective` \| `disabled` |

### Comportamento por modo

| Modo | Publica no Outbox? | Efeito |
|------|-------------------|--------|
| `legacy` | Sim (todos) | Comportamento atual |
| `shadow` | **Sim** (inalterado) | Conta eventos que *seriam* suprimidos em `disabled` |
| `selective` | Apenas exceções | breach, anomaly ≥0.5, áreas configuradas |
| `disabled` | **Não** | Apenas Timeseries |

### Modo selective — áreas opcionais

`IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_SELECTIVE_AREAS=utilities,emissions`

---

## Rollback imediato

```bash
IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE=legacy
pm2 restart impetus-backend --update-env
```

Sem alteração de código.

---

## Componentes implementados (100% aditivos)

| Componente | Ficheiro |
|------------|----------|
| Modos outbox | `environmentTelemetryOutboxMode.js` |
| Validação + métricas + detector | `validation/environmentTelemetryOutboxValidationService.js` |
| Scheduler comparação | `validation/environmentTelemetryOutboxValidationScheduler.js` |
| Integração ingest | `environmentTelemetryIngestService.js` |
| Monitor UI (aditivo) | `routes/environmentOperational.js` |
| API relatórios | `routes/environmentTelemetry.js` |

**Não alterados:** Event Backbone, Timeseries schema, Pulse, ANAM, Gêmeo, Event Retention, purge.

---

## Métricas (`observabilityService`)

- `telemetry_sample_outbox_published`
- `telemetry_sample_outbox_suppressed`
- `telemetry_sample_shadow_hits`
- `telemetry_sample_consumer_requests`
- `telemetry_sample_missing_dependency`
- `telemetry_sample_timeseries_reads`

---

## API de validação (aditiva)

| Endpoint | Descrição |
|----------|-----------|
| `GET /api/environment-telemetry/validation/outbox` | Relatório explainability |
| `GET /api/environment-telemetry/validation/outbox/projections` | Projeções + critérios segurança |
| `POST /api/environment-telemetry/validation/outbox/comparison` | Comparação Timeseries × Outbox |

---

## Detector de dependências ocultas

Regista em memória (últimos 200) qualquer acesso a `sample_ingested` via:

- `environmentOperational` (summary/list UI)
- Logs estruturados `TELEMETRY_SAMPLE_CONSUMER_ACCESS`

Se **nenhum acesso** no período → relatório declara explicitamente.

---

## Matriz de impacto

| Área | legacy | shadow | selective | disabled |
|------|--------|--------|-----------|----------|
| Timeseries | ✅ | ✅ | ✅ | ✅ |
| Outbox crescimento | Alto | Alto (métricas) | Médio | **Zero** |
| UI Environment KPIs | ✅ | ✅ | ✅ | ✅ |
| Cognitivos | ✅ | ✅ | ✅ | ✅ |
| Event Backbone | ✅ | ✅ | ✅ | ✅ |

---

## Matriz de riscos

| Risco | Mitigação |
|-------|-----------|
| Regressão oculta | Modo `shadow` antes de `disabled` |
| Perda de trilha | Timeseries + logs de validação |
| Rollback lento | Flag `legacy` + PM2 restart |
| Dependência UI | Monitor registra acessos bounded |

---

## Plano de validação recomendado

1. **Semana 1:** `shadow` — observar `telemetry_sample_shadow_hits` ≈ ingestões
2. **Semana 2:** `selective` — confirmar exceções publicadas
3. **Semana 3:** `disabled` em tenant piloto (se aplicável)
4. **Aprovação:** critérios FASE 7 satisfeitos → `CERT-OUTBOX-REMEDIATION-01`

---

## Critérios de segurança (FASE 7)

| Critério | Verificação |
|----------|-------------|
| Nenhuma dependência funcional | `consumer_requests` + dependency_hits |
| Timeseries íntegra | `comparison.ok` |
| Sem regressão cognitiva | Nenhum módulo cognitivo instrumentado = sem impacto |
| Backbone preservado | Outros eventos inalterados |
| Observabilidade | Métricas + logs estruturados |

Endpoint: `GET /validation/outbox/projections` → `safety.ready_for_remediation_cert`

---

## Projeções (modo disabled simulado)

| Métrica | Valor estimado |
|---------|----------------|
| Eventos/dia evitados no outbox | ~414.000 |
| Disco/dia poupado | ~0,48 GB |
| Disco/ano poupado | ~175 GB |
| Redução archive/enforce | ~99,9% |

Fonte: baseline CERT-OUTBOX-FORENSICS-01.

---

## Testes

```bash
cd backend && node src/tests/test-outbox-validation.js
```

**Resultado:** 10/10 ✅ (2026-06-30)

---

## Critérios de aceite (respostas objetivas)

| Pergunta | Estado inicial |
|----------|----------------|
| Modo shadow sem regressões? | ✅ Implementado — ativar via flag |
| Consumidor oculto identificado? | Monitor ativo; aguarda período observação |
| Timeseries fonte única? | ✅ Por design; comparação contínua |
| Queda crescimento outbox? | Mensurável em `disabled` |
| Seguro para REMEDIATION-01? | Após período shadow + critérios safety |

---

## Scheduler

| Variável | Defeito |
|----------|---------|
| `IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_VALIDATION_SCHEDULER` | `on` |
| `IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_VALIDATION_INTERVAL_MS` | `3600000` (1h) |
| `IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_VALIDATION_BOOT_DELAY_MS` | `180000` |

Boot: `server.js` (9,5s após start).

---

## Próximo passo

Após período de observação em `shadow` → avaliar `disabled` → somente então **`CERT-OUTBOX-REMEDIATION-01`**.

---

## Status Atual

**Status:** IMPLEMENTADO — AGUARDANDO VALIDAÇÃO OPERACIONAL

- Mecanismo de validação (`IMPETUS_ENVIRONMENT_TELEMETRY_OUTBOX_MODE`) **implementado**; defeito permanece `legacy`.
- Arquitetura, governança, observabilidade e explainability do componente **concluídas**.
- Validação operacional em produção (modos `shadow`, `selective`, `disabled`) **pendente**.
- **Nenhuma remediação definitiva iniciada**.
- Próxima certificação prevista: **CERT-OUTBOX-REMEDIATION-01** (condicionada à validação operacional).
