# SECURITY CERTIFICATION REPORT

**Última actualização:** SEC-20 — Enterprise Security v2  
**Programa:** Enterprise Security v1 + v2

---

## v1 (SEC-08)

| Item | Valor |
|------|-------|
| Decisão | CERTIFIED WITH REMARKS |
| Fases | SECURITY-BASELINE-01 → SEC-07 |
| Evidência | `evidence/sec-08/certification-latest.json` |

---

## v2 (SEC-20)

| Item | Valor |
|------|-------|
| Decisão | Ver `evidence/sec-20/certification-latest.json` |
| Fases | SECURITY-BASELINE-01 → SEC-19 |
| Regressão | SEC-01→SEC-19 (100% PASS requerido) |
| Evidência consolidada | `evidence/sec-20/` |

### Pacote de evidências v2

- `certification-latest.json`
- `criteria.json`
- `regression-summary.json`
- `operational-readiness.json`

---

## NCs remanescentes

Registadas em `evidence/sec-20/certification-latest.json` → campo `ncs`

| ID | Severidade | Tema |
|----|------------|------|
| NC-SEC20-002 | Baixa | Flags OFF em produção (shadow by design) |
| NC-SEC20-003 | Média | Stress HTTP real pendente em staging |

---

*Relatório consolidado v1 + v2.*
