# APPSEC-02A — Confidence Level

**Componente:** `confidenceLevelEngine.js`

---

## Objetivo

Expandir cada finding APPSEC-02 (RT-01…RT-16) com **Confidence Level** quantificado, combinando múltiplas fontes de evidência.

---

## Escala

| Nível | Percentual |
|-------|------------|
| VERY_HIGH | 90–100% |
| HIGH | 75–89% |
| MEDIUM | 55–74% |
| LOW | 35–54% |
| VERY_LOW | 0–34% |

---

## Fontes de evidência (pesos)

| Fonte | Peso |
|-------|------|
| static_code | 25% |
| static_policy | 20% |
| dynamic_http | 30% |
| runtime_operational | 15% |
| regression_clean | 10% |

---

## Exemplos esperados

| Finding | Status | Confidence |
|---------|--------|------------|
| RT-01 | FIXED | ~99% |
| RT-02 | FIXED | ~96% |
| RT-07 | PARTIALLY_FIXED | ~71% (backups UNSAFE presentes) |
| RT-08 | PARTIALLY_FIXED | ~68% (config runtime) |
| RT-09 | PARTIALLY_FIXED | ~65% (deps pendentes) |

Findings **NOT_APPLICABLE** recebem 100% (out of scope).

---

## Campos por finding

```json
{
  "finding_id": "RT-01",
  "status": "FIXED",
  "confidence_percent": 99,
  "confidence_level": "VERY_HIGH",
  "evidence": ["static_code:mitigation_present", "dynamic_http:verified"]
}
```

---

## Relatório JSON

`docs/evidence/appsec-02a/confidence-level.json`

Inclui `aggregate`: média, contagem abaixo de MEDIUM, etc.

---

## Critério de aceitação

Todos os findings do baseline Red Team possuem `confidence_level` e `confidence_percent` — verificado pela suíte APPSEC_02A test 12.
