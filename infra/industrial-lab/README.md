# Lab industrial IMPETUS (D9)

Stack mínima para validação end-to-end dos conectores MQTT e Modbus.

## Subir serviços

```bash
cd infra/industrial-lab
docker compose up -d
```

| Serviço | Porta | Uso |
|---------|-------|-----|
| Mosquitto | 1883 | `IMPETUS_MQTT_BROKER_URL=mqtt://127.0.0.1:1883` |
| Modbus TCP | 502 | `IMPETUS_MODBUS_HOST=127.0.0.1` |

## OPC-UA

Instalar **Prosys OPC UA Simulation Server** ou equivalente em `opc.tcp://127.0.0.1:4840`.

## Validar no backend

```bash
cd backend
node scripts/run-industrial-lab-e2e.js
node scripts/verify-industrial-lab-e2e.js
```

## Publicar teste MQTT

```bash
mosquitto_pub -h 127.0.0.1 -t 'impetus/telemetry/lab' -m '{"value":22.5,"unit":"C","metric_key":"lab.temp"}'
```
