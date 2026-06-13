# AIOI_P0D_REAL_DATA_VALIDATION

**Fase:** AIOI-P0D — Operational Pilot Certification Framework  
**Etapa:** D.4 — Real Data Validation  
**Data:** 2026-06-12  
**Tenant Piloto:** `21dd3cee-2efa-4936-908f-9ff1ba04e2a3` (find fish alimentos)  
**Correlation ID:** `289f3d9c-a390-49d3-9c9c-c9867a30f525`

---

## Sumário Executivo

| Item | Resultado |
|------|-----------|
| PLC Registros Amostrados | 5 (dados reais do BD) |
| IOEs Criados | 4 |
| Idempotência | 1 duplicata corretamente rejeitada |
| Erros de Ingestão | 0 |
| Classificação Aplicada | 4/4 (100%) |
| Pipeline Completo | PASS |
| **VEREDITO** | **REAL_DATA_VALIDATION_PASS** |

---

## D.4.1 — Amostra de Dados PLC Reais

Registros extraídos da tabela `plc_collected_data` do tenant piloto:

| Registro | Equipamento | Temperatura | Vibração | RPM | Status | Alarm |
|----------|-------------|-------------|----------|-----|--------|-------|
| 5ef49a0f | Compressor Principal (EQ-001) | 75,0°C | 1,28 mm/s | 1360 | running | ok |
| ddcd58b3 | Prensa 500T (EQ-003) | 75,0°C | 1,75 mm/s | 1603 | running | ok |
| 8c1a0c1f | Compressor Principal (EQ-001) | 75,0°C | 1,89 mm/s | 1470 | running | ok |
| 669fef6f | Prensa 500T (EQ-003) | 75,0°C | 1,62 mm/s | 1272 | running | ok |
| f8b958d1 | Bomba Hidráulica (EQ-002) | 75,0°C | 2,01 mm/s | 1498 | running | ok |

**Critério de seleção:** registros com temperatura máxima (75°C = limite operacional), selecionados por telemetria real do BD de produção.

---

## D.4.2 — Mapeamento PLC → IOE

O `plcAioiAdapter` aplicou as seguintes transformações:

| Campo PLC | Cálculo | Campo IOE |
|-----------|---------|-----------|
| `temperature / 75°C` | 100% → `risk_score=100` | `score_risk` |
| `vibration / 2.5 mm/s` | ratio → `attention_score` | `score_attention` |
| `alarm_state='ok'` | `telemetry_health=90` | `score_telemetry_hlth` |
| `equipment_id` | `uuidv5(equipment_id, tenant_ns)` | `equipment_id` (UUID determinístico) |
| `collected_at` | horizonte temporal | `idempotency_key` bucket |

**Soberania de prioridade:** `computePriorityScore()` do `operationalPrioritizationService` foi a única fonte de `priority_score` e `priority_band`. Nenhum cálculo local.

---

## D.4.3 — IOEs Criados

| IOE ID | Equipamento | Score | Banda | Correlation |
|--------|-------------|-------|-------|-------------|
| `f73ba21d` | Prensa 500T | 63 | high | 289f3d9c |
| `1868079b` | Bomba Hidráulica | 70 | high | 289f3d9c |
| `b317d255` | Compressor Principal | 76 | critical | 289f3d9c |
| `5525e2c1` | Bomba Hidráulica | 81 | critical | 289f3d9c |

**Correlation ID compartilhado:** todos os IOEs do ciclo de ingestão piloto compartilham o mesmo `correlation_id`, garantindo rastreabilidade end-to-end.

---

## D.4.4 — Validação de Idempotência

| Teste | Resultado |
|-------|-----------|
| Re-ingestão do primeiro registro (mesmo `idempotency_key`) | `duplicate: true` |
| Novo IOE criado no re-ingest | NÃO (duplicata rejeitada) |
| Total de IOEs no BD após re-ingest | 4 (inalterado) |
| **Veredito** | **IDEMPOTENCY_PRESERVED** |

O constraint `UNIQUE(company_id, idempotency_key)` funcionou conforme especificado em `AIOI_IOE_SPECIFICATION.md §5`.

---

## D.4.5 — Classificação Aplicada

Pipeline de classificação via `aioiClassificationConsumerService`:

| IOE | Status Pre | Status Pós | SLA Class | Confidence |
|-----|-----------|------------|-----------|------------|
| `5525e2c1` | open | triaged | CRITICAL_4H | 93% |
| `b317d255` | open | triaged | CRITICAL_4H | 93% |
| `1868079b` | open | triaged | HIGH_8H | 93% |
| `f73ba21d` | open | triaged | HIGH_8H | 88% |

**Transição autorizada:** `open → triaged` apenas (PROIBIDO: `open → approved`, `open → executing`).

---

## D.4.6 — Correlação Preservada

| Verificação | Resultado |
|-------------|-----------|
| Todos IOEs com mesmo `correlation_id` | ✓ `289f3d9c...` |
| `correlation_id` herdado do adaptador PLC | ✓ |
| Rastreabilidade IOE → Outbox via `correlation_id` | ✓ |

---

## Resultado

```json
{
  "audit_id": "AIOI_P0D_D4",
  "timestamp": "2026-06-12T15:50:00.000Z",
  "pilot_tenant": "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
  "plc_records_sampled": 5,
  "ioes_created": 4,
  "idempotency_preserved": true,
  "duplicates_rejected": 1,
  "ingestion_errors": 0,
  "classification_applied": 4,
  "correlation_preserved": true,
  "priority_score_sovereign": true,
  "verdict": "REAL_DATA_VALIDATION_PASS"
}
```

---

**VEREDITO: `REAL_DATA_VALIDATION_PASS`**

> Pipeline de ingestão real validado. IOEs criados, classificados e correlacionados a partir de dados PLC reais.
> Idempotência preservada. Score soberano mantido (`operationalPrioritizationService`).
> Zero erros de ingestão. Zero duplicatas não detectadas.
