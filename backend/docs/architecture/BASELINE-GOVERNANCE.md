# BASELINE-GOVERNANCE — IMPETUS

**Identificador:** `BASELINE-GOVERNANCE`  
**ARC:** [ARC-002-GREENFIELD-DELIVERY-STANDARD.md](ARC-002-GREENFIELD-DELIVERY-STANDARD.md)  
**Índice mestre:** [BASELINE-SYSTEM-v1.4.md](BASELINE-SYSTEM-v1.4.md)  
**Data:** 2026-07-17

---

## 1. Definição de Baseline

Um **Baseline** é um conjunto **congelado** de surfaces arquitecturais, contratos, documentação e critérios de teste que **não podem ser alterados** sem nova **INC** explícita.

Estado canónico: **`{NAME}_BASELINE_v{x.y} = LOCKED`**

---

## 2. Hierarquia de baselines

```
BASELINE-SYSTEM v1.4          ← índice mestre (11 runtimes cognitivos)
    ├── BASELINE-UI-v1.0
    ├── BASELINE-DASHBOARDS-v1.0
    ├── BASELINE-QUALITY-v1.1
    ├── BASELINE-LOGISTICS-v1.1      ← logistics_native cognitivo
    ├── BASELINE-PPAP-v1.0
    ├── BASELINE-MSA-v1.0
    ├── BASELINE-ISHIKAWA-v1.0
    ├── BASELINE-EXECUTIVE-v1.0
    ├── BASELINE-PRODUCTION-v1.0
    ├── BASELINE-MAINTENANCE-v1.0
    ├── BASELINE-ENVIRONMENT-v1.0
    ├── BASELINE-HR-v1.0
    ├── BASELINE-SAFETY-v1.0
    └── BASELINE-WMS-v1.0              ← futuro (operacional OCP)
```

**Nota:** BASELINE-LOGISTICS-v1.1 congela **runtime cognitivo**. BASELINE-WMS-v1.0 congelará **camada operacional** — domínios distintos.

---

## 3. Critérios mínimos para LOCKED

| # | Critério | Verificação |
|---|----------|-------------|
| 1 | **Arquitectura concluída** | Plano + diagrama + surfaces listadas |
| 2 | **Homologação concluída** | Relatório homologation read-only ou funcional |
| 3 | **Testes aprovados** | Suites mínimas fase final PASS |
| 4 | **Documentação emitida** | Evidence + baseline doc |
| 5 | **Baseline publicada** | `BASELINE-*-v1.x.md` com declaração LOCKED |
| 6 | **INC concluída** | Quando registo no SYSTEM index (GF) ou OCP equivalente |

---

## 4. Superfícies congeladas — Greenfield cognitivo

Por domínio homologado (modelo INC-043 · GF-020):

| Camada | Exemplos congelados |
|--------|---------------------|
| Registry Z.19 | block pack · pilot IDs |
| Runtime Z.20 | tenant signal loader · block bridge |
| Runtime Z.22 | controlled render · promotion supervisor |
| Runtime Z.23 | consolidator · cognitive centers |
| Foundation attach | foundation attachment |
| Facade branch | `cognitiveRuntimeFacade` domain branch |
| CC Promotion | `*NativeCockpitPromotion.jsx` |
| Hubs | lazy hub components |
| Adapters homologados | `*RuntimeHubAdapter.js` |

**Alteração:** nova INC + homologação + regressão ARC-001 + nova versão baseline.

---

## 5. Superfícies congeladas — Operational Baseline (futuro WMS)

| Camada | Exemplos |
|--------|----------|
| SSOT tables | `wms_*` schema v1 |
| OCL contracts | port interfaces |
| Legacy adapter mapping | warehouse_* → canonical DTO |
| API contracts | `/api/logistics-operational/*` v1 |
| RBAC profiles | warehouse_operator/supervisor/manager |

**Não congela:** runtime `logistics_native` (já LOCKED separadamente).

---

## 6. Política de evolução pós-LOCKED

| Acção permitida | Tipo | Requisito |
|-----------------|------|-----------|
| Adicionar hub analítico Ishikawa | EV | Sem alterar Z.19–Z.23 |
| Adicionar picking operacional | OCP / EV | Referência ARC-002 |
| Alterar threshold Z.22 global | INC | Homologação transversal |
| Corrigir typo documentação baseline | Patch doc | Sem alterar surfaces listadas |
| Novo runtime Finance | GF + INC | Ciclo completo |

---

## 7. Versionamento

| Incremento | Significado |
|------------|-------------|
| **v1.0 → v1.1** (domínio) | Aditivo homologado · surfaces novas |
| **v1.x → v2.0** | Breaking · exige INC Implementation |
| **SYSTEM v1.4 → v1.5** | Novo runtime registado (INC) ou consolidação major |

---

## 8. Relação com ARC-001

`npm run test:architecture-conformance` valida integridade de baselines registadas no golden manifest. **FAIL bloqueia** registo INC subsequentes até correcção.

---

## 9. Referências

- [BASELINE-SYSTEM-v1.4.md](BASELINE-SYSTEM-v1.4.md)
- [ARCHITECTURE-CHANGELOG.md](ARCHITECTURE-CHANGELOG.md)
- [ARC-001-ARCHITECTURE-CONFORMANCE.md](../evidence/ARC-001-ARCHITECTURE-CONFORMANCE.md)
