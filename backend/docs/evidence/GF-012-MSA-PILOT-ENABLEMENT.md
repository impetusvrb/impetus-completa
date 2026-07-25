# GF-012 — MSA Pilot Enablement (Operational Dataset)

**Data:** 2026-07-17  
**Tipo:** implementação funcional controlada  
**Pré-requisitos:** [GF-011-MSA-PROMOTION.md](GF-011-MSA-PROMOTION.md) · [GF-009-MSA-CORE-DOMAIN.md](GF-009-MSA-CORE-DOMAIN.md) · [BASELINE-SYSTEM-v1.2.md](BASELINE-SYSTEM-v1.2.md) (LOCKED)

---

## Gate de validação

| Flag | Valor |
|------|-------|
| `MSA_OPERATIONAL_DATA` | **YES** |
| `MSA_SIGNAL_READINESS` | **DATA_AVAILABLE** (`partial` \| `ready`) |
| `MSA_BINDING_RATIO` | **> 0** (12/12 blocos após pilot) |
| `NO_SYNTHETIC_DATA` | **YES** |
| `PROMOTION_FORCED` | **NO** |
| `GATE_DRIVEN` | **YES** |
| `NO_RUNTIME_REGRESSION` | **YES** |
| `BASELINE_SYSTEM_v1.2` | **PRESERVED** |
| `ARC_001_CONFORMANCE` | **PRESERVED** |

---

## Princípio

Cria **massa operacional real** via Core Domain GF-009 — **sem alterar** Signal Loader, Promotion, facade, registries ou ARC-001.

Espelha disciplina **GF-005 (PPAP Pilot Enablement)**.

---

## Implementação

| Componente | Path | Função |
|------------|------|--------|
| Pilot scenario | `domains/msa/services/msaPilotScenario.js` | `runMsaPilotScenario()` |
| Evidence helpers | `domains/msa/services/msaStudyEvidenceService.js` | `linkStudyOperator`, `linkStudyPart` |
| Master data lists | `domains/msa/services/msaMasterDataService.js` | GET list APIs |
| Operational API | `routes/msa.js` | CRUD + workflow + evidências |

### Fluxo piloto

1. Cadastro: gauges, instruments, operators, parts, calibration references  
2. Estudo Variable GRR principal: operadores, peças, amostras (27 medições determinísticas), documentos  
3. Workflow completo: PLAN → START → REVIEW → APPROVE  
4. Aprovações explícitas (metrology + quality)  
5. Estudos adicionais: Attribute Agreement, Bias, Linearity, Stability (extensões dedicadas)  
6. Integrações opcionais: `ppap_submission_id`, `quality_inspection_id` quando existem no tenant  

### Blocos cognitivos alimentados (12/12)

| Bloco | Dataset |
|-------|---------|
| `measurement_system_registry` | `msa_measurement_studies` |
| `gauge_inventory` | `msa_gauges` + `msa_instruments` |
| `variable_grr` | `msa_variable_grr_studies` |
| `attribute_agreement` | `msa_attribute_agreement_studies` |
| `bias_analysis` | `msa_bias_studies` |
| `linearity_analysis` | `msa_linearity_studies` |
| `stability_analysis` | `msa_stability_studies` |
| `measurement_capability` | `msa_measurement_samples` |
| `calibration_monitoring` | `msa_calibration_references` + gauges |
| `study_governance` | `msa_study_history` + `msa_study_approvals` |
| `contextual_msa_ai` | blocos bound upstream |
| `msa_narrative` | sumários factuais upstream |

---

## APIs operacionais (completadas)

| Método | Rota |
|--------|------|
| GET | `/api/msa/gauges`, `/instruments`, `/operators`, `/parts`, `/calibration-references` |
| POST | `/api/msa/instruments`, `/calibration-references` |
| POST | `/api/msa/studies/:id/operators`, `/parts`, `/samples`, `/documents`, `/approvals` |
| POST | `/api/msa/studies/:id/plan\|start\|review\|approve\|reject\|reopen\|archive` |

Sem endpoints cognitivos novos.

---

## Runtime esperado pós-pilot

```json
{
  "msa_signal_loader": {
    "binding_ratio": 1,
    "signal_readiness": "ready",
    "bound_blocks": ["msa.measurement_system_registry", "..."]
  },
  "msa_cognitive_runtime": {
    "inactive": true,
    "promotion_applied": false,
    "consolidation_applied": false
  }
}
```

Promotion **não forçada** — gates Z.22/Z.23 da GF-011 permanecem válidos.

---

## Testes

```bash
npm run test:msa-pilot-enablement
npm run test:msa-promotion-chain
npm run test:msa-signal-loader
npm run test:msa-core-domain
npm run test:architecture-conformance
```

---

## Restrições respeitadas

- `msaCoreSemantics.js` — **inalterado**
- Workflow engine — **inalterado**
- Signal Loader / Promotion / facade — **inalterados**
- Thresholds Z.22/Z.23 — **inalterados**
- CentroComando / registries — **inalterados**
- Sem `Math.random()` em dados operacionais

---

## Próximo passo

**GF-013 — Homologation:** validar cenários OFF/ON, emitir `BASELINE-MSA-v1.0`, preparar INC-046.

---

## Referências

- [MSA-ARCHITECTURE-v1.0.md](MSA-ARCHITECTURE-v1.0.md) §2.5
- [GF-005-PPAP-PILOT-ENABLEMENT.md](GF-005-PPAP-PILOT-ENABLEMENT.md) (modelo espelho)
