# GF-007 — MSA Discovery & Architecture Audit (READ-ONLY)

**Data:** 2026-07-16  
**Tipo:** auditoria read-only (sem implementação)  
**Pré-requisitos:** [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) (LOCKED) · [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md)  
**Plano arquitectural:** [MSA-ARCHITECTURE-v1.0.md](MSA-ARCHITECTURE-v1.0.md)  
**Metodologia:** espelha [GF-000-PPAP-DISCOVERY.md](GF-000-PPAP-DISCOVERY.md) — descobrir antes de construir

---

## Declaração de escopo

| Proibido | Estado |
|----------|--------|
| Alteração de código | **ZERO** |
| Alteração de CSS | **ZERO** |
| Alteração de banco / migrations | **ZERO** |
| Alteração de APIs / runtimes / loaders / Promotion | **ZERO** |
| Alteração de CentroComando / registries / SurfaceCapabilities | **ZERO** |
| PM2 restart / build | **ZERO** |

---

## Critérios obrigatórios de encerramento

| Flag | Valor |
|------|-------|
| `READ_ONLY` | **YES** |
| `CODE_CHANGED` | **NO** |
| `DATABASE_CHANGED` | **NO** |
| `UI_CHANGED` | **NO** |
| `RUNTIME_CHANGED` | **NO** |
| `BASELINE_SYSTEM_v1.2` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** (65/65 CONFORMANT) |

---

## Resumo executivo

**MSA (Measurement System Analysis) não existe no IMPETUS** — nem como módulo, runtime cognitivo, API dedicada, schema `msa_*`, página, widget ou hub.

Pesquisa em `backend/src/`, `frontend/src/`, `backend/migrations/`, `backend/tests/` e `cognitiveRuntime/` retornou **zero ocorrências** de:

- `msa`, `MSA`, `msa_native`, `measurement_system`
- `Gauge R&R`, `Gage R&R`, `GRR`, `attribute_agreement`
- `AIAG MSA`, `Variable Gauge`, `Measurement System Analysis`

**Falsos positivos descartados:**

| Match | Motivo |
|-------|--------|
| `application/vnd.msa-disk-image` | MIME type em bundles AIOI test SSR |
| `setGauge` / `IndustrialMiniGauge` | Widgets visuais KPI — **não** MSA metrológico |
| `aioiBaselineReproducibilityService` | Reprodutibilidade de **baseline software** AIOI — **não** reproducibility MSA |
| `runtimeCalibration` / Pulse HR calibration | Calibração de **runtime/pulse** — **não** calibração de instrumento |
| `equipment` tables | Cadastro de **ativos/manutenção** — **não** cadastro de gages |

**Conclusão:** o domínio MSA é **greenfield puro** ao nível de produto, com **componentes estatísticos adjacentes reutilizáveis** (SPC, Cp/Cpk, inspeções dimensionais, evidências PPAP) — **sem risco de duplicar um runtime MSA oculto**.

**Cenário recomendado:** **Cenário A** — sequência GF-008→GF-013 espelhando PPAP, com bridges read-only para Quality/PPAP.

---

## Etapa 1 — Pesquisa textual (codebase)

### Termos auditados

**Primários:** MSA · Measurement System Analysis · Gauge R&R · Gage R&R · Repeatability · Reproducibility · Bias · Linearity · Stability · Measurement Capability · AIAG MSA · Variable Gauge · Attribute Agreement

**Variações:** `msa` · `grr` · `gauge` · `gage` · `measurement_system` · `repeatability` · `reproducibility` · `bias` · `linearity` · `stability` · `attribute_agreement`

### Resultado por camada (código de produção, excl. `docs/`)

| Camada | Matches MSA-específicos | Notas |
|--------|-------------------------|-------|
| `backend/src/**/*.js` | **0** | — |
| `frontend/src/**/*.{js,jsx}` | **0** | Gauges UI ≠ MSA |
| `backend/migrations/*.sql` | **0** | — |
| `backend/tests/**` (excl. docs) | **0** | — |
| `cognitiveRuntime/**` | **0** | — |
| Ficheiros `*msa*` / `*MSA*` | **0** | Glob: apenas `smsAdapter.js` (SMS) |
| `backend/docs/evidence/*.md` | **20+** | Roadmap / baseline — NÃO IMPLEMENTADO |

---

## Etapa 2 — Flags Backend

| Flag | Valor | Evidência |
|------|-------|-----------|
| `MSA_ENGINE_EXISTS` | **NO** | Nenhum `*msa*Engine.js` |
| `MSA_SERVICE_EXISTS` | **NO** | Nenhum `*msa*Service.js` |
| `MSA_API_EXISTS` | **NO** | Nenhuma rota `/msa` ou `/measurement-system` |
| `MSA_SCHEMA_EXISTS` | **NO** | Nenhuma migration `msa_*` |
| `MSA_TABLES_EXIST` | **NO** | Zero tabelas MSA/GRR/gage study |
| `MSA_DATA_EXIST` | **NO** | Sem massa MSA em BD |

### Inventário backend auditado

| Categoria | Resultado MSA | Artefactos adjacentes (reutilizáveis) |
|-----------|---------------|--------------------------------------|
| **Services** | Ausente | `qualitySpcSeriesService.js`, `ppapEvidenceService.js` |
| **Controllers/Routes** | Ausente | `qualityGovernance.js` (SPC/FMEA rank), `ppap.js` |
| **Runtime cognitivo** | Ausente | `ppap_native`, `quality_native` (LOCKED) |
| **Loaders** | Ausente | `qualityTenantSignalLoader`, `ppapTenantSignalLoader` |
| **Engines** | Ausente | `qualitySpcEngine.js`, `qualityProcessCapabilityEngine.js`, `qualityFmeaRuntime.js` |
| **Adapters** | Ausente | `qualitySpcSeriesAdapter.js` |
| **DTOs/Semantics** | Ausente | `ppapCoreSemantics.js` (padrão GF-002) |
| **Schemas/Migrations** | Ausente | `ppap_*` tables, `quality_inspections`, `supplier_quality_metrics` |
| **Testes** | Ausente | `qualityGovernanceRuntimeScenarios.js` (SPC/FMEA smoke) |

---

## Etapa 3 — Flags Frontend

| Flag | Valor | Evidência |
|------|-------|-----------|
| `MSA_WIDGET_EXISTS` | **NO** | — |
| `MSA_PAGE_EXISTS` | **NO** | — |
| `MSA_HUB_EXISTS` | **NO** | — |
| `MSA_ADAPTER_EXISTS` | **NO** | — |

### Inventário frontend auditado

| Categoria | Resultado MSA | Notas |
|-----------|---------------|-------|
| **Páginas / rotas** | Ausente | Domínio `quality/` (81 ficheiros) — sem MSA |
| **Widgets CC** | Ausente | `IndustrialMiniGauge` = visual KPI |
| **Hubs cognitivos** | Ausente | Quality/PPAP hubs LOCKED — sem ramo MSA |
| **Registries** | Ausente | Sem `msaNativeCockpitRegistry.js` |
| **Lazy modules** | Ausente | — |
| **Shells referenciados** | **PLACEHOLDER** | `qualityGovernanceUiEngine.js` referencia `fmea_panel`, `ishikawa_canvas`, `supplier_quality` — **FmeaPanel.jsx não existe** |

---

## Etapa 4 — Runtime cognitivo

| Flag | Valor | Evidência |
|------|-------|-----------|
| `MSA_RUNTIME_EXISTS` | **NO** | — |
| `MSA_BLOCK_PACK_EXISTS` | **NO** | — |
| `MSA_SIGNAL_LOADER_EXISTS` | **NO** | — |
| `MSA_PROMOTION_EXISTS` | **NO** | — |
| `MSA_CONSOLIDATOR_EXISTS` | **NO** | — |

### Verificação em componentes nucleares

| Componente | Referência MSA |
|------------|----------------|
| `cognitiveDomainRegistry.js` | **9 domínios** — quality, ppap, logistics… **sem `msa`** |
| `cognitiveRuntimeFacade.js` | Sem ramo `msa_*` |
| `cockpit registries` FE | quality · logistics · ppap — **sem msa** |
| `pilot packs` | `ppapCognitiveBlockPack.js` — **sem blocos MSA** |
| `signal loaders` | quality · ppap · logistics — **sem msa** |
| `promotion / consolidation` | Z.22/Z.23 quality/logistics/ppap — **sem msa** |

**Referência documental PPAP:** elemento AIAG #8 «MSA studies» classificado como **GREENFIELD** em [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md) §4.2.

---

## Etapa 5 — Reutilização (classificação objetiva)

| Componente | Origem | Classificação | Uso futuro MSA |
|------------|--------|---------------|----------------|
| `qualitySpcEngine.js` | Quality | **PARTIAL** | Subgrupos, X-bar/R, regras Nelson/WE — **não** ANOVA GRR |
| `qualityProcessCapabilityEngine.js` | Quality | **PARTIAL** | Cp/Cpk/Pp/Ppk — **não** %GRR/Tolerance |
| `qualitySpcSeriesService.js` | Quality | **PARTIAL** | Medidas de `quality_inspections` — input variable MSA |
| `qualityFmeaRuntime.js` | Quality | **PARTIAL** | `rankFmeaRows` — risco, não metrologia |
| `qualityRootCauseEngine.js` | Quality | **PARTIAL** | `buildIshikawaTemplate()` — sem UI |
| `quality_inspections` (BD) | Quality | **READY_TO_REUSE** | Bridge read-only para dados de medição |
| `ppap_dimensional_results` | PPAP | **PARTIAL** | Medição unitária por característica — **não** estudo GRR |
| `ppap_capability_studies` | PPAP | **PARTIAL** | Snapshot Cp/Cpk PPAP — **não** MSA formal |
| `supplier_quality_metrics` | Supply/Quality | **PARTIAL** | Scorecard fornecedor — sem gage tracking |
| `qualityTenantSignalLoader` | Quality | **READY_TO_REUSE** | **Padrão** Z.20 para `msaTenantSignalLoader` |
| Stack `ppap_native` GF-000→006 | PPAP | **READY_TO_REUSE** | **Metodologia** greenfield completa |
| `quality_native` runtime | Quality | **READY_TO_REUSE** | Parent axis · coexistência (modelo PPAP) |
| `FmeaPanel` shell | Quality UI engine | **PLACEHOLDER** | Referência em `qualityGovernanceUiEngine.js` — ficheiro ausente |
| `IshikawaCanvas` | Quality | **PLACEHOLDER** | Engine template only |
| `technical_library_equipments` | Maintenance | **LEGACY** | Equipamentos produção — **não** gages MSA |
| `runtimeCalibration` | Platform | **LEGACY** | Calibração runtime IMPETUS — domínio distinto |
| GRR / Attribute Agreement engine | — | **GREENFIELD** | A construir GF-009+ |

---

## Etapa 6 — Modelo conceitual de integração

```
Supplier / Incoming
        │
        ▼
Incoming Inspection ──bridge──► quality_inspections
        │
        ▼
Measurement System (gages, fixtures, software)
        │
        ▼
MSA (msa_native)  ◄── sub-runtime eixo Qualidade
  ├── Variable GRR (AIAG Method 1/ANOVA)
  ├── Attribute Agreement
  ├── Bias / Linearity / Stability studies
  └── Gage register + calibration status
        │
        ├──► Quality (quality_native LOCKED)
        ├──► PPAP (ppap_native LOCKED) — elemento AIAG #8
        └──► Production (process studies read-only)
```

### Dependências técnicas

| Dependência | Tipo | Notas |
|-------------|------|-------|
| **Quality v1.1** | Parent domain | Eixo `quality` · perfis `manager_quality` |
| **PPAP v1.0** | Sibling sub-runtime | Elemento 8 · **sem alterar** baseline PPAP |
| **SPC engine** | Bridge read-only | Medidas históricas — **não** modificar `qualitySpcEngine` |
| **PPAP dimensional/capability** | Bridge read-only | Evidências submissão — FK nullable futuro |
| **Supplier quality** | Bridge read-only | Contexto fornecedor · sem gage registry hoje |
| **Logistics receipts** | Bridge opcional | Lote/recebimento → estudo MSA por característica |

### Payload isolado proposto (preview — GF-008+)

- `msa_cognitive_runtime`
- `msa_signal_loader`
- `msa_cognitive_centers`
- `cockpit_mode: msa_native`

Coexistência com `quality_native` + `ppap_native` no perfil `manager_quality` (modelo homologado GF-006).

---

## Etapa 7 — Débitos iniciais (backlog)

| ID | Categoria | Descrição | Tipo |
|----|-----------|-----------|------|
| **P-MSA-001** | Domínio inexistente | Zero runtime/API/schema MSA | GREENFIELD |
| **P-MSA-002** | Engine GRR | Sem ANOVA GRR / %Tolerance / ndc | GREENFIELD |
| **P-MSA-003** | Attribute MSA | Sem Kappa / Kendall / attribute agreement | GREENFIELD |
| **P-MSA-004** | Bias/Linearity/Stability | Estudos AIAG MSA Phase 2 ausentes | GREENFIELD |
| **P-MSA-005** | Gage register | Sem cadastro gages/fixtures/software MSA | GREENFIELD |
| **P-MSA-006** | Schema dedicado | Sem tabelas `msa_studies`, `msa_measurements`, `msa_gages` | GREENFIELD |
| **P-MSA-007** | APIs | Sem `/api/msa/*` | GREENFIELD |
| **P-MSA-008** | Runtime cognitivo | Sem `msa_native` Z.19→Z.23 | GREENFIELD |
| **P-MSA-009** | Block pack | Sem `msa.*` blocks em registry | GREENFIELD |
| **P-MSA-010** | UI/CC | Sem hubs MSA / promotion CC | GREENFIELD |
| **P-MSA-011** | Integração PPAP | Elemento AIAG #8 não ligado a submissões | Integração |
| **P-MSA-012** | Integração Quality | Inspeções não modeladas como sistema de medição | Integração |
| **P-MSA-013** | Massa de dados | Zero estudos GRR reais em tenant | Dados |
| **P-MSA-014** | FMEA/Ishikawa UI | Shells referenciados mas não implementados | Adjacente (EV/GF) |
| **P-MSA-015** | Registo SYSTEM | `msa_native` ausente de BASELINE-SYSTEM v1.2 | INC futura pós-GF-013 |

---

## Etapa 8 — Cenário recomendado

### **Cenário A — Greenfield integral** (selecionado)

Não existe código MSA reutilizável a nível de domínio. Existem apenas **engines estatísticos parciais** e **dados adjacentes** — insuficientes para Cenário B (sequência encurcada).

| GF | Entrega | Notas |
|----|---------|-------|
| **GF-007** | **Discovery** | **Este documento** ✅ |
| **GF-008** | Runtime Foundation | `msa_native` inactivo · payload isolado |
| **GF-009** | Core Domain | Schema AIAG MSA · workflow estudo · APIs CRUD |
| **GF-010** | Signal Loader | Z.20 real · bridges quality/ppap read-only |
| **GF-011** | Promotion + CC | Z.22/Z.23 gate-driven · hubs estruturais |
| **GF-012** | Pilot Enablement | Massa GRR piloto · binding observado |
| **GF-013** | Homologation | OFF/ON · cross-domain · BASELINE-MSA-v1.0 |
| **INC-046** (futura) | Registo SYSTEM v1.3 | Após homologação — **não** durante GF |

### Justificação técnica (vs Cenário B)

| Critério | Avaliação |
|----------|-----------|
| Domínio completo existente | **Não** |
| APIs MSA existentes | **Não** |
| Schema estudo GRR | **Não** |
| Runtime cognitivo | **Não** |
| Reutilização significativa (>40% domínio) | **Não** — apenas bridges + engines parciais |
| Metodologia PPAP aplicável | **Sim** — sequência integral recomendada |

### Reaproveitamento planeado (GF-008+, sem alterar LOCKED)

1. **Padrão arquitectural** PPAP (`ppap_cognitive_runtime` → `msa_cognitive_runtime`)
2. **Bridges read-only** para `quality_inspections`, `ppap_dimensional_results`, `ppap_capability_studies`
3. **Import** de funções puras `qualitySpcEngine` / `qualityProcessCapabilityEngine` em **novo** `msaGrrEngine.js` — **sem modificar** ficheiros Quality LOCKED
4. **Thresholds** Z.22/Z.23 — mesma disciplina gate-driven (ARC-001G)

---

## Etapa 9 — Verificação de conformidade

| Verificação | Resultado |
|-------------|-----------|
| `npm run test:architecture-conformance` | **65/65 PASS · CONFORMANT** |
| Alterações nesta GF | Apenas `backend/docs/evidence/` |
| BASELINE-SYSTEM v1.2 | **PRESERVED** |
| ARC-001 golden manifest | **Não alterado** |

---

## Referências

| Documento | Relação |
|-----------|---------|
| [MSA-ARCHITECTURE-v1.0.md](MSA-ARCHITECTURE-v1.0.md) | Plano arquitectural alvo |
| [PPAP-ARCHITECTURE-v1.0.md](PPAP-ARCHITECTURE-v1.0.md) | Modelo espelho · elemento #8 |
| [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | Parent domain LOCKED |
| [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md) | Sibling sub-runtime LOCKED |
| [EVOLUTION-TAXONOMY-v1.0.md](EVOLUTION-TAXONOMY-v1.0.md) | GF-007 = Discovery |

---

## Decisão GF-007

**APROVADO — discovery concluída.**

MSA é **greenfield total** com reutilização **adjacente** (Quality SPC/Cp-Cpk, inspeções, evidências PPAP, metodologia PPAP).

**Próximo passo:** **GF-008 — MSA Runtime Foundation** (infraestrutura inactiva, sem activar gates).
