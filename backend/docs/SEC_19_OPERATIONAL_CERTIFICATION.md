# SEC-19 — Enterprise Attack Simulation & Operational Stress Certification

**Fase:** SEC-19  
**Tipo:** Certificação operacional (auditoria only)  
**Status:** ✅ Implementado  
**Flag:** `SECURITY_OPERATIONAL_CERTIFICATION=false` (default OFF)

## Objectivo

Validar operacionalmente a arquitectura Enterprise Security v2 (SEC-01→SEC-18) mediante:

- Simulação controlada de ataques (sem tráfego HTTP real)
- Stress operacional simulado (5k / 10k / 20k / 50k requests virtuais)
- Regressão completa SEC-01→18 + Security Baseline
- Cálculo de Operational Readiness Score
- Dashboard `security_operational_certification_v1`

**Nenhuma nova funcionalidade de protecção.** **Nenhum módulo SEC-01→18 alterado.**

## Módulo

```
backend/src/securityOperationalCertification/
backend/src/tests/securityOperational/
```

## Endpoint

`GET /api/audit/security-operational-certification` (read-only, requireAuth + tenant admin)

## Comando de teste

```bash
node backend/src/tests/securityOperational/SEC_19_OPERATIONAL_CERTIFICATION.test.js
```

Regressão completa (≈30–60 min):

```bash
# Sem skip — executa SEC-01→18 + Baseline
node backend/src/tests/securityOperational/SEC_19_OPERATIONAL_CERTIFICATION.test.js
```

Desenvolvimento rápido (sem regressão):

```bash
SKIP_SEC19_REGRESSION=true node backend/src/tests/securityOperational/SEC_19_OPERATIONAL_CERTIFICATION.test.js
```

## Critérios obrigatórios

Ver [`evidence/sec-19/criteria.json`](./evidence/sec-19/criteria.json)

## Documentação relacionada

- [`SEC_19_ATTACK_SCENARIOS.md`](./SEC_19_ATTACK_SCENARIOS.md)
- [`SEC_19_STRESS_RESULTS.md`](./SEC_19_STRESS_RESULTS.md)
- [`SEC_19_OPERATIONAL_SCORE.md`](./SEC_19_OPERATIONAL_SCORE.md)
- [`SEC_19_OBSERVABILITY.md`](./SEC_19_OBSERVABILITY.md)
- [`SEC_19_ROLLBACK.md`](./SEC_19_ROLLBACK.md)
- [`SEC_19_REPORT.md`](./SEC_19_REPORT.md)

## Próximo

**SEC-20** — Enterprise Security v2 Operational Certification (encerramento formal)
