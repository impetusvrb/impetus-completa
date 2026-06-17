# M1.13 — Pilot Adoption & Domain Utilization Assessment

**Data:** 2026-06-16  
**Tenant:** Fresh & Fit `511f4819` · Food Base Pilot  
**Modo:** READ ONLY · evidências reais

---

## Veredicto

```json
{
  "phase": "M1.13",
  "pass": true,
  "verdict": "PLATFORM_READY_ADOPTION_PENDING"
}
```

---

## Diagnóstico M1.11 / M1.12

```json
{
  "platform_problem": false,
  "tenant_adoption_gap": true,
  "blocked_by_platform": false,
  "blocked_by_adoption": true
}
```

Os blockers Ambiental e Manutenção **não são falha de plataforma** — runtimes activos, zero eventos tenant-scoped = **gap de adopção**.

---

## Pilot Utilization Index

```json
{
  "executive_usage": true,
  "financial_usage": true,
  "hr_usage": true,
  "safety_usage": true,
  "environment_usage": false,
  "maintenance_usage": false,
  "adopted_domains": 4,
  "available_domains": 6,
  "pilot_utilization_index": 66.67
}
```

---

## Environment Adoption

```json
{
  "environment_runtime_available": true,
  "environment_users_detected": false,
  "environment_events_detected": false,
  "environment_adoption_confirmed": false,
  "reason": "tenant_not_using_environment_module"
}
```

---

## Maintenance Adoption

```json
{
  "maintenance_runtime_available": true,
  "maintenance_users_detected": true,
  "maintenance_events_detected": false,
  "maintenance_adoption_confirmed": false,
  "reason": "tenant_not_using_maintenance_module"
}
```

---

## M2 Readiness Recommendation

```json
{
  "platform_ready": true,
  "pilot_adoption_partial": true,
  "m2_technical_readiness": true
}
```

**M2 tecnicamente viável** — gate operacional (M1.11/M1.12) permanece fechado até eventos reais Ambiental + Manutenção.

---

## APIs

```
GET /api/m1/pilot-adoption/status
GET /api/m1/pilot-adoption/environment
GET /api/m1/pilot-adoption/maintenance
GET /api/m1/pilot-adoption/utilization
GET /api/m1/pilot-adoption/recommendation
```
