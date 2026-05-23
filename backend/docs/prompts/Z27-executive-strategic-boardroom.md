# PROMPT — FASE Z.27 — EXECUTIVE STRATEGIC BOARDROOM

## Pré-requisitos

- **Z.24** foundation
- **Terminal governance Z.16** — executivo só com módulos/KPIs permitidos
- Z.17 operational convergence validada para perfis C-level

---

## Objectivo

Cockpit **executivo estratégico** real — boardroom, não painel operacional com KPIs brutos.

---

## Implementar `backend/src/cognitiveRuntime/domains/executive/`

- `strategicBoardroom`
- `enterpriseRiskCenter`
- `financialGovernanceCenter`
- `sustainabilityExecutiveCenter`
- `enterpriseHealthCenter`
- `operationalFinanceCenter`
- `executiveNarrativeCenter`
- `strategicDecisionSupport`

Métricas: EBITDA, margem, lucro, sustentabilidade, enterprise health, cross-domain risk, governance maturity, strategic OEE, rollout health — **scoped** por `company_id` e política executiva.

---

## Bloqueios

- Sem excesso de cards operacionais brutos
- Sem noise de turno/linha para `executive_director`
- Integrar com `terminalGovernanceFacade` — purge widgets operacionais se locked

---

## Executive AI (assistive)

- Qual domínio deteriorou?
- Qual risco enterprise aumentou?
- Qual unidade crítica?
- Qual KPI estratégico fora da meta?

---

## Flags

```env
IMPETUS_EXECUTIVE_BOARDROOM=off
IMPETUS_STRATEGIC_COGNITIVE_RUNTIME=off
IMPETUS_EXECUTIVE_OBSERVABILITY=on
```

---

## Testes

```bash
npm run test:executive-boardroom
npm run test:strategic-governance
npm run test:enterprise-risk
npm run test:executive-semantic-runtime
```

Validar: coordinator_quality **não** recebe widgets executivos; executivo **não** recebe NC/SPC operacional detalhado.

---

## Relatório final

- Boardroom parece estratégico vs operacional?
- Cross-domain risk coerente?
- Governance terminal intacta?
