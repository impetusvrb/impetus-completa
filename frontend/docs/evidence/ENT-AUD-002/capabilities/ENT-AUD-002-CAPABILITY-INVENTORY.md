# ENT-AUD-002 — Capability Inventory

| Domínio/camada | Implementadas | Parciais | Planeadas/inexistentes |
|---|---|---|---|
| Finance | Hub, custos, leakage, billing, Smart Costing, performance, Twin overlay, What-if, Prediction Wave 1 | Join Finance↔ordem; energia | ERP/GL/AP-AR/tesouraria |
| WMS | Warehouses, inventory, receiving, picking, shipping, transfers, intelligence, cognitive advisory | Dual stack/compatibilidade | Retirement legacy |
| Logistics | Runtime/baseline nativo, WMS integration | Hub Wave 6, dock, telemetry, governance, rollout, picking cognitivo | TMS/GPS real |
| Supply | Core, REST, RBAC, signal loader, promotion, pilot foundation | Runtime/API efetivos flag-default-off; INC-048 off | Business activation |
| Quality | Inspection, NCR/CAPA, SPC, telemetry, cognitive, rollout | Capacidades condicionadas por flags | Evidência operacional contínua |
| Safety/SST | Workspace, inspeção, incidentes | PTW/EPI, telemetry, cognitive, rollout; fallbacks sintéticos | Full production promotion |
| Environment | Operacional, ESG, compliance, telemetry, cognitive, executive | Connectors sem hardware loop; rollout/pilot | Industrial hardware validation |
| Maintenance | ManuIA, field app, diagnóstico, OS, Digital Twin aplicado | Guard/observabilidade/testes frontend | Evolução business-scoped |
| Production | Runtime cognitivo, widgets e semântica | Telemetria/validation shadow | Workspace navegável |
| Prediction Platform | Contrato, registry, API pública, forecasting mounts | Energia; AIOI forecast exposure | Model lifecycle governado adicional |
| Cognitive/AIOI | P0–P16 foundation, UI, contracts, SSR, governance | Runtime off, queue precedence, pilot/rollout | P17–P20 proibidos |
| Centro de Comando | Dashboard por perfil, hubs nativos, cérebro operacional, mapa, insights | Observabilidade externa e catálogo de owners | Consolidação de aliases |
| Digital Twin | Twin industrial aplicado e Finance overlay | Deep-link Finance→ManuIA defeituoso; hardware data parcial | Twin físico completo por planta |
| Governance | RBAC, tenant isolation, audit, HITL, rollout, certification, DOMAIN-GOV | Settings guard vazio; flags complexas | Policy-as-code formal |
| Security | SEC, APPSEC, active defense consultiva, go-live | Red Team externo; homologação operacional | ISO/SOC/IEC externos |
| Telemetry/Edge | Ingestion Quality, event backbone, MQTT/Modbus/OPC-UA code | I/O real e OTEL exporter desativados | Edge agent físico |
| Observability | Health, correlation, logs, pool/request metrics, Prometheus endpoint | Frontend best-effort; Grafana/OTEL não confirmados | Pipeline corporativo reproduzível |
| Admin Portal | Aplicação Vite e gestão administrativa | Um teste utilitário não registado | Cobertura de rotas/browser/auth |
| Lipsync | Bridge Express/Socket.IO | Sem testes | Certificação operacional |

## Capacidade versus ativação

Cada capacidade deve receber quatro estados separados:

1. `IMPLEMENTED`: código existe;
2. `MOUNTED`: rota/componente está ligado;
3. `ENABLED`: flags e configuração permitem execução;
4. `RUNNING`: telemetria do ambiente prova utilização.

A auditoria encontrou documentação que usa `CERTIFIED` ou `ACTIVE` sem distinguir esses estados.

## Capacidades com maior maturidade

Finance, WMS, Quality foundation, Centro de Comando, Prediction Platform e governança estrutural.

## Capacidades com maior risco de sobredeclaração

Logistics Wave 6, Safety telemetry/cognitive, Supply/INC-048, AIOI runtime ativo, edge/protocolos “real” e observabilidade externa.

