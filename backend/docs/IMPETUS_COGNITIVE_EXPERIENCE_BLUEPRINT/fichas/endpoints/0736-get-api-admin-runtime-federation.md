# Etapa 736 — Endpoint: GET /api/admin/runtime/federation

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 736 / 1060 |
| **Método** | GET |
| **Path** | `/api/admin/runtime/federation` |
| **Mount** | `/api/admin/runtime` |
| **Classificação** | AB |

## Serviço candidato

../../services/aiAnonymizationService, ../../services/sz5CognitivePurgeService, ../../services/sz5GraphPurgeService, ../../services/kms/kmsGovernanceService, ../../services/kms/columnEncryptionService, ../../services/aiGovernancePersistenceService, ../../services/aiSchemaBootstrap, ../../services/hallucinationDetectionService, ../../services/hallucinationMetricsService, ../../services/hallucinationReviewQueueService, ../../federation/services/federationConfigService, ../../federation/services/scimProvisioningService, ../../mfa/services/mfaPolicyService, ../../industrial-mqtt/services/mqttBrokerConfigService, ../../industrial-edge/services/edgeQueuePersistenceService, ../../industrial-modbus/services/modbusDeviceConfigService, ../../industrial-opcua/services/opcuaServerConfigService

## Guards

requireAuth (mount)

## Referenciado pelo frontend

não / desconhecido

## Evidências

- `backend/docs/inventory/BACKEND_INVENTORY.json`
- Ficheiro rota: `—`

---
*Etapa 736 · ICEB auto-gen*
