# Telemetry Supported Claims (Fase 40-E)

**Camada:** Industrial Truth Enforcement (aditivo)  
**Categoria nova:** `telemetry_supported_claim`

---

## Condições de permissão

1. `data_state === 'telemetry_only'`
2. `evidence_binding.source_table === 'plc_collected_data'`
3. Snapshot PLC com evidência directa (`buildPlcOperationalPack`)
4. Afirmação alinhada a padrões observáveis (telemetria, equipamento activo, alarmes, coleta)

---

## Afirmações permitidas (exemplos)

- Equipamentos com telemetria activa (contagem + IDs)
- Última coleta PLC (timestamp do snapshot)
- Runtime estimado (horas no snapshot)
- Saúde da telemetria (score 0–100)
- Alarmes observados (`alarm_count`, `alarm_state`)
- «Disponibilidade observada» no sentido de **continuidade de coleta** (não OEE)

---

## Afirmações bloqueadas (`forbidden_industrial_kpi`)

- OEE, MTBF, MTTR explícitos
- Produção de hoje / diária quantificada
- Percentagens de qualidade ou eficiência
- «Eficiência global/operacional de linha»

Resposta enforcement: `UNSUPPORTED_OPERATIONAL_CLAIM`

---

## Evidence numérica

`collectTelemetryEvidenceNumbers(pack)` alimenta o conjunto de números autorizados para `detectUnsupportedClaims` em modo `telemetry_only`.

`evidence_binding.claim_categories = ['telemetry_supported_claim']`

---

## Não alterado

Hallucination Detection/Block, Motor A, gates de governance.
