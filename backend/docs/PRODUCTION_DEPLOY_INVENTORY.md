# PRODUCTION DEPLOY INVENTORY — Fase 47-R

**Data:** 2026-06-02  
**Escopo:** Fases 39 → 47 (Intelligence Stack)

---

## Infraestrutura

| Item | Valor |
|------|-------|
| Servidor | `/var/www/impetus-completa` |
| OS | Linux 5.15.0 |
| Node.js | v20.18.2 |
| PM2 | Ativo (impetus-backend id:3, impetus-lab-oidc id:7) |
| Disk | 20G / 97G (20% usado) |
| DB | PostgreSQL (impetus_db) |

## Serviços Backend (342 total)

### Novos serviços adicionados nas Fases 39-47

| Arquivo | Fase | Funções exportadas |
|---------|------|-------------------|
| `plcOperationalIntelligenceService.js` | F40 | 9 |
| `plcTrendAnalysisService.js` | F41 | 9 |
| `operationalAnomalyDetectionService.js` | F42 | 6 |
| `correlationInsightsService.js` | F43 | 5 |
| `eventEngine.js` | F44 | 1 |
| `operationalPatternIntelligenceService.js` | F45 | 10 |
| `operationalExplanationService.js` | F46 | 14 |
| `operationalPrioritizationService.js` | F47 | 12 |
| `industrialTruthEnforcementService.js` | F40-F47 | 46 |
| `plcChatGroundingService.js` | F39 | atualizado |

### Configurações

| Arquivo | Fase | Conteúdo |
|---------|------|---------|
| `priorityIntelligenceConfig.js` | F47 | Pesos, níveis, limites de fila |

### Prompts IA

| Arquivo | Fase |
|---------|------|
| `telemetryOnlyModePrompt.js` | F40-F47 (atualizado) |

### Scripts de Certificação

| Script | Fase |
|--------|------|
| `phase39-grounding-revalidation.js` | F39 |
| `phase40-plc-intelligence-certification.js` | F40 |
| `phase41-trend-certification.js` | F41 |
| `phase42-anomaly-certification.js` | F42 |
| `phase43-correlation-certification.js` | F43 |
| `phase44-event-certification.js` | F44 |
| `phase45-pattern-certification.js` | F45 |
| `phase46-explanation-certification.js` | F46 |
| `phase47-priority-certification.js` | F47 |
| `phase47r-collect-certs.sh` | F47-R (orquestrador) |
| `phase47r-run-all-certs.js` | F47-R (runner) |

## Rotas API (118 total)

Rotas relevantes para as novas fases:

| Rota | Serviço |
|------|---------|
| `POST /api/dashboard/chat` | chatGrounding + intelligence stack + truth |
| `GET /api/dashboard/metrics` | priority pack + intelligence bundle |
| `GET /api/dashboard/pulse` | cognitivePulse + liveFeedPriorities |

## Variáveis de Ambiente Críticas

| Variável | Valor esperado |
|----------|---------------|
| `IMPETUS_INDUSTRIAL_TRUTH_ENFORCEMENT` | `on` |
| `NODE_ENV` | `development` (prod em breve) |
| `JWT_SECRET` | Configurado |
| `DATABASE_URL` / `DB_*` | Configurados |

---

*Inventário gerado como parte da Fase 47-R Controlled Enterprise Deployment Certification.*
