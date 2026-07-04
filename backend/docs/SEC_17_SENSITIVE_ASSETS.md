# SEC-17 — Sensitive Assets

## Catálogo lógico (12 ativos)

| assetId | Categoria | Criticidade |
|---------|-----------|-------------|
| asset-backend-src | source_code | CRITICAL |
| asset-frontend-src | source_code | CRITICAL |
| asset-blueprint-vol | strategic_doc | HIGH |
| asset-adrs | documentation | HIGH |
| asset-enterprise-docs | documentation | HIGH |
| asset-audit-scripts | audit_artifact | HIGH |
| asset-env | credentials | CRITICAL |
| asset-certificates | certificates | CRITICAL |
| asset-config | configuration | HIGH |
| asset-public-bundle | public_bundle | MEDIUM |
| asset-backups | backup | CRITICAL |
| asset-evidence | audit_artifact | HIGH |

## Campos por ativo

- `criticality`, `category`, `logicalPath`
- `expectedExposure`: internal | restricted | public | never
- `protectionPolicy`: política consultiva

## Ficheiro

`backend/src/securityExfiltrationDetection/engine/sensitiveAssetRegistry.js`
