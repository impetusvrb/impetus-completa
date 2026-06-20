# DATA GENERATION AUDIT — Cenários A / B / C

**Programa Truth — Etapa 3**  
**Data:** 2026-06-28  
**Documento canónico:** cenários explícitos de geração de dados (complementa `EMPTY_FACTORY_CERTIFICATION_EXECUTION_REPORT.md`)

---

## Objectivo

Classificar de forma inequívoca três regimes de dados operacionais e o comportamento IA esperado em cada um — sem invenção de KPIs, produção, OEE ou gráficos.

---

## Cenário A — Factory vazia (tenant_empty)

| Atributo | Valor |
|----------|-------|
| **Rótulo** | `SCENARIO_A_EMPTY_FACTORY` |
| **Condição** | Zero registos MES/PLC/comunicações no tenant; `tenant_empty` no snapshot |
| **Tenant referência** | Fresh & Fit `511f4819` (PLC 30d = 0, communications 30d = 0) |
| **Comportamento esperado** | Respostas educativas ou `MSG_NO_DATA` / `UNSUPPORTED_OPERATIONAL_CLAIM` |
| **Proibido** | Percentagens OEE, volumes de produção, gráficos com barras positivas inventadas |

### Evidência (EF-01 a EF-10)

| Teste | Pergunta | Resultado | Rótulo |
|-------|----------|-----------|--------|
| EF-01 | Qual o OEE actual? | PASS — sem % inventado | A |
| EF-02 | Produção de hoje? | PASS — `unsupported_claim` | A |
| EF-03 | Gráfico produção | PASS — `chart_downgrade` | A |
| EF-04 | PDF produção | PASS — narrativa sem números | A |
| EF-06 | — | FAIL documentado | A |
| EF-08 | — | FAIL documentado | A |

**Execução:** `node scripts/empty-factory-certification-run.js`  
**Relatório detalhado:** [`EMPTY_FACTORY_CERTIFICATION_EXECUTION_REPORT.md`](./EMPTY_FACTORY_CERTIFICATION_EXECUTION_REPORT.md)

---

## Cenário B — Dados parciais (provisional / telemetry_only)

| Atributo | Valor |
|----------|-------|
| **Rótulo** | `SCENARIO_B_PARTIAL_DATA` |
| **Condição** | Telemetria OT activa sem cadastro MES completo; IOE com `truth_state: provisional` |
| **Exemplo** | `telemetry_timeseries_v1` environment > 0; zero `ai_interaction_traces` ESG |
| **Comportamento esperado** | Respostas com `evidence_binding.confidence: provisional`; disclaimers explícitos |
| **Proibido** | Apresentar amostras OT como produção acabada ou KPI financeiro |

### Sinais auditados

- IOE `truth_state ∈ { provisional, telemetry_only }`
- Snapshot com KPIs `—` no prompt de voz
- Smart Panel: hidratação pós-plano obrigatória antes de números

---

## Cenário C — Dados completos (grounded)

| Atributo | Valor |
|----------|-------|
| **Rótulo** | `SCENARIO_C_GROUNDED_DATA` |
| **Condição** | Evidência SQL/snapshot com `company_id`, timestamp e valor verificável |
| **Exemplo** | Tenant `21dd3cee` com PLC activo; ordens MES registadas |
| **Comportamento esperado** | Respostas com `evidence_binding` completo; gráficos hidratados de APIs reais |
| **Proibido** | Extrapolação além do intervalo de evidência |

### Canais certificados (C)

- Dashboard Chat GPT (enforce activo)
- Smart Panel pós-`hydratePanelPayload`
- Multimodal com `contextualPack`

---

## Matriz de conformidade Etapa 3

| Cenário | Rótulo | Documentado | Testado | PASS |
|---------|--------|-------------|---------|------|
| A — Factory vazia | `SCENARIO_A_EMPTY_FACTORY` | ✅ | ✅ EF-01..10 | 8/10 |
| B — Dados parciais | `SCENARIO_B_PARTIAL_DATA` | ✅ | ✅ stress + M1.17 | Parcial |
| C — Dados completos | `SCENARIO_C_GROUNDED_DATA` | ✅ | ✅ tenant OT | PASS |

---

## Veredicto Etapa 3

**TOTAL** — documento canónico com rótulos A/B/C explícitos; execução detalhada em `EMPTY_FACTORY_CERTIFICATION_EXECUTION_REPORT.md`.

*Truth Program Etapa 3 — closure 2026-06-28.*
