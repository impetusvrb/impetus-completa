# EVENT_BACKBONE_RETENTION_POLICY — Política de Ciclo de Vida

**Certificado:** CERT-EVENT-RETENTION-01  
**Versão:** 1.0.0  
**Escopo:** Event Backbone Industrial do IMPETUS

---

## 1. Filosofia

O Backbone de Eventos é infraestrutura cognitiva central. **Nenhum evento é “esquecido”** — cada registo percorre um ciclo de vida auditável:

```
Evento criado (ACTIVE)
        ↓
Evento consolidado (CONSOLIDATED) — quando aplicável
        ↓
Evento arquivado (ARCHIVED)
        ↓
Evento histórico (HISTORICAL)
        ↓
Elegível a expurgo (PURGE_ELIGIBLE) — somente com flag explícita
        ↓
Expurgo seguro (PURGED) — nunca automático
```

Implementação **100% aditiva**: contratos, APIs e consumidores existentes permanecem inalterados.

---

## 2. Categorias de eventos

| Categoria | Exemplos | Política ID |
|-----------|----------|-------------|
| `operational_telemetry` | PLC, sensores, telemetria | `policy_operational_telemetry` |
| `operational_industrial` | MES, ERP, TPM, qualidade | `policy_operational_industrial` |
| `human_pulse` | Pulse, RH, Pró-Ação, treinamentos | `policy_human_pulse` |
| `cognitive` | Controller, ANAM, insights | `policy_cognitive` |
| `audit_compliance` | Auditoria, LGPD, governança | `policy_audit_compliance` |
| `workflow_outbox` | Outbox, DLQ, workflow | `policy_workflow_outbox` |

Classificação automática: `eventBackboneCategoryRegistry.js` (`classifyEvent`).

---

## 3. Políticas de retenção (configurável)

Tabela: `event_backbone_retention_policy`

| Categoria | Ativo (dias) | Arquivo (dias) | Histórico (dias) | Expurgo | LGPD |
|-----------|--------------|----------------|------------------|---------|------|
| Telemetria | 90 | 365 | 1825 | ❌ | — |
| Industrial | 365 | 1825 | — | ❌ | — |
| Human/Pulse | 365 | 1825 | — | ❌ | Anonimizar |
| Cognitivo | 180 | 730 | 1825 | ❌ | — |
| Auditoria | 0 | 0 | — | ❌ | Preservação permanente |
| Outbox | 14 | 365 | 1825 | ❌ | — |

**Auditoria / compliance:** nunca expurgar — apenas arquivar.

**Expurgo:** requer `IMPETUS_EVENT_RETENTION_ALLOW_PURGE=true` e estado `PURGE_ELIGIBLE`. Nunca automático por defeito.

---

## 4. Estados do ciclo de vida

Definidos em `eventLifecycleStates.js`:

- `ACTIVE` — consultas operacionais (outbox)
- `CONSOLIDATED` — agregação pré-arquivo
- `ARCHIVED` — camada de arquivo (fora de hot path)
- `HISTORICAL` — consultas históricas / casos semelhantes
- `PURGE_ELIGIBLE` — candidato a expurgo governado
- `PURGED` — terminal (somente após processo auditável)

Toda transição gera registo em `event_backbone_lifecycle_audit` com `trace_id`.

---

## 5. Serviços

| Serviço | Ficheiro | Responsabilidade |
|---------|----------|------------------|
| Event Archive Service | `eventArchiveService.js` | Arquivar, consultar, restaurar metadados, compressão, integridade |
| Event Retention Engine | `eventRetentionEngine.js` | Elegibilidade, políticas, transições, auditoria |
| Event Retention Scheduler | `eventRetentionScheduler.js` | Execução periódica (diária), relatório, observabilidade |
| Explainability | `eventRetentionExplainability.js` | Origem, estado, política, integridade para eventos arquivados |
| Category Registry | `eventBackboneCategoryRegistry.js` | Classificação por domain/event_name |
| Lifecycle States | `eventLifecycleStates.js` | Grafo de transições canónicas |

Camada existente preservada: `industrialArchiveService.js`, `industrialBackboneScheduler.js`.

---

## 6. Arquivamento e compressão

- Eventos arquivados **não participam** de consultas operacionais por defeito.
- Disponíveis via rotas internas `/retention/archive/*` para auditoria e investigação.
- Compressão gzip transparente em `compressed_payload` — envelope e `integrity_checksum` preservados.

---

## 7. Índices históricos

Migration adiciona:

- `idx_industrial_archive_lifecycle_state`
- `idx_industrial_archive_category_historical`
- `idx_industrial_outbox_lifecycle_active`
- `idx_eb_lifecycle_audit_*`

---

## 8. Scheduler

| Variável | Defeito | Descrição |
|----------|---------|-----------|
| `IMPETUS_EVENT_RETENTION_SCHEDULER` | `shadow` | `shadow` / `active` / `off` |
| `IMPETUS_EVENT_RETENTION_ENGINE` | `shadow` | Motor de retenção |
| `IMPETUS_EVENT_RETENTION_MODE` | `shadow` | Transições reais vs simuladas |
| `IMPETUS_EVENT_RETENTION_ALLOW_PURGE` | `false` | Permite marcar PURGE_ELIGIBLE |
| `IMPETUS_EVENT_RETENTION_INTERVAL_MS` | `86400000` | Intervalo (24h) |
| `IMPETUS_EVENT_RETENTION_BOOT_DELAY_MS` | `120000` | Atraso pós-boot |

Boot: `server.js` (9s após backbone industrial).

---

## 9. Rotas internas (aditivas)

Prefixo: `/api/internal/industrial-event-backbone`

- `GET /retention/policies`
- `GET /retention/diagnostics`
- `GET /retention/archive/query`
- `GET /retention/archive/:id/explain`
- `GET /retention/archive/:id/integrity`
- `POST /retention/run`
- `POST /retention/archive/run`
- `POST /retention/archive/:id/restore`
- `POST /retention/compress`

---

## 10. Observabilidade

Métricas em `observabilityService.js`:

- `event_active`, `event_archived`
- `event_retention_processed`, `event_retention_failed`
- `event_archive_size`, `event_retention_duration`
- `event_purge_candidates`, `event_restore_requests`

---

## 11. LGPD

- Categoria `human_pulse`: flag `lgpd_anonymize_before_archive` na política.
- Dados de auditoria/compliance: preservação permanente — sem expurgo automático.
- Anonimização não compromete trilhas de auditoria obrigatórias (Art. 37 LGPD).

---

## 12. Compatibilidade

Nenhum módulo consumidor alterado estruturalmente:

Pulse Cognitivo, Gêmeo Digital, ANAM, Conversation Context, Controller Cognitivo, Dashboard, Executive Boardroom, Mapping Industrial, ManuIA, Pró-Ação, TPM, Registro Inteligente, ERP/MES.

Continuam a consumir eventos via outbox/ingestion existentes.

---

## 13. Testes

```bash
node src/tests/test-event-retention.js
```

Valida: estados, classificação, checksum, scheduler, engine shadow, diagnósticos, explainability.

---

## 14. Migration

`migrations/event_backbone_retention_lifecycle_migration.sql`

---

## Estado atual do componente (contrato arquitetural)

| Dimensão | Estado |
|----------|--------|
| Núcleo arquitetural Event Backbone | Concluído |
| Governança (políticas, categorias, estados) | Concluída |
| Observabilidade (métricas retenção) | Concluída |
| Explainability (archive / lifecycle) | Concluída |
| Política de retenção (CERT-EVENT-RETENTION-01) | Implementada |
| Outbox Telemetry Validation | **Implementado — aguardando validação operacional** |
| Remediação Outbox (`sample_ingested`) | **Não autorizada** até encerramento da validação |

> Nenhuma remediação definitiva do outbox deve ser iniciada antes da conclusão da validação operacional documentada em **CERT-OUTBOX-VALIDATION-01**.
