# Enterprise Telemetry Hardening

## Capacidades

- `enterpriseTelemetryOverloadProtection` — throttle por taxa/burst
- `enterpriseTelemetryAdaptiveSampling` — amostragem adaptativa (assistive)
- `enterpriseTelemetryBurstProtection` — janelas de burst
- `enterpriseTelemetryReplayProtection` — replay storms e duplicados
- `enterpriseTelemetryIsolationRuntime` — isolamento multi-tenant/domínio
- `enterpriseTelemetryResilienceRuntime` — pressão MQTT / OPC-UA / Modbus

## Validações

- MQTT overload
- OPC-UA overload
- Modbus overload
- Colapso de ingestão (`collapse_risk` quando pressão ≥ 0.92)

## Teste

```bash
cd backend && npm run test:enterprise-telemetry-hardening
```
