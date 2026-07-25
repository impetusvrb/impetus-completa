# OPM-000 — Functional Gap Matrix

**Modo:** READ ONLY · **Data:** 2026-07-19

---

## Legenda

| Classificação | Significado |
|---------------|-------------|
| **CLOSED** | Gap REV-001 encerrado e confirmado REV-002 |
| **CERTIFIED** | Infra homologada; produto pode ainda ser parcial |
| **PARTIAL** | Risco residual documentado |
| **OPEN-PRODUCT** | Lacuna de **produto** (pós-infra) — backlog OPM |

---

## GAPs REV-001 — estado pós-certificação

| ID | Estado REV-002 | Produto OPM-000 | Notas |
|----|----------------|-----------------|-------|
| GAP-WMS-001 | CLOSED | API ✅ | WMS-003 entregue |
| GAP-WMS-002 | CLOSED | UI ⚠️ PARCIAL | List-only pós-007A; mocks eliminados |
| GAP-WMS-003 | VALIDATED | RBAC ✅ | Navegação NAV-001 |
| GAP-WMS-004 | CERTIFIED | Validação ✅ | WMS-005/006 |
| GAP-WMS-005 | CLOSED* | Flags pilot ON | OPS-002 |
| GAP-LOG-001 | PARTIAL | Menu ✅ com NAV-001 | Residual: dados tenant |
| GAP-LOG-002 | PARTIAL | **OPEN-PRODUCT** | CC vs ops — UI incompleta |
| GAP-SUP-001…006 | CLOSED | Arch ✅ | Produto UI OPEN |

\*Activado em piloto; default global OFF preservado.

---

## Novos gaps de produto (OPM — não arquitectura)

| ID | Domínio | Descrição | Impacto | Prioridade |
|----|---------|-----------|---------|:----------:|
| **GAP-OPM-W01** | WMS | UI CRUD armazéns / localizações | Alto | P0 |
| **GAP-OPM-W02** | WMS | UI workflows receiving (create, status) | Alto | P0 |
| **GAP-OPM-W03** | WMS | UI workflows picking (execute, complete) | Alto | P0 |
| **GAP-OPM-W04** | WMS | UI shipping dispatch + transfer complete | Alto | P0 |
| **GAP-OPM-W05** | WMS | Filtros, pesquisa, paginação módulos | Médio | P1 |
| **GAP-OPM-W06** | WMS | Detalhe documento (`GET :id`) em FE | Médio | P1 |
| **GAP-OPM-W07** | WMS | Inventário rotativo / conferência / romaneio | Alto | P1 |
| **GAP-OPM-W08** | WMS | KPIs operacionais por módulo (não só count) | Médio | P2 |
| **GAP-OPM-W09** | WMS | IA operacional em módulos (vs CC only) | Médio | P2 |
| **GAP-OPM-S01** | Supply | UI entidade Fornecedores | Alto | P0 |
| **GAP-OPM-S02** | Supply | UI Requisições + submit/approve | Alto | P0 |
| **GAP-OPM-S03** | Supply | UI Pedidos de compra | Alto | P0 |
| **GAP-OPM-S04** | Supply | UI Cotações / Contratos | Médio | P1 |
| **GAP-OPM-S05** | Supply | Analytics OTIF / spend (FE dedicado) | Médio | P1 |
| **GAP-OPM-S06** | Supply | Persistência BD (vs in-memory pilot) | Alto | P1 |

---

## Divergências Documento Mestre vs implementação

| Tema | Documento mestre | Implementação | Divergência |
|------|------------------|---------------|-------------|
| WMS operacional enterprise | AUD-001: recebimento, picking, conferência, romaneio, rotativo | APIs core ✅; UI list-only; conferência/romaneio ❌ | **Produto abaixo do blueprint AUD** |
| Supply procure-to-pay UI | GF-021: 7 hubs + decisões compras | CC ✅; workspace shell ❌ | **Arquitectura = doc; produto UI ≠ doc** |
| Cognitive vs Operational | Baseline: runtimes separados | Confirmado — não é bug | **Alinhado** |
| Navegação global | UX/NAV certificados | NAV-001 corrige segregação | **Alinhado pós-NAV-001** |
| «Implementações Pendentes» único | Referência informal | Conjunto REV-001 distribuído | **Metadocumentação — sem ficheiro único** |

---

## Matriz consolidada (infra vs produto)

| Domínio | Infra (cert.) | Produto (OPM) | Delta |
|---------|:-------------:|:-------------:|:-----:|
| WMS | 96% | 41% | **-55 pp** |
| Supply | 94% | 28% | **-66 pp** |
| Integração WMS↔Supply | 85% (INC-048) | 50% (UI) | **-35 pp** |

---

*Registo apenas — nenhuma correcção aplicada nesta actividade.*
