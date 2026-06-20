# NC-04-FEDERATION — Relatório de Implementação

**Data:** 2026-06-20  
**Origem:** AUD-NOTIFICATION-CENTER-01 · NC-02-FIX · NC-03-BRIDGE · BILLING-NOTIF-02  
**Modo:** implementação aditiva — federação **read-only**  
**Escopo:** visão unificada sem migrar tabelas, schemas ou dados

---

## Resumo executivo

O Notification Center passou a oferecer uma **camada de federação de leitura** que agrega eventos de cinco fontes existentes num DTO canónico, exposta via API e **Unified Feed** no frontend — mantendo o feed original (`app_notifications`) como default.

| Critério | Estado |
|----------|--------|
| Federação read-only | **Sim** — apenas SELECT |
| Schema / dados alterados | **Não** |
| Feed actual preservado | **Sim** (tab "Centro") |
| Unified Feed | **Sim** (tab + filtros) |
| Testes | **15/15** |

```json
{
  "notification_federation_complete": true,
  "single_user_view_available": true,
  "source_systems_preserved": true,
  "no_schema_changes": true,
  "no_data_migration": true,
  "safe_for_production": true
}
```

---

## Problema resolvido

Múltiplos sistemas de notificação coexistiam sem visão unificada:

| Fonte | Módulo |
|-------|--------|
| `app_notifications` | Notification Center / unifiedMessaging |
| `operational_alerts` | Quality, SST, ESG, operacional |
| `notifications` | DSR / LGPD |
| `manuia_inbox_notifications` | ManuIA |
| `alerts` | TPM / insights |

**Solução:** `notificationFederationService.getUnifiedNotifications()` — merge em memória, tenant-scoped, sem ETL.

---

## Arquitectura

```text
┌─────────────────────────────────────────────────────────┐
│              GET /app-communications/unified-notifications │
└────────────────────────────┬────────────────────────────┘
                             │
              notificationFederationService
                             │
     ┌───────────┬───────────┼───────────┬───────────┐
     ▼           ▼           ▼           ▼           ▼
 app_notif   operational   notif.    manuia_inbox   alerts
             _alerts       (DSR)
                             │
                    merge + sort + filter + paginate
                             │
                    Canonical Notification DTO
                             │
              Layout.jsx → Unified Feed (opcional)
```

Feed **Centro** (default) continua a usar `GET /notifications` inalterado.

---

## DTO canónico

```json
{
  "id": "operational_alerts:uuid",
  "source": "operational_alerts",
  "title": "Parada linha",
  "message": "Equipamento offline",
  "severity": "high",
  "created_at": "2026-06-20T10:00:00.000Z",
  "read": false,
  "origin_module": "operacional",
  "deep_link": "/app/centro-operacoes-industrial",
  "raw_id": "uuid"
}
```

**`origin_module` inferido:**

| Fonte | Módulo default | Regras especiais |
|-------|----------------|------------------|
| `app_notifications` | `sistema` | `billing` se texto inadimplência/assinatura |
| `operational_alerts` | `operacional` | `tpm` se tipo contém tpm/perdas |
| `alerts` | `operacional` | `tpm` idem |
| `notifications` | `dsr` | — |
| `manuia_inbox_notifications` | `manuia` | — |

---

## API

**Endpoint:** `GET /api/app-communications/unified-notifications`  
**Auth:** `requireAuth` + `requireCompanyActive`

| Parâmetro | Descrição |
|-----------|-----------|
| `limit` | 1–50 (default 20) |
| `offset` | Paginação |
| `source` | Filtro por tabela origem |
| `severity` | Filtro severidade normalizada |
| `unread` | `true` — só não lidas |
| `category` | `sistema` \| `operacional` \| `billing` \| `manuia` \| `dsr` \| `tpm` |

**Resposta:**

```json
{
  "ok": true,
  "notifications": [],
  "total": 0,
  "limit": 20,
  "offset": 0,
  "federation_enabled": true
}
```

---

## Frontend

**Hook:** `useNotificationCenter.js` expandido (backward compatible)

- **`feedMode`:** `default` | `unified`
- **`categoryFilter`:** chips Todas / Sistema / Operacional / Billing / ManuIA / DSR / TPM
- Feed default inalterado; Unified Feed opcional via tab

**Layout.jsx:** tabs "Centro" + "Unified Feed", filtros, título + origem por item.

Mark-read unificado: apenas itens `source=app_notifications` delegam ao endpoint existente (read-only para outras fontes).

---

## Observabilidade

Métricas em `observabilityService`:

| Métrica | Uso |
|---------|-----|
| `notification_federation_queries` | Chamadas à federação |
| `notification_federation_results` | Itens devolvidos |
| `notification_federation_latency_ms` | Latência acumulada |

---

## Auditoria

**Endpoint:** `GET /api/audit/notification-center/federation`  
**Auth:** `requireAuth` + `requireTenantAdminRole`

```json
{
  "ok": true,
  "federation_enabled": true,
  "sources": ["operational_alerts", "notifications", "manuia_inbox_notifications", "alerts"],
  "total_items": 0
}
```

*Nota: `sources` lista apenas tabelas existentes na BD (detecção via `information_schema`).*

---

## Feature flag

```env
NC_04_FEDERATION_ENABLED=true   # default — desligar com false
```

Registada em `featureGovernanceService.js`.

---

## Artefactos

| Ficheiro | Tipo |
|----------|------|
| `backend/src/services/notificationFederationService.js` | **Novo** |
| `backend/src/routes/appCommunications.js` | Rota unified-notifications |
| `backend/src/routes/audit.js` | Rota federation audit |
| `backend/src/services/observabilityService.js` | Métricas |
| `frontend/src/hooks/useNotificationCenter.js` | Unified Feed |
| `frontend/src/components/Layout.jsx` | UI tabs + filtros |
| `frontend/src/services/api.js` | Cliente API |
| `backend/src/tests/audit/NC_04_FEDERATION.test.js` | 15 testes |

## Não alterado

- Schemas de BD, migrations, ETL  
- `notificationCenterService.js` (feed default)  
- ManuIA Inbox, DSR, Billing, Operational Alerts (produtores)  
- NC-03 bridges  

---

## Testes

```bash
node backend/src/tests/audit/NC_04_FEDERATION.test.js
```

**Resultado:** `{ "passed": 15, "failed": 0 }`

---

## Evolução futura (fora de escopo)

- Mark-read federado por fonte (delegação a endpoints existentes de cada módulo)  
- Inclusão read-only de `ai_proactive_alerts` quando schema estável  
- Badge unificado com contagem federada unread  

---

## Documentos relacionados

- [AUD_NOTIFICATION_CENTER_01_REPORT.md](./AUD_NOTIFICATION_CENTER_01_REPORT.md)
- [AUD_NOTIFICATION_CENTER_02_FIX_REPORT.md](./AUD_NOTIFICATION_CENTER_02_FIX_REPORT.md)
- [NC_03_BRIDGE_REPORT.md](./NC_03_BRIDGE_REPORT.md)
- [BILLING_NOTIF_02_REPORT.md](./BILLING_NOTIF_02_REPORT.md)
