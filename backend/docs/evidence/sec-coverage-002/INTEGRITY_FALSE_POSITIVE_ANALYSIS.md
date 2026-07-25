# INTEGRITY_FALSE_POSITIVE_ANALYSIS.md
## SEC-COVERAGE-002 — Falsos Positivos e Falsos Negativos

**Data:** 2026-07-23

---

## 1. Taxas Observadas (janela controlada)

| Métrica | Valor |
|---|---|
| Testes controlados aplicáveis | 7 |
| Detectados correctamente | 7 |
| Falsos negativos | 0 |
| Taxa FN | **0.0%** |
| Falsos positivos (injectos / activos restaurados) | 0 |
| Taxa FP | **0.0%** |
| IDs de evento duplicados | 0 |
| Inconsistências de severidade CRITICAL | 0 |

---

## 2. Verdadeiros Positivos Operacionais (não FP)

Na activação SEC-OBS-002, o motor reportou HASH_CHANGED em:

- INT-C-001 `server.js` (hook INT-01B)
- INT-C-002 `.env` (flag)
- INT-H-001 / INT-H-002 (integração INT-01D)

Classificação: **verdadeiros positivos** por drift legítimo face ao baseline INT-01A. Não regenerar baseline agora — apenas em SEC-BASELINE-002 após CERT.

---

## 3. Cenários Analisados

| Cenário | Resultado |
|---|---|
| Alteração intencional de conteúdo | Detectado (TP) |
| Alteração intencional de permissão | Detectado (TP) |
| Alteração intencional de UID | Detectado (TP) |
| Exclusão / rename | Detectado (TP) |
| Restauração ao hash baseline | Sem re-alarme contínuo indevido |
| Deduplicação Event Bus | Sem duplicação de `event_id` |
| Severidade CRITICAL assets | CRITICAL/HIGH conforme regras |

---

## 4. Nota sobre alteração de grupo (GID)

`chgrp` **não** gera `OWNER_CHANGED` — o PermChecker compara apenas UID. Documentado como limitação P2 (não FN de owner UID).

---

## 5. Aceitação

| Critério | Valor |
|---|---|
| FALSE_POSITIVE_RATE_ACCEPTABLE | TRUE (0% ≤ limiar arquitectural ~5%) |
| FALSE_NEGATIVE_RATE_ACCEPTABLE | TRUE (0%) |
