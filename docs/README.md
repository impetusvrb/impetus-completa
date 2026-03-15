# Documentação IMPETUS Comunica IA

## Índice

| Documento | Descrição |
|-----------|-----------|
| [SISTEMA_INTELIGENCIA_INDUSTRIAL.md](SISTEMA_INTELIGENCIA_INDUSTRIAL.md) | Coleta PLC, Machine Brain, mapa operacional, Digital Twin |
| [IND4_ARQUITETURA.md](IND4_ARQUITETURA.md) | Arquitetura Indústria 4.0: PLC, MES/ERP, Digital Twin, Edge, produção em tempo real |
| [EDGE_AUTENTICACAO.md](EDGE_AUTENTICACAO.md) | Fluxo de autenticação do Edge Agent (registro + token) |
| [ROTAS_REGISTRO.md](ROTAS_REGISTRO.md) | Como montar o router `/api/integrations` no app Express |
| [CENTRO_PREVISAO_OPERACIONAL.md](CENTRO_PREVISAO_OPERACIONAL.md) | Dashboard de previsão para CEO e diretores |
| [PROTOCOLO_IA_SEGURANCA_MAQUINAS.md](PROTOCOLO_IA_SEGURANCA_MAQUINAS.md) | Segurança, intervenção humana e automação de equipamentos |
| [ARQUITETURA_TRÍADE_IAs.md](ARQUITETURA_TRÍADE_IAs.md) | Tríade de IAs: Claude, Gemini, ChatGPT |
| [CHECKLIST_DEPLOY.md](CHECKLIST_DEPLOY.md) | Checklist para deploy em produção |

## Estado atual (2026-03)

- **PLC real:** Modbus/OPC UA/REST via `machine_monitoring_config` + `plcCollector`
- **Machine Brain:** `machineBrainService` lista perfis para mapa e Digital Twin
- **MES/ERP:** Webhook push + conectores
- **Digital Twin:** Estado da planta (layout + cache)
- **Produção tempo real:** KPIs turno, eficiência
- **Edge:** Ingest + registro com token
