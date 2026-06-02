# Operational Snapshot Trace Report (Fase 38-C)

**Data:** 2026-06-01  
**Serviço:** `backend/src/services/softwareOperationalSnapshotService.js`  
**Modo:** READ-ONLY

---

## Papel do serviço

Fornece **snapshots por domínio** (telemetria, manutenção, produção, etc.) filtrados por RBAC, formatados para:

- Smart Panel (`hydrate`)
- Claude Panel (`buildSystemPrompt`)
- Voz Realtime / Anam (`voiceRealtimeContextService.buildVoiceRealtimeContext`)

**Não alimenta** `metrics.data_state` do `dashboardContextualPack`.

---

## Fontes por domínio

| domainId | Função fetch | Tabelas / serviços |
|----------|--------------|-------------------|
| **telemetria** | `fetchPlcTelemetry` | `plc_collected_data` (DISTINCT equipment_id 24h), `plc_analysis` (anomalias 24h) |
| manutencao | `fetchMaintenanceSnapshot` | `dashboardMaintenanceService.getCards` |
| proaction | `fetchProposalsSnapshot` | `proposals` |
| chat | `fetchChatSnapshot` | `impetusChatOperationalContextService` |
| comunicacoes | `fetchCommunicationsSnapshot` | `communications` |
| producao, qualidade, ambiente, rh, financeiro | KPI agregado | `dashboardKPIs.getDashboardSummary` |

---

## Telemetria — o snapshot **não** está vazio

Para tenant find fish (auditoria):

```text
Equipamentos com leitura (24h): ≥ 1  (LAB-EQ-001 activo)
Anomalias PLC (24h): conforme plc_analysis
```

Código (`fetchPlcTelemetry`, linhas 189–217):

```sql
SELECT COUNT(DISTINCT equipment_id) FROM plc_collected_data
WHERE company_id = $1 AND collected_at > now() - INTERVAL '24 hours'
```

**Resposta à pergunta F38-C:** se `plc_collected_data > 0`, o snapshot de telemetria **não** está vazio — contém contagem de equipamentos e anomalias.

---

## Por que a IA do dashboard chat diz “vazio”?

| Pipeline | Usa snapshot PLC? |
|----------|-------------------|
| Dashboard `POST /chat` | **Não** chama `buildSnapshotsForQuery` |
| Dashboard chat | Usa `retrieveContextualData` → `metrics.data_state` + `buildNoDataPrompt` |
| Smart Panel / Claude / Voz | **Sim** chama snapshot |

**GAP de integração:** dois pipelines paralelos:

1. **Context pack cognitivo** — registry MES (`machines`) → `tenant_empty`
2. **Snapshot software** — PLC directo → dados reais **não injectados** no chat principal

---

## Regras de disponibilidade no snapshot

- `userCanAccessDomain` — módulos + permissões (`dashboardAccessService`)
- `inferDomainsFromText` — keywords (OEE → domínio `producao`, telemetria → `telemetria`)
- Domínios sem permissão → `permitted: false` + `denialReason`

Não há regra “se PLC > 0 então override tenant_empty”.

---

## Dependências identificadas

| Dependência | Afecta snapshot? | Afecta data_state chat? |
|-------------|------------------|-------------------------|
| Cadastro `machine_monitoring_config` | Indirectamente (manutenção cards) | **Sim** (via machines[]) |
| MES / production orders | Via KPI summary | Não directamente |
| PLC raw | **Snapshot telemetria OK** | **Ignorado no chat** |
| Eventos `findRecentEvents` | N/A snapshot | **Sim** (classifyDataState) |

---

## Filtros incorretos?

Não foi encontrado filtro SQL errado em `fetchPlcTelemetry` para o tenant piloto.

O problema **não** é snapshot vazio — é **snapshot não ligado** ao ramo `tenant_empty` do dashboard chat.

---

## Veredito 38-C

| Afirmação | Verdade |
|-----------|---------|
| Snapshot ignora PLC | **Falso** — domínio telemetria lê PLC |
| Snapshot global vazio com PLC>0 | **Falso** para domínio telemetria |
| Chat ignora snapshot | **Verdade** |
| Dependência cadastro MES para narrativa chat | **Verdade** |

**Classificação:** **INTEGRATION GAP** (HIGH), não bug de query no snapshot service.
