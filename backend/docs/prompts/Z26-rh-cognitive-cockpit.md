# PROMPT — FASE Z.26 — RH COGNITIVE COCKPIT SPECIALIZATION

## Pré-requisitos

- **Z.24** foundation
- Z.23 como template de consolidação
- `isHrDashboardLayout` / perfis RH em `dashboardProfiles.js`

---

## Objectivo

Cockpit **RH-native** (people/governance) — sem SST, ESG executivo, produção operacional, telemetria industrial irrelevante.

---

## Implementar `backend/src/cognitiveRuntime/domains/rh/`

- `peopleAnalyticsCenter`
- `turnoverHeatmap`
- `trainingGovernance`
- `hiringPipeline`
- `absenteeismIntelligence`
- `workforceStability`
- `peopleNarrative`
- `organizationalClimateCenter` (Pulse/clima quando dados reais existirem)

Dashboard semântico: turnover, absenteísmo, treinamentos, onboarding, clima, headcount, performance, recrutamento, retenção.

---

## RH contextual AI (assistive)

- Setores com maior turnover?
- Treinamentos vencidos?
- Risco de retenção?
- Área com mais absenteísmo?

---

## Bloqueios explícitos

Validar em testes: zero widgets `manutencao`, `operacoes`, `indicadores_executivos`, `safety_*` em perfis RH.

---

## Flags

```env
IMPETUS_RH_NATIVE_COCKPIT=off
IMPETUS_PEOPLE_ANALYTICS_RUNTIME=off
IMPETUS_RH_OBSERVABILITY=on
```

---

## Testes

```bash
npm run test:rh-native-cockpit
npm run test:people-analytics
npm run test:turnover-heatmap
npm run test:rh-semantic-isolation
```

---

## Relatório final

- Cockpit parece RH-native?
- Isolamento vs SST/produção?
- Dados reais vs proxy documentados?
