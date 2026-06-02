# Traceability Map Report (Fase 46-G)

**Função:** `buildOperationalTraceabilityMap(bundle, explanations)`

---

## Cadeia

1. Telemetria (`plc_collected_data`)
2. Trend
3. Anomaly
4. Correlation
5. Event
6. Pattern
7. Explanation

---

## Campos

- `layers[]` — cada camada com `ref.available` e metadados
- `chain_complete` — telemetria + explicações + camadas intermédias com dados
- `llm_text_used: false` em `evidence_chain` de cada explicação

---

## Uso

Responde «por que foi classificado assim?» com rastreio até snapshots PLC, não texto do modelo.
