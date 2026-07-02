# Etapa 710 — Endpoint: GET /api/admin/runtime/sz5-anonymization

> ICEB v1.0 · BACKEND_INVENTORY

## Identificação

| Campo | Valor |
|-------|-------|
| **Etapa** | 710 / 1060 |
| **Método** | GET |
| **Path** | `/api/admin/runtime/sz5-anonymization` |
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
*Etapa 710 · ICEB auto-gen*
