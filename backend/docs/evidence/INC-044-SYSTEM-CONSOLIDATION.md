# INC-044 — BASELINE-SYSTEM v1.1 (Consolidação Arquitetural)

**Data:** 2026-07-16  
**Tipo:** consolidação arquitetural **READ-ONLY**  
**Modo:** documentação exclusiva — **nenhuma implementação**

---

## Declaração de escopo

| Proibido (confirmado) | Estado |
|-----------------------|--------|
| Alteração de código (`.js`, `.jsx`, `.css`) | **ZERO** |
| Alteração de runtimes / loaders / promotion | **ZERO** |
| Alteração de registries | **ZERO** |
| Deploy | **ZERO** |
| PM2 restart | **ZERO** |

**Entregáveis:**

- [BASELINE-SYSTEM-v1.1.md](BASELINE-SYSTEM-v1.1.md) — documento mestre actualizado
- Este relatório de consolidação

**Base obrigatória auditada:**

- [BASELINE-SYSTEM-v1.0.md](BASELINE-SYSTEM-v1.0.md)
- [BASELINE-DASHBOARDS-v1.0.md](BASELINE-DASHBOARDS-v1.0.md)
- [BASELINE-QUALITY-v1.1.md](BASELINE-QUALITY-v1.1.md)
- [BASELINE-LOGISTICS-v1.1.md](BASELINE-LOGISTICS-v1.1.md)
- INC-022 → INC-043

---

## Critérios de encerramento

| Flag | Valor | Evidência |
|------|-------|-----------|
| `SYSTEM_BASELINE_v1.1` | **LOCKED** | BASELINE-SYSTEM-v1.1.md |
| `QUALITY_BASELINE` | **LOCKED** | BASELINE-QUALITY-v1.1.md (referenciado) |
| `LOGISTICS_BASELINE` | **LOCKED** | BASELINE-LOGISTICS-v1.1.md (referenciado) |
| `ALL_RUNTIME_REFERENCES` | **CONSISTENT** | § Verificação cruzada |
| `ALL_BASELINES_INDEXED` | **YES** | § Índice mestre v1.1 |
| `ZERO_ARCHITECTURE_CHANGED` | **YES** | Nenhum artefacto runtime alterado |
| `ZERO_CODE_CHANGED` | **YES** | Apenas `backend/docs/evidence/` |
| `ZERO_PM2_RESTART` | **YES** | — |

---

## Objetivo

Actualizar o **BASELINE-SYSTEM** para reflectir oficialmente a arquitectura homologada após conclusão do domínio **Logística** (paridade com **Qualidade**), marcando a transição da fase de consolidação da plataforma para a fase de **expansão funcional incremental**.

---

## Etapa 1 — Inventário de runtimes (actualizado)

Consolidação oficial registada em BASELINE-SYSTEM v1.1 § Etapa 1:

| Runtime (família) | Runtime ID canónico | Estado v1.0 | Estado v1.1 | Delta |
|-------------------|---------------------|-------------|-------------|-------|
| executive_native | `executive_boardroom` | ACTIVE | **LOCKED** | Reclassificado (homologado EXECUTIVE v1.0) |
| production_native | `production_native` | ACTIVE | **LOCKED** | Reclassificado |
| maintenance_native | `maintenance_native` | ACTIVE | **LOCKED** | Reclassificado |
| quality_native | `quality_native` | LOCKED | **LOCKED** | Mantido |
| logistics_native | `logistics_native` | GREENFIELD | **LOCKED** | **INC-036→043** |
| environmental_native | `environmental_native` | ACTIVE | **LOCKED** | Reclassificado |
| hr_native | `hr_native` | ACTIVE | **LOCKED** | Reclassificado |
| safety_native | `safety_native` | ACTIVE | **LOCKED** | Reclassificado |
| finance_native | — | GREENFIELD | **GREENFIELD** | Mantido |
| supply_native | — | GREENFIELD | **GREENFIELD** | Mantido |

**Conclusão:** 8 runtimes nativos **LOCKED**; 2 **GREENFIELD** (finance, supply).

---

## Etapa 2 — Cadeia arquitectural oficial (documentada)

Cadeia v1.1 registada em [BASELINE-SYSTEM-v1.1.md § Etapa 3](BASELINE-SYSTEM-v1.1.md#etapa-3--cadeia-arquitetural-oficial-v11):

```
Cadastro → /dashboard/me → SurfaceCapabilities → Runtime
  → Z.19 → Z.20 → Z.21 → Z.22 → Z.23
  → Promotion → CentroComando → Hubs → Adapters → APIs
```

**Deltas face a v1.0:**

| Aspecto | v1.0 | v1.1 |
|---------|------|------|
| SurfaceCapabilities na cadeia | Após Z.23 | **Antes** da resolução runtime (fail-closed explícito) |
| Promotion CC | Só Quality | **Quality + Logistics** |
| Payload Z.23 | `specialized_cockpit_runtime` | + `logistics_cognitive_runtime` |
| Loaders homologados | quality | quality + **logistics** |

**Validação read-only:** paths canónicos confirmados sem modificação — `cognitiveRuntimeFacade.js`, `dashboardSurfaceCapabilities.js`, `QualityNativeCockpitPromotion.jsx`, `LogisticsNativeCockpitPromotion.jsx`.

---

## Etapa 3 — Baselines homologados LOCKED

| Baseline | Versão | Estado | Documento |
|----------|--------|--------|-----------|
| UI | v1.0 | **LOCKED** | BASELINE-UI-v1.0.md |
| Dashboards | v1.0 | **LOCKED** | BASELINE-DASHBOARDS-v1.0.md |
| Quality | v1.1 | **LOCKED** | BASELINE-QUALITY-v1.1.md |
| Logistics | v1.1 | **LOCKED** | BASELINE-LOGISTICS-v1.1.md |

**Superseded registados em v1.1:**

- BASELINE-SYSTEM v1.0 → v1.1
- BASELINE-QUALITY v1.0 → v1.1 (já em v1.0)
- BASELINE-LOGISTICS v1.0 → v1.1 (**novo** — v1.0 documentava «sem runtime nativo»)

---

## Etapa 4 — Débitos arquiteturais (reorganizados)

### Greenfields

| Item | Domínio |
|------|---------|
| PPAP | Quality |
| MSA | Quality |
| Ishikawa UI | Quality |
| Finance Native | Finance |
| Supply Native | Supply |
| *Promotion CC* Executivo / Produção / RH / SST / Ambiente | Respective domains |

### Evoluções incrementais (runtime LOCKED)

| Item | Domínio |
|------|---------|
| Picking | Logistics |
| Fleet AI | Logistics |
| OTIF | Logistics |
| Warehouse Telemetry | Logistics |
| Supplier Intelligence | Logistics / Quality |

### Resolvido nesta consolidação

| ID v1.0 | Resolução |
|---------|-----------|
| P-LOG-001..003 | Fechado — `logistics_native` homologado INC-036→043 |

---

## Etapa 5 — Matriz única de domínios

Registada integralmente em [BASELINE-SYSTEM-v1.1.md § Etapa 2](BASELINE-SYSTEM-v1.1.md#etapa-2--matriz-única-de-domínios-cognitivos).

**Verificação paridade Quality ↔ Logistics:**

| Gate | Quality | Logistics |
|------|---------|-----------|
| Runtime foundation | ✅ | ✅ |
| Signal loader | ✅ | ✅ |
| Binding reconciliation | ✅ (0.875) | ✅ (0.385) |
| Promotion Z.22 | ✅ | ✅ |
| Consolidation Z.23 | ✅ | ✅ |
| CC promotion | ✅ | ✅ |
| Baseline LOCKED | v1.1 | v1.1 |

---

## Etapa 6 — Política de engenharia (reforço explícito)

Transcrita em BASELINE-SYSTEM v1.1 § Etapa 7. Componentes nucleares que exigem **nova INC + auditoria + regressão + update baseline**:

- runtimes
- promotion
- loaders
- registries
- SurfaceCapabilities (`dashboardSurfaceCapabilities`)
- CentroComando Shell

**Alinhamento:** regra idêntica já presente em BASELINE-QUALITY-v1.1 e BASELINE-LOGISTICS-v1.1; v1.1 unifica ao nível SYSTEM.

---

## Etapa 7 — Roadmap (fase incremental)

Registado em BASELINE-SYSTEM v1.1 § Etapa 8:

1. Picking  
2. Fleet AI  
3. PPAP  
4. MSA  
5. Ishikawa  
6. Finance Native  
7. Supply Native  

Classificação: **evoluções incrementais / greenfields** — **não** alterações arquitecturais ao núcleo v1.1.

---

## Etapa 8 — Verificação de consistência documental

### Referências cruzadas validadas

| De | Para | Estado |
|----|------|--------|
| BASELINE-SYSTEM v1.1 | BASELINE-QUALITY v1.1 | ✅ runtime, baseline, INC chain |
| BASELINE-SYSTEM v1.1 | BASELINE-LOGISTICS v1.1 | ✅ runtime, loader, promotion, hubs |
| BASELINE-SYSTEM v1.1 | BASELINE-DASHBOARDS v1.0 | ✅ perfis logistics (`manager_logistics`, …) |
| BASELINE-SYSTEM v1.1 | BASELINE-UI v1.0 | ✅ shell CC inalterado |
| BASELINE-LOGISTICS v1.1 | INC-043 | ✅ homologação |
| BASELINE-QUALITY v1.1 | INC-034 | ✅ homologação |
| INC-043 | INC-044 (este doc) | ✅ encadeamento |
| BASELINE-SYSTEM v1.0 | v1.1 sucessão | ✅ SUPERSEDED declarado |

### Divergências documentais conhecidas (não bloqueiam v1.1)

| Documento | Observação | Acção |
|-----------|------------|-------|
| **BASELINE-DASHBOARDS v1.0** | Matriz § Inventário ainda lista Logística como `*none*` runtime e aponta BASELINE-LOGISTICS **v1.0** | **PENDENTE INC futura** (update dashboards doc) ou nota em v1.1 — runtime real = `logistics_native` v1.1 |
| **BASELINE-DASHBOARDS v1.0** | Quality aponta BASELINE-QUALITY **v1.0** na tabela | Referência histórica; canónico = **v1.1** (indexado em SYSTEM v1.1) |
| **BASELINE-SYSTEM v1.0** | `logistics_native` = GREENFIELD | **SUPERSEDED** — corrigido em v1.1 |
| **Nomenclatura executive** | Família `executive_native` vs ID `executive_boardroom` | Nota explícita em v1.1 § Etapa 1 |

> INC-044 **não altera** BASELINE-DASHBOARDS v1.0 por escopo estrito (apenas documento mestre). A inconsistência está **documentada**; o índice canónico actual é **BASELINE-SYSTEM v1.1**.

### Runtime IDs — consistência código ↔ documentação

| Runtime ID | Presente em facade | Baseline domínio | SYSTEM v1.1 |
|------------|-------------------|------------------|-------------|
| `executive_boardroom` | ✅ | EXECUTIVE v1.0 | ✅ LOCKED |
| `production_native` | ✅ | PRODUCTION v1.0 | ✅ LOCKED |
| `maintenance_native` | ✅ | MAINTENANCE v1.0 | ✅ LOCKED |
| `quality_native` | ✅ | QUALITY v1.1 | ✅ LOCKED |
| `logistics_native` | ✅ | LOGISTICS v1.1 | ✅ LOCKED |
| `environmental_native` | ✅ | ENVIRONMENT v1.0 | ✅ LOCKED |
| `hr_native` | ✅ | HR v1.0 | ✅ LOCKED |
| `safety_native` | ✅ | SAFETY v1.0 | ✅ LOCKED |
| `finance_native` | ❌ | — | ✅ GREENFIELD |
| `supply_native` | ❌ | SUPPLY v1.0 doc | ✅ GREENFIELD |

**Resultado:** `ALL_RUNTIME_REFERENCES = CONSISTENT` entre SYSTEM v1.1, baselines de domínio homologados e código canónico (auditoria read-only INC-043/034).

---

## Metodologia INC-044

1. Leitura read-only de BASELINE-SYSTEM v1.0 e baselines Quality/Logistics/Dashboards/UI  
2. Consolidação de inventário runtime pós INC-043  
3. Actualização da cadeia arquitectural com Logistics no mesmo patamar que Quality  
4. Reorganização débitos: greenfields vs evoluções incrementais  
5. Matriz única domínios + política de engenharia unificada  
6. Verificação cruzada de referências  
7. **Zero** alterações fora de `backend/docs/evidence/`

---

## Trilha INC sistémica (contexto)

| Fase | INCs | Domínio |
|------|------|---------|
| UI + Dashboards | INC-014→025 | Transversal |
| Quality runtime | INC-022→034 | Quality v1.1 |
| Logistics runtime | INC-036→043 | Logistics v1.1 |
| **Consolidação SYSTEM** | **INC-044** | **Global v1.1** |

---

## Conclusão

A **INC-044** encerra a fase de consolidação arquitectural iniciada com BASELINE-SYSTEM v1.0.

O IMPETUS passa a ter um **BASELINE-SYSTEM v1.1** formalizado, no qual **Qualidade** e **Logística** estão oficialmente homologadas como domínios cognitivos completos (runtime → loader → promotion → Centro de Comando → baseline próprio).

A partir deste ponto:

- Alterações ao **núcleo cognitivo** exigem INC + auditoria + regressão + baseline update.  
- **Picking, Fleet AI, PPAP, MSA, Ishikawa, Finance Native, Supply Native** são evoluções **incrementais** ou **greenfields** — não reabrem a arquitectura v1.1 sem INC transversal dedicada.

**Estado final:** `SYSTEM_BASELINE_v1.1 = LOCKED`
