# REV-001 — Master Project Conformance

**Revisão:** REV-001  
**Modo:** READ ONLY  
**Data:** 2026-07-18

---

## FASE 2 — Identificação do Master Project

### Decisão: **Conjunto de documentos mestres** (não documento único)

O projeto IMPETUS **não** está num único ficheiro. A visão arquitectural consolidada distribui-se por um **núcleo normativo** + **roadmaps de programa** + **baselines homologados** + **evidências de entrega**.

### Núcleo normativo (obrigatório)

| Papel | Documento |
|-------|-----------|
| **Índice mestre global** | `backend/docs/architecture/BASELINE-SYSTEM-v1.4.md` |
| **Inventário runtimes** | `backend/docs/architecture/SYSTEM-RUNTIME-INVENTORY.md` |
| **Taxonomia evolução** | `backend/docs/architecture/EVOLUTION-TAXONOMY.md` |
| **Norma Greenfield** | `backend/docs/architecture/ARC-002-GREENFIELD-DELIVERY-STANDARD.md` |
| **Ciclo de entrega** | `backend/docs/architecture/DELIVERY-LIFECYCLE.md` |
| **Conformidade runtime** | `backend/docs/evidence/ARC-001-ARCHITECTURE-CONFORMANCE.md` |

### Roadmaps de programa (complementares)

| Programa | Documento | Âmbito |
|----------|-----------|--------|
| Supply Greenfield | `GF-021-ROADMAP.md` | GF-022→027 |
| WMS OCP | `WMS-IMPLEMENTATION-ROADMAP.md` | WMS-001→006 |
| Supply discovery | `GF-021-DISCOVERY.md`, `DEC-001-DOMAIN-SELECTION.md` | Bounded context |

### Baselines homologados (estado LOCKED)

13 baselines referenciados em BASELINE-SYSTEM v1.4 (Quality, Logistics, PPAP, MSA, Ishikawa, Executive, Production, Maintenance, Environment, HR, Safety, UI, Dashboards).

### Justificação

1. **BASELINE-SYSTEM v1.4** declara-se explicitamente *índice mestre* — não contém detalhe de implementação WMS ou Supply.
2. **Dois programas paralelos autorizados** (EV-001 C-2): WMS OCP + Supply GF — cada um com roadmap próprio.
3. **INC-047** congelou 11 runtimes; evoluções posteriores (Supply GF-022+) **não alteram** baselines LOCKED — conforme taxonomia.
4. Documentos AIOI/ICEB são **referência histórica** — anteriores ou paralelos ao congelamento v1.4.

---

## FASE 3 — Conformidade global código vs master

### Veredicto global

| Resultado | Classificação |
|-----------|---------------|
| **MASTER PROJECT STATUS** | **IMPLEMENTAÇÃO ADERENTE COM LACUNAS** |

### Fundamentação

| Dimensão | Aderência | Notas |
|----------|:---------:|-------|
| 11 runtimes LOCKED (v1.4) | ✅ Alta | Código + facade + testes architecture-conformance |
| Taxonomia GF/INC/EV | ✅ Alta | Supply e WMS seguem trilhas documentadas |
| Isolamento WMS ↔ Supply | ✅ Alta | Sem imports cruzados verificados |
| Completude operacional Logística/WMS | ⚠️ Média | WMS-003+ pendente (planeado) |
| Supply Greenfield | ⚠️ Média | GF-024 ✅; GF-025+ pendente (planeado) |
| Critério estrito REV (CC+menu+RBAC+API) | ⚠️ Baixa em vários | Vários módulos **cockpit-only** ou **flags OFF** |

**Não classificado como DIVERGENTE** porque lacunas correspondem a fases **documentadas e autorizadas** (WMS-003…006, GF-025…027), não a desvios arquitecturais não planeados.

---

## Matriz domínio — resumo

| Domínio | Previsto (master) | Implementado | Classificação |
|---------|-------------------|--------------|---------------|
| **Qualidade** | `quality_native` LOCKED, CC, ops+gov | Runtime + APIs + CC + menu (prod ON) | **IMPLEMENTADO** * |
| **SST / Segurança** | `safety_native` LOCKED | Runtime + APIs + CC; menu parcial | **IMPLEMENTADO PARCIALMENTE** |
| **Meio Ambiente** | `environmental_native` LOCKED | Runtime + APIs + CC + menu (prod ON) | **IMPLEMENTADO** * |
| **Logística** | `logistics_native` LOCKED, CC 7 hubs | Runtime + CC; menu flags OFF; ops gaps | **IMPLEMENTADO PARCIALMENTE** |
| **Supply** | GF-021→027 `supply_native` | GF-022/023/024 ✅; sem API/UI/CC | **IMPLEMENTADO PARCIALMENTE** |
| **Executive** | `executive_boardroom` LOCKED | Portal deep-link; CC adapter | **IMPLEMENTADO PARCIALMENTE** |
| **PPAP** | `ppap_native` LOCKED, CC 6 hubs | APIs + CC; sem rotas/menu dedicados | **IMPLEMENTADO PARCIALMENTE** |
| **MSA** | `msa_native` LOCKED, CC 6 hubs | APIs + CC; foundation manifest | **IMPLEMENTADO PARCIALMENTE** |
| **Ishikawa** | `ishikawa_native` LOCKED, CC 10 hubs | APIs + CC; foundation manifest | **IMPLEMENTADO PARCIALMENTE** |
| **WMS** | WMS-001→006 OCP | WMS-001/002 ✅; flags OFF; menu oculto | **IMPLEMENTADO PARCIALMENTE** |
| Production | `production_native` LOCKED | Facade Z.P0; sem UI industrial dedicada | **IMPLEMENTADO PARCIALMENTE** |
| Maintenance | `maintenance_native` LOCKED | Facade Z.M1; dashboard mecânico | **IMPLEMENTADO PARCIALMENTE** |
| HR | `hr_native` LOCKED | Facade Z.26 | **IMPLEMENTADO PARCIALMENTE** |

\* *IMPLEMENTADO* sob critério REV quando flags produção activas + registries + CC + navegação publicada.

---

## Conformidade normativa

| Norma | Estado |
|-------|--------|
| ARC-001 (`test:architecture-conformance`) | **PRESERVADA** — suite activa |
| ARC-002 (Greenfield delivery) | **PRESERVADA** — Supply GF-022…024 conforme |
| BASELINE-SYSTEM v1.4 | **PRESERVADA** — 11 runtimes não alterados por GF/WMS |
| EV-001 condições | **PARCIAL** — C-4 testes BD pendente CI |

---

## Tensões documentação ↔ código (não divergências)

| Tensão | Descrição | Impacto |
|--------|-----------|---------|
| T-01 | `HOMOLOGATED_RUNTIMES` inclui PPAP/Logistics; `cognitiveDomainRegistry` marca `maturity: foundation` | Baixo — naming |
| T-02 | SYSTEM v1.4 lista 11 LOCKED; MSA/Ishikawa também em `FOUNDATION_RUNTIMES` no manifest | Baixo — test taxonomy |
| T-03 | `BASELINE-SUPPLY-v1.0` (doc legado) vs Supply GF (runtime novo) | Médio — nomenclatura |
| T-04 | ICEB prevê mais endpoints do que WMS-002 entrega | Esperado — WMS-003+ |

---

## Etapas concluídas (contexto REV-001)

```
AUD-001 ✅  EV-001 ✅ (WITH CONDITIONS)
WMS-001 ✅  WMS-002 ✅
GF-022 ✅  GF-023 ✅  GF-024 ✅
```

---

*Detalhe por domínio:* [REV-001-DOMAIN-COVERAGE.md](./REV-001-DOMAIN-COVERAGE.md)  
*Lacunas:* [REV-001-GAP-MATRIX.md](./REV-001-GAP-MATRIX.md)
