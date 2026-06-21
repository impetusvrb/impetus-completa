# SST Lifecycle — Evidência E2E (Parte 7.2)

**Run:** ver `report.json`  
**Cenário:** Incidente → Quase-acidente → Treinamento vencido

## API industrial

```http
POST /api/safety-operational/events
Authorization: Bearer <token>
Content-Type: application/json

{
  "kind": "incident" | "near_miss" | "training_expired",
  "title": "...",
  "message": "...",
  "severity": "alta|media|baixa",
  "location": "Linha 2",
  "correlation_id": "<uuid>"
}
```

**Flag obrigatória:** `IMPETUS_SAFETY_OPERATIONAL_RUNTIME_ENABLED=true`

## Persistência

- `operational_alerts` (tipo `sst_*`, source `safety_operational`)
- `hr_alerts` (tipo `treinamento_vencido` quando kind=training_expired)
- Notificação via `SST_LIFECYCLE` (`sstNotificationService`)

## Scripts

```bash
node backend/scripts/audit/e2e_sst_lifecycle.js
node backend/scripts/audit/applyCertEvidenceToMatrix.js --domain=all
```

## Migration

`backend/migrations/operational_alerts_sst_tipo_alerta_migration.sql` — expande CHECK de `tipo_alerta`.
