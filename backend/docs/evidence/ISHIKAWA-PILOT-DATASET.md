# ISHIKAWA — Pilot Dataset (GF-019)

**Data:** 2026-07-17  
**Tag operacional:** `GF-019`  
**Serviço:** `domains/ishikawa/services/ishikawaPilotScenario.js`

---

## Objetivo

Conjunto representativo de **10 investigações reais** percorrendo o workflow completo do Core Domain (GF-016), alimentando os 12 blocos cognitivos do Block Pack Ishikawa sem alterar Signal Loader, Promotion ou Consolidação.

---

## Cenários incluídos

| Código | Cenário | Categorias 6M | Causa raiz |
|--------|---------|---------------|------------|
| DIM | Defeito dimensional — tolerância fora de spec | MEASUREMENT, METHOD, MACHINE | MEASUREMENT |
| ASM | Defeito de montagem — parafuso faltante | MAN, METHOD | MAN |
| WLD | Defeito de soldagem — porosidade | MACHINE, METHOD, MAN | METHOD |
| CAL | Falha de calibração — drift do instrumento | MEASUREMENT, MACHINE | MEASUREMENT |
| OPR | Erro operacional — procedimento não seguido | MAN, METHOD | MAN |
| SUP | Falha de fornecedor — lote não conforme | MATERIAL, METHOD | MATERIAL |
| CNT | Contaminação de material — particulado | MATERIAL, MOTHER_NATURE, METHOD | MATERIAL |
| ENV | Problema ambiental — humidade elevada | MOTHER_NATURE, MEASUREMENT | MOTHER_NATURE |
| PRC | Instabilidade de processo — variação Cpk | METHOD, MACHINE, MEASUREMENT | METHOD |
| REC | Reincidência de NC — NC-2024-088 | METHOD, MAN, MATERIAL | METHOD |

---

## Cobertura funcional por investigação

Cada registro percorre:

1. **Cadastro** — `createInvestigation` com número `ISH-{suffix}-{code}`
2. **Equipe** — lead + quality engineer
3. **Fishbone 6M** — causas por categoria (diagrama completo na primária)
4. **Five Why** — cadeia de 5 respostas
5. **Evidências** — observação + documento anexo
6. **Workflow** — START → DEFINE_ROOT_CAUSE → PLAN_ACTIONS → SUBMIT_APPROVAL → APPROVE → CLOSE → ARCHIVE
7. **Ações** — corretiva + preventiva
8. **Aprovação** — registo em `ishikawa_investigation_approvals`
9. **Verificação** — `addVerificationResult` (eficácia confirmada)
10. **Encerramento** — estado final `ARCHIVED`

---

## Integrações opcionais (tenant)

Quando existem no tenant piloto:

- `quality_inspection_id`
- `ppap_submission_id`
- `msa_study_id`

---

## Blocos cognitivos alimentados (12/12)

| Bloco | Fonte de dados |
|-------|----------------|
| `ishikawa.investigation_registry` | `ishikawa_root_cause_investigations` |
| `ishikawa.root_cause_repository` | investigações com causa raiz definida |
| `ishikawa.fishbone_analysis` | diagramas + causas fishbone |
| `ishikawa.five_whys` | análises + passos 5 Porquês |
| `ishikawa.corrective_actions` | `ishikawa_corrective_actions` |
| `ishikawa.preventive_actions` | `ishikawa_preventive_actions` |
| `ishikawa.evidence_repository` | evidências + documentos |
| `ishikawa.investigation_workflow` | histórico + aprovações |
| `ishikawa.contextual_root_cause_ai` | blocos upstream bound |
| `ishikawa.organizational_learning` | histórico + encerradas/arquivadas |
| `ishikawa.recurrence_monitor` | verificações + encerradas |
| `ishikawa.ishikawa_narrative` | sumários factuais upstream |

---

## Execução

```javascript
const { runIshikawaPilotScenario } = require('./ishikawaPilotScenario');
const result = await runIshikawaPilotScenario(companyId, { tag: 'GF-019' });
// result.investigations.length === 10
// result.primaryInvestigationId — primeira investigação (DIM)
```

---

## Referências

- [GF-019-ISHIKAWA-PILOT-ENABLEMENT.md](GF-019-ISHIKAWA-PILOT-ENABLEMENT.md)
- [ISHIKAWA-BINDING-REPORT.md](ISHIKAWA-BINDING-REPORT.md)
- [GF-016-ISHIKAWA-CORE-DOMAIN.md](GF-016-ISHIKAWA-CORE-DOMAIN.md)
