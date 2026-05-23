# PROMPT — FASE Z.23 — SPECIALIZED COGNITIVE COCKPIT CONSOLIDATION

## Antes de iniciar (obrigatório)

Ler:

- `backend/docs/cognitive-cockpit-domain-specialization-audit.md` (2026-05-22)
- `backend/docs/controlled-cognitive-render-promotion-z22.md`
- `backend/docs/kpi-domain-adapter-z21.md`
- `backend/docs/quality-engine-bridge-z20.md`
- `backend/docs/runtime-cognitive-composition-z19.md`
- `backend/docs/terminal-governance-lock.md` (se existir na raiz docs)
- `backend/docs/operational-convergence-validation.md` (se existir)

Validar que Z.19–Z.22 estão verdes:

```bash
cd backend && npm run test:cognitive-composition && npm run test:quality-engine-bridge && npm run test:specialized-delivery && npm run test:render-promotion
```

---

## Contexto

Z.22 entregou promoção controlada de render (`widgets_promoted`, `cognitive_render_promotion`). O cockpit ainda é **híbrido** (widgets industriais + centros parcialmente especializados).

**Z.23** consolida o **primeiro cockpit cognitivo operacional nativo de Quality** para `coordinator_quality` — sem rewrite React nem CSS estrutural.

---

## Objectivo

Implementar **SPECIALIZED COGNITIVE COCKPIT CONSOLIDATION**:

- governance-safe, deterministic, rollback-safe, pilot-only
- additive-first, operationally useful, cognitively coherent

**Proibido:** rewrite React, CSS estrutural, cockpit replacement global, hard delete widgets, boundary global, auto-remediation, chat activation.

---

## 1. Backend — `backend/src/cognitiveRuntime/cockpitConsolidation/`

```
cockpitConsolidation/
├── quality/
│   ├── qualityCockpitConsolidator.js
│   ├── qualityOperationalCenter.js      # NC: abertas, críticas, reincidência, setor, lotes
│   ├── qualityGovernanceCenter.js       # auditorias, ISO, fornecedor, compliance
│   ├── qualityTelemetryCenter.js        # SPC: Cp/Cpk, drift, alarmes
│   ├── qualityNarrativeCenter.js
│   ├── qualityActionCenter.js           # CAPA: vencidas, eficácia, causa raiz
│   └── qualityDecisionSupport.js        # perguntas contextuais quality
├── runtime/
│   ├── cognitiveCockpitConsolidator.js
│   ├── cockpitDomainBalancer.js         # 70% op / 20% gov / 10% estratégico
│   ├── cockpitUsefulnessOptimizer.js
│   ├── cockpitDensityGovernor.js
│   └── cockpitFallbackSupervisor.js
└── observability/
    ├── cockpitSpecializationTelemetry.js
    ├── cockpitOperationalMetrics.js
    └── cockpitCognitiveHealth.js
```

Dados reais: reutilizar `qualityTenantSignalLoader`, `qualityBlockBridgeInvoker`, shadow cockpit Z.20.

---

## 2. Centros (payload consolidado, não novos componentes UI)

Cada centro expõe `center_id`, `metrics`, `signals`, `render_slot` mapeado a widgets existentes (`qualidade`, `kpi_cards`, `grafico_tendencia`, `insights_ia`, `alertas`, `pergunte_ia`).

---

## 3. Generic cockpit collapse

Reduzir presença/peso de: `resumo_executivo`, `operacoes`, `gargalos`, `centro_previsao`, `indicadores_executivos` — via `collapsed_generic: true` + `widgets_legacy`, **sem** apagar do rollback.

---

## 4. Cockpit density governor

Limites configuráveis (ex.: máx. 8 widgets activos, máx. 12 métricas visíveis). Rejeitar overload; log `COCKPIT_DENSITY_CAPPED`.

---

## 5. Summary consolidation

Enriquecer narrativa quality (reutilizar `qualitySummaryAdapter` / `qualityExecutiveNarrativeEngine`) com foco: estabilidade, auditoria, SPC, CAPA, fornecedores, recorrência.

---

## 6. Cognitive health score

```json
{
  "cockpit_cognitive_health": {
    "specialization": 0.0,
    "usefulness": 0.0,
    "genericity": 0.0,
    "operational_focus": 0.0,
    "cognitive_density": 0.0
  }
}
```

---

## 7. Frontend (mínimo — sem novo dashboard)

Criar `frontend/src/cognitiveRuntime/cockpit/`:

- `specializedCockpitResolver.js` — lê `specialized_cockpit_runtime` + centros do `/me`
- `cockpitCompositionRenderer.js` — merge metadata nos widgets existentes (`raw.cognitive_center`)
- `qualityCockpitRuntime.js`
- `cockpitDensityBalancer.js`
- `cockpitFallbackRuntime.js`

Integrar em `dashboardContextAdapter` ou `CentroComando` **apenas** pass-through de metadata (labels, hints, métricas nos widgets já renderizados).

---

## 8. Integração `/dashboard/me`

Adicionar (aditivo):

```json
{
  "specialized_cockpit_runtime": {
    "phase": "Z.23",
    "cockpit_mode": "quality_native",
    "specialized_ratio": 0.0,
    "generic_ratio": 0.0,
    "operational_focus": 0.0,
    "cognitive_health": {},
    "centers": [],
    "fallback_preserved": true
  }
}
```

Integrar em `cognitiveRuntimeFacade.js` **após** Z.21 enrich e Z.22 render promotion.

---

## 9. Flags (`backend/.env` — default off até validação)

```env
IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=off
IMPETUS_QUALITY_NATIVE_COCKPIT=off
IMPETUS_COGNITIVE_COCKPIT_BALANCER=off
IMPETUS_COCKPIT_DENSITY_GOVERNOR=off
IMPETUS_SPECIALIZED_COCKPIT_OBSERVABILITY=on
```

Piloto activação:

```env
IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=quality_native
IMPETUS_QUALITY_NATIVE_COCKPIT=pilot
IMPETUS_COGNITIVE_COCKPIT_BALANCER=on
IMPETUS_COCKPIT_DENSITY_GOVERNOR=on
```

---

## 10. Testes (`package.json`)

```bash
npm run test:specialized-cockpit-runtime
npm run test:quality-native-cockpit
npm run test:quality-telemetry-runtime
npm run test:quality-governance-center
npm run test:cognitive-density-governor
npm run test:cockpit-balancing
npm run test:cockpit-health
```

Ficheiro sugerido: `backend/tests/cognitive-runtime/runCockpitConsolidationTests.js`

Validar: no leakage, no executive contamination, no underdelivery, no overload, determinismo, governance, fallback.

---

## 11. Documentação

- `backend/docs/specialized-cognitive-cockpit-z23.md`
- `backend/docs/quality-native-operational-cockpit.md`
- `backend/docs/cockpit-cognitive-health.md`
- `backend/docs/cockpit-density-governor.md`
- `backend/docs/cognitive-cockpit-balancing.md`

---

## 12. Relatório final obrigatório

Entregar em markdown com:

| Métrica | Valor |
|---------|-------|
| specialized cockpit ratio | |
| genericity reduction | |
| operational usefulness delta | |
| cockpit cognitive health | |
| semantic fidelity | |
| governance preservation | |
| determinism validation | |
| fallback behaviour | |
| density / overload analysis | |
| underdelivery analysis | |
| rollout readiness | |
| riscos | |
| readiness multi-domain | |

Responder explicitamente:

1. O cockpit parece verdadeiramente quality-native?
2. A genericidade industrial deixou de dominar?
3. O cockpit ficou mais útil operacionalmente?
4. Continua estável?
5. Pronto para expansão multi-domínio (Z.24)?

---

## Rollback

```env
IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=off
IMPETUS_QUALITY_NATIVE_COCKPIT=off
```

`pm2 reload impetus-backend --update-env`
