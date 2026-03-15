# Arquitetura Indústria 4.0 (IMPETUS)

**Data:** 2026-03  
**Princípio:** Implementação aditiva. Design atual preservado. Nenhuma alteração em componentes existentes.

---

## Resumo do Estado Atual

| Área | Status | Componentes |
|------|--------|-------------|
| **Integração PLC real** | ✅ Implementado | plcCollector, adapterFactory, modbusAdapter, opcuaAdapter, restAdapter, machine_monitoring_config |
| **MES/ERP** | ✅ Implementado | mesErpIntegrationService, integration_connectors, mes_erp_sync_log |
| **Digital Twin** | ✅ Implementado | digitalTwinService, plant_layout_config, digital_twin_machine_states |
| **Produção tempo real** | ✅ Implementado | productionRealtimeService, production_shift_data, production_line_metrics, dashboardKPIs |
| **Edge Computing** | ✅ Implementado | edgeIngestService, edge_agents, POST /api/integrations/edge/ingest |
| **Machine Brain** | ✅ Implementado | machineBrainService.listProfiles (mapa, Digital Twin, offline) |

---

## 1. Integração PLC Real

### Fluxo
- `plcCollector.runCollectorCycle` carrega equipamentos de `machine_monitoring_config` (ou lista padrão)
- Para cada equipamento: chama `adapterFactory.read(config)` (Modbus/OPC UA/REST)
- Se adapter retornar dados válidos → usa; senão → simulação

### Tabela machine_monitoring_config
| Coluna | Tipo | Descrição |
|--------|------|-----------|
| company_id | UUID | Empresa |
| machine_identifier | TEXT | ID único do equipamento |
| machine_name | TEXT | Nome amigável |
| line_name | TEXT | Linha de produção (opcional) |
| data_source_type | TEXT | `simulated`, `modbus_tcp`, `modbus_rtu`, `opc_ua`, `rest` |
| data_source_config | JSONB | Parâmetros de conexão |
| collection_interval_sec | INT | Intervalo de coleta (default 5) |
| enabled | BOOLEAN | Ativo para coleta |

### data_source_config (exemplos)
```json
// Modbus TCP
{ "host": "192.168.1.10", "port": 502, "slaveId": 1, "registers": { "temperature": 1000, "vibration": 1002 } }

// OPC UA
{ "endpoint": "opc.tcp://192.168.1.10:4840", "nodeIds": { "temperature": "ns=2;s=Temp", "vibration": "ns=2;s=Vib" } }

// REST (gateway)
{ "url": "http://gateway.local/api/equipment/EQ-001", "method": "GET" }
```

---

## 2. MES/ERP

- **POST** `/api/integrations/mes-erp/push` — MES/ERP envia dados (webhook)
- **GET** `/api/integrations/mes-erp/connectors` — lista conexões
- **POST** `/api/integrations/mes-erp/connectors` — cadastra conexão (admin)
- Tabelas: `integration_connectors`, `mes_erp_sync_log`, `production_shift_data`

---

## 3. Digital Twin

- **GET** `/api/integrations/digital-twin/state` — Estado (mapa + layout + cached_states)
- **PUT** `/api/integrations/digital-twin/layout` — Salva layout (admin)
- Tabelas: `plant_layout_config`, `digital_twin_machine_states`

---

## 4. Produção em Tempo Real

- **POST** `/api/integrations/production/shift` — Registro manual
- **GET** `/api/integrations/production/shift` — Consulta por data/linha
- KPIs no dashboard: produção do turno, meta realizado, eficiência por linha
- Tabelas: `production_shift_data`, `production_line_metrics`

---

## 5. Edge Computing

- **POST** `/api/integrations/edge/ingest` — Edge envia leituras em batch
- **POST** `/api/integrations/edge/register` — Registra edge agent e gera token (admin)
- Autenticação: token validado contra `edge_agents.token_hash` quando registrado
- Ver `docs/EDGE_AUTENTICACAO.md`

---

## Migrations

```bash
cd backend
npm run migrate
```

Arquivos em `backend/src/models/`: `lacunas_ind4_migration.sql` e demais migrations.

---

## Montagem das Rotas

O router de integrações deve ser montado no app Express:

```javascript
app.use('/api/integrations', require('./routes/integrations'));
```

Ver `docs/ROTAS_REGISTRO.md` para detalhes.
