# Etapa 709 — Endpoint: POST /api/admin/runtime/ai-anonymization/worker/run

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 709 / 1060 |
| **Método** | POST |
| **Path** | `/api/admin/runtime/ai-anonymization/worker/run` |
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
*Etapa 709 · ICEB auto-gen*
