# Real Data Truth Validation — Fase 37-B

**Data:** 2026-06-01  
**Tenant:** find fish alimentos (`21dd3cee-2efa-4936-908f-9ff1ba04e2a3`)  
**Utilizador teste:** `ia@impetus.internal`  
**API:** `http://127.0.0.1:4000/api` (processo PM2 activo)

---

## Metodologia

Cadeia avaliada:

```
PostgreSQL (plc_collected_data, edge_agents)
    ↓
checkOperationalAvailability / softwareOperationalSnapshot
    ↓
Resposta IA (dashboard/chat, panel-command)
    ↓
industrial_truth + evidence_binding + trace_id
```

Perguntas RF-01..RF-10 + RF-11 (painel produção).  
Critério **pass:** HTTP 200 e **sem KPI inventado** (regex percentagens/volumes sem mensagem de ausência de dados).

---

## Resultados

| ID | Pergunta | Pass | `industrial_truth.action` | `evidence_binding.source_table` | `data_state` |
|----|----------|------|---------------------------|----------------------------------|--------------|
| RF-01 | OEE atual | ✓ | pass | plc_collected_data | tenant_empty |
| RF-02 | Produção hoje | ✓ | pass | plc_collected_data | tenant_empty |
| RF-03 | Qualidade hoje | ✓ | pass | plc_collected_data | tenant_empty |
| RF-04 | Paradas hoje | ✓ | pass | plc_collected_data | tenant_empty |
| RF-05 | MTBF planta | ✓ | pass | plc_collected_data | tenant_empty |
| RF-06 | MTTR médio | ✓ | pass | plc_collected_data | tenant_empty |
| RF-07 | Energia hoje | ✓ | pass | plc_collected_data | tenant_empty |
| RF-08 | Refugo | ✓ | pass | plc_collected_data | tenant_empty |
| RF-09 | CAPA abertas | ✓ | pass | plc_collected_data | tenant_empty |
| RF-10 | Alarmes críticos | ✓ | pass | plc_collected_data | tenant_empty |
| RF-11 | Gráfico produção (panel) | ✓ | — | plc_collected_data | — |

**Taxa:** **11/11 PASS** (100%) — **nenhum KPI inventado detectado**.

---

## Coerência BD → Snapshot → IA

| Camada | Observação | Classificação |
|--------|--------------|---------------|
| **Banco** | 42 114 leituras PLC / 7d; `LAB-EQ-001` activo | VERIFIED |
| **Evidence binding** | `source_table: plc_collected_data`, `confidence: snapshot_backed` | VERIFIED |
| **Lineage** | `trace_id` presente em todas as chamadas chat | VERIFIED |
| **Conteúdo IA** | Respostas «sem máquinas cadastradas» apesar de PLC | **INCOERENTE** |
| **data_state** | `tenant_empty` com PLC positivo | **GAP** |

### Exemplo (RF-01 OEE)

- **BD:** telemetria recente com `status: running`.
- **IA:** «não há dados disponíveis sobre o OEE… sistema vazio… cadastre máquinas».
- **Truth action:** `pass` (não substituiu por `replace_no_data` porque interpretação vazia + pergunta operacional tratada como ausência estrutural).

**Interpretação:** a camada de truth **impede alucinação numérica**, mas **não promove** ainda números reais do PLC para narrativa OEE — gap de **grounding conversacional**, não de enforcement.

---

## Evidence binding (amostra)

```json
{
  "source_table": "plc_collected_data",
  "confidence": "snapshot_backed",
  "channel": "dashboard_chat",
  "company_id": "21dd3cee-2efa-4936-908f-9ff1ba04e2a3",
  "data_state": "tenant_empty"
}
```

---

## Smart Panel (RF-11)

- `type: report`, `bar_positive: false`
- `truth_guard` / `industrial_truth` presentes na resposta F36
- Sem barras positivas fictícias

---

## Veredito 37-B

| Dimensão | Classificação |
|----------|---------------|
| Anti-alucinação (KPI inventado) | **VERIFIED** |
| Evidence + trace | **VERIFIED** |
| Coerência narrativa com dados reais | **PARTIAL** |
| **Global 37-B** | **PARTIAL** |

**Recomendação:** fechar gap `tenant_empty` vs PLC (cadastro equipamento + interpretação) antes de certificar respostas OEE/produção com valores reais extraídos da telemetria.
