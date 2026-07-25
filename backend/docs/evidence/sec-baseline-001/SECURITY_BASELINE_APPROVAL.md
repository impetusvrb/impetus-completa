# SECURITY_BASELINE_APPROVAL — Aprovação Oficial do Baseline de Segurança

---

```
╔══════════════════════════════════════════════════════════════════════════════╗
║                                                                              ║
║            BASELINE OFICIAL DE SEGURANÇA OPERACIONAL — IMPETUS               ║
║                                                                              ║
║  Missão:    SEC-BASELINE-001                                                 ║
║  Versão:    1.0                                                              ║
║  Data:      2026-07-23                                                       ║
║                                                                              ║
╠══════════════════════════════════════════════════════════════════════════════╣
║                                                                              ║
║  SECURITY_BASELINE_2026 = APPROVED                                           ║
║                                                                              ║
╚══════════════════════════════════════════════════════════════════════════════╝
```

---

## Declaração formal

> O **Baseline Oficial de Segurança Operacional do IMPETUS — Versão 1.0** está aprovado como referência técnica obrigatória para todas as futuras evoluções do ecossistema de segurança da plataforma.
>
> Este baseline consolida os resultados das missões SEC-OBS-001, SEC-COVERAGE-001 e SEC-CERT-001, incorporando o estado certificado de todas as 20 camadas de protecção, os critérios formais de transição de estado, a classificação de confiabilidade, o registo completo de limitações conhecidas e o processo oficial de certificação para novas camadas.
>
> A partir desta data, toda nova camada de segurança ou alteração substancial em camada existente deve percorrer o fluxo OBS→COVERAGE→CERT→BASELINE antes de ser considerada operacionalmente certificada.

---

## Critérios de aceite

| Critério | Resultado |
|---|---|
| `SEC_BASELINE_001_STATUS` | **PASS** |
| `BASELINE_CREATED` | **TRUE** |
| `ALL_CERTIFICATIONS_REFERENCED` | **TRUE** |
| `ALL_LIMITATIONS_DOCUMENTED` | **TRUE** |
| `GOVERNANCE_PROCESS_DEFINED` | **TRUE** |
| `NO_PRODUCTION_CODE_CHANGED` | **TRUE** |
| `NO_REGRESSIONS` | **TRUE** |
| `FORENSIC_EVIDENCE_PRESERVED` | **TRUE** |

---

## Métricas oficiais do baseline v1.0

| Métrica | Valor |
|---|---|
| Data de emissão | 2026-07-23T01:25:15Z |
| Total de camadas | 20 |
| CERTIFIED | 10 (56% das 18 com escopo) |
| CERTIFIED_WITH_LIMITATIONS | 8 (44%) |
| NOT_CERTIFIED | 0 |
| N/A (escopo) | 2 |
| Confiança ALTA | 9 camadas |
| Confiança MÉDIA | 6 camadas |
| Confiança BAIXA | 3 camadas |
| Score Phase C | 0.64 / CERTIFIED_WITH_REMARKS |
| Score meta após GAP-INT-01 | ≥ 0.75 |
| Defeitos P0 abertos | 0 |
| Defeitos P1 abertos | 1 (GAP-INT-01) |
| Multi-source consistency | YES |
| UNSUPPORTED_STATE | 0 |
| AMBIGUOUS_STATE | 0 |

---

## Relatório final (10 perguntas)

**1. O Baseline Oficial foi consolidado?**  
Sim. 6 documentos gerados em `backend/docs/evidence/sec-baseline-001/`, incorporando todas as missões anteriores.

**2. Todas as certificações foram incorporadas?**  
Sim — SEC-OBS-001 (PASS), SEC-COVERAGE-001 (PASS), SEC-CERT-001 (APPROVED_WITH_LIMITATIONS) estão referenciadas e consolidadas.

**3. Todas as limitações permaneceram registradas?**  
Sim — 8 gaps formalizados em `SECURITY_LIMITATIONS_BASELINE.md`: 0 P0, 3 P1, 5 P2.

**4. O fluxo oficial de certificação de novas camadas foi definido?**  
Sim — fluxo OBS→COVERAGE→CERT→BASELINE→PRODUÇÃO documentado em `SECURITY_GOVERNANCE_BASELINE.md` com critérios formais por fase.

**5. Houve alteração em código de produção?**  
**Não.** Esta missão é exclusivamente documental.

**6. Houve build ou reinício de serviços?**  
**Não.** `NO_PRODUCTION_CODE_CHANGED = TRUE`.

**7. O baseline foi aprovado como referência oficial?**  
`SECURITY_BASELINE_2026 = APPROVED`. O baseline é a referência técnica obrigatória a partir de 2026-07-23.

**8. O próximo passo continua sendo o GAP-INT-01?**  
Sim. GAP-INT-01 (sensor real de integridade) é a 1ª prioridade. Quando implementado, iniciar SEC-OBS-002 → SEC-COVERAGE-002 → SEC-CERT-002 → SEC-BASELINE-002.

**9. O ADR-018 permanece como segunda prioridade?**  
Sim. GAP-BK-01 / ADR-018 (pipeline backup imutável automático) é a 2ª prioridade. RPO indefinido é o risco operacional mais alto do produto neste momento.

**10. Recomendações antes de qualquer nova evolução da segurança?**

| # | Recomendação | Referência |
|---|---|---|
| 1 | Implementar GAP-INT-01 antes de qualquer nova camada de segurança | `SECURITY_LIMITATIONS_BASELINE.md#GAP-INT-01` |
| 2 | Operacionalizar ADR-018 (pipeline backup) | `backend/docs/adrs/ADR-018-backup-estrategia.md` |
| 3 | Corrigir GAP-SIM-01 (script de simulação) | `SECURITY_LIMITATIONS_BASELINE.md#GAP-SIM-01` |
| 4 | Nenhuma nova camada de segurança sem percorrer OBS→COVERAGE→CERT→BASELINE | `SECURITY_GOVERNANCE_BASELINE.md` |
| 5 | Qualquer alteração em `buildProtectionLayers()` deve incluir smoke test de telemetria | `SECURITY_GOVERNANCE_BASELINE.md#2` |
| 6 | Manter score Phase C ≥ 0.60 (INV-BL-007); meta pós-GAP-INT-01 ≥ 0.75 | `SECURITY_OPERATIONAL_BASELINE_2026.md#6` |
| 7 | Rever `companies` sem RLS (GAP-RLS-01) no contexto de expansão de tenants | `SECURITY_LIMITATIONS_BASELINE.md#GAP-RLS-01` |

---

## Estrutura completa do ciclo de certificação 2026

```
backend/docs/evidence/
│
├── sec-obs-001/                         ← PASS (2026-07-23)
│   ├── SECURITY_LAYER_TELEMETRY_AUDIT.md
│   ├── SECURITY_LAYER_STATUS_MATRIX.md
│   └── SECURITY_LAYER_GAP_ANALYSIS.md
│
├── sec-coverage-001/                    ← PASS (2026-07-23)
│   ├── SECURITY_LAYER_COVERAGE_AUDIT.md
│   ├── SECURITY_LAYER_TRANSITION_MATRIX.md
│   ├── SECURITY_LAYER_VALIDATION_MATRIX.md
│   ├── SECURITY_LAYER_CONFIDENCE_MATRIX.md
│   └── SECURITY_LAYER_CERTIFICATION_REPORT.md
│
├── sec-cert-001/                        ← APPROVED_WITH_LIMITATIONS (2026-07-23)
│   ├── SECURITY_CERTIFICATION_MATRIX.md
│   ├── SECURITY_REPRODUCIBILITY_REPORT.md
│   ├── SECURITY_MULTI_SOURCE_CONSISTENCY.md
│   ├── SECURITY_LIMITATIONS_REGISTER.md
│   ├── SECURITY_OPERATIONAL_CERTIFICATION.md
│   └── SECURITY_FINAL_CERTIFICATE.md
│
└── sec-baseline-001/                    ← APPROVED (2026-07-23)
    ├── SECURITY_OPERATIONAL_BASELINE_2026.md
    ├── SECURITY_GOVERNANCE_BASELINE.md
    ├── SECURITY_LAYER_REFERENCE.md
    ├── SECURITY_CERTIFICATION_PROCESS.md
    ├── SECURITY_LIMITATIONS_BASELINE.md
    └── SECURITY_BASELINE_APPROVAL.md  ← este ficheiro
```

---

*Baseline v1.0 — não reeditar sem nova evidência de regressão ou novo ciclo de certificação.*  
*Próxima versão esperada: v1.1 após implementação de GAP-INT-01 (SEC-BASELINE-002).*
