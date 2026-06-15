# AIOI-P1R — Enterprise Release Governance & Baseline Acceptance Certification

**Data:** 2026-06-14  
**Tag:** `P1R-RELEASE-ACCEPTANCE`  
**Veredito:** `AIOI_P1R_ENTERPRISE_RELEASE_GOVERNANCE_AND_ACCEPTANCE_PASS`

---

## Objetivo

Certificar formalmente a aceitação da baseline enterprise P1A→P1Q e criar o mecanismo oficial de governança de release — **encerramento formal da Linha P1**.

**Modo exclusivo:** READ ONLY · OBSERVATIONAL · GOVERNANCE ONLY · RELEASE ACCEPTANCE ONLY

---

## Invariantes obrigatórios

```json
{
  "runtime_enabled": false,
  "runtime_active": false,
  "runtime_authorized": false,
  "cognitive_execution_allowed": false,
  "auto_execute_band": "none"
}
```

---

## Contagem canónica

```json
{
  "baseline_range": "P1A-P1Q",
  "expected_phases_total": 17,
  "stale_phase_counts": [9, 13, 14, 15, 16]
}
```

---

## Componentes P1R

| ID | Componente | Ficheiro |
|----|------------|----------|
| P1R.1 | Release Acceptance | `aioiReleaseAcceptanceService.js` |
| P1R.2 | Release Registry | `aioiEnterpriseReleaseRegistryService.js` |
| P1R.3 | Change Governance | `aioiChangeGovernanceService.js` |
| P1R.4 | Release Soak | `scripts/p1r_release_acceptance.js` |
| P1R.5 | Release Readiness | `aioiReleaseReadinessService.js` |
| P1R.6 | Dashboard | `WidgetAIOIScale.jsx` (secção P1R) |
| P1R.7 | Release API | `aioiReleaseRoutes.js` |

---

## API (READ ONLY)

```
GET /api/aioi/release/status
GET /api/aioi/release/registry
GET /api/aioi/release/governance
GET /api/aioi/release/readiness
```

---

## Certificação

```bash
node backend/scripts/p1r_release_acceptance.js
```

Saída esperada:

```json
{
  "phase": "P1R",
  "pass": true,
  "verdict": "AIOI_P1R_ENTERPRISE_RELEASE_GOVERNANCE_AND_ACCEPTANCE_PASS"
}
```

Exit code: `0`

---

## Critério final

```json
{
  "release_acceptance_ready": true,
  "release_registry_ready": true,
  "change_governance_ready": true,
  "release_readiness_ready": true,
  "release_soak_completed": true,
  "release_dashboard_ready": true,
  "release_api_ready": true,
  "enterprise_release_ready": true
}
```

---

## Documentação relacionada

- [Release Acceptance](./AIOI_P1R_RELEASE_ACCEPTANCE.md)
- [Release Registry](./AIOI_P1R_RELEASE_REGISTRY.md)
- [Change Governance](./AIOI_P1R_CHANGE_GOVERNANCE.md)
- [Release Readiness](./AIOI_P1R_RELEASE_READINESS.md)
- [Release Soak](./AIOI_P1R_RELEASE_SOAK.md)
