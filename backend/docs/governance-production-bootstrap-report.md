# Governance Production Bootstrap Report

Generated: 2026-05-19T18:49:50.658Z

## Deploy status

- Status: **ready**
- Mode: shadow + observability (no hard enforcement)
- KPI activation: **soft_candidate**

## Metrics

```json
{
  "divergence": {
    "shadow_alignment": 1,
    "passed": true
  },
  "leakage": {
    "risk": "low"
  },
  "overblocking": {
    "risk": "low"
  },
  "soft_kpi": {
    "action": "soft_kpi_activation_candidate",
    "env_hint": "IMPETUS_KPI_GOVERNANCE=on OR POST /api/internal/governance/production/promote/kpi",
    "auto_execute": false,
    "observe_days": 7
  }
}
```

## Coverage gaps

- manutencao_ia: POST /manutencao-ia/*

## Stabilization

- Proceed with soft KPI after PM2 reload + 24h observation

## Full status

```json
{
  "bootstrap_active": true,
  "mode": "shadow_observability_first",
  "hard_enforcement": false,
  "global_governance_enforced": false,
  "flag_plan": {
    "activate": {
      "IMPETUS_CONTROLLED_GOVERNANCE_ACTIVATION": "on",
      "IMPETUS_GOVERNANCE_OPERATIONS": "on",
      "IMPETUS_RUNTIME_GOVERNANCE_MONITORING": "on",
      "IMPETUS_RUNTIME_OBSERVATION": "on",
      "IMPETUS_PRODUCTION_ROLLOUT": "on",
      "IMPETUS_GOVERNANCE_STABILIZATION": "on",
      "IMPETUS_FINAL_GOVERNANCE_REVIEW": "on",
      "IMPETUS_RUNTIME_VALIDATION": "on",
      "IMPETUS_ROLLOUT_SAFETY_VALIDATION": "on",
      "IMPETUS_GOVERNANCE_SHADOW_MODE": "on",
      "IMPETUS_FAILSAFE_GOVERNANCE": "on",
      "IMPETUS_GOVERNANCE_BOOTSTRAP_ACTIVE": "on",
      "IMPETUS_GLOBAL_SHADOW_OBSERVATION": "on",
      "IMPETUS_GOVERNANCE_READINESS": "on",
      "IMPETUS_GOVERNANCE_QUALITY_GATES": "on",
      "IMPETUS_GOVERNANCE_AUDIT_FEED": "on",
      "IMPETUS_GOVERNANCE_EXPLAINABILITY": "on",
      "IMPETUS_GOVERNANCE_INCIDENT_ENGINE": "on",
      "IMPETUS_GOVERNANCE_RUNTIME_HEALTH": "on"
    },
    "keep_off": {
      "IMPETUS_KPI_GOVERNANCE": "off",
      "IMPETUS_SUMMARY_GOVERNANCE": "off",
      "IMPETUS_CHAT_GOVERNANCE": "off",
      "IMPETUS_COGNITIVE_BOUNDARY_GUARD": "off",
      "IMPETUS_SOFT_KPI_GOVERNANCE_ROLLOUT": "off"
    },
    "auto_apply": false,
    "pm2_hint": "pm2 reload impetus-backend --update-env",
    "description": "shadow_first_observability_bootstrap"
  },
  "pre_deploy_audit": {
    "passed": true,
    "audited_at": "2026-05-19T18:49:50.655Z",
    "migrations": {
      "ok": true,
      "dir": "/var/www/impetus-completa/backend/migrations",
      "file_count": 15,
      "destructive_pending": []
    },
    "modules": [
      {
        "module": "productionRollout/productionRolloutCoordinator",
        "ok": true
      },
      {
        "module": "runtimeValidation/governanceRuntimeValidation",
        "ok": true
      },
      {
        "module": "governanceOperations/governanceOperationsService",
        "ok": true
      },
      {
        "module": "governanceBootstrap/governanceBootstrapCoordinator",
        "ok": true
      },
      {
        "module": "finalReview/integratedGovernanceReview",
        "ok": true
      },
      {
        "module": "governanceActivation/governanceActivationRuntime",
        "ok": true
      },
      {
        "module": "policyEngine/cognitiveGovernanceFacade",
        "ok": true
      },
      {
        "module": "policyEngine/shadow/governanceShadowComparator",
        "ok": true
      }
    ],
    "internal_route_guards": {
      "ok": true,
      "governance_route_refs": 7,
      "internal_net_governance": 9
    },
    "tenant_admins": {
      "ok": true,
      "note": "verify_via_db_in_deploy_script"
    },
    "support_recovery": {
      "ok": true,
      "note": "verify_via_db_in_deploy_script"
    },
    "governance_tables": {
      "ok": true,
      "note": "audit_feed_jsonl_optional"
    },
    "pm2_health": {
      "ok": true,
      "note": "verify_via_pm2_list_in_deploy_script"
    },
    "destructive_migration_pending": false,
    "auto_deploy": false
  },
  "operations": {
    "enabled": true,
    "flags": {
      "operations": false,
      "incident_engine": false,
      "runtime_health": false,
      "emergency_controls": false
    },
    "operational_state": {
      "state": "shadow_only",
      "valid_states": [
        "shadow_only",
        "partial_governance",
        "controlled_activation",
        "stabilized",
        "degraded",
        "rollback_ready",
        "emergency_mode"
      ],
      "last_transition_at": null,
      "transition_count": 0
    },
    "lifecycle": {
      "phases": [
        "foundation",
        "shadow_observation",
        "readiness_assessment",
        "controlled_activation",
        "stabilization",
        "operations"
      ],
      "current_phase": "operations",
      "operational_state": {
        "state": "shadow_only",
        "valid_states": [
          "shadow_only",
          "partial_governance",
          "controlled_activation",
          "stabilized",
          "degraded",
          "rollback_ready",
          "emergency_mode"
        ],
        "last_transition_at": null,
        "transition_count": 0
      },
      "readiness_summary": {
        "readiness_score": 97,
        "activation_recommendation": "full_activation_candidate",
        "auto_activation": false
      },
      "activation_runtime": {
        "controlled_framework": false,
        "tenant_safe": false,
        "global_channels": {
          "kpi": false,
          "summary": false,
          "chat": false,
          "boundary": false,
          "explainability": false,
          "oversight": false,
          "drift": false
        },
        "metrics": {
          "activation_count": 0,
          "denial_count": 0,
          "last_activation_at": null
        }
      },
      "auto_progression": false
    },
    "runtime": {
      "collected_at": "2026-05-19T18:49:50.645Z",
      "tenant_id": null,
      "activation": {
        "controlled_framework": false,
        "tenant_safe": false,
        "global_channels": {
          "kpi": false,
          "summary": false,
          "chat": false,
          "boundary": false,
          "explainability": false,
          "oversight": false,
          "drift": false
        },
        "metrics": {
          "activation_count": 0,
          "denial_count": 0,
          "last_activation_at": null
        }
      },
      "channels": [
        {
          "channel": "kpi",
          "active": false,
          "source": "controlled_framework_off"
        },
        {
          "channel": "summary",
          "active": false,
          "source": "controlled_framework_off"
        },
        {
          "channel": "chat",
          "active": false,
          "source": "controlled_framework_off"
        },
        {
          "channel": "boundary",
          "active": false,
          "source": "controlled_framework_off"
        }
      ],
      "phase_i_health": {
        "monitoring": false
      }
    },
    "metrics": {
      "governance_operational_health": 0.97,
      "governance_runtime_stability": 1,
      "governance_activation_safety": 97,
      "governance_incident_rate": 0,
      "governance_drift_pressure": 0.1,
      "governance_context_integrity": 1,
      "readiness_score": 97,
      "computed_at": "2026-05-19T18:49:50.645Z"
    },
    "rollout": {
      "auto_execute": false,
      "steps": [
        {
          "channel": "kpi",
          "status": "pending_manual_promotion",
          "endpoint_hint": "POST /api/internal/governance/activate/kpi"
        },
        {
          "channel": "summary",
          "status": "pending_manual_promotion",
          "endpoint_hint": "POST /api/internal/governance/activate/summary"
        },
        {
          "channel": "chat",
          "status": "pending_manual_promotion",
          "endpoint_hint": "POST /api/internal/governance/activate/chat"
        },
        {
          "channel": "boundary",
          "status": "pending_manual_promotion",
          "endpoint_hint": "POST /api/internal/governance/activate/boundary"
        }
      ],
      "activation_plan": {
        "enabled": true,
        "auto_execute": false,
        "readiness_score": 97,
        "activation_safety_score": 97,
        "max_recommended_step": 7,
        "activation_mode": "full_staged",
        "foundation_flags": [
          {
            "flag": "IMPETUS_COGNITIVE_POLICY_ENGINE",
            "label": "Content exposure policy engine",
            "recommended": true,
            "status": "candidate_after_shadow_validation"
          },
          {
            "flag": "IMPETUS_COGNITIVE_ENVELOPE",
            "label": "Cognitive envelope",
            "recommended": true,
            "status": "candidate_after_shadow_validation"
          },
          {
            "flag": "IMPETUS_CONTEXT_SANITIZER",
   
```