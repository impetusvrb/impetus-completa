# GF-005 — PPAP Pilot Enablement (Massa Piloto + Validação Funcional)

**Data:** 2026-07-16  
**Tipo:** implementação funcional controlada (enablement operacional)  
**Pré-requisitos:** [GF-004-PPAP-PROMOTION.md](GF-004-PPAP-PROMOTION.md) · [GF-003-PPAP-SIGNAL-LOADER.md](GF-003-PPAP-SIGNAL-LOADER.md)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `PPAP_PILOT_DATA_CREATED` | **YES** |
| `PPAP_WORKFLOW_VALIDATED` | **YES** |
| `PPAP_SIGNAL_LOADER_OBSERVED_REAL_DATA` | **YES** |
| `PPAP_BINDING_RATIO > 0` | **YES** (`1.0` após cenário piloto) |
| `NO_RUNTIME_LOGIC_CHANGED` | **YES** |
| `PPAP_PROMOTION_FORCED` | **NO** |
| `BASELINE_SYSTEM_v1.1` | **PRESERVED** |

---

## Princípio

Esta fase **não altera arquitectura cognitiva**. Cria capacidade operacional para que o runtime `ppap_native` possa atingir naturalmente os critérios de Promotion.

Componentes **intocados:**

- `ppapTenantSignalLoader` / bridge Z.20
- Promotion Z.22 / Consolidação Z.23
- Registries cognitivos / CentroComando
- Thresholds / runtime flags

O Signal Loader **apenas observa** os novos dados persistidos.

---

## Escopo implementado

### Serviços operacionais

| Serviço | Path | Responsabilidade |
|---------|------|----------------|
| Evidence | `domains/ppap/services/ppapEvidenceService.js` | PSW, dimensional, material, capability, appearance, performance, ECN, documentos |
| Pilot scenario | `domains/ppap/services/ppapPilotScenario.js` | Cenário piloto completo (testes + seed) |

### APIs `/api/ppap` (GF-005)

| Método | Rota |
|--------|------|
| GET/POST | `/parts` |
| GET/POST | `/suppliers` |
| GET/POST | `/customers` |
| POST | `/submissions/:id/psw` |
| POST | `/submissions/:id/dimensional-results` |
| POST | `/submissions/:id/material-certifications` |
| POST | `/submissions/:id/capability-studies` |
| POST | `/submissions/:id/appearance-approvals` |
| POST | `/submissions/:id/performance-tests` |
| POST | `/submissions/:id/engineering-changes` |
| POST | `/submissions/:id/documents` |
| POST | `/submissions/:id/advance-technical` |
| POST | `/submissions/:id/advance-quality` |
| POST | `/submissions/:id/request-approval` |
| POST | `/submissions/:id/resubmit` |

Workflow completo até `APPROVED` via acções canónicas GF-002.

---

## Cenário piloto executado

1. Criar peça, fornecedor, cliente OEM  
2. Criar submissão PPAP Level 3  
3. Registar PSW aprovado  
4. Anexar documentos (control plan, PFMEA, PSW)  
5. Certificação material + estudo Cp/Cpk  
6. Resultados dimensionais (2 características)  
7. Aprovação aparência + teste desempenho + ECN  
8. Workflow: `submit` → `advance_technical` → `advance_quality` → `request_approval` → `approve`  
9. Estado final: **`APPROVED`** + histórico ≥ 5 transições  

---

## Observação Signal Loader (pós-piloto)

| Métrica | Antes | Depois |
|---------|-------|--------|
| `binding_ratio` | `0.333`* | **`1.0`** |
| `signal_readiness` | `ready` | `ready` |
| `bound_blocks` | parcial | **12/12** |
| `missing_blocks` (NO_DATASET) | variável | **0** |

\* Tenant de teste já continha dados residuais de GF-002.

### Blocos vinculados após piloto

`ppap.submission_management` · `ppap.supplier_approval` · `ppap.dimensional_validation` · `ppap.material_certification` · `ppap.process_capability` · `ppap.appearance_approval` · `ppap.performance_validation` · `ppap.document_package` · `ppap.engineering_change` · `ppap.customer_requirements` · `ppap.contextual_ppap_ai` · `ppap.ppap_narrative`

### Runtime (sem forçar Promotion)

```
ppap_cognitive_runtime.inactive = true
ppap_cognitive_runtime.promotion_applied = false
ppap_cognitive_runtime.consolidation_applied = false
ppap_signal_loader.binding_ratio = 1.0
```

---

## Decisão GF-006 (concluída)

Com `binding_ratio = 1.0` ≥ thresholds (Z.22 ≥ 0.5 · Z.23 ≥ 0.35), o tenant piloto cumpriu os critérios de gate.

**Homologação:** [GF-006-PPAP-RUNTIME-HOMOLOGATION.md](GF-006-PPAP-RUNTIME-HOMOLOGATION.md) · **Baseline:** [BASELINE-PPAP-v1.0.md](BASELINE-PPAP-v1.0.md)

**Registo sistémico:** **INC-045** ✅ — [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md)

---

## Testes

```bash
npm run test:ppap-pilot-enablement   # 7/7
npm run test:ppap-core-domain        # 9/9
npm run test:ppap-signal-loader      # 9/9
npm run test:ppap-promotion-chain     # 7/7
```

---

## Ficheiros criados / alterados

| Ficheiro | Acção |
|----------|-------|
| `domains/ppap/services/ppapEvidenceService.js` | **NOVO** |
| `domains/ppap/services/ppapPilotScenario.js` | **NOVO** |
| `routes/ppap.js` | **EXPANDIDO** (APIs operacionais) |
| `tests/ppap/runPpapPilotEnablementTests.js` | **NOVO** |
| `package.json` | `test:ppap-pilot-enablement` |

**Não alterados:** Signal loader, promotion, consolidação, registries, CentroComando, thresholds, flags.
