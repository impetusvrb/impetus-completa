# PROMPT — FASE Z.25 — SST COGNITIVE COCKPIT SPECIALIZATION

## Pré-requisitos

- **Z.24** registry multi-domínio activo
- Roadmap 2026-05-22, Z.23 como referência de padrão
- Perfis SST mapeados em `dashboardProfiles.js` / `domainRegistry.js`

---

## Objectivo

Primeiro cockpit **safety-native** real — substituir semanticamente cockpit industrial genérico SST.

---

## Implementar `backend/src/cognitiveRuntime/domains/sst/`

Centros (payload + bridge a engines SST existentes ou stubs governados):

- `incidentIntelligenceCenter`
- `permitGovernanceCenter` (APR/PT/LOTO)
- `ppeComplianceCenter`
- `hazardHeatmapCenter`
- `safetyTelemetryCenter`
- `fieldOccurrenceCenter`
- `riskMatrixCenter`
- `safetyNarrativeCenter`
- `safetyDecisionSupport`

Métricas: incidentes, quase-acidentes, EPI, mapa risco, reincidência, comportamento inseguro, risco por setor.

---

## Generic collapse (SST)

Reduzir peso/render: produção, eficiência industrial, uptime genérico, executivo híbrido. Preservar `widgets_legacy`.

---

## Safety contextual AI (assistive only)

Perguntas exemplo: áreas com mais incidentes; APRs críticas; risco em alta; reincidência; comportamento inseguro.

**Sem** activar chat global.

---

## Integração

- Reutilizar padrão Z.23: `specialized_cockpit_runtime` com `cockpit_mode: "sst_native"`
- Piloto: perfis `coordinator_safety` / equivalentes no registry Z.24
- Terminal governance após enrich

---

## Flags

```env
IMPETUS_SST_NATIVE_COCKPIT=off
IMPETUS_SAFETY_COGNITIVE_RUNTIME=off
IMPETUS_SST_OBSERVABILITY=on
```

---

## Testes

```bash
npm run test:sst-native-cockpit
npm run test:safety-telemetry
npm run test:safety-governance
npm run test:hazard-heatmap
npm run test:sst-semantic-isolation
```

---

## Relatório final

- Cockpit SST parece safety-native?
- Genericidade industrial reduzida?
- Leakage zero?
- Usefulness melhorou vs baseline Z.17?
