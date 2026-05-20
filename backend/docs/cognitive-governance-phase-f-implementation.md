# Fase F — Unified Cognitive Exposure Governance

## Entrypoints integrados

| Canal | Módulo | Activar |
|-------|--------|---------|
| Chat | `secureChatContextBuilder.js` | `IMPETUS_CHAT_GOVERNANCE=on` |
| KPIs | `secureKpiExposureResolver.js` | `IMPETUS_KPI_GOVERNANCE=on` |
| Summaries | `summaryExposureSanitizer.js` | `IMPETUS_SUMMARY_GOVERNANCE=on` |
| Todos os pipelines IA | `cognitiveBoundaryGuard.js` | `IMPETUS_COGNITIVE_BOUNDARY_GUARD=on` |
| Observabilidade | `governanceShadowComparator.js` | `IMPETUS_GOVERNANCE_SHADOW_MODE=on` (default) |

## Fluxo chat

```
POST /dashboard/chat
  → retrieveContextualData (legacy)
  → cognitiveGovernanceFacade.governChatRequest
      → resolveContentExposure
      → cognitive_envelope
      → boundarySanitizePack
      → resolveGovernedKpis
      → contextExposureSanitizer
      → secureContextBuilder
  → IA (pack filtrado no user turn)
```

Com `IMPETUS_CHAT_GOVERNANCE=off`: pack passa pelo facade em modo legacy (shadow pode comparar).

## Leakage mitigado

- KPI negado na UI → removido do pack de chat (governance on)
- Texto de inferência OEE/eficiência → redacção em summaries (governance on)
- `cross_domain`, `mqtt`, runtime keys → boundary + sanitizer
- Módulos `denied_modules` → removidos de `contextual_data`

## Shadow mode

Com governance **off** mas shadow **on**:
- Resposta ao cliente = **legacy**
- Logs: `COGNITIVE_EXPOSURE_DIVERGENCE`, `COGNITIVE_GOVERNANCE_SHADOW_DIFF`
- Métricas: `governanceTelemetry.getSnapshot()`

## Rollback imediato

```bash
IMPETUS_CHAT_GOVERNANCE=off
IMPETUS_KPI_GOVERNANCE=off
IMPETUS_SUMMARY_GOVERNANCE=off
IMPETUS_COGNITIVE_BOUNDARY_GUARD=off
pm2 reload impetus-backend --update-env
```

## Testes

```bash
npm run test:cognitive-governance-phase-f
npm run test:cognitive-governance
npm run test:safety-environmental-isolation
```

Snapshots: `backend/tests/cognitive-governance-phase-f/snapshots/`

## Readiness

| Critério | Estado |
|----------|--------|
| Chat governado | Pronto (flag) |
| KPI governado | Pronto (flag) |
| Summary governado | Pronto (flag) |
| Produção default | **Legacy** (flags off) |
| Shadow observability | **Activo** |
| UX alterada | **Não** (resposta legacy até flags on) |

## Próximos riscos

- `POST /dashboard/executive-query` ainda sem facade
- Voice realtime context
- Live dashboard SSE
- HITL / explainability UI

## Limitações

- Smart summary negado devolve mensagem genérica apenas com `IMPETUS_SUMMARY_GOVERNANCE=on`
- Chat com governance on ainda usa motor GPT legado — apenas contexto é limitado
- Policy engine Fase E continua off por defeito — recomenda-se activar `IMPETUS_COGNITIVE_POLICY_ENGINE` antes dos flags F em produção
