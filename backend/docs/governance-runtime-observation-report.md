# Governance Runtime Observation Report

Generated: 2026-05-19T18:51:13.363Z

## Executive summary

- **Mode:** shadow_observability_first
- **Hard enforcement:** false
- **Governance health:** 97
- **Rollout readiness:** safe_gradual_activation
- **KPI soft safe:** true

## 1. Runtime health

```json
{
  "governance_health": 97,
  "runtime_stability": "stable",
  "production_status": "enterprise_ready",
  "stabilization": {
    "monitoring": true,
    "stabilization_score": 1,
    "runtime_activation_confidence": 1,
    "governance_operational_pressure": 0,
    "contextual_preservation_score": 1,
    "rollout_runtime_integrity": "intact",
    "stable": true,
    "sample_count": 0
  }
}
```

## 2. Governance coverage

```json
{
  "entrypoints_total": 13,
  "governed": 4,
  "shadow_only": 8,
  "gaps_count": 35
}
```

## 3. Entrypoint gaps (priority)

- **manutencao_ia** — unknown
- **routes/cadastrarComIA.js** — ungoverned
- **routes/tts.js** — ungoverned
- **routes/voz.js** — ungoverned
- **policyEngine/channels/summaryExposureSanitizer.js** — ungoverned
- **policyEngine/cognitiveEnvelopeResolver.js** — ungoverned
- **services/aiEgressGuardService.js** — ungoverned
- **services/aiIntegrationsHealthService.js** — ungoverned
- **services/aiLatencyMonitor.js** — ungoverned
- **services/aiProviderService.js** — ungoverned
- **services/architectureHealthService.js** — ungoverned
- **services/billingTokenService.js** — ungoverned
- **services/communicationEscalation.js** — ungoverned
- **services/diagnostic.js** — ungoverned
- **services/enterprise/executiveCompositionService.js** — ungoverned
- **services/eventPipelineBootstrapService.js** — ungoverned
- **services/executiveMode.js** — ungoverned
- **services/hrIntelligenceService.js** — ungoverned
- **services/openaiVozService.js** — ungoverned
- **services/operational/documentOperationalRuntime.js** — ungoverned
- **services/operational/operationalAssistanceRuntime.js** — ungoverned
- **services/operational/operationalToolRegistry.js** — ungoverned
- **services/operationalForecastingAI.js** — ungoverned
- **services/organizationalAI.js** — ungoverned
- **services/personalizedInsightsService.js** — ungoverned
- **services/plcAi.js** — ungoverned
- **services/realtimeOpenaiProxy.js** — ungoverned
- **services/resilienceLoadShape.js** — ungoverned
- **services/runLlm.js** — ungoverned
- **services/smartSummary.js** — ungoverned

## 4. Orphan pipelines (code scan)

- `routes/cadastrarComIA.js`
- `routes/tts.js`
- `routes/voz.js`
- `policyEngine/channels/summaryExposureSanitizer.js`
- `policyEngine/cognitiveEnvelopeResolver.js`
- `services/aiEgressGuardService.js`
- `services/aiIntegrationsHealthService.js`
- `services/aiLatencyMonitor.js`
- `services/aiProviderService.js`
- `services/architectureHealthService.js`
- `services/billingTokenService.js`
- `services/communicationEscalation.js`
- `services/diagnostic.js`
- `services/enterprise/executiveCompositionService.js`
- `services/eventPipelineBootstrapService.js`
- `services/executiveMode.js`
- `services/hrIntelligenceService.js`
- `services/openaiVozService.js`
- `services/operational/documentOperationalRuntime.js`
- `services/operational/operationalAssistanceRuntime.js`

## 5. Legacy routes

- `routes/chatVoice.js`
- `routes/communications.js`
- `services/ai.js`
- `services/aiOrchestrator.js`
- `services/aiPromptGuardService.js`
- `services/aiSecurityGateway.js`
- `services/chatAIService.consolidated.js`
- `services/chatAIService.js`
- `services/circuitBreakerService.js`
- `services/claudePanelService.js`
- `services/claudeService.js`
- `services/equipmentResearchService.js`
- `services/financialLeakageDetectorService.js`
- `services/impetusVoiceChatService.js`
- `services/intelligentRegistrationService.js`

## 6. Leakage & divergence

```json
{
  "leakage": "low",
  "divergence": {
    "shadow_alignment": 1,
    "shadow_passed": true,
    "aggregate_divergence_events": 0
  },
  "overblocking": "low"
}
```

## 7. Contextual degradation

```json
{
  "risk": "low",
  "contextual_anomalies": 0
}
```

## 8. Shadow runtime aggregate

```json
{
  "shadow_divergence": {
    "count": 0,
    "recent": []
  },
  "governance_conflicts": {
    "count": 0,
    "recent": []
  },
  "cross_domain_attempts": {
    "count": 0,
    "recent": []
  },
  "runtime_degradation": {
    "count": 0,
    "recent": []
  },
  "contextual_anomalies": {
    "count": 0,
    "recent": []
  },
  "orphan_pipelines": {
    "count": 0,
    "recent": []
  },
  "legacy_routes": {
    "count": 0,
    "recent": []
  },
  "ungoverned_entrypoints": {
    "count": 0,
    "recent": []
  },
  "log_dir": "/var/www/impetus-completa/backend/logs/governance-shadow-runtime",
  "aggregate_file": "/var/www/impetus-completa/backend/logs/governance-shadow-runtime/shadow-runtime-aggregate.jsonl"
}
```

## 9. KPI readiness (manual only)

```json
{
  "safe": true,
  "recommendation": {
    "action": "soft_kpi_activation_candidate",
    "env_hint": "IMPETUS_KPI_GOVERNANCE=on OR POST /api/internal/governance/production/promote/kpi",
    "auto_execute": false,
    "observe_days": 7
  },
  "metrics": {
    "runtime_stable": true,
    "divergence_low": true,
    "leakage_low": true,
    "overblocking_low": true
  },
  "auto_activate": false
}
```

## 10. Stabilization recommendations

- Manter observação shadow 7 dias
- KPI soft activation é candidato — activação manual apenas
- Não activar chat/summary/boundary até nova revisão

## Code scan summary

```json
{
  "total_cognitive_files": 78,
  "ungoverned_count": 34,
  "legacy_count": 32
}
```