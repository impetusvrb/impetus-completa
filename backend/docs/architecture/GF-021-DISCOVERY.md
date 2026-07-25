# GF-021 — Supply Discovery

**Identificador:** `GF-021`  
**Domínio:** **Supply** · Runtime `supply_native`  
**Decisão:** [DEC-001-DOMAIN-SELECTION.md](../evidence/DEC-001-DOMAIN-SELECTION.md) — **DOMAIN = SUPPLY**  
**Categoria:** Greenfield (GF) · Fase Discovery  
**Norma:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Data:** 2026-07-17 (especializado pós DEC-001)  
**Modo:** Documentation Only

---

## Conformidade ARC-002

| Campo | Valor |
|-------|-------|
| **Categoria** | Greenfield (GF) |
| **Objetivo** | Discovery arquitectural do runtime `supply_native` |
| **Critérios de entrada** | EV-001 · GF-021 neutro · DEC-001 SUPPLY |
| **Critérios de saída** | Documentação especializada · roadmap GF-022→027 |
| **Impacto arquitetural** | Nenhum (documentation only) |
| **Baselines afectadas** | Nenhuma — v1.4 preservada; alvo futuro BASELINE-SUPPLY-v2.0 |
| **Justificativa de categoria** | GF — 12º runtime candidato; sinergia WMS OCP; resolve P-SUP-003 |

**Autorização:** [EV-001](../evidence/EV-001-ARCHITECTURE-READINESS.md) READY WITH CONDITIONS

---

## Missão do domínio Supply

O runtime **`supply_native`** fornece **inteligência decisória sobre procure-to-pay e performance de fornecedores**, integrando sinais de WMS (via OCL), Qualidade (PPAP/inbound), Ishikawa (excepções) e ERP (master data) **sem duplicar SSOT**, exposto via Centro de Comando quando homologado.

---

## Parte 1 — Problema de negócio

| Pergunta | Resposta Supply |
|----------|-----------------|
| **Qual problema resolve?** | Decisões de compras e fornecedor fragmentadas entre admin legacy, logística colapsada e planilhas — sem runtime cognitivo dedicado (P-SUP-001/003) |
| **Quem utiliza?** | Gestores suprimentos/compras, coordenadores logística, analistas OTIF, diretoria (Executive rollup) |
| **Quais decisões apoia?** | Priorizar excepções inbound, seleccionar fornecedor, aprovar desvio PO, escalar ruptura abastecimento |
| **Quais indicadores melhora?** | OTIF fornecedor, lead time compras, spend por categoria, taxa excepção recebimento, qualidade inbound |

---

## Parte 2 — Delimitação

Ver: [GF-021-DOMAIN-BOUNDARY.md](GF-021-DOMAIN-BOUNDARY.md)

---

## Parte 3 — Modelo conceitual

### Entidades

| Entidade | Descrição | Agregado |
|----------|-----------|----------|
| `SupplySignal` | Sinal normalizado Z.20 (PO, recebimento, score) | — |
| `SupplyCase` | Excepção procurement/inbound | `SupplyCase` |
| `SupplyMetric` | OTIF, spend, lead time | `SupplyMetric` |
| `SupplyPolicy` | Limiar OTIF, aprovação PO | `SupplyPolicy` |
| `SupplyCommitment` | PO / contrato fornecedor | `SupplyCommitment` |
| `SupplyParty` | Fornecedor | `SupplyParty` |

### Eventos

| Evento | Descrição |
|--------|-----------|
| `supply.signal.received` | Loader ingeriu bloco |
| `supply.case.opened` | Excepção inbound/PO |
| `supply.case.resolved` | Caso encerrado |
| `supply.metric.threshold_breached` | OTIF/spend fora banda |
| `supply.commitment.updated` | PO ou contrato alterado |
| `supply.party.score_updated` | Score fornecedor recalculado |

### Relações

```
SupplyParty ──< SupplyCommitment (PO)
SupplyCase ──> SupplyMetric
SupplySignal ──> SupplyMetric
WMS Receiving (OCL read) ──> SupplySignal
PPAP/Quality inbound ──> SupplySignal
```

---

## Parte 4 — Linguagem ubíqua

Ver: [GF-021-UBIQUITOUS-LANGUAGE.md](GF-021-UBIQUITOUS-LANGUAGE.md)

---

## Parte 5 — Arquitetura cognitiva

### Runtime `supply_native`

Payload canónico: `supply_cognitive_runtime`, `supply_signal_loader`, `supply_cognitive_centers`.

| Capacidade | Necessária | Justificativa |
|------------|:----------:|---------------|
| Signal Loader Z.20 | **SIM** | Binding PO/recebimento/fornecedor |
| Promotion Z.22 | **SIM** | Gate-driven · paridade PPAP/MSA |
| Consolidação Z.23 | **SIM** | Payload CC canónico |
| Centro de Comando | **SIM** | 6–8 hubs suprimentos |

### Limites

- **Não** substituir WMS como SSOT stock/movimento
- **Não** duplicar `warehouse_*` / `wms_*`
- **Não** alterar `logistics_native` LOCKED

---

## Parte 6 — Cognitive Centers

| # | Centro | Objetivo | Entradas | Saídas | Decisões |
|---|--------|----------|----------|--------|----------|
| C1 | **Supply Overview** | Panorama spend/OTIF | Metrics agregados | KPI cards | Onde focar |
| C2 | **Inbound Exceptions** | Fila excepções recebimento | Cases WMS+Quality | Lista priorizada | Escalar |
| C3 | **Commitments** | POs e contratos | ERP read | Status vs plano | Aprovar desvio |
| C4 | **Supplier Performance** | Score fornecedores | OTIF, PPAP, inbound NC | Ranking | Seleccionar fornecedor |
| C5 | **Procurement Trends** | Lead time · spend | Séries temporais | Gráficos | Antecipar ruptura |
| C6 | **Procurement Actions** | Acções sugeridas | Cases + policies | Tasks | Executar mitigação |
| C7 | **Requisition Queue** | Requisições pendentes | ERP/domínio | Fila aprovação | Priorizar compra |

*Alvo homologation: 7 hubs (expandível a 8–10).*

---

## Parte 7 — Integrações

| Sistema | Modo | Uso Supply |
|---------|------|------------|
| Executive | Leitura + rollup | Spend · OTIF executivo |
| PPAP | Leitura | Qualidade inbound fornecedor |
| MSA | Leitura | Capability materiais recebidos |
| Ishikawa | Leitura | Causa excepção fornecedor |
| Logistics/WMS | **Leitura OCL** | Receiving, movimentos, fornecedor |
| ERP | Leitura | Master PO, requisições, contratos |
| MES | Leitura | Demanda produção → requisição |
| PLC | Eventos (futuro) | Telemetria industrial indirecta |

---

## Parte 8 — SSOT

| Entidade | SSOT | Supply |
|----------|------|--------|
| Stock / movimentos / receiving | WMS via OCL | Read-only |
| Inspeções inbound | Quality | Read-only |
| PPAP status | PPAP runtime | Read-only |
| Fornecedor master | ERP / admin legacy | Read-only até GF-023 |
| **SupplyCase / SupplyMetric / PO domain** | **`supply_native`** | Write GF-023+ |

---

## Parte 9 — Riscos

| ID | Risco | Classificação |
|----|-------|:-------------:|
| R1 | Overlap Supply × Logistics/WMS | **Médio** — fronteira OCL |
| R2 | Colapso perfil em logística (P-SUP-001) | **Médio** — GF-025+ perfil dedicado |
| R3 | Ambiguidade procurement eixo (P-SUP-002) | **Médio** |
| R4 | Scope creep procure-to-pay completo | **Médio** |
| R5 | Violação isolamento cognitive/WMS | **Alto** — mitigado ARC-002 |

---

## Parte 10 — Roadmap

Ver: [GF-021-ROADMAP.md](GF-021-ROADMAP.md)

---

## Próximo passo

**GF-022 — Supply Runtime Foundation** — registar `supply_native` inactive.

---

*Referências:* [DEC-001](../evidence/DEC-001-DOMAIN-SELECTION.md) · [BASELINE-SUPPLY-v1.0.md](../evidence/BASELINE-SUPPLY-v1.0.md)
