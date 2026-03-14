# Arquitetura - Lacunas Indústria 4.0 (IMPETUS)

**Data:** 2026-03  
**Princípio:** Implementação aditiva. Design atual preservado. Nenhuma alteração em componentes existentes.

---

## 1. Integração PLC Real (Modbus / OPC UA)

### Arquitetura

```
machine_monitoring_config.data_source_type  →  plcAdapterFactory  →  [modbus | opc_ua | rest_api | simulated]
machine_monitoring_config.data_source_config →  Parâmetros de conexão (host, port, slave_id, nodeId, etc.)
```

### Componentes Novos (não alteram existentes)

| Componente | Responsabilidade |
|------------|------------------|
| `plcAdapters/modbusAdapter.js` | Leitura Modbus TCP/RTU (pacote opcional: `modbus-serial`) |
| `plcAdapters/opcuaAdapter.js` | Leitura OPC UA (pacote opcional: `node-opcua`) |
| `plcAdapters/restApiAdapter.js` | Requisição HTTP para gateway REST (sem deps extras) |
| `plcAdapters/adapterFactory.js` | Retorna adapter conforme `data_source_type`; fallback para simulação |

### Fluxo

- `plcCollector.runCollectorCycle` carrega equipamentos de `machine_monitoring_config` (ou lista padrão)
- Para cada equipamento: chama `adapterFactory.read(config)` (Modbus/OPC UA/REST)
- Se adapter retornar dados válidos → usa; senão → `simulatePLCRead` (fallback, comportamento atual)
- Pacotes Modbus/OPC UA: `optionalDependencies` — se não instalados, adapters retornam `null`

### Tabela machine_monitoring_config (lacunas_ind4_migration.sql)

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
{ "protocol": "modbus_tcp", "host": "192.168.1.10", "port": 502, "slaveId": 1, "registers": { "temperature": 1000, "vibration": 1002 } }

// OPC UA
{ "protocol": "opc_ua", "endpoint": "opc.tcp://192.168.1.10:4840", "nodeIds": { "temperature": "ns=2;s=Temp", "vibration": "ns=2;s=Vib" } }

// REST (gateway que expõe JSON)
{ "protocol": "rest", "url": "http://gateway.local/api/equipment/EQ-001", "method": "GET" }
```

---

## 2. MES/ERP Integration Layer

### Arquitetura

```
MES/ERP  ←→  API /api/integrations/mes-erp  ←→  mesErpIntegrationService  ←→  mes_erp_sync_log, production_shift_data
```

### Tabelas Novas

- `integration_connectors` — cadastro de conexões (tipo, URL, credenciais criptografadas)
- `mes_erp_sync_log` — log de sincronizações
- `production_shift_data` — produção por turno (usado também por KPIs em tempo real)

### Rotas Novas

- `POST /api/integrations/mes-erp/push` — MES/ERP envia dados (webhook)
- `GET /api/integrations/mes-erp/connectors` — lista conexões (admin)
- `POST /api/integrations/mes-erp/connectors` — cadastra conexão

### Segurança

- Token/API Key por connector
- Rate limit
- Auditoria em `mes_erp_sync_log`

---

## 3. Digital Twin / Planta Digital

### Arquitetura

```
digitalTwinService  ←→  plant_layout_config, digital_twin_machine_states
                    ←  industrialOperationalMapService (dados existentes)
```

### Tabelas Novas

- `plant_layout_config` — layout da planta (linhas, posições, imagem/SVG opcional)
- `digital_twin_machine_states` — estado atual por máquina (cache para twin)

### Serviço

- `digitalTwinService.getTwinState(companyId)` — agrega mapa operacional + layout + estados
- Não substitui `industrialOperationalMapService`; consome seus dados e enriquece

### Frontend

- Nova rota `/app/digital-twin` (opcional, não altera Centro Operações existente)
- Ou: parâmetro `?view=twin` na rota atual que adiciona camada visual — apenas se não mudar design

---

## 4. Produção em Tempo Real (KPIs)

### Arquitetura

```
productionRealtimeService  ←→  production_shift_data, production_line_metrics
dashboardKPIs.getDashboardKPIs  ←  consulta productionRealtimeService quando profile = produção
```

### Tabelas Novas

- `production_shift_data` — produção por turno, linha, meta
- `production_line_metrics` — eficiência, paradas, perdas (por linha)

### Fontes de Dados

1. **MES/ERP** — via integration layer (push)
2. **PLC** — contadores de peças via adapters (quando configurado)
3. **Manual** — API para operador/supervisor registrar produção do turno

### dashboardKPIs.js

- Injetar chamada a `productionRealtimeService.getShiftKPIs()` quando `profileCode` incluir production
- Adicionar KPIs: `production_shift`, `meta_realizado`, `line_efficiency`, `losses`, `stops`
- Se serviço não retornar dados, KPIs retornam 0 ou '-' (não quebram)

---

## 5. Edge Computing / Agente Local

### Arquitetura

```
[Edge Agent]  --HTTP POST-->  /api/integrations/edge/ingest  --→  edgeIngestService  --→  plc_collected_data / machine_detected_events
```

### Componentes

- Rota `POST /api/integrations/edge/ingest` — recebe payload do edge
- `edgeIngestService` — valida, normaliza, persiste em `plc_collected_data` ou tabela equivalente
- Token por edge/installação
- Documentação + script exemplo em `scripts/edge-agent-example.js`

### Formato Payload

```json
{
  "edge_id": "edge-fabrica-01",
  "company_id": "uuid",
  "token": "hash",
  "readings": [
    { "machine_identifier": "EQ-001", "temperature": 52.1, "vibration": 1.2, "status": "running", "timestamp": "2026-03-07T10:00:00Z" }
  ]
}
```

### Benefício

- Edge coleta localmente (Modbus/OPC direto na rede industrial)
- Envia batch ao central
- Reduz latência e carga no servidor central
- Funciona offline (edge buffer) e sincroniza quando online

---

## Ordem de Implementação

1. Migration (todas as tabelas novas) ✅ `lacunas_ind4_migration.sql`, `npm run migrate`
2. PLC Adapters (factory + rest adapter nativo; modbus/opcua opcionais) ✅
3. Integração no plcCollector (usa adapter quando disponível) ✅
4. MES/ERP layer (tabelas, rotas, serviço) ✅
5. productionRealtimeService + tabelas + extensão dashboardKPIs ✅
6. digitalTwinService + tabelas (sem alterar UI atual) ✅
7. edgeIngestService + rota + documentação ✅
8. **machineBrainService** ✅ Lista perfis de equipamentos para mapa/Digital Twin (fontes: machine_monitoring_config, production_line_machines, plc_collected_data)

## Documentação relacionada

- `docs/ROTAS_IND4_REGISTRO.md` – Montagem do router `/api/integrations` no app
- `docs/EDGE_AUTENTICACAO.md` – Fluxo de autenticação do Edge Agent

---

## Garantias

- Nenhum componente existente é removido ou alterado em comportamento visual
- Novos recursos são opt-in (config, env, feature flags)
- Falhas em módulos novos não derrubam o sistema (try/catch, fallback)
