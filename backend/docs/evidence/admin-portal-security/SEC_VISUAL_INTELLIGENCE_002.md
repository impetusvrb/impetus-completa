# SEC-VISUAL-INTELLIGENCE-002 — Contexto Geoespacial de Eventos Administrativos Críticos

**Status:** IMPLEMENTED  
**Classificação:** A (certificação funcional + baseline 001 preservado)  
**Data:** 2026-07-11  
**Predecessor:** SEC-VISUAL-INTELLIGENCE-001 (CERTIFIED, BASELINE LOCKED)

---

## Invariante semântica central

### INV-SVI2-001 — GEOLOCATION_IS_CONTEXT_NOT_RISK

> A geolocalização é contexto de evidência e não prova de hostilidade, autoria, nacionalidade ou risco.

Formalmente: `country_code / country / geo_state ≠ risk_score`

Proibido: elevar severidade, alterar classificação, bloquear IP, alterar score, mudar badge ou índice exclusivamente com base em país.

---

## Modelo escolhido

**MODELO B — Universo GeoIP ampliado, sem alterar população analítica**

| Critério | A | B |
|---|---|---|
| Fonte canônica única | ✔ | ✔ |
| Zero HTTP síncrono | ✔ | ✔ |
| IP administrativo eventualmente enriquecido | ✗ | ✔ |
| Preserva população analítica 001 | ✔ | ✔ |
| Preserva fórmula badges | ✔ | ✔ |
| Sem país presumido | ✔ | ✔ |
| Snapshot imutável / X→Y | ✔ | ✔ |

Justificativa: Modelo A deixaria IPs exclusivos de `failedLogins`/`ai_detections` indefinidamente sem enrichment. Modelo B reutiliza `geoCache`, `lookupGeoEntry`, `enrichWithCountries` e `scheduleGeoBacklogEnrichment` certificados — apenas amplia candidatos do backlog assíncrono com peso 1 (prioridade operacional de resolução, não risco).

Modelo C proibido — não há impossibilidade estrutural de A/B.

---

## Alterações implementadas

### Backend (`adminPortalSecurityDashboardService.js`)

1. `failedLogins` enriquecidos via `enrichWithCountries(failedLogins)` — lookup-only síncrono ao geoCache
2. IPs de `failedLogins` + observatório `recent_events` adicionados ao `ipCountMap` do backlog assíncrono (peso 1)
3. `ai_detections.recent_events` enriquecidos em `buildDashboard` via `enrichWithCountries(..., 'source_ip')`

**Não alterado:** `buildWorldMap`, badges, `recent_alerts_analytical`, `resolveIpsBounded` no critical path.

### Frontend

- `admin-portal/src/components/GeoIpContext.jsx` — componente reutilizável com linguagem contextual
- `SecurityDashboard.jsx` — coluna "Contexto GeoIP" em Logins falhados e Detecções IA SEC-01

### ExplainPanel

**NOT_IMPLEMENTED** — `explainBlockedIp` em `adminPortalSecurityScoreService.js` faz chamada HTTP independente a ip-api.com fora do geoCache certificado. Integração exigiria refatoração cognitiva ampla — próximo item separado.

---

## Contrato geográfico

Campos adicionados (mesma semântica em ambas as fontes):

```
country_code
country
geo_state  → GEO_RESOLVED | GEO_UNRESOLVED | GEO_INVALID | GEO_NOT_ENRICHED
```

---

## Prova anti-viés

| ID | Resultado |
|---|---|
| BIAS-01 | PASS — classification invariável por país |
| BIAS-02 | PASS — score não depende de país isolado |
| BIAS-03 | PASS — badges/população/world_map excluem failedLogins |
| BIAS-04 | PASS — enrichment não aciona fail2ban/ufw |
| BIAS-05 | PASS — sem linguagem de identidade humana |

---

## Baseline 001

**PRESERVED** — INV-SVI-001..010 mantidas. `geo_sync_provider_calls = 0`. Mapa × drill-down intacto.

Script de certificação: `backend/scripts/sec002-certification.js`

---

## Artefato diagnóstico

| Arquivo | Classificação |
|---|---|
| `backend/scripts/sec002-certification.js` | CERTIFICATION_TEST |

Não conectado a cron, PM2, boot ou runtime.
