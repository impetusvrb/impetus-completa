# BASELINE-LOCK-01 — Checklist de Encerramento

**Data:** 2026-07-03 · **Modo:** Read-only

---

## Pré-requisitos

- [x] EG-20 certificado
- [x] INTEG-01 certificado
- [x] PROMOTION-01 / PROMOTION-02 concluídos
- [x] ECO-01 → ECO-08 certificados
- [x] Infra FORENSICS → BACKUP certificada (engenharia)

---

## PARTE 1 — Certificações

- [x] Inventário completo em CERTIFICATIONS-INDEX
- [x] Documentação por certificação existe
- [x] Evidências eco-01…08 presentes
- [x] Evidências event-governance-20 presentes
- [x] Roadmap ECO marcado encerrado
- [x] Matriz consolidada emitida (BASELINE_LOCK_MATRIX.md)

---

## PARTE 2 — ADRs

- [x] 25 ADRs listados em adrs/INDEX.md
- [x] 5 ADRs ECO classificados
- [x] 20 ADRs Enterprise classificados
- [x] Nenhum ADR sem classificação
- [x] ADR-ECO-005 marcado futuro (retirement v2)

---

## PARTE 3 — Arquitectura

- [x] EG v1 congelado (auditoria estática)
- [x] 6 adapters ECO presentes
- [x] 5 consumidores integrados
- [x] Rollback por flag documentado
- [x] ENTERPRISE_BASELINE_V1.md emitido

---

## PARTE 4 — Código

- [x] Pesquisa TODO/FIXME/HACK/XXX (read-only)
- [x] NCs registadas para pendências
- [x] **Nenhuma alteração de código**

---

## PARTE 5 — Feature flags

- [x] ECO_OAE_VIA_EG = false
- [x] ECO_CHAT_VIA_EG = false
- [x] ECO_ORG_AI_VIA_EG = false
- [x] ECO_CONTROLLER_VIA_EG = false
- [x] ECO_PULSE_VIA_EG = false
- [x] ECO_CONTEXT_VIA_EG = false
- [x] ECO_EXECUTIVE_VIA_EG = false
- [x] EVENT_GOVERNANCE_* Grupo A = true
- [x] Classificação shadow/baseline documentada

---

## PARTE 6 — Observabilidade

- [x] /api/audit/event-governance/* (21 rotas)
- [x] /api/audit/eco-convergence/status
- [x] /api/audit/eco-controller/status
- [x] /api/audit/eco-pulse/status
- [x] /api/audit/eco-context/status
- [x] /api/audit/eco-executive/status
- [x] Métricas eco_* e event_governance_* registadas

---

## PARTE 7 — Documentação

- [x] FUNCTIONAL_MATRIX — secção ECO + baseline
- [x] CERTIFICATIONS-INDEX — BASELINE-LOCK-01
- [x] adrs/INDEX.md
- [x] Volume-10 ROADMAP — baseline encerrada
- [x] ENTERPRISE_BASELINE_V1.md
- [x] BASELINE_LOCK_REPORT.md
- [x] BASELINE_LOCK_MATRIX.md

---

## Critérios obrigatórios

- [x] baseline_v1_frozen
- [x] architecture_locked
- [x] all_certifications_registered
- [x] all_adrs_classified
- [x] all_feature_flags_classified
- [x] all_observability_verified
- [x] no_pending_enterprise_code_changes *(durante este lock)*
- [x] documentation_consistent
- [x] future_v2_guidelines_defined
- [x] production_code_unchanged

---

## Decisão

**BASELINE ENCERRADA COM RESSALVAS**

Ressalvas: NC-BL-03 (homologação ops), NC-BL-04 (flags staging), NC-BL-01/02 (TODOs menores).
