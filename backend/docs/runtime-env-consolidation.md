# Consolidação de variáveis de ambiente (runtime cognitivo) — IMPETUS

**Data (UTC):** 2026-05-12T17:40Z  
**Política:** este documento **não** activa nem altera o `.env` de produção; consolida o que o repositório define como referência e o que a equipa deve verificar manualmente.

## 1. Fonte de verdade no código

- **`backend/.env.example`** — lista completa de flags cognitivas e operacionais.
- **PM2** — `pm2 restart … --update-env` recarrega variáveis injectadas na configuração PM2 (não sobrescreve ficheiros `.env` no disco).

## 2. Grupos críticos (checklist de revisão manual)

Verificar em produção (valores reais **não** documentados aqui):

| Grupo | Chaves exemplares | Risco se mal configurado |
|-------|-------------------|---------------------------|
| Policy | `IMPETUS_POLICY_*`, `IMPETUS_POLICY_DIFF_ENABLED`, `IMPETUS_POLICY_EVOLUTION_ENABLED` | Endpoints admin 403 até activação explícita |
| Dashboard cognitivo | `IMPETUS_COGNITIVE_DASHBOARD_ENABLED` | Painel governança indisponível |
| Event backbone | `IMPETUS_EVENT_BACKBONE_ENABLED`, `IMPETUS_EVENT_BACKBONE_PERSIST` | Sem persistência ou sem backbone |
| Pipeline / fila | `IMPETUS_EVENT_PIPELINE_ENABLED`, `IMPETUS_EVENT_QUEUE_MAX`, … | Pressão ou shadow-only |
| Integridade | `IMPETUS_CONTEXT_INTEGRITY_ENABLED`, `IMPETUS_CONTEXT_INTEGRITY_BLOCK_MODE` | **Não** activar block mode sem readiness |
| Orchestrator | `IMPETUS_UNIFIED_ORCHESTRATOR_ENABLED`, `IMPETUS_BLOCK_LEGACY_COGNITIVE_PATHS` | Alteração de caminhos — só com plano |
| Consenso / CSI / calibração | `IMPETUS_COGNITIVE_CONSENSUS_ENABLED`, `IMPETUS_CSI_ENABLED`, `IMPETUS_CONFIDENCE_CALIBRATION_ENABLED` | Features desligadas vs esperado |
| Safety | `IMPETUS_COGNITIVE_SAFETY_ENABLED` | Superfície de risco |
| Realtime | `IMPETUS_REALTIME_PROXY_ENABLED`, `IMPETUS_AI_GATEWAY_REALTIME_*` | WebSocket / gateway |
| Destructive migrations | `IMPETUS_ALLOW_DESTRUCTIVE_MIGRATIONS` | **Manter false** salvo janela de manutenção |

## 3. Defaults seguros no `.env.example`

A maior parte das capacidades cognitivas avançadas está em **`false`** por defeito — alinhado com *safe rollout* e kill-switches.

## 4. Inconsistências comuns a evitar

- `IMPETUS_COGNITIVE_DASHBOARD_ENABLED=false` mas expectativa de uso das rotas `/api/admin/learning/dashboard` → 403 `DASHBOARD_DISABLED`.
- Policy phases activadas sem `IMPETUS_POLICY_DISCOVERY_ENABLED` onde dependências documentadas existam.
- `BLOCK_MODE` sem passar por `integrity-readiness`.

## 5. Acções **não** realizadas nesta consolidação

- Não se activou authority runtime, enforcement de governance, nem `CONTEXT_INTEGRITY_BLOCK_MODE`.
- Não se escreveu nem versionou o `.env` de produção no repositório.

---

*Documento de apoio à equipa de operações. Actualizar após mudanças contractuais de ENV.*
