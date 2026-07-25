# GF-015 — Ishikawa Runtime Foundation (Infrastructure Only)

**Data:** 2026-07-17  
**Tipo:** implementação estrutural controlada  
**Pré-requisitos:** [GF-014-ISHIKAWA-DISCOVERY.md](GF-014-ISHIKAWA-DISCOVERY.md) · [ISHIKAWA-ARCHITECTURE-v1.0.md](ISHIKAWA-ARCHITECTURE-v1.0.md) · [BASELINE-SYSTEM-v1.3.md](../architecture/BASELINE-SYSTEM-v1.3.md) (LOCKED) · [ARC-001-ARCHITECTURE-CONFORMANCE.md](ARC-001-ARCHITECTURE-CONFORMANCE.md)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `ISHIKAWA_RUNTIME_EXISTS` | **YES** |
| `ISHIKAWA_RUNTIME_ACTIVE` | **NO** |
| `ISHIKAWA_SIGNAL_LOADER_EXISTS` | **YES** (structural stub) |
| `ISHIKAWA_SIGNAL_LOADER_ACTIVE` | **NO** |
| `ISHIKAWA_PROMOTION_EXISTS` | **YES** (structural) |
| `ISHIKAWA_PROMOTION_ACTIVE` | **NO** |
| `ISHIKAWA_CONSOLIDATION_EXISTS` | **YES** |
| `ISHIKAWA_CONSOLIDATION_ACTIVE` | **NO** |
| `ISHIKAWA_COGNITIVE_CENTERS` | **[]** |
| `NO_UI_CHANGED` | **YES** (CentroComando não montado) |
| `NO_CSS_CHANGED` | **YES** |
| `NO_DATABASE_CHANGED` | **YES** |
| `NO_API_CHANGED` | **YES** |
| `NO_LEGACY_DEPENDENCIES` | **YES** |
| `LEGACY_ENGINE_IMPORTED` | **NO** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.3` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** |

---

## Escopo entregue

Fundação **`ishikawa_native`** aditiva e **inactiva** (default). Sem Fishbone funcional, 5 Porquês persistidos, CAPA, RCA, schema BD, migrations, APIs de domínio, promotion activa, hubs funcionais, CSS, IA, KPIs ou mount no Centro de Comando.

### Runtime ID canónico

```
runtime_id   = ishikawa_native
runtime_name = ishikawa_native
cockpit_mode = off          (até homologação GF-020)
parent_axis  = quality
foundation_inc = GF-015
```

---

## Artefato legado (GF-014)

| Ficheiro | Tratamento GF-015 |
|----------|-------------------|
| `qualityRootCauseEngine.js` | **LEGACY_REUSABLE_ALGORITHM** — **não importado**, **não alterado** |

Migração de `buildIshikawaTemplate()` / `fiveWhysChain()` avaliada exclusivamente em **GF-016 Core Domain**.

---

## Arquitectura criada

### Cadeia Z.19 → Z.23 (preparada, inactiva)

| Fase | Componente | Estado GF-015 |
|------|-----------|---------------|
| Z.19 | `ishikawaCockpitPilot.js` | Skip quando flags OFF |
| Z.19 | `ishikawaCognitiveBlockPack.js` | **12 blocos registados** (inactive) |
| Z.20 | `ishikawaTenantSignalLoader.js` | **Stub** — `NO_DATASET`, **zero consultas BD** |
| Z.22 | `ishikawaControlledRenderRuntime.js` | `promotion_applied: false` **sempre** |
| Z.23 | `ishikawaCockpitConsolidationRuntime.js` | `consolidation_applied: false` **sempre** |
| — | `ishikawaFoundationAttachment.js` | **Sempre anexa descriptor inactivo** |
| — | `ishikawaRuntimeDescriptor.js` | Descriptor canónico |
| — | `phaseIshikawaNativeFeatureFlags.js` | Flags default OFF |

### Blocos estruturais (Z.19 — registry only)

| block_id | semantic_category |
|----------|-------------------|
| `ishikawa.investigation_registry` | investigation_registry |
| `ishikawa.root_cause_repository` | root_cause_repository |
| `ishikawa.fishbone_analysis` | fishbone_analysis |
| `ishikawa.five_whys` | five_whys |
| `ishikawa.corrective_actions` | corrective_actions |
| `ishikawa.preventive_actions` | preventive_actions |
| `ishikawa.evidence_repository` | evidence_repository |
| `ishikawa.investigation_workflow` | investigation_workflow |
| `ishikawa.contextual_root_cause_ai` | contextual_root_cause_ai |
| `ishikawa.organizational_learning` | organizational_learning |
| `ishikawa.recurrence_monitor` | recurrence_monitor |
| `ishikawa.ishikawa_narrative` | ishikawa_narrative |

---

## Integração `/dashboard/me`

Via `cognitiveRuntimeFacade.applyCognitiveFoundationToDashboard` — branch aditivo **após MSA**, **sem alterar** quality / ppap / msa homologados.

---

## Frontend (registries only)

| Ficheiro | Comportamento |
|----------|---------------|
| `ishikawaNativeCockpitRegistry.js` | Runtime / cockpit / promotion / center / dashboard registries — **OFF** |
| `IshikawaNativeCockpitPromotion.jsx` | `return null` |
| `specializedCockpitResolver.js` | `resolveIshikawaCockpitRuntime()` — null até Z.23 futuro |
| `CentroComando.jsx` | **Sem alteração** |

---

## Registos arquitecturais

| Registo | Entrada |
|---------|---------|
| `cognitiveDomainRegistry` | `ishikawa` · `runtime_id: ishikawa_native` · `maturity: foundation` |
| `cognitiveBlockRegistry` | 12 blocos `ishikawa.*` |
| `FOUNDATION_RUNTIMES` (ARC-001) | `ishikawa_native` · GF-015 |

---

## Testes

```bash
npm run test:ishikawa-runtime-foundation   # 14/14
npm run test:architecture-conformance        # ARC-001 (75+ checks)
npm run test:msa-runtime-foundation          # regressão sibling
npm run test:ppap-runtime-foundation         # regressão sibling
```

**Regressão 10 runtimes LOCKED:** 9 homologados ARC-001 + `msa_native` registado SYSTEM v1.3 — payloads preservados com fundação Ishikawa aditiva.

---

## Restrições respeitadas

- **Zero** alteração em `quality_native`, `ppap_native`, `msa_native` cadeias homologadas
- **Zero** import de `qualityRootCauseEngine.js`
- **Zero** migrations / APIs / CSS
- **Zero** mount CentroComando

---

## Próximo passo

**GF-016 — Ishikawa Core Domain** — schema `ishikawa_*`, serviços, APIs CRUD, avaliação de migração das funções puras legadas.
