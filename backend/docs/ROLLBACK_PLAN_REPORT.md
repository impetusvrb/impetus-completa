# ROLLBACK PLAN — Fases 39-47 Intelligence Stack

**Versão:** 1.0  
**Data:** 2026-06-02  
**Escopo:** Fases 39 → 47 completo  
**RTO:** < 5 minutos  
**RPO:** Zero data loss (operações aditivas)

---

## Contexto

Todas as fases 39-47 foram implementadas de forma **aditiva e não destrutiva**:
- Nenhuma tabela existente foi alterada estruturalmente
- Nenhum serviço existente foi removido
- Novos serviços foram injetados via composição
- Truth Enforcement preserva todas as verificações anteriores

---

## Nível 1 — Rollback PM2 (< 1 min)

Para falha de startup ou crash imediato:

```bash
# Reiniciar com último estado estável
pm2 restart impetus-backend

# Se necessário, reload com variáveis
pm2 reload impetus-backend --update-env

# Verificar
curl http://127.0.0.1:4000/health
pm2 logs impetus-backend --lines 20
```

## Nível 2 — Rollback de Código (< 3 min)

Para falha em serviço específico de inteligência:

```bash
# Ver commits recentes
git log --oneline -15 backend/src/services/

# Reverter serviço específico
git checkout HEAD~1 -- backend/src/services/operationalPrioritizationService.js

# Recarregar
pm2 reload impetus-backend --update-env
```

### Mapa de Serviços por Fase (para rollback cirúrgico)

| Fase | Arquivo | Rollback seguro? |
|------|---------|-----------------|
| F39 | `plcChatGroundingService.js` | ✅ Sim |
| F40 | `plcOperationalIntelligenceService.js` | ✅ Sim |
| F41 | `plcTrendAnalysisService.js` | ✅ Sim |
| F42 | `operationalAnomalyDetectionService.js` | ✅ Sim |
| F43 | `correlationInsightsService.js` | ✅ Sim |
| F44 | `eventEngine.js` | ✅ Sim |
| F45 | `operationalPatternIntelligenceService.js` | ✅ Sim |
| F46 | `operationalExplanationService.js` | ✅ Sim |
| F47 | `operationalPrioritizationService.js` | ✅ Sim |
| Truth | `industrialTruthEnforcementService.js` | ⚠️ Apenas com aprovação sênior |

## Nível 3 — Rollback Completo (< 5 min)

```bash
# 1. Identificar baseline estável
git log --oneline -20

# 2. Criar branch de emergência
git checkout -b emergency/rollback-$(date +%Y%m%d%H%M)

# 3. Hard reset para baseline
git reset --hard <commit-hash-estavel>

# 4. Reload PM2
pm2 reload impetus-backend --update-env

# 5. Verificar certificação mínima
node backend/scripts/phase40-plc-intelligence-certification.js 2>/dev/null | tail -5

# 6. Health check
curl http://127.0.0.1:4000/health
```

## Nível 4 — Rollback de Banco de Dados

> ⚠️ Somente se operação de rollback de código não for suficiente

```bash
# Restaurar backup pré-deploy
pg_restore -U postgres -d impetus_db backup_pre_fase47r.dump

# Verificar integridade
psql -U postgres -d impetus_db -c "SELECT COUNT(*) FROM plc_telemetry_samples;"
```

---

## Critérios de Trigger Automático

| Indicador | Threshold | Ação |
|-----------|-----------|------|
| PM2 restarts | > 3 em 5min | Nível 1 |
| `/health` não-200 | > 60s | Nível 1 → 2 |
| `enforceTextResponse` ausente | Imediato | Nível 2 (Truth) |
| Chat retorna dados inventados | Imediato | Nível 2 (Truth) |
| DB query error | > 10 em 1min | Nível 4 |

---

## Contatos de Aprovação

| Nível | Aprovação Necessária |
|-------|---------------------|
| Nível 1 | Automático / DevOps |
| Nível 2 | Tech Lead |
| Nível 3 | Arquiteto Sênior |
| Nível 4 | CTO + DBA |

---

*Plano de rollback certificado em 2026-06-02 como parte da Fase 47-R.*
