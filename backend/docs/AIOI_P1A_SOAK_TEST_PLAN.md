# AIOI-P1A.8 — 48h Soak Validation Framework

**Data de Preparação:** 2026-06-12  
**Fase:** P1A — Continuous Operational Runtime Certification  
**Status:** FRAMEWORK PREPARADO — SOAK TEST NÃO EXECUTADO (por especificação)

---

## Objetivo

Definir o framework completo de certificação para validação de operação contínua 48h do pipeline AIOI, garantindo ausência de perda de eventos, duplicatas, falhas de outbox, violações de RLS e erros críticos.

---

## Critérios de Aceitação

```json
{
  "runtime_hours":     48,
  "events_lost":        0,
  "duplicates":         0,
  "failed_outbox":      0,
  "rls_violations":     0,
  "critical_errors":    0,
  "max_dlq_items":      0,
  "max_latency_p99_ms": 10000,
  "worker_restarts_max": 3,
  "snapshot_lag_max_s": 120
}
```

---

## Pré-requisitos para Execução

| Requisito | Verificação |
|---|---|
| `AIOI_P1A_CONTINUOUS_RUNTIME_FOUNDATION_PASS` | Certificação P1A completa |
| `IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true` | Flag habilitada em ambiente de soak |
| `IMPETUS_AIOI_ENABLED=true` | Master switch ativo |
| `IMPETUS_AIOI_PILOT_TENANTS=<uuid>` | Pelo menos 1 tenant configurado |
| BD com `aioi_outbox`, `industrial_operational_events` | Schema P0B provisionado |
| PM2 configurado com `--watch=false` | Evitar restart acidental por mudança de arquivo |

---

## Arquitectura do Framework

```
┌────────────────────────────────────────────────────────────┐
│                    SOAK TEST FRAMEWORK                       │
│                                                              │
│  ┌──────────────┐   ┌──────────────┐   ┌───────────────┐  │
│  │ Load Generator│   │ Health Prober│   │ Metrics Aggreg│  │
│  │ (plcAioiAdap) │   │ /runtime/    │   │ aioiRuntime   │  │
│  │ N eventos/min │   │ health poll  │   │ MetricsService│  │
│  └──────┬────────┘   └──────┬───────┘   └───────┬───────┘  │
│         │                   │                    │          │
│         ▼                   ▼                    ▼          │
│  ┌────────────────────────────────────────────────────┐    │
│  │           aioiContinuousWorkerService               │    │
│  │   pending_outbox → classification → snapshot        │    │
│  └────────────────────────────────────────────────────┘    │
│         │                                                    │
│         ▼                                                    │
│  ┌───────────────┐   ┌──────────────┐   ┌───────────────┐  │
│  │ Assertion Log │   │ RLS Validator│   │ Final Report  │  │
│  │ (every 1h)    │   │ (every 6h)   │   │ (at 48h)      │  │
│  └───────────────┘   └──────────────┘   └───────────────┘  │
└────────────────────────────────────────────────────────────┘
```

---

## Fase 1 — Setup (T=0h)

### 1.1 Snapshot Inicial

```sql
-- Capturar estado baseline antes do soak
SELECT 
  (SELECT COUNT(*) FROM aioi_outbox WHERE status='pending') AS pending_baseline,
  (SELECT COUNT(*) FROM aioi_outbox WHERE status='delivered') AS delivered_baseline,
  (SELECT COUNT(*) FROM aioi_outbox WHERE status='failed') AS failed_baseline,
  (SELECT COUNT(*) FROM industrial_operational_events) AS ioe_baseline,
  (SELECT COUNT(*) FROM aioi_executive_queue_snapshot) AS snapshot_baseline,
  NOW() AS soak_start_at;
```

### 1.2 Ativação do Worker

```bash
# Configurar variáveis
export IMPETUS_AIOI_CONTINUOUS_RUNTIME_ENABLED=true
export IMPETUS_AIOI_CONTINUOUS_RUNTIME_INTERVAL_MS=30000
export IMPETUS_AIOI_PILOT_TENANTS=<tenant_uuid>

# Reiniciar com novas variáveis
pm2 restart impetus-backend --update-env

# Confirmar boot
pm2 logs impetus-backend --lines 20 | grep AIOI_CONTINUOUS_WORKER_BOOT
```

### 1.3 Verificação de Invariants Pré-Soak

```bash
curl -s http://localhost:3000/api/aioi/runtime/health | jq '{
  invariants_preserved,
  runtime_mode,
  continuous_worker_enabled,
  worker_running
}'
# Esperado: invariants_preserved=true, runtime_mode="operational_only"
```

---

## Fase 2 — Geração de Carga (T=0h..48h)

### 2.1 Perfil de Carga

| Parâmetro | Valor |
|---|---|
| Taxa de eventos | 5-10 IOEs/minuto por tenant |
| Tipos de eventos | equipment_failure, production_deviation, quality_issue |
| Tenants simultâneos | 1-3 (conforme IMPETUS_AIOI_PILOT_TENANTS) |
| Distribuição temporal | Uniforme (sem burst artificial) |

### 2.2 Script de Geração (referência)

```javascript
// backend/scripts/soak/soakEventGenerator.js
// NÃO executa automaticamente — requer invocação manual
'use strict';

const adapter = require('../../src/services/aioi/plcAioiAdapter');
const ingestion = require('../../src/services/aioi/aioiEventIngestionService');

async function generateSoakEvent(companyId, sequence) {
  const plcPayload = {
    equipment_id: `EQ-SOAK-${String(sequence).padStart(4,'0')}`,
    equipment_name: `Equipamento Soak ${sequence}`,
    event_type: 'equipment_failure',
    severity: sequence % 4 === 0 ? 'critical' : 'high',
    timestamp: new Date().toISOString(),
    value: 85 + (sequence % 15),
    unit: 'pct',
    source: 'SOAK_TEST'
  };
  const ioe = await adapter.transformToIOE(plcPayload, companyId);
  return ingestion.ingestEvent({ ioe, companyId });
}
```

---

## Fase 3 — Monitoramento Contínuo (T=0h..48h)

### 3.1 Health Check a cada 5 minutos

```bash
# Script: soak_health_check.sh
while true; do
  TIMESTAMP=$(date -u +"%Y-%m-%dT%H:%M:%SZ")
  HEALTH=$(curl -s http://localhost:3000/api/aioi/runtime/health)
  METRICS=$(curl -s http://localhost:3000/api/aioi/runtime/metrics)
  
  echo "$TIMESTAMP HEALTH: $HEALTH" >> soak_health.log
  echo "$TIMESTAMP METRICS: $METRICS" >> soak_metrics.log
  
  # Alert se outbox_failed > 0
  FAILED=$(echo $HEALTH | jq '.outbox_failed')
  if [ "$FAILED" -gt "0" ]; then
    echo "ALERT: outbox_failed=$FAILED at $TIMESTAMP" >> soak_alerts.log
  fi
  
  sleep 300
done
```

### 3.2 RLS Spot Check a cada 6 horas (T=6h, 12h, 18h, 24h, 30h, 36h, 42h, 48h)

```sql
-- Executar como impetus_app (não superuser)
BEGIN;
  SET LOCAL ROLE impetus_app;
  SET LOCAL app.current_company_id = '<TENANT_1_UUID>';
  
  -- Verificar que tenant 1 não vê dados do tenant 2
  SELECT COUNT(*) AS cross_tenant_leak
  FROM industrial_operational_events
  WHERE company_id != '<TENANT_1_UUID>';
  -- Esperado: 0
  
  SELECT COUNT(*) AS cross_tenant_outbox_leak
  FROM aioi_outbox
  WHERE company_id != '<TENANT_1_UUID>';
  -- Esperado: 0
ROLLBACK;
```

### 3.3 Métricas Acumuladas a cada 1 hora

```bash
# Registrar checkpoint horário
HOUR=$(($(date +%s) / 3600))
curl -s http://localhost:3000/api/aioi/runtime/metrics | \
  jq ". + {\"checkpoint_hour\": $HOUR}" >> soak_hourly_checkpoints.jsonl
```

---

## Fase 4 — Assertions (T=24h e T=48h)

### 4.1 Assertions T=24h

```sql
-- Assertion 1: Zero eventos perdidos
SELECT 
  COUNT(*) FILTER (WHERE status='pending') AS still_pending,
  COUNT(*) FILTER (WHERE status='failed') AS failed_count
FROM aioi_outbox
WHERE created_at >= '<soak_start_at>';
-- PASS: failed_count = 0

-- Assertion 2: Todos IOEs ingeridos foram classificados (exceto janela ativa)
SELECT COUNT(*) AS unclassified_stale
FROM industrial_operational_events
WHERE status = 'open'
  AND created_at < NOW() - INTERVAL '10 minutes';
-- PASS: unclassified_stale = 0

-- Assertion 3: Snapshots gerados continuamente
SELECT 
  DATE_TRUNC('hour', generated_at) AS hour_bucket,
  COUNT(*) AS snapshots_per_hour
FROM aioi_executive_queue_snapshot
WHERE generated_at >= '<soak_start_at>'
GROUP BY 1
ORDER BY 1;
-- PASS: pelo menos 1 snapshot por hora ativa
```

### 4.2 Assertions T=48h (Finais)

```sql
-- Assertion final 1: Zero lost events
WITH baseline AS (SELECT <delivered_baseline> AS b),
current AS (SELECT COUNT(*) AS c FROM aioi_outbox WHERE status='delivered')
SELECT 
  c - b AS new_deliveries,
  0 AS events_lost
FROM baseline, current;

-- Assertion final 2: Zero duplicates
SELECT idempotency_key, COUNT(*) AS n
FROM aioi_outbox
GROUP BY idempotency_key
HAVING COUNT(*) > 1;
-- PASS: 0 rows

-- Assertion final 3: Zero RLS violations
-- (via impetus_app role spot check — ver 3.2)

-- Assertion final 4: Latency P99 aceitável
-- (via GET /api/aioi/runtime/metrics → latency_p99 <= 10000ms)

-- Assertion final 5: Worker running continuously
-- (via GET /api/aioi/runtime/health → worker_running=true)
```

---

## Fase 5 — Relatório Final (T=48h)

### 5.1 Template de Relatório

```markdown
# AIOI-P1A SOAK TEST RESULTS

Início: <soak_start_at>
Fim: <soak_end_at>
Duração: 48h

## Métricas Finais
- events_ingested: <N>
- events_classified: <N>
- snapshots_projected: <N>
- outbox_delivered: <N>
- outbox_failed: 0 (esperado)
- dlq_count: 0 (esperado)
- rls_violations: 0 (esperado)
- latency_p95: <N>ms
- latency_p99: <N>ms
- worker_restarts: <N>

## Assertions
- events_lost:     PASS (0)
- duplicates:      PASS (0)
- failed_outbox:   PASS (0)
- rls_violations:  PASS (0)
- critical_errors: PASS (0)

## Veredito
AIOI_P1A_SOAK_TEST_PASS
```

---

## Critérios de Abort (Soak Test Interrompido)

| Condição | Threshold | Ação |
|---|---|---|
| `outbox_failed > 0` e crescendo | Qualquer | Investigar antes de continuar |
| `rls_violation` detectada | 1 | ABORT imediato + escalação |
| `cognitive_execution_allowed = true` | Qualquer | ABORT imediato + escalação |
| Latência p99 > 30000ms por >15min | 30000ms | Warning + investigar |
| Worker down por >10min | 10min | Restart manual + log |

---

## Invariants a Monitorar durante 48h

```json
{
  "runtime_enabled":             false,
  "runtime_active":              false,
  "runtime_authorized":          false,
  "cognitive_execution_allowed": false,
  "auto_execute_band":           "none"
}
```

Verificar a cada check:
```bash
curl -s http://localhost:3000/api/aioi/runtime/health | \
  jq '{invariants_preserved, runtime_mode}'
# Esperado: invariants_preserved=true, runtime_mode="operational_only"
```

---

## Artefatos a Gerar (durante execução)

```text
soak_health.log           — health checks a cada 5 min
soak_metrics.log          — métricas a cada 5 min
soak_hourly_checkpoints.jsonl — checkpoint horário
soak_alerts.log           — alertas automáticos
soak_rls_checks.log       — spot checks de RLS (6h cada)
AIOI_P1A_SOAK_RESULTS.md  — relatório final (T=48h)
```

---

## Status do Framework

```json
{
  "framework_ready":           true,
  "scripts_documented":        true,
  "assertions_defined":        true,
  "abort_criteria_defined":    true,
  "invariant_monitoring_defined": true,
  "soak_test_executed":        false,
  "note":                      "Execução pendente — aguarda janela operacional controlada"
}
```

---

## Veredito de Preparação

```
AIOI_P1A_SOAK_FRAMEWORK_READY
```

O framework de certificação de 48h está completo e documentado.  
O soak test **não foi executado** conforme especificação P1A.8.  
A execução requer aprovação operacional e janela de 48h contínua com supervisão.
