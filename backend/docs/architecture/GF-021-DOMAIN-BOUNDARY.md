# GF-021 — Supply Domain Boundary

**Identificador:** `GF-021-DOMAIN-BOUNDARY`  
**Domínio:** **Supply** · `supply_native`  
**Decisão:** [DEC-001-DOMAIN-SELECTION.md](../evidence/DEC-001-DOMAIN-SELECTION.md)  
**Data:** 2026-07-17

---

## Dentro do domínio Supply

| Capacidade | Descrição |
|------------|-----------|
| Ciclo procure-to-pay cognitivo | Requisição → aprovação → PO → follow-up |
| Performance fornecedor | OTIF, score, ranking |
| Excepções inbound | Desvios recebimento vs PO vs qualidade |
| Spend analytics | Agregação por categoria/fornecedor |
| Políticas procurement | Limiares, aprovações, SLA |
| Hubs CC nativos | 7 centros suprimentos |
| Eventos `supply.*` | Emissão pós-commit domínio |
| Casos e métricas SSOT | `SupplyCase`, `SupplyMetric`, `SupplyCommitment` |

---

## Fora do domínio Supply

| Capacidade | Dono SSOT |
|------------|-----------|
| Stock físico, picking, shipping operacional | WMS (`logistics-operational` + OCL) |
| Runtime cognitivo logística CC | `logistics_native` LOCKED |
| Inspeções, NC, CAPA | Quality / Ishikawa |
| Submissões PPAP | `ppap_native` |
| Lançamentos contábeis / fecho | ERP — **Finance futuro** |
| Admin CRUD `warehouse_*` legacy | Reaproveitar até paridade WMS |
| Promotion / Consolidação engine | Cognitive transversal — **não alterar** |

### Proibido

- Duplicar `wms_receiving_orders` como SSOT Supply write  
- Absorver WMS no `supply_native`  
- Alterar OCL WMS-002  
- Dual write fornecedor ERP + domínio sem contract  

---

## Dependências

| Domínio | Leitura | Escrita | Integração |
|---------|:-------:|:-------:|------------|
| **PPAP** | Status submissão · inbound quality | — | Loader block `supply.ppap_inbound` |
| **MSA** | Capability material | — | Loader block |
| **Ishikawa** | Investigação excepção fornecedor | — | Case link read-only |
| **Logistics** (`logistics_native`) | Sinais cognitivos logística | — | Não confundir com WMS |
| **WMS/OCL** | Receiving, movimentos, fornecedor operacional | — | **Fronteira obrigatória OCL** |
| **Executive** | Rollup OTIF/spend | — | Evento rollup futuro |

---

## Diagrama

```
ERP (PO, requisições)          Quality / PPAP / Ishikawa
        │                              │
        └──────────┬───────────────────┘
                   ▼ read-only
         supplyTenantSignalLoader (Z.20)
                   │
                   ▼
            supply_native (GREENFIELD)
         Cases · Metrics · Policies
                   │
                   ▼ read-only
    logistics-operational / OCL / WMS
         (WMS-002+ — NÃO alterado)
```

---

## Resolução pendências BASELINE-SUPPLY-v1.0

| ID | Pendência | Resolução GF |
|----|-----------|--------------|
| P-SUP-001 | Sem `manager_supply` | GF-025+ perfil dedicado |
| P-SUP-002 | Ambiguidade eixo procurement | GF-022 registry + GF-023 semantics |
| P-SUP-003 | Sem runtime nativo | **GF-022 `supply_native`** |

---

*Referência:* [GF-021-DISCOVERY.md](GF-021-DISCOVERY.md)
