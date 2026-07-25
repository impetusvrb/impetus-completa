# INC-046 — MSA Registration & BASELINE-SYSTEM v1.3

**Data:** 2026-07-17  
**Tipo:** Architecture Registration INC — **governança exclusiva**  
**Modo:** Architecture Governance Only — **nenhuma implementação**

---

## Declaração de escopo

| Proibido (confirmado) | Estado |
|-----------------------|--------|
| Alteração de código (`.js`, `.jsx`, `.css`, `.sql`) | **ZERO** |
| Alteração Z.19 / Z.20 / Z.22 / Z.23 MSA | **ZERO** |
| Alteração `quality_native` / `ppap_native` / `logistics_native` | **ZERO** |
| Alteração `cognitiveRuntimeFacade` | **ZERO** |
| Alteração Promotion / CentroComando / Signal Loader | **ZERO** |
| Alteração APIs / banco de dados / ARC-001 | **ZERO** |
| Deploy / PM2 restart | **ZERO** |

**Entregáveis:**

- [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) — índice mestre actualizado
- [EVOLUTION-TAXONOMY.md](../architecture/EVOLUTION-TAXONOMY.md) — taxonomia actualizada pós MSA
- Este relatório de registo arquitectural

**Base obrigatória auditada:**

- [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) (LOCKED — superseded por v1.3)
- [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md)
- GF-007 → GF-013 (sequência greenfield MSA completa)
- [GF-013-MSA-HOMOLOGATION.md](GF-013-MSA-HOMOLOGATION.md)

---

## Objetivo

Registrar oficialmente o runtime **`msa_native`** no inventário arquitectural homologado do IMPETUS, promovendo o índice mestre de **BASELINE-SYSTEM v1.2** para **BASELINE-SYSTEM v1.3**.

Esta INC **não implementa** funcionalidades. Reconhece que o MSA passou de greenfield concluído (GF-007→GF-013) a **décimo runtime cognitivo homologado**.

---

## Critérios de encerramento

| Flag | Valor | Evidência |
|------|-------|-----------|
| `INC_046_COMPLETED` | **YES** | Este documento |
| `SYSTEM_BASELINE` | **v1.3** | BASELINE-SYSTEM-v1.3.md |
| `MSA_REGISTERED` | **YES** | Inventário § Runtime |
| `TOTAL_HOMOLOGATED_RUNTIMES` | **10** | Tabela abaixo |
| `NO_CODE_CHANGED` | **YES** | Apenas `backend/docs/` |
| `NO_DATABASE_CHANGED` | **YES** | Zero migrações |
| `NO_RUNTIME_CHANGED` | **YES** | Zero alteração runtime |
| `NO_UI_CHANGED` | **YES** | Zero `.jsx` alterados |
| `BASELINE_MSA_v1.0_REGISTERED` | **YES** | Índice mestre v1.3 |
| `BASELINE_PPAP_v1.0_REGISTERED` | **YES** | Preservado v1.2 |
| `ARC_001_CONFORMANCE` | **PASS** | `test:architecture-conformance` |

---

## Auditoria — sequência Greenfield MSA

| GF | Documento | Estado | Gate |
|----|-----------|--------|------|
| **GF-007** | [GF-007-MSA-DISCOVERY.md](GF-007-MSA-DISCOVERY.md) | ✅ Homologado | Discovery read-only |
| **GF-008** | [GF-008-MSA-RUNTIME-FOUNDATION.md](GF-008-MSA-RUNTIME-FOUNDATION.md) | ✅ Homologado | Foundation inactivo |
| **GF-009** | [GF-009-MSA-CORE-DOMAIN.md](GF-009-MSA-CORE-DOMAIN.md) | ✅ Homologado | Schema + workflow + APIs |
| **GF-010** | [GF-010-MSA-SIGNAL-LOADER.md](GF-010-MSA-SIGNAL-LOADER.md) | ✅ Homologado | Z.20 real |
| **GF-011** | [GF-011-MSA-PROMOTION.md](GF-011-MSA-PROMOTION.md) | ✅ Homologado | Z.22/Z.23 gate-driven |
| **GF-012** | [GF-012-MSA-PILOT-ENABLEMENT.md](GF-012-MSA-PILOT-ENABLEMENT.md) | ✅ Homologado | Massa piloto · binding 1.0 |
| **GF-013** | [GF-013-MSA-HOMOLOGATION.md](GF-013-MSA-HOMOLOGATION.md) | ✅ Homologado | OFF/ON · cross-domain |
| **Baseline** | [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md) | ✅ **LOCKED** | `MSA_BASELINE_v1.0` |

**Plano arquitectural:** [MSA-ARCHITECTURE-v1.0.md](MSA-ARCHITECTURE-v1.0.md) — `MSA_BASELINE_v1.0 = LOCKED`

**Testes homologação (referência — re-executados para INC-046):**

```bash
npm run test:msa-runtime-homologation   # 11/11 (GF-013)
npm run test:architecture-conformance   # 75/75 (ARC-001)
```

**Resultado ARC-001 (2026-07-17 — re-execução INC-046):**

```
SurfaceCapabilities ..... PASS
CentroComando ........... PASS
Threshold Policy ........ PASS
Baseline Integrity ...... PASS

Architecture Status ..... CONFORMANT
Checks: 75 passed, 0 failed

NO_RUNTIME_CHANGED = YES (ARC-001 adds tests/docs only)
BASELINE_SYSTEM_v1.2 = PRESERVED
ARCHITECTURE_CONFORMANCE_SUITE = YES
CI_GATE_READY = YES
```

---

## Verificação de não-regressão arquitectural

| Domínio baseline | Preservado | Notas |
|------------------|------------|-------|
| BASELINE-QUALITY-v1.1 | **YES** | Parent axis MSA |
| BASELINE-PPAP-v1.0 | **YES** | Coexistência quality + ppap + msa |
| BASELINE-LOGISTICS-v1.1 | **YES** | Cross-domain GF-013 verde |
| BASELINE-EXECUTIVE-v1.0 | **YES** | — |
| BASELINE-PRODUCTION-v1.0 | **YES** | — |
| BASELINE-MAINTENANCE-v1.0 | **YES** | — |
| BASELINE-ENVIRONMENT-v1.0 | **YES** | — |
| BASELINE-HR-v1.0 | **YES** | — |
| BASELINE-SAFETY-v1.0 | **YES** | — |
| BASELINE-SYSTEM-v1.2 | **SUPERSEDED** | Conteúdo preservado; índice v1.3 |

---

## Registo oficial — `msa_native`

| Campo | Valor registado |
|-------|-----------------|
| **Runtime ID** | `msa_native` |
| **Família** | Sub-runtime eixo Qualidade |
| **Camada** | Z.19 → Z.23 (paridade PPAP) |
| **Baseline** | MSA v1.0 |
| **CC Promotion** | **YES** (`MsaNativeCockpitPromotion`) |
| **Signal loader** | `msaTenantSignalLoader` |
| **Payload canónico** | `msa_cognitive_runtime` + `msa_cognitive_centers` |
| **Binding piloto** | **1.0** (12/12 blocos) |
| **Data homologação** | 2026-07-17 (GF-013) |
| **Data registo SYSTEM** | 2026-07-17 (INC-046) |
| **Sequência origem** | GF-007 → GF-013 |

---

## Inventário de runtimes homologados (pós INC-046)

| # | Domínio | Runtime ID | Baseline | Versão | Estado | Homologação |
|---|---------|------------|----------|--------|--------|-------------|
| 1 | Executive | `executive_boardroom` | EXECUTIVE | v1.0 | **LOCKED** | 2026-07-15 |
| 2 | Production | `production_native` | PRODUCTION | v1.0 | **LOCKED** | 2026-07-15 |
| 3 | Maintenance | `maintenance_native` | MAINTENANCE | v1.0 | **LOCKED** | 2026-07-15 |
| 4 | Quality | `quality_native` | QUALITY | v1.1 | **LOCKED** | 2026-07-16 |
| 5 | Logistics | `logistics_native` | LOGISTICS | v1.1 | **LOCKED** | 2026-07-16 |
| 6 | PPAP | `ppap_native` | PPAP | v1.0 | **LOCKED** | 2026-07-16 |
| 7 | **MSA** | **`msa_native`** | **MSA** | **v1.0** | **LOCKED** | **2026-07-17** |
| 8 | Environment | `environmental_native` | ENVIRONMENT | v1.0 | **LOCKED** | 2026-07-15 |
| 9 | HR | `hr_native` | HR | v1.0 | **LOCKED** | 2026-07-15 |
| 10 | SST | `safety_native` | SAFETY | v1.0 | **LOCKED** | 2026-07-15 |

**Total runtimes nativos LOCKED:** **10** (era 9 em SYSTEM v1.2)

**Greenfields runtime pendentes:** `finance_native`, `supply_native`

---

## Catálogo Greenfields concluídos

| Greenfield | Sequência | Runtime resultante | Baseline | Registo SYSTEM |
|------------|-----------|-------------------|----------|----------------|
| **PPAP** | GF-000 → GF-006 | `ppap_native` | BASELINE-PPAP-v1.0 | INC-045 (v1.2) |
| **MSA** | GF-007 → GF-013 | `msa_native` | BASELINE-MSA-v1.0 | **INC-046 (v1.3)** |

> MSA é o **segundo greenfield** registado formalmente no índice mestre SYSTEM, espelhando a disciplina PPAP.

---

## Delta face a SYSTEM v1.2

| Aspecto | v1.2 | v1.3 |
|---------|------|------|
| Domínios cognitivos LOCKED | 9 | **10** (+ MSA) |
| CC Promotion nativa | Quality + Logistics + PPAP | + **MSA** |
| Payload Z.23 | quality + logistics + ppap | + **`msa_cognitive_runtime`** |
| Loaders homologados | quality + logistics + ppap | + **msa** |
| Greenfield MSA | Pendente (roadmap) | **LOCKED v1.0** |
| Código alterado | ZERO (INC-045) | **ZERO** (INC-046) |

---

## Resolvido nesta INC

| Item v1.2 | Resolução |
|-----------|-----------|
| MSA listado como «GF futuro» (§ débitos / roadmap) | **Registado** como `msa_native` LOCKED |
| «Próxima evolução SYSTEM v1.3 após INC transversal» | **Publicado** |
| Recomendação GF-013 → INC-046 | **Executada** |

---

## Roadmap actualizado (referência v1.3)

MSA **concluído**. Próximas evoluções **sem reabrir espinha dorsal**:

| Prioridade | Item | Tipo |
|------------|------|------|
| 1 | Ishikawa UI | EV / GF Quality |
| 2 | Picking | EV Logistics |
| 3 | Fleet AI | EV Logistics |
| 4 | Finance Native | GF runtime |
| 5 | Supply Native | GF runtime |
| 6 | APQP extensão | EV PPAP |

---

## Referências

| Documento | Relação |
|-----------|---------|
| [INC-045-PPAP-REGISTRATION.md](INC-045-PPAP-REGISTRATION.md) | Predecessor — SYSTEM v1.2 |
| [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) | Índice mestre publicado |
| [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md) | Baseline domínio registado |
| [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) | Baseline sibling |
| [EVOLUTION-TAXONOMY.md](../architecture/EVOLUTION-TAXONOMY.md) | Política de evolução |
| [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md) | Guardião arquitectural |

---

## Decisão INC-046

**APROVADO — registo arquitectural concluído.**

O runtime **`msa_native`** integra oficialmente a arquitectura homologada do IMPETUS como **décimo runtime cognitivo nativo**, sem alteração de comportamento, código ou infraestrutura.

**Próximo passo operacional:** evoluções funcionais via **EV-*** ou novos domínios via **GF-*** — alterações nucleares apenas via **INC-***.
