# ARC-001 — Architecture Conformance Suite v1.0

**Data:** 2026-07-16  
**Tipo:** infraestrutura de validação arquitectural  
**Modo:** Architecture Governance — **não altera arquitectura homologada**  
**Baseline referência:** [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md)  
**Taxonomia:** [EVOLUTION-TAXONOMY-v1.0.md](EVOLUTION-TAXONOMY-v1.0.md)

---

## Objetivo

Criar uma suíte executável que valide continuamente a conformidade dos contratos arquitecturais do **BASELINE-SYSTEM v1.2**, detectando regressões **antes** das homologações funcionais por domínio.

```bash
npm run test:architecture-conformance
```

A suíte é **determinística** e **independente de dados de produção** (tenant vazio canónico).

---

## Restrições (confirmadas)

| Proibido | Estado |
|----------|--------|
| Alterar runtimes / registries / loaders | **ZERO** |
| Alterar Promotion / CentroComando / SurfaceCapabilities | **ZERO** |
| Alterar thresholds / payloads / BD / APIs / UI / CSS | **ZERO** |
| Alterar lógica de negócio | **ZERO** |

**Artefactos adicionados:** testes + documentação + script npm apenas.

---

## Estrutura da suíte

| Categoria | ID | Ficheiro / módulo | Validação |
|-----------|-----|-------------------|-----------|
| Runtime Registry | **ARC-001A** | `cognitiveDomainRegistry.js` | 9 runtimes homologados |
| Loader Contract | **ARC-001B** | loaders + binding runtime | Exports + shape tenant vazio |
| Payload Contract | **ARC-001C** | `cognitiveRuntimeFacade` | Campos mínimos `/dashboard/me` |
| Promotion Contract | **ARC-001D** | supervisors Z.22/Z.23 | Gate binding · PPAP sem bypass · sem DB |
| SurfaceCapabilities | **ARC-001E** | `dashboardSurfaceCapabilities.js` | Baseline INC-022 fail-closed |
| Centro de Comando | **ARC-001F** | registries FE + `CentroComando.jsx` | OFF/ON hub mount |
| Threshold Policy | **ARC-001G** | flags + supervisors | Z.21=0.5 · Z.22=0.5 · Z.23=0.35 |
| Baseline Integrity | **ARC-001H** | docs evidence | SYSTEM v1.2 · PPAP · TAXONOMY · GF chain |

**Golden manifest:** `backend/tests/architecture-conformance/baselineManifest.js`  
**Runner:** `backend/tests/architecture-conformance/runArchitectureConformanceTests.js`

---

## ARC-001A — Runtime Registry

Runtimes homologados esperados (família → ID canónico):

| Família | Runtime ID |
|---------|------------|
| executive_native | `executive_boardroom` |
| production_native | `production_native` |
| maintenance_native | `maintenance_native` |
| quality_native | `quality_native` |
| logistics_native | `logistics_native` |
| ppap_native | `ppap_native` |
| environment_native | `environmental_native` |
| hr_native | `hr_native` |
| sst_native | `safety_native` |

**Gate:** `RUNTIME_REGISTRY_COMPLETE = YES`

---

## ARC-001B — Loader Contract

Valida existência e exports de:

- `qualityTenantSignalLoader` → `loadQualityTenantSignals`
- `logisticsTenantSignalLoader` → `runLogisticsSignalBinding`
- `ppapTenantSignalLoader` → `runPpapSignalBinding`

Campos mínimos binding (estrutura, não valores):

- `binding_ratio` · `bound_blocks` · `missing_blocks` · `pilot_blocks`
- `signal_readiness` (payload facade / PPAP)

---

## ARC-001C — Payload Contract

Estrutura mínima por runtime (`/dashboard/me` via facade):

**Runtime object:** `runtime_id` · `inactive` · `binding_ratio` · `promotion_applied` · `consolidation_applied` · `cockpit_mode`

**Signal loader (quando aplicável):** campos acima + `signal_readiness`

Perfis cross-domain validados: Executive · Production · Maintenance · Quality · Logistics · Environment · HR · SST.

---

## ARC-001D — Promotion Contract

| Regra | Validação |
|-------|-----------|
| Natural path exige binding | Supervisors rejeitam `binding_ratio < threshold` |
| PPAP sem bypass | `force_ppap_render` / `force_ppap_consolidation` **não** contornam binding |
| Binding do loader | Supervisors leem `engine_bridge.binding_ratio` |
| Sem BD em promotion | Supervisors PPAP/Logistics não `require('db')` |

> Logistics homologado permite bypass de binding via `force_logistics_render` (testes/homologação) — documentado; PPAP é mais restritivo.

---

## ARC-001E — SurfaceCapabilities

Baseline INC-022 — matriz perfil → superfície:

- Quality primário → `maintenance: false` · `commandCenter: true`
- Maintenance primário → `maintenance: true` · `commandCenter: false`
- Quality bloqueia heurística maintenance (`tecnic` + quality)

Detecta contaminação cross-domain e alteração de padrões fail-closed no source.

---

## ARC-001F — Centro de Comando

| Modo | Comportamento validado |
|------|------------------------|
| **OFF** | `shouldSuppress*PlaceholderWidgets` → `false` |
| **ON** | `consolidation_applied` + `cockpit_mode=<domain>_native` → suppress `true` |
| **Isolamento** | PPAP suppress **não** activa com `cockpit_mode=quality_native` |

Registries: Quality (≥3 hubs) · Logistics (7 hubs) · PPAP (6 hubs).

---

## ARC-001G — Threshold Policy

| Gate | Valor congelado |
|------|-----------------|
| Z.21 min binding | **0.5** |
| Z.22 min binding | **0.5** |
| Z.23 Quality / Logistics / PPAP | **0.35** |
| Z.23 Production | **0.25** |

Alteração requer **INC** explícita + actualização `baselineManifest.js`.

---

## ARC-001H — Baseline Integrity

Documentos obrigatórios:

- `BASELINE-SYSTEM-v1.2.md`
- `BASELINE-PPAP-v1.0.md`
- `EVOLUTION-TAXONOMY-v1.0.md`
- Cadeia `GF-000` → `GF-006`
- `INC-045-PPAP-REGISTRATION.md`

---

## Relatório de execução

```
Architecture Conformance Report
Runtime Registry ........ PASS
Loader Contracts ........ PASS
Payload Contracts ....... PASS
Promotion Contracts ..... PASS
SurfaceCapabilities ..... PASS
CentroComando ........... PASS
Threshold Policy ........ PASS
Baseline Integrity ...... PASS

Architecture Status ..... CONFORMANT
```

Em caso de FAIL, cada violação indica `[ARC-001X] descrição` para acção imediata.

---

## Integração CI

| Resultado | Acção |
|-----------|-------|
| **PASS** | Merge permitido (gate arquitectural) |
| **FAIL** | Merge bloqueado — contrato violado |

**Recomendação:** executar **antes** de testes funcionais por domínio:

```bash
cd backend && npm run test:architecture-conformance
```

---

## Critérios de encerramento

| Flag | Valor |
|------|-------|
| `NO_RUNTIME_CHANGED` | **YES** |
| `NO_PROMOTION_CHANGED` | **YES** |
| `NO_LOADER_CHANGED` | **YES** |
| `NO_UI_CHANGED` | **YES** |
| `NO_DATABASE_CHANGED` | **YES** |
| `NO_API_CHANGED` | **YES** |
| `ARCHITECTURE_CONFORMANCE_SUITE` | **YES** |
| `CI_GATE_READY` | **YES** |
| `BASELINE_SYSTEM_v1.2` | **PRESERVED** |

**Resultado homologação:** 65 checks · 0 failed · `Architecture Status = CONFORMANT`

---

## Evolução da suíte

| Versão | Alteração |
|--------|-----------|
| **ARC-001 v1.0** | Suite inicial — 8 categorias · 9 runtimes |
| ARC-001 v1.1 (futuro) | Registo Finance/Supply após GF + INC |
| ARC-001 v1.x | Novos contratos via **INC** + actualização golden manifest |

---

## Posição na trilha de evolução

```
INC-022 → INC-045   Arquitectura estabilizada
GF-000 → GF-006     PPAP construído
ARC-001             Guardião automático ← actual
GF-007+ / EV-001+   Capacidades sobre baseline protegido
```

**Próximo passo funcional recomendado:** **GF-007 — MSA Runtime** (após ARC-001 verde em CI).
