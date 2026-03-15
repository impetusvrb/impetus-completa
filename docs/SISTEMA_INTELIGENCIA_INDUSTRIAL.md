# Sistema de Inteligência Industrial Autônoma (IMPETUS)

## Objetivo

A IA analítica atua como **cérebro industrial** da empresa, responsável por:

- Monitorar máquinas 24 horas por dia
- Interpretar dados industriais
- Detectar anomalias e prever falhas
- Registrar eventos automaticamente
- Sugerir ações operacionais
- Executar comandos em equipamentos auxiliares quando autorizado

---

## 1. Coleta de Dados PLC (plcCollector)

**Arquivo:** `backend/src/services/plcCollector.js`

- Coleta dados de sensores, PLC e sistemas industriais
- **Fontes:** `machine_monitoring_config` (Modbus TCP/RTU, OPC UA, REST) ou simulação
- Intervalo configurável em `collection_interval_sec` por equipamento
- Variáveis lidas: `machine_status`, `motor_temperature`, `vibration_level`, `oil_level`, `water_flow`, `hydraulic_pressure`, `electrical_current`, `rpm`, `alarm_state`
- Acionamento: rota `POST /api/plc-alerts/run-collector` (admin) ou Edge Agent (`POST /api/integrations/edge/ingest`)

### Configuração de equipamentos reais

Tabela `machine_monitoring_config`: `machine_identifier`, `machine_name`, `data_source_type` (`modbus_tcp`, `opc_ua`, `rest`, `simulated`), `data_source_config` (host, port, registers, endpoint, nodeIds, etc.).

---

## 2. Machine Brain (Cérebro Industrial)

**Arquivo:** `backend/src/services/machineBrainService.js`

- Lista perfis de equipamentos para mapa operacional, Digital Twin e detecção de offline
- **Fontes:** `machine_monitoring_config`, `production_line_machines`, `plc_collected_data`
- Usado por: `industrialOperationalMapService`, `digitalTwinService`, `operationalForecastingService`
- Eventos (tabela `machine_detected_events`): `machine_started`, `machine_stopped`, `low_oil`, `overheating`, `vibration_alert`, `pressure_low`, `compressor_offline`, `predicted_failure`

---

## 3. Arquitetura de Comunicação

```
IA → Software IMPETUS → Gateway/PLC → Máquina
```

A IA **nunca** controla máquinas diretamente. O controlador industrial valida segurança antes de executar comandos.

---

## 4. Controle de Equipamentos

**Permitidos (auxiliares):** compressor, bomba, ventilação, refrigeração  
**Proibidos:** prensa, torno, fresadora, guilhotina, dobradeira

**Modos:**
- **Monitoramento:** IA apenas observa
- **Assistido:** IA sugere ações
- **Automático:** IA executa comandos (apenas equipamentos autorizados)

---

## 5. Integração com Manutenção

Eventos críticos (`overheating`, `low_oil`, `vibration_alert`, `predicted_failure`, etc.) geram **Ordem de Serviço** automaticamente, atribuída a mecânico/eletromecânico.

---

## 6. Dashboard - Centro de Operações Industrial

- **Status:** máquinas, alertas, perfis, equipamentos offline, previsões de falha
- **Mapa:** visão da fábrica com status em tempo real (`industrialOperationalMapService`)
- **Digital Twin:** estado da planta (layout + estados em cache) – `GET /api/integrations/digital-twin/state`
- **Eventos:** histórico de eventos detectados
- **Perfis:** padrões operacionais (Machine Brain)
- **Intervenção:** registro de manutenção e bloqueio de automação

---

## 7. Integrações Indústria 4.0

| Componente | Rota / Tabela | Descrição |
|------------|---------------|-----------|
| MES/ERP | `POST /api/integrations/mes-erp/push` | Webhook para dados de produção |
| Produção turno | `POST /api/integrations/production/shift` | Registro manual de produção |
| Edge Agent | `POST /api/integrations/edge/ingest` | Ingest de leituras do edge local |
| Edge Register | `POST /api/integrations/edge/register` | Cadastro de agentes edge (admin) |
| Digital Twin | `GET /api/integrations/digital-twin/state` | Estado do twin |
| PLC Alerts | `POST /api/plc-alerts/run-collector` | Disparo manual da coleta |

Documentação detalhada: `IND4_ARQUITETURA.md`, `EDGE_AUTENTICACAO.md`, `ROTAS_REGISTRO.md`
