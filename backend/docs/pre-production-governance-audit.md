# Pre-Production Governance Audit

Generated: 2026-05-19T18:49:50.221Z

**Overall:** PASS

## Migrations

```json
{
  "ok": true,
  "dir": "/var/www/impetus-completa/backend/migrations",
  "file_count": 15,
  "destructive_pending": []
}
```

## Module integrity

| Module | OK |
|--------|-----|
| productionRollout/productionRolloutCoordinator | yes |
| runtimeValidation/governanceRuntimeValidation | yes |
| governanceOperations/governanceOperationsService | yes |
| governanceBootstrap/governanceBootstrapCoordinator | yes |
| finalReview/integratedGovernanceReview | yes |
| governanceActivation/governanceActivationRuntime | yes |
| policyEngine/cognitiveGovernanceFacade | yes |
| policyEngine/shadow/governanceShadowComparator | yes |

## Internal route guards

```json
{
  "ok": true,
  "governance_route_refs": 7,
  "internal_net_governance": 9
}
```

## Manual checks (deploy script)

- PM2 process health
- tenant_admins integrity
- support_recovery integrity
- backup before reload