# EVENT-GOVERNANCE-09 — Auditoria DSR/LGPD

**Data:** 2026-06-20  
**Objectivo:** mapear produtores DSR antes da migração para Event Governance  
**Escopo:** distribuição de notificações apenas — workflow/SLA/LGPD inalterados

---

## Resumo

| Campo | Valor |
|-------|-------|
| Produtor principal | `dsrNotificationService.js` |
| Rotas consumidoras | `routes/lgpd.js` |
| Tabela destino | `notifications` |
| Federação | NC-04 (`notificationFederationService`) |
| Política Governance | `DSR_LIFECYCLE` |

```json
{
  "events_mapped": true,
  "notifications_identified": true,
  "migration_safe": true
}
```

---

## Produtores identificados

| Serviço | Função | Papel |
|---------|--------|-------|
| `dsrNotificationService.js` | `notify()` | INSERT em `notifications` — titular ou admin |
| `dsrNotificationService.js` | `notifyDpoTeam()` | Loop admins `hierarchy_level <= 1` → `notify()` |
| `dsrNotificationService.js` | `scanSlaApproaching()` | Scanner SLA D-3 → `notify()` + `notifyDpoTeam()` |
| `dsrNotificationService.js` | `startSlaScheduler()` | Intervalo 6h (server.js) |

**Não são produtores de distribuição (fora de escopo EG-09):**

| Serviço | Motivo |
|---------|--------|
| `dsrExportService.js` | Exportação de dados — sem notificação directa |
| `dsrEraseService.js` | Apagamento — sem notificação directa |

---

## Pontos de integração em `lgpd.js`

| Rota / acção | Tipo notificação | Destinatário |
|--------------|------------------|--------------|
| POST export submit | `EXPORT_SUBMITTED` | Titular + DPO team |
| POST export approve | `EXPORT_APPROVED` | Titular |
| POST export execute | `EXPORT_EXECUTED` | Titular |
| POST export reject | `EXPORT_REJECTED` | Titular |
| POST erase submit | `ERASE_SUBMITTED` | Titular + DPO team |
| POST erase approve | `ERASE_APPROVED` | Titular |
| POST erase execute | `ERASE_EXECUTED` | Titular |
| POST erase reject | `ERASE_REJECTED` | Titular |

---

## Eventos → Lifecycle Governance

| Fase Governance | Tipos DSR | Severidade típica | Escalation |
|-----------------|-----------|-------------------|------------|
| `REQUEST_CREATED` | export/erase submitted | medium–high | 1 |
| `REQUEST_ASSIGNED` | export/erase approved | high | 2 |
| `REQUEST_DUE_SOON` | sla_approaching | critical | 3 |
| `REQUEST_COMPLETED` | export/erase executed | high–critical | 1 |
| `REQUEST_REJECTED` | export/erase rejected | high | 2 |
| `REQUEST_ESCALATED` | (reservado DPO crítico) | critical | 3 |

Política única: **`DSR_LIFECYCLE`**

---

## Canais actuais

| Canal | Implementação | Federação |
|-------|---------------|-----------|
| `notifications_table` | INSERT directo em `notifications` | NC-04 source `notifications` |
| `notification_center` | Alias lógico — mesma persistência | Lido via federation |

**Nota:** DSR não usa `unifiedMessagingService` directamente. A federação NC-04 lê a tabela `notifications`; a migração **deve** manter INSERT na mesma tabela.

---

## Destinatários

| Perfil | Resolução |
|--------|-----------|
| Titular | `userId` do pedido LGPD |
| DPO / admins | `users WHERE hierarchy_level <= 1 AND active` |
| SLA titular | `lgpd_data_requests.user_id` |
| SLA DPO | `notifyDpoTeam()` |

---

## Tabelas envolvidas (read-only na migração)

| Tabela | Papel |
|--------|-------|
| `notifications` | Destino de todas as notificações DSR |
| `lgpd_data_requests` | SLA scanner — dedupe idempotente |
| `users` | Resolução DPO/admins |

**Schema `notifications` — não alterado.**

---

## Integração NC-04 Federation

- Fonte: `notificationFederationService.FEDERATION_SOURCES` inclui `'notifications'`
- Mapper: `mapRowToDto('notifications', row)` — DSR/LGPD
- Endpoint audit: `GET /api/audit/notification-center/federation`

**Garantia EG-09:** execução governance continua a persistir em `notifications` via `runLegacyDistribution()`.

---

## SLA / Workflow (inalterados)

| Componente | Ficheiro | EG-09 |
|------------|----------|-------|
| Workflow estados | `lgpd.js` + serviços DSR | ❌ não alterado |
| SLA deadline | `lgpd_data_requests.deadline` | ❌ não alterado |
| Scanner D-3 | `scanSlaApproaching()` | ❌ lógica inalterada |
| Scheduler 6h | `startSlaScheduler()` | ❌ não alterado |
| Retention | `retentionPolicyRegistry` | ❌ não alterado |

---

## Riscos e mitigação

| Risco | Mitigação |
|-------|-----------|
| Federation deixa de ver DSR | Persistência mantida em `notifications` |
| Perda notificação regulatória | Fallback obrigatório para `runLegacyDistribution` |
| Alteração acidental workflow | Integração só em `notify()` |
| Shadow divergência | Métricas `event_governance_dsr_shadow_*` |

---

## Conclusão de migração

A migração é **segura** porque:

1. Um único ponto de distribuição (`notify()`)
2. `notifyDpoTeam()` e `scanSlaApproaching()` delegam a `notify()`
3. Federação depende da tabela `notifications` — preservada
4. Shadow mode default (`EVENT_GOVERNANCE_DSR=false`)

---

## Referências

- `backend/src/services/dsrNotificationService.js`
- `backend/src/routes/lgpd.js`
- `backend/src/services/notificationFederationService.js`
- `backend/docs/NC_04_FEDERATION_REPORT.md`
- `backend/src/governance/eventPolicyCatalog.js` → `DSR_LIFECYCLE`
