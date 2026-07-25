# GF-014 — Ishikawa Discovery & Architecture Audit (READ-ONLY)

**Data:** 2026-07-17  
**Tipo:** auditoria read-only (sem implementação)  
**Pré-requisitos:** [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) (LOCKED) · [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md)  
**Plano arquitectural:** [ISHIKAWA-ARCHITECTURE-v1.0.md](ISHIKAWA-ARCHITECTURE-v1.0.md)  
**Metodologia:** espelha [GF-000-PPAP-DISCOVERY.md](GF-000-PPAP-DISCOVERY.md) e [GF-007-MSA-DISCOVERY.md](GF-007-MSA-DISCOVERY.md) — descobrir antes de construir

---

## Declaração de escopo

| Proibido | Estado |
|----------|--------|
| Alteração de código (`.js`, `.jsx`, `.css`, `.sql`) | **ZERO** |
| Alteração de banco / migrations | **ZERO** |
| Alteração de UI / CSS / runtimes / loaders / Promotion | **ZERO** |
| Alteração CentroComando / registries / ARC-001 | **ZERO** |
| Alteração BASELINE-SYSTEM v1.3 | **ZERO** |
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
| `BASELINE_SYSTEM_v1.3` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** (75/75 — suite existente, não re-executada nesta INC documental) |

---

## Resumo executivo

**Ishikawa (Fishbone / Cause Analysis) não existe no IMPETUS como domínio, runtime, API, schema ou UI.**

Existe **um micro-motor isolado** (`qualityRootCauseEngine.js`, 22 linhas) com template 6M e helper `fiveWhysChain`, **sem consumidores** no codebase de produção — **código morto assistivo**. Há **referências declarativas** (UI engine manifest, PPAP FK textual) e **integração cognitiva indirecta** via bloco `quality.capa_engine` (semantic tag `root_cause`), mas **nenhuma persistência, rota ou ecrã Ishikawa**.

**Conclusão:** Ishikawa é **greenfield de produto** com **reutilização pontual** de workflows CAPA/NCR, inspeções e padrão arquitectural PPAP/MSA — **não** encurtar a sequência GF por causa do engine existente.

**Cenário recomendado:** **Cenário A — Greenfield completo** (GF-014→GF-020 + INC-047), reutilizando funções puras e bridges read-only em GF-016, **sem alterar** baselines LOCKED.

---

## Etapa 1 — Pesquisa textual (codebase)

### Termos auditados

**Primários:** Ishikawa · Fishbone · Fish Bone · Cause Analysis · Root Cause · RCA · Cause Tree · 5 Why · Five Why · Why Analysis · Cause Investigation · Corrective Action · Preventive Action · CAPA

**Variações:** `ishikawa` · `fishbone` · `fish_bone` · `root_cause` · `rca` · `five_why` · `5why` · `cause_analysis` · `cause_tree` · `corrective_action` · `preventive_action` · `capa`

### Resultado por camada (código de produção, excl. `docs/`)

| Camada | Matches Ishikawa-específicos | Notas |
|--------|------------------------------|-------|
| `backend/src/**/*.js` | **10** (6 ficheiros) | Ver inventário § Backend |
| `frontend/src/**/*.{js,jsx}` | **1** | `qualityGovernanceUiEngine.js` — id manifesto apenas |
| `backend/migrations/*.sql` | **1** | `ppap_submissions.ishikawa_analysis_ref` |
| `backend/tests/**` | **0** | Sem testes Ishikawa |
| `cognitiveRuntime/**` | **0** | Sem `ishikawa_native`; `quality.capa_engine` tag `root_cause` |

### Falsos positivos descartados

| Match | Motivo |
|-------|--------|
| `ROOT_CAUSE` em INC/stabilization docs | Diagnóstico forense de bugs — **não** domínio Ishikawa |
| `financial_f48_root_cause` (M1.15) | Auditoria financeira plataforma — **não** CAPA |
| `root_cause` em TPM / Digital Twin / ManuIA | Manutenção / twin — **não** Ishikawa Quality |
| `ppap_capability_*` / `measurement_capability` | MSA/Cp-Cpk — **não** cause analysis |
| `enrich` em dashboard/runtime facades | Enriquecimento cognitivo genérico — **não** Ishikawa |
| Manual Pró-Ação «Ishikawa/5W2H no enrich» | **Documentação desalinhada** — `enrichProposalWithIA` **não** estrutura Ishikawa (ver § Adjacente) |
| `action_plans_5w2h` index em hardening SQL | Índice sem CREATE TABLE nos models — **LEGACY / órfão** |

---

## Etapa 2 — Inventário Backend

### Flags obrigatórias

| Flag | Valor | Evidência |
|------|-------|-----------|
| `ISHIKAWA_ENGINE_EXISTS` | **YES (PARTIAL)** | `qualityRootCauseEngine.js` — template 6M + `fiveWhysChain`; **zero imports** |
| `ISHIKAWA_SERVICE_EXISTS` | **NO** | Sem `ishikawa*Service.js` |
| `ISHIKAWA_API_EXISTS` | **NO** | Sem rota `/ishikawa` ou CRUD análise causa |
| `ISHIKAWA_SCHEMA_EXISTS` | **NO** | Sem semantics/DTO dedicados |
| `ISHIKAWA_TABLES_EXIST` | **NO** | Sem `ishikawa_*`; apenas `ppap_submissions.ishikawa_analysis_ref TEXT` |
| `ISHIKAWA_DATA_EXIST` | **NO** | Sem persistência de diagramas ou árvores de causa |

### Services

| Artefacto | Path | Classificação | Notas |
|-----------|------|---------------|-------|
| Root cause engine | `domains/quality/governance/capa/qualityRootCauseEngine.js` | **PARTIAL** | Único motor Ishikawa; não referenciado |
| CAPA intelligence | `domains/quality/governance/capa/qualityCapaIntelligence.js` | **PARTIAL** | Recorrência/eficácia — sem Ishikawa |
| Corrective action analytics | `domains/quality/governance/capa/qualityCorrectiveActionAnalytics.js` | **PARTIAL** | Scoring advisory — sem diagrama |
| Risk propagation | `domains/quality/governance/capa/qualityRiskPropagation.js` | **PARTIAL** | Grafo adjacência — útil pós-Ishikawa |
| Quality intelligence | `services/qualityIntelligenceService.js` | **READY_TO_REUSE** | NC/CAPA summary, inspeções |
| PPAP submission | `domains/ppap/services/ppapSubmissionService.js` | **PARTIAL** | Campo `ishikawa_analysis_ref` — link futuro |
| Pro-Ação enrich | `services/proacao.js` | **LEGACY** | IA genérica; **não** Ishikawa estruturado |

### Controllers / Routes

| Prefixo | Ishikawa | Endpoints adjacentes |
|---------|----------|---------------------|
| `/api/quality-intelligence` | **NO** | `GET /nc-capa-summary`, inspeções |
| `/api/quality-governance` | **NO** | `POST /intelligence/fmea/rank` |
| `/api/ppap` | **NO** | Submissions com ref textual Ishikawa |
| `/api/internal/quality-universal` | **NO** | Workflows NCR/CAPA |
| `/api/proacao` | **NO** | `POST /:id/enrich` — sem Ishikawa no prompt |

### Engines / Adapters

| Engine | Path | Relevância Ishikawa |
|--------|------|---------------------|
| `qualityFmeaRuntime.js` | governance/risk | **PARTIAL** — RPN; causa contributiva FMEA |
| `qualityProcessCapabilityEngine.js` | governance/spc | **PARTIAL** — osso «measurement» |
| `qualitySpcEngine.js` | governance/spc | **PARTIAL** — desvios processo |
| `qualityEngineBridgeRegistry` | cognitiveRuntime/bridge | `quality.capa_engine` → `bindCapaEngine` |

### DTOs / Schemas / Semantics

| Item | Estado |
|------|--------|
| `ishikawaCoreSemantics.js` | **INEXISTENTE** |
| JSON schema diagrama 6M | **INEXISTENTE** |
| `ppapCoreSemantics.ishikawa_analysis_ref` | **PARTIAL** — ref opaca TEXT |

### Migrations / Tabelas

| Tabela / coluna | Ishikawa | Notas |
|-----------------|----------|-------|
| `ishikawa_analyses` | **NO** | — |
| `ishikawa_causes` | **NO** | — |
| `ppap_submissions.ishikawa_analysis_ref` | **PARTIAL** | FK lógica futura |
| `quality_inspections.corrective_action` | **PARTIAL** | Texto livre — não estruturado |
| `impetus_quality_workflow_instance` | **READY_TO_REUSE** | NCR/CAPA/PDCA instances |
| `action_plans_5w2h` | **LEGACY** | Index hardening; sem migration CREATE nos models |
| `quality_tools_applied` | **LEGACY** | Retention registry; sem uso código |

### Testes

| Suite | Ishikawa |
|-------|----------|
| `runArchitectureConformanceTests.js` | **NO** |
| `qualityIndustrialRuntimeValidationSuite.js` | **NO** (workflows CAPA sim) |
| `e2e_quality_nc_capa.js` | **NO** (`root_cause_hypothesis` em context JSON workflow — não diagrama) |

---

## Etapa 3 — Inventário Frontend

### Flags obrigatórias

| Flag | Valor | Evidência |
|------|-------|-----------|
| `ISHIKAWA_WIDGET_EXISTS` | **NO** | — |
| `ISHIKAWA_PAGE_EXISTS` | **NO** | — |
| `ISHIKAWA_HUB_EXISTS` | **NO** | — |
| `ISHIKAWA_ADAPTER_EXISTS` | **NO** | — |

### Componentes auditados

| Categoria | Resultado | Notas |
|-----------|-----------|-------|
| Páginas `/app/quality/*` | **NO Ishikawa** | `QualityGovernanceHub` — tab NCR/CAPA sem canvas |
| Widgets CentroComando | **NO** | KPIs NC/CAPA genéricos |
| Shells governance | **PLACEHOLDER** | `ishikawa_canvas` em manifest — **`domains/quality/shells/` inexistente** |
| Cockpit registries | **NO** | quality · ppap · msa — sem ishikawa |
| Lazy modules | **NO** | — |

**Confirmação glob:** `**/Ishikawa*`, `**/*ishikawa*`, `**/*fishbone*` → **0 ficheiros** UI.

---

## Etapa 4 — Runtime cognitivo

### Flags obrigatórias

| Flag | Valor | Evidência |
|------|-------|-----------|
| `ISHIKAWA_RUNTIME_EXISTS` | **NO** | — |
| `ISHIKAWA_BLOCK_PACK_EXISTS` | **NO** | — |
| `ISHIKAWA_SIGNAL_LOADER_EXISTS` | **NO** | — |
| `ISHIKAWA_PROMOTION_EXISTS` | **NO** | — |
| `ISHIKAWA_CONSOLIDATOR_EXISTS` | **NO** | — |

### Verificação em componentes nucleares

| Componente | Referência Ishikawa |
|------------|---------------------|
| `cognitiveDomainRegistry.js` | **10 homologados** + finance/supply greenfield — **sem `ishikawa_native`** |
| `cognitiveRuntimeFacade.js` | Sem ramo `ishikawa_*` |
| `cognitiveBlockRegistry.js` | `quality.capa_engine` — tags `capa`, `root_cause`, `effectiveness` |
| Cockpit FE registries | quality · ppap · msa — **sem ishikawa** |
| Signal loaders | quality · ppap · msa · logistics — **sem ishikawa** |
| Promotion / consolidation Z.22/Z.23 | **sem ishikawa** |
| `qualityRuntimeSeparationGuard.js` | Lista `ishikawa_canvas` como hint governance — **guard only** |

---

## Etapa 5 — Reutilização (classificação objetiva)

| Componente | Origem | Classificação | Uso futuro Ishikawa |
|------------|--------|---------------|---------------------|
| `buildIshikawaTemplate()` / `fiveWhysChain()` | Quality CAPA | **PARTIAL** | Copiar/importar em **novo** domínio GF-016 — **não alterar** ficheiro LOCKED |
| `capa_universal` / `ncr_universal` workflows | Quality universal | **READY_TO_REUSE** | Gatilho pós-NC → análise causa |
| `quality_inspections` + APIs | Quality | **READY_TO_REUSE** | Origem NC / efeito diagrama |
| `quality.capa_engine` block + bridge | quality_native | **READY_TO_REUSE** | Padrão bloco Z.19; sibling `ishikawa.*` |
| `qualityCapaIntelligence` + analytics | Quality | **PARTIAL** | Eficácia CAPA pós-Ishikawa |
| `qualityFmeaRuntime.rankFmeaRows` | Quality | **PARTIAL** | Correlação risco ↔ causa |
| `ppap_submissions.ishikawa_analysis_ref` | PPAP v1.0 | **PARTIAL** | Bridge elemento APQP |
| Stack `ppap_native` / `msa_native` | Greenfields irmãos | **READY_TO_REUSE** | **Metodologia** GF completa |
| `qualityGovernanceUiEngine` shell hint | Quality UI | **PLACEHOLDER** | Substituir por hub real GF-018 |
| Pro-Ação + `proposals` | Melhoria contínua | **LEGACY** | Domínio paralelo; não substitui Ishikawa industrial |
| `action_plans_5w2h` (docs/index) | Platform | **LEGACY** | Tabela não materializada nos models |
| Documentação roadmap Ishikawa | SYSTEM v1.3 | **GREENFIELD** | Planeado EV/GF — ainda não implementado |

---

## Etapa 6 — Modelo conceitual (integração)

```
Inspection (quality_inspections)
      │
      ▼
Nonconformance (ncr_universal workflow)
      │
      ▼
Ishikawa (ishikawa_native — GREENFIELD)
      │  ├── diagrama 6M (method…environment)
      │  ├── 5 Porquês (cadeia)
      │  └── ligação FMEA / SPC (read-only)
      ▼
CAPA (capa_universal workflow)
      │
      ▼
Quality (quality_native LOCKED)
      ├── PPAP (ppap_native — ishikawa_analysis_ref)
      └── MSA (msa_native — osso measurement)
```

### Dependências técnicas

| Dependência | Tipo | Baseline |
|-------------|------|----------|
| `quality_inspection_id` / NC correlation | Funcional | Quality v1.1 |
| `capa_universal` instance linkage | Funcional | Quality universal runtime |
| `ppap_submissions.ishikawa_analysis_ref` | Bridge opcional | PPAP v1.0 |
| `quality.capa_engine` coexistência | Arquitectural | quality_native LOCKED |
| Perfil `manager_quality` / coordinator | Autorização | Dashboard profiles |
| ARC-001 11.º runtime | Governança | INC-047 pós-GF-020 |

### Dependências funcionais

1. **Entrada:** NC aberta ou inspeção não conforme dispara estudo causa (manual ou workflow).
2. **Análise:** Diagrama Ishikawa + optional 5 Whys persistidos com audit trail.
3. **Saída:** Hipótese causa raiz alimenta CAPA (`capa_universal`) e ref PPAP quando aplicável.
4. **Cognitivo:** Sub-runtime `ishikawa_native` no eixo Qualidade — **paridade PPAP/MSA**.

---

## Etapa 7 — Débitos Ishikawa (backlog inicial)

| ID | Tipo | Descrição |
|----|------|-----------|
| **P-ISH-001** | Domínio | Ausência total de módulo Ishikawa (schema, serviço, API) |
| **P-ISH-002** | Runtime | Sem `ishikawa_native` / block pack / loader / promotion |
| **P-ISH-003** | UI | `IshikawaCanvas` declarado mas **ficheiro 0**; directório `shells/` inexistente |
| **P-ISH-004** | Persistência | Sem tabelas `ishikawa_*`; análises não persistem |
| **P-ISH-005** | Integração NC | Sem ligação formal NCR instance → análise causa estruturada |
| **P-ISH-006** | Integração CAPA | `quality.capa_engine` sem payload Ishikawa; workflow CAPA sem campo diagrama |
| **P-ISH-007** | 5 Porquês | `fiveWhysChain()` existe mas **não exposto** via API/UI |
| **P-ISH-008** | PPAP bridge | `ishikawa_analysis_ref` sem entidade destino resolvível |
| **P-ISH-009** | Testes | Zero cobertura automatizada Ishikawa |
| **P-ISH-010** | Código morto | `qualityRootCauseEngine` não importado — risco de drift |
| **P-ISH-011** | Docs desalinhados | Manual Pró-Ação promete Ishikawa no enrich — código não cumpre |
| **P-ISH-012** | CC | Sem promotion Ishikawa no CentroComando |
| **P-ISH-013** | Dados piloto | Sem massa operacional para binding_ratio > 0 |
| **P-ISH-014** | FMEA UI | FMEA rank API sem painel — adjacente Ishikawa |

---

## Etapa 8 — Referências históricas (consistência)

| Documento | Conclusão Ishikawa |
|-----------|-------------------|
| [INC-023-QUALITY-ECOSYSTEM-AUDIT.md](INC-023-QUALITY-ECOSYSTEM-AUDIT.md) | **PARTIAL** — engine + MISSING `IshikawaCanvas` |
| [INC-034-QUALITY-HOMOLOGATION.md](INC-034-QUALITY-HOMOLOGATION.md) | **ENGINE EXISTE / UI NÃO** |
| [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md) | Greenfield funcional |
| [GF-000-PPAP-DISCOVERY.md](GF-000-PPAP-DISCOVERY.md) | P-PPAP-010 shells Ishikawa |
| [GF-007-MSA-DISCOVERY.md](GF-007-MSA-DISCOVERY.md) | FMEA/Ishikawa fora scope MSA |
| [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) | Roadmap: Ishikawa EV/GF Quality |

**GF-014 confirma auditorias anteriores — sem implementação oculta descoberta.**

---

## Etapa 9 — Roadmap recomendado

### Decisão: **Cenário A — Greenfield completo**

Justificativa técnica:

1. **Zero domínio persistido** — apenas 22 linhas de engine não ligado.
2. **Disciplina PPAP + MSA comprovada** — sub-runtime `*_native` no eixo Qualidade evita reabrir `quality_native` LOCKED.
3. **Reutilização não encurta a cadeia** — workflows e inspeções entram como **bridges read-only** em GF-016/GF-017, não como substituto de Foundation/Loader/Promotion.
4. **Cenário B (sequência adaptada)** só seria defensável com schema + API + UI parcial — **inexistente**.

### Sequência proposta

| GF | Entrega |
|----|---------|
| **GF-014** | Discovery (este documento) |
| **GF-015** | Runtime Foundation — `ishikawa_native`, flags OFF, block pack Z.19 |
| **GF-016** | Core Domain — schema `ishikawa_*`, workflow, APIs CRUD análise |
| **GF-017** | Signal Loader — bridge NC/CAPA/inspections/PPAP ref |
| **GF-018** | Promotion + Command Center — hubs CC + canvas real |
| **GF-019** | Pilot Enablement — massa operacional binding_ratio > 0 |
| **GF-020** | Homologation — OFF/ON + `BASELINE-ISHIKAWA-v1.0.md` |
| **INC-047** | Architecture Registration — BASELINE-SYSTEM v1.4 (11 runtimes) |

> Plano detalhado: [ISHIKAWA-ARCHITECTURE-v1.0.md](ISHIKAWA-ARCHITECTURE-v1.0.md)

---

## Metodologia

1. Grep recursivo (`ishikawa`, `fishbone`, `root_cause`, `capa`, `five_why`, `rca`, etc.) em `backend/src`, `frontend/src`, migrations, tests, `cognitiveRuntime/`
2. Glob `*ishikawa*`, `*Ishikawa*`, `*fishbone*`
3. Leitura de engines CAPA, UI engines, PPAP semantics, block registry, INC-023/034
4. Verificação runtime Z.19–Z.23 e registries (sem alteração)
5. Geração exclusiva de documentação em `backend/docs/evidence/`

---

## Conclusão

O IMPETUS **não possui Ishikawa implementado** como capacidade de produto. Existe **sinal arquitectural mínimo** (engine template + manifest placeholder + ref PPAP) insuficiente para EV isolado credível.

A construção deve **reutilizar** NCR/CAPA workflows, inspeções, bloco CAPA cognitivo e metodologia greenfield PPAP/MSA, mas o **domínio Cause Analysis** (persistência, API, UI canvas, runtime `ishikawa_native`) é **greenfield integral**.

**Próximo passo:** GF-015 — Ishikawa Runtime Foundation (modo implementação controlada, **BASELINE-SYSTEM v1.3 intacto**).
