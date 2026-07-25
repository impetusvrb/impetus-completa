# INC-047 — Ishikawa Registration & BASELINE-SYSTEM v1.4

**Data:** 2026-07-17  
**Tipo:** Architecture Registration INC — **governança exclusiva**  
**Modo:** Architecture Registration Only — **nenhuma implementação**

---

## Declaração de escopo

| Proibido (confirmado) | Estado |
|-----------------------|--------|
| Alteração de código (`.js`, `.jsx`, `.css`, `.sql`) | **ZERO** |
| Alteração Z.19 / Z.20 / Z.22 / Z.23 Ishikawa | **ZERO** |
| Alteração `quality_native` / `ppap_native` / `msa_native` / `logistics_native` | **ZERO** |
| Alteração `cognitiveRuntimeFacade` | **ZERO** |
| Alteração Promotion / CentroComando / Signal Loader | **ZERO** |
| Alteração APIs / banco de dados / testes / ARC-001 | **ZERO** |
| Deploy / PM2 restart | **ZERO** |

**Entregáveis (apenas documentação):**

- [BASELINE-SYSTEM-v1.4.md](../architecture/BASELINE-SYSTEM-v1.4.md) — índice mestre actualizado
- [EVOLUTION-TAXONOMY.md](../architecture/EVOLUTION-TAXONOMY.md) — taxonomia actualizada pós Ishikawa
- [SYSTEM-RUNTIME-INVENTORY.md](../architecture/SYSTEM-RUNTIME-INVENTORY.md) — inventário oficial 11 runtimes
- [ARCHITECTURE-CHANGELOG.md](../architecture/ARCHITECTURE-CHANGELOG.md) — registo de versões SYSTEM
- Este relatório de registo arquitectural

**Base obrigatória auditada:**

- [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) (LOCKED — superseded por v1.4)
- [BASELINE-ISHIKAWA-v1.0.md](BASELINE-ISHIKAWA-v1.0.md)
- [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md)
- [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md)
- GF-014 → GF-020 (sequência greenfield Ishikawa completa)
- [GF-020-ISHIKAWA-HOMOLOGATION.md](GF-020-ISHIKAWA-HOMOLOGATION.md)

---

## Objetivo

Registrar oficialmente o runtime **`ishikawa_native`** no inventário arquitectural homologado do IMPETUS, promovendo o índice mestre de **BASELINE-SYSTEM v1.3** para **BASELINE-SYSTEM v1.4**.

Esta INC **não implementa** funcionalidades. Reconhece que o Ishikawa passou de greenfield concluído (GF-014→GF-020) a **décimo primeiro runtime cognitivo homologado**.

---

## Critérios de encerramento

| Flag | Valor | Evidência |
|------|-------|-----------|
| `INC_047_COMPLETED` | **YES** | Este documento |
| `SYSTEM_BASELINE` | **v1.4** | BASELINE-SYSTEM-v1.4.md |
| `ISHIKAWA_REGISTERED` | **YES** | Inventário § Runtime |
| `SYSTEM_RUNTIME_COUNT` | **11** | Tabela abaixo |
| `CODE_CHANGED` | **NO** | Apenas `backend/docs/` |
| `DATABASE_CHANGED` | **NO** | Zero migrações |
| `API_CHANGED` | **NO** | Zero rotas |
| `UI_CHANGED` | **NO** | Zero `.jsx` alterados |
| `RUNTIME_CHANGED` | **NO** | Zero alteração runtime |
| `BASELINE_ISHIKAWA_v1.0` | **LOCKED** | Índice mestre v1.4 |
| `BASELINE_PPAP_v1.0` | **PRESERVED** | LOCKED |
| `BASELINE_MSA_v1.0` | **PRESERVED** | LOCKED |
| `ARC_001_CONFORMANCE` | **PASS** | `test:architecture-conformance` |

---

## Auditoria — sequência Greenfield Ishikawa

| GF | Documento | Estado | Gate |
|----|-----------|--------|------|
| **GF-014** | [GF-014-ISHIKAWA-DISCOVERY.md](GF-014-ISHIKAWA-DISCOVERY.md) | ✅ Homologado | Discovery read-only |
| **GF-015** | Runtime Foundation | ✅ Homologado | Foundation inactivo |
| **GF-016** | [GF-016-ISHIKAWA-CORE-DOMAIN.md](GF-016-ISHIKAWA-CORE-DOMAIN.md) | ✅ Homologado | Schema + workflow + APIs |
| **GF-017** | Signal Loader | ✅ Homologado | Z.20 real |
| **GF-018** | [GF-018-ISHIKAWA-PROMOTION.md](GF-018-ISHIKAWA-PROMOTION.md) | ✅ Homologado | Z.22/Z.23 gate-driven |
| **GF-019** | [GF-019-ISHIKAWA-PILOT-ENABLEMENT.md](GF-019-ISHIKAWA-PILOT-ENABLEMENT.md) | ✅ Homologado | Massa piloto · binding 1.0 |
| **GF-020** | [GF-020-ISHIKAWA-HOMOLOGATION.md](GF-020-ISHIKAWA-HOMOLOGATION.md) | ✅ Homologado | OFF/ON · cross-domain |
| **Baseline** | [BASELINE-ISHIKAWA-v1.0.md](BASELINE-ISHIKAWA-v1.0.md) | ✅ **LOCKED** | `ISHIKAWA_BASELINE_v1.0` |

**Plano arquitectural:** [ISHIKAWA-ARCHITECTURE-v1.0.md](ISHIKAWA-ARCHITECTURE-v1.0.md) — `ISHIKAWA_BASELINE_v1.0 = LOCKED`

**Testes homologação (referência — re-executados para INC-047):**

```bash
npm run test:ishikawa-runtime-homologation   # 16/16 (GF-020)
npm run test:architecture-conformance        # 84/84 (ARC-001)
```

**Resultado ARC-001 (2026-07-17 — re-execução INC-047):**

```
Architecture Status ..... CONFORMANT
Checks: 84 passed, 0 failed

NO_RUNTIME_CHANGED = YES
BASELINE_SYSTEM_v1.3 = PRESERVED (superseded by v1.4 index)
ARCHITECTURE_CONFORMANCE_SUITE = YES
CI_GATE_READY = YES
```

---

## Verificação de não-regressão arquitectural

| Domínio baseline | Preservado | Notas |
|------------------|------------|-------|
| BASELINE-QUALITY-v1.1 | **YES** | Parent axis Ishikawa |
| BASELINE-PPAP-v1.0 | **YES** | Coexistência quality + ppap + msa + ishikawa |
| BASELINE-MSA-v1.0 | **YES** | Sibling eixo Qualidade |
| BASELINE-LOGISTICS-v1.1 | **YES** | Cross-domain GF-020 verde |
| BASELINE-EXECUTIVE-v1.0 | **YES** | — |
| BASELINE-PRODUCTION-v1.0 | **YES** | — |
| BASELINE-MAINTENANCE-v1.0 | **YES** | — |
| BASELINE-ENVIRONMENT-v1.0 | **YES** | — |
| BASELINE-HR-v1.0 | **YES** | — |
| BASELINE-SAFETY-v1.0 | **YES** | — |
| BASELINE-SYSTEM-v1.3 | **SUPERSEDED** | Conteúdo preservado; índice v1.4 |

---

## Registo oficial — `ishikawa_native`

| Campo | Valor registado |
|-------|-----------------|
| **Runtime ID** | `ishikawa_native` |
| **Família** | Sub-runtime eixo Qualidade |
| **Camada** | Z.19 → Z.23 (paridade PPAP/MSA) |
| **Baseline** | Ishikawa v1.0 |
| **CC Promotion** | **YES** (`IshikawaNativeCockpitPromotion`) |
| **Signal loader** | `ishikawaTenantSignalLoader` |
| **Payload canónico** | `ishikawa_cognitive_runtime` + `ishikawa_cognitive_centers` |
| **Binding piloto** | **1.0** (12/12 blocos) |
| **Cognitive Centers** | **10** |
| **Data homologação** | 2026-07-17 (GF-020) |
| **Data registo SYSTEM** | 2026-07-17 (INC-047) |
| **Sequência origem** | GF-014 → GF-020 |
| **Impacto comportamental** | **Nenhum** (registo documental) |

---

## Inventário de runtimes homologados (pós INC-047)

| # | Domínio | Runtime ID | Baseline | Versão | Estado | Homologação |
|---|---------|------------|----------|--------|--------|-------------|
| 1 | Executive | `executive_boardroom` | EXECUTIVE | v1.0 | **LOCKED** | 2026-07-15 |
| 2 | Production | `production_native` | PRODUCTION | v1.0 | **LOCKED** | 2026-07-15 |
| 3 | Maintenance | `maintenance_native` | MAINTENANCE | v1.0 | **LOCKED** | 2026-07-15 |
| 4 | Quality | `quality_native` | QUALITY | v1.1 | **LOCKED** | 2026-07-16 |
| 5 | Logistics | `logistics_native` | LOGISTICS | v1.1 | **LOCKED** | 2026-07-16 |
| 6 | PPAP | `ppap_native` | PPAP | v1.0 | **LOCKED** | 2026-07-16 |
| 7 | MSA | `msa_native` | MSA | v1.0 | **LOCKED** | 2026-07-17 |
| 8 | **Ishikawa** | **`ishikawa_native`** | **ISHIKAWA** | **v1.0** | **LOCKED** | **2026-07-17** |
| 9 | Environment | `environmental_native` | ENVIRONMENT | v1.0 | **LOCKED** | 2026-07-15 |
| 10 | HR | `hr_native` | HR | v1.0 | **LOCKED** | 2026-07-15 |
| 11 | SST | `safety_native` | SAFETY | v1.0 | **LOCKED** | 2026-07-15 |

**Total runtimes nativos LOCKED:** **11** (era 10 em SYSTEM v1.3)

**Greenfields runtime pendentes:** `finance_native`, `supply_native`

---

## Catálogo Greenfields concluídos

| Greenfield | Sequência | Runtime resultante | Baseline | Registo SYSTEM |
|------------|-----------|-------------------|----------|----------------|
| **PPAP** | GF-000 → GF-006 | `ppap_native` | BASELINE-PPAP-v1.0 | INC-045 (v1.2) |
| **MSA** | GF-007 → GF-013 | `msa_native` | BASELINE-MSA-v1.0 | INC-046 (v1.3) |
| **Ishikawa** | GF-014 → GF-020 | `ishikawa_native` | BASELINE-ISHIKAWA-v1.0 | **INC-047 (v1.4)** |

> Ishikawa é o **terceiro greenfield** registado formalmente no índice mestre SYSTEM, espelhando a disciplina PPAP e MSA.

---

## Delta face a SYSTEM v1.3

| Aspecto | v1.3 | v1.4 |
|---------|------|------|
| Domínios cognitivos LOCKED | 10 | **11** (+ Ishikawa) |
| CC Promotion nativa | Quality + Logistics + PPAP + MSA | + **Ishikawa** |
| Payload Z.23 | quality + logistics + ppap + msa | + **`ishikawa_cognitive_runtime`** |
| Loaders homologados | quality + logistics + ppap + msa | + **ishikawa** |
| Greenfield Ishikawa | Pendente (roadmap) | **LOCKED v1.0** |
| Código alterado | ZERO (INC-046) | **ZERO** (INC-047) |

---

## Resolvido nesta INC

| Item v1.3 | Resolução |
|-----------|-----------|
| Ishikawa listado como «EV / GF Quality» (roadmap) | **Registado** como `ishikawa_native` LOCKED |
| «Próxima evolução SYSTEM v1.4 após INC transversal» | **Publicado** |
| Recomendação GF-020 → INC-047 | **Executada** |

---

## Roadmap actualizado (referência v1.4)

Ishikawa **concluído**. Próximas evoluções **sem reabrir espinha dorsal**:

| Prioridade | Item | Tipo |
|------------|------|------|
| 1 | **Consolidação plataforma** | Revisão doc · ARC-001 · inventário congelado |
| 2 | Picking | EV Logistics |
| 3 | Fleet AI | EV Logistics |
| 4 | Finance Native | GF runtime |
| 5 | Supply Native | GF runtime |
| 6 | APQP extensão | EV PPAP |

---

## Referências

| Documento | Relação |
|-----------|---------|
| [INC-046-ARCHITECTURE-REGISTRATION.md](INC-046-ARCHITECTURE-REGISTRATION.md) | Predecessor — SYSTEM v1.3 |
| [BASELINE-SYSTEM-v1.4.md](../architecture/BASELINE-SYSTEM-v1.4.md) | Índice mestre publicado |
| [BASELINE-ISHIKAWA-v1.0.md](BASELINE-ISHIKAWA-v1.0.md) | Baseline domínio registado |
| [BASELINE-MSA-v1.0.md](../architecture/BASELINE-MSA-v1.0.md) | Baseline sibling |
| [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) | Baseline sibling |
| [EVOLUTION-TAXONOMY.md](../architecture/EVOLUTION-TAXONOMY.md) | Política de evolução |
| [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md) | Guardião arquitectural |

---

## Decisão INC-047

**APROVADO — registo arquitectural concluído.**

O runtime **`ishikawa_native`** integra oficialmente a arquitectura homologada do IMPETUS como **décimo primeiro runtime cognitivo nativo**, sem alteração de comportamento, código ou infraestrutura.

**Próximo passo operacional:** pausa no crescimento horizontal · consolidação plataforma · evoluções funcionais via **EV-*** ou novos domínios via **GF-*** — alterações nucleares apenas via **INC-***.
