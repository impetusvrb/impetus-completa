# Auditoria — Cognitive EntryPoint Governance (Fase F)

**Data:** 2026-05-19

## Canais mapeados

| Canal | Ficheiro / Rota | Estado pré-F | Estado pós-F |
|-------|-----------------|--------------|--------------|
| Dashboard `/me` | `dashboard.js` | Parcial (Fase E `content_exposure`) | Parcial + shadow |
| Visibilidade UI | `GET /dashboard/visibility` | Protegido (Fase E) | Protegido |
| **Chat** | `POST /dashboard/chat` | **Sem governance sections** | Integrado (flag off default) |
| **KPIs** | `GET /dashboard/kpis` | RBAC sensíveis apenas | Integrado (flag off default) |
| **Smart summary** | `GET /dashboard/smart-summary` | Perfil + RBAC | Integrado (flag off default) |
| Summary legado | `GET /dashboard/summary` | Hierarquia | Não alterado (fora escopo) |
| Live surface | `GET /dashboard/live-surface` | Engine V2 policies | Boundary guard opt-in |
| Live stream | SSE | Parcial | Não alterado nesta fase |
| Conselho cognitivo | `cognitiveOrchestrator` | Egress + safety | Boundary rules definidas |
| Voice context | `voiceRealtimeContextService` | KPI allowlist | Não alterado nesta fase |
| Data retrieval | `dataRetrievalService` | Amplo | Sanitizer via chat path |
| WebSocket voice | `/impetus-voice` | Separado | Fora escopo F |

## Classificação de risco

### [CRITICAL]

| ID | Canal | Risco | Mitigação F |
|----|-------|-------|-------------|
| C1 | Chat `operational_overview` | KPI/alertas via pack JSON | `secureChatContextBuilder` |
| C2 | Chat user turn | `JSON.stringify(kpis,events)` | Pack sanitizado + KPI filter |
| C3 | Fail-open visibility | Já corrigido Fase E | Mantido failsafe |

### [HIGH]

| ID | Canal | Risco | Mitigação |
|----|-------|-------|-----------|
| H1 | KPIs route | Sem `sections.kpi_request` | `secureKpiExposureResolver` |
| H2 | Smart summary | Reconstrução narrativa | `summaryExposureSanitizer` |
| H3 | Inferência indireta | "eficiência caiu 14%" | `stripInferenceFromText` |
| H4 | Cross-domain pack | `cross_domain` no pack | `cognitiveBoundaryGuard` |

### [MEDIUM]

| ID | Canal | Nota |
|----|-------|------|
| M1 | Unified decision engine | Não alterado; recebe pack já filtrado no chat |
| M2 | Council pipeline | Council data from filtered pack |
| M3 | Executive query | Rota separada — próxima fase |

### [LOW]

| ID | Canal | Nota |
|----|-------|------|
| L1 | Personalizado | Módulos por perfil — domain authority |
| L2 | Maintenance dashboard | Domínio isolado |

## Bypassável?

| Cenário | Com flags OFF | Com flags ON |
|---------|---------------|--------------|
| Chat KPI leak | Sim (legacy) | Mitigado |
| KPI API leak | Parcial (RBAC) | Mitigado + sections |
| Summary reconstruct | Sim | Mitigado |
| Shadow observability | N/A | Divergência logada |

## Flags Fase F

| Flag | Default |
|------|---------|
| `IMPETUS_CHAT_GOVERNANCE` | off |
| `IMPETUS_KPI_GOVERNANCE` | off |
| `IMPETUS_SUMMARY_GOVERNANCE` | off |
| `IMPETUS_COGNITIVE_BOUNDARY_GUARD` | off |
| `IMPETUS_GOVERNANCE_SHADOW_MODE` | on |
