# Baseline de Maturidade v1 — IECP

> **Data:** 2026-06-22  
> **Programa:** IMPETUS Enterprise Certification Program  
> **Plano:** `PLANO_MESTRE_LIGACAO_INDUSTRIAL_v2.md`

## Snapshot inicial (ponto de partida)

| Métrica | Valor |
|---------|-------|
| Telas | 77 |
| Endpoints | 1.098 |
| Telas VERDE | 6 (7,8%) |
| Telas NAO_VALIDADO | 63 (81,8%) |
| Cenários E2E Parte 7.2 | 10/10 VERDE |
| Drift gate | activo (CI + servidor) |
| PM2 NODE_ENV | development → migrar para production (CERT-02.0) |

## Artefatos confirmados

- `FUNCTIONAL_MATRIX.json` + inventários
- `FLAG_BASELINE_FROZEN.md`
- `backend/docs/evidence/` (10 domínios)
- `backend/docs/iecp/` (relatórios auditoria)
- Scripts: `e2e_cert_all.js`, `checkMatrixDrift.js`, `cert_classify_screens.js`

## Gates abertos

| Gate | Critério |
|------|----------|
| G1 (Fase 1) | 100% telas classificadas ≠ NAO_VALIDADO |
| G2 (Fase 2) | Hardening P0 produção |
| G4 (Piloto) | Evidência visual + operação assistida |

## Meta IECP

Certificar **todo o software** sem reiniciar — continuidade a partir de CERT-01.4.
