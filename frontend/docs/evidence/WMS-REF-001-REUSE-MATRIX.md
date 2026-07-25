# WMS-REF-001 — Matriz de Reutilização

**Fonte:** `wmsRef001ReuseMatrix.js`

---

## Legenda

| Modo | Significado |
|------|-------------|
| **direct** | Import directo do catálogo certificado, sem alteração |
| **adapt** | Reutilizar componente base; adaptar dados/colunas/intelligence via props/extensão |

---

## Matriz módulo × componente

| Componente | Receiving (OPM-003) | Picking (OPM-004) | Shipping (OPM-005) | Transfers (OPM-006) | WH Intelligence (OPM-007) |
|------------|--------------------|--------------------|--------------------|--------------------|---------------------------|
| InventoryDashboard | direct | direct | direct | direct | direct |
| InventoryMetrics | adapt | adapt | adapt | adapt | adapt |
| InventorySearch | direct | direct | direct | direct | direct |
| InventoryFilters | direct | direct | direct | direct | direct |
| InventoryGrid | adapt | adapt | adapt | adapt | adapt |
| InventoryTimeline | direct | direct | direct | direct | direct |
| InventoryExport | direct | direct | direct | direct | direct |

**Todos:** `reuse: required`

---

## Excepções

Criação de componente alternativo (ex.: `ReceivingGrid` do zero) só permitida com:

1. Entrada no gap registry do módulo
2. Justificativa arquitectural (ADR ou evidência WMS-REF-001-EXCEPTION)
3. Aprovação explícita antes de merge

---

## OPM-003 — Receiving (preview)

| Slot | Uso previsto |
|------|--------------|
| Dashboard | KPIs doca, ASN, SLA conferência |
| Metrics | Heurísticas quarentena, divergência documental |
| Search | ASN, PO, fornecedor, doca |
| Filters | Pendente / conferido / quarentena / rejeitado |
| Grid | Linhas ASN / conferência física |
| Timeline | Eventos recebimento → estoque |
| Export | Relatórios conferência / ASN |

**Foco OPM-003:** domínio e inteligência — **não** reconstruir slots certificados.
