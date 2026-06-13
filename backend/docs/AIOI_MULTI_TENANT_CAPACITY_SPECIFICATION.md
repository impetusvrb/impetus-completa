# AIOI — Multi-Tenant Capacity Specification

**Camada:** P4.1 — Tenant Capacity Governance  
**Serviço:** `backend/src/services/aioi/aioiTenantCapacityService.js`  

---

## 1. Propósito

Métricas de capacidade operacional por tenant piloto — **READ ONLY**, sem alterar workflow.

---

## 2. Métricas por tenant

| Métrica | Descrição |
|---------|-----------|
| `tenant_throughput` | IOE total, ativos, volume 24h/7d |
| `tenant_queue_volume` | Outbox pending/processing/failed/delivered |
| `tenant_sla_pressure` | IOEs at_risk ou breached |
| `tenant_processing_utilization_pct` | Utilização de processamento outbox |
| `tenant_growth_metrics` | Taxa crescimento 24h |
| `tenant_operational_saturation` | Score + level (NORMAL/WARNING/CRITICAL) |

---

## 3. Funções

| Função | Scope |
|--------|-------|
| `getTenantCapacitySnapshot()` | Agregado pilot tenants |
| `getTenantCapacityForCompany(companyId)` | RLS scoped |

---

## 4. Token

**TENANT_CAPACITY_CERTIFIED**
