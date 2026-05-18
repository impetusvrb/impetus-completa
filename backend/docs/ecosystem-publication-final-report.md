# Ecosystem Publication Final Report

Generated: 2026-05-17T19:39:49.491Z

## Multi-domain pipeline

Domains: quality → safety → logistics

## Publication validation

```json
{
  "ok": true,
  "publication_stable": true,
  "runtime_snapshot": {
    "ok": true,
    "stable": true,
    "runtime_validation_ms": 1,
    "flags": {
      "quality": {
        "universal_runtime": false,
        "universal_shadow": false,
        "navigation": false,
        "publication": false,
        "governance": false,
        "cognitive": false,
        "rollout": false
      },
      "safety": {
        "operational": false,
        "navigation": false,
        "publication": false,
        "governance": false,
        "cognitive": false,
        "rollout": false,
        "publication_shadow": false
      },
      "logistics": {
        "operational": false,
        "navigation": false,
        "publication": false,
        "governance": false,
        "cognitive": false,
        "rollout": false,
        "publication_shadow": false
      },
      "cognitive_budget": false,
      "observability_v2": false
    },
    "manifests": {
      "quality_route_count": 0,
      "safety_route_count": 0,
      "logistics_route_count": 6,
      "cross_collisions": [],
      "quality_duplicates": [],
      "safety_duplicates": [],
      "logistics_duplicates": []
    },
    "conflicts": [],
    "mount_issues": [],
    "bounded_contexts": [
      "quality",
      "safety",
      "logistics",
      "dashboard",
      "chat",
      "ia"
    ],
    "legacy_coexistence": true,
    "fallback_navigation_preserved": true
  },
  "domains": {
    "quality": {
      "navigation": false,
      "publication": false,
      "shadow": false,
      "routes": 0
    },
    "safety": {
      "operational": false,
      "publication": false,
      "shadow": false,
      "routes": 0
    },
    "logistics": {
      "operational": false,
      "publication": false,
      "shadow": false,
      "routes": 6
    },
    "ia_chat": {
      "preserved": true,
      "paths": [
        "/app/chatbot",
        "/chat"
      ]
    },
    "dashboard": {
      "preserved": true,
      "path": "/app"
    }
  },
  "cross_collisions": [],
  "bounded_publication": true,
  "safe_merge_required": true,
  "pipeline_order": [
    "quality",
    "safety",
    "logistics"
  ]
}
```

## Governance

- Bounded publication: true
- Pipeline: quality → safety → logistics

## Status

Publication stable: **true**

Shadow-first; sem promoção automática para FULL.
