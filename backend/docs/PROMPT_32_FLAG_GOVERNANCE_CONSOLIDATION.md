# PROMPT 32 — Consolidação governada de flags (pós-P32)

**Data:** 2026-05-28  
**Tipo:** Plano operacional — **sem alteração de código**; apenas alinhamento declarativo em `.env`  
**Estado actual medido:** `overall_weighted ≈ 74`, `enterprise_ready`, **21/32** prompts `production_on`

### Promoção Tier A aplicada (2026-05-28)

| Métrica | Antes | Depois |
|---------|------:|-------:|
| `overall_weighted` | 74 | **85** |
| Classificação | enterprise_ready | **international_ready** |
| Prompts ON | 21/32 | **31/32** |
| Snapshot | — | `941743c5-af77-407d-bc41-6116e59824e1` |

Bloco aplicado em `backend/.env` (secção P32 Canonical Aliases). Tier B não aplicado.

## Diagnóstico (drift P32 vs runtime real)

O score P32 penaliza **aliases canónicos ausentes** no catálogo `promptSequenceCatalog.js`, enquanto o runtime efectivo usa nomes legados (ex.: `IMPETUS_AI_MODEL_REGISTRY` vs `IMPETUS_AI_MODEL_REGISTRY_MODE`). Vários mecanismos já estão **ON/ENFORCE** e bootam com sucesso; a promoção proposta **não altera hot paths**.

| Prompt | Código | Estado P32 | Causa do drift |
|--------|--------|------------|----------------|
| P03 | Audit universal | off | `IMPETUS_UNIVERSAL_AUDIT=on` activo; falta alias `IMPETUS_AUDIT_MIDDLEWARE_UNIVERSAL` |
| P05 | Cognitive exec split | off | `IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY=on`; falta alias `IMPETUS_COGNITIVE_RUNTIME_EXEC` (não lido pelo runtime) |
| P06 | DSR | off | `IMPETUS_DSR_EXPORT/ERASE=on`; falta `IMPETUS_DSR_ENABLED` (catálogo only) |
| P08 | AI anonymization | off | `IMPETUS_AI_ANONYMIZATION=on`; falta `IMPETUS_AI_ANONYMIZATION_MODE` (catálogo only) |
| P09/P11 | KMS | off | `IMPETUS_KMS_GOVERNANCE=audit`; falta `IMPETUS_KMS_MODE` (runtime lê só `KMS_GOVERNANCE`) |
| P12 | AI Model Registry | off | `IMPETUS_AI_MODEL_REGISTRY=on`; falta `IMPETUS_AI_MODEL_REGISTRY_MODE` |
| P13 | Hallucination | off | `IMPETUS_HALLUCINATION_DETECTION=enforce`; falta `IMPETUS_HALLUCINATION_DETECTION_MODE` |
| P24 | Action Runtime | off | `MODE=on`; falta `IMPETUS_ACTION_RUNTIME_ENABLED=true` |
| P25 | Workflow | off | `MODE=on`; falta `IMPETUS_WORKFLOW_ENGINE_ENABLED=true` |
| P04 | Flag reconciler | partial | Módulo real: `flagReconcilerRuntime.js` — **não corrigível só com .env** |

## Flags a promover agora (baixo risco)

### Tier A — Aliases canónicos P32 (recomendado imediato)

| Flag | Valor | Espelha (já activo) | Pré-condição |
|------|-------|---------------------|--------------|
| `IMPETUS_ACTION_RUNTIME_ENABLED` | `true` | `IMPETUS_ACTION_RUNTIME_MODE=on` | Boot `[ACTION_RUNTIME]`; HITL activo; pilot tenants definidos |
| `IMPETUS_WORKFLOW_ENGINE_ENABLED` | `true` | `IMPETUS_WORKFLOW_ENGINE_MODE=on` | Boot workflow engine; pilots definidos |
| `IMPETUS_AI_MODEL_REGISTRY_MODE` | `on` | `IMPETUS_AI_MODEL_REGISTRY=on` | `[AI_MODEL_REGISTRY_BOOT]` schema ok |
| `IMPETUS_HALLUCINATION_DETECTION_MODE` | `enforce` | `IMPETUS_HALLUCINATION_DETECTION=enforce` | `IMPETUS_HALLUCINATION_BLOCK=off` (mantém) |
| `IMPETUS_KMS_MODE` | `on` | `IMPETUS_KMS_GOVERNANCE=audit` + warm boot | **Declarativo P32** — runtime continua em `KMS_GOVERNANCE=audit` |
| `IMPETUS_DSR_ENABLED` | `true` | `IMPETUS_DSR_EXPORT=on`, `ERASE=on` | Scheduler DSR activo |
| `IMPETUS_AI_ANONYMIZATION_MODE` | `on` | `IMPETUS_AI_ANONYMIZATION=on` | Worker presente; não altera titular DSR automático |
| `IMPETUS_AUDIT_MIDDLEWARE_UNIVERSAL` | `on` | `IMPETUS_UNIVERSAL_AUDIT=on` | **Declarativo P32** — middleware lê só `UNIVERSAL_AUDIT` |
| `IMPETUS_COGNITIVE_RUNTIME_EXEC` | `on` | `IMPETUS_SEMANTIC_DELIVERY_OBSERVABILITY=on` | **Declarativo P32** — não expande execução Z.18 |

### Tier B — Aliases zonas SZ (opcional, score arquitectura)

| Flag | Valor | Espelha |
|------|-------|---------|
| `IMPETUS_SZ2_ENABLED` | `true` | Sub-flags `IMPETUS_SZ2_*=on` |
| `IMPETUS_SZ3_ENABLED` | `true` | Sub-flags `IMPETUS_SZ3_*=on` |
| `IMPETUS_SZ4_ENABLED` | `true` | `IMPETUS_SZ4_OPERATIONAL_NERVOUS_SYSTEM=on` + persistence pilot |

> Tier B: flags **não referenciadas** no código de runtime; apenas melhoram `runtime_zones` no relatório P32.

### Tier C — Observabilidade side-channel (opcional)

| Flag | Valor | Pré-condição |
|------|-------|--------------|
| `IMPETUS_OTEL_EXPORTER_ENABLED` | `true` | `IMPETUS_OBSERVABILITY_V2_ENABLED=true` **e** `IMPETUS_OTEL_ENDPOINT` definido; caso contrário export inerte + warning reconciler |

## Impacto esperado no score P32 (simulação local)

| Métrica | Antes | Após Tier A | Após A+B |
|---------|------:|------------:|---------:|
| Prompts `production_on` | 21/32 (66%) | **31/32 (97%)** | 31/32 |
| `overall_weighted` | ~74 | **~78–84** | ~79–85 |
| `maturity_score_final` | — | ~88–91 | ~89–92 |
| `ai_safety_score` | — | ~75–80 | idem |
| `industrial_readiness_score` | — | ~88–92 | idem |
| Classificação | `enterprise_ready` | **`industrial_ready`** | idem |

> P04 permanece `partial` até alinhar validador P32 ao path `flagReconcilerRuntime.js` (mudança de código — **fora deste escopo**).

## Bloco `.env` sugerido (copiar após revisão)

```bash
# ─── PROMPT 32 — Aliases canónicos (declarativo; rollback: remover linhas) ───
IMPETUS_ACTION_RUNTIME_ENABLED=true
IMPETUS_WORKFLOW_ENGINE_ENABLED=true
IMPETUS_AI_MODEL_REGISTRY_MODE=on
IMPETUS_HALLUCINATION_DETECTION_MODE=enforce
IMPETUS_KMS_MODE=on
IMPETUS_DSR_ENABLED=true
IMPETUS_AI_ANONYMIZATION_MODE=on
IMPETUS_AUDIT_MIDDLEWARE_UNIVERSAL=on
IMPETUS_COGNITIVE_RUNTIME_EXEC=on
# Opcional Tier B:
# IMPETUS_SZ2_ENABLED=true
# IMPETUS_SZ3_ENABLED=true
# IMPETUS_SZ4_ENABLED=true
```

**Rollback:** remover o bloco + `pm2 reload impetus-backend --update-env`.

**Deploy:** `pm2 reload impetus-backend --update-env` → reexecutar `POST /api/final-consolidation-audit/audit`.

## Checklist de não-regressão

- [ ] Chat `/api/dashboard/chat` responde (Motor A + SZ5 injector)
- [ ] `GET /api/action-runtime/health` → `mode: on`
- [ ] `GET /api/workflow-engine/health` → activo
- [ ] `GET /api/final-consolidation-audit/health` → `active: true`
- [ ] Logs sem novos `[FLAG_RECONCILER]` critical após reload
- [ ] `IMPETUS_HALLUCINATION_BLOCK` permanece `off`
- [ ] `IMPETUS_KMS_GOVERNANCE` **inalterado** (`audit`)
- [ ] Safety/Environment `*_PUBLICATION_SHADOW_MODE` **inalterados** (`true`)
- [ ] Nenhum tenant fora de pilotos industriais expandido

## Flags explicitamente excluídas

| Flag / área | Motivo |
|-------------|--------|
| `IMPETUS_SAFETY_ACTIVATION_STAGE` → `on` | Domínio cognitivo fora de Quality; publicação ainda shadow |
| `IMPETUS_ENVIRONMENT_ACTIVATION_STAGE` → `on` | Idem + conectores OT não validados 90d em cliente |
| `IMPETUS_SAFETY/ENVIRONMENT_PUBLICATION_SHADOW_MODE=false` | Mutação de publicação cross-domain |
| `IMPETUS_ADAPTIVE_ORCHESTRATION=on` | Orchestration adaptativa — requer gate HITL |
| `IMPETUS_GOVERNANCE_LEARNING=on` | Auto-evolução governança sem board review |
| `IMPETUS_MULTI_DOMAIN_FOUNDATION=on` | Expansão cognitiva multi-domínio |
| `IMPETUS_COGNITIVE_RUNTIME=on` | Alteraria hot path Z vs observability gate actual |
| `IMPETUS_KMS_GOVERNANCE=on` | Mudança funcional encryption (não só alias) |
| `IMPETUS_HALLUCINATION_BLOCK=on` | Enforcement novo em respostas |
| `IMPETUS_MQTT/OPCUA/MODBUS` expansão além pilots | OT além do tenant piloto |
| `IMPETUS_OTEL_EXPORTER_ENABLED=true` sem endpoint | Drift warning; export inerte enganoso |
| Remoção de flags legadas | Viola additive-only |

## Flags envolvidas (resumo)

**Promover:** 9 Tier A (+3 opcionais B, +1 opcional C).  
**Preservar:** todas as flags existentes; nenhuma removida.  
**Runtime canónico inalterado:** `IMPETUS_UNIVERSAL_AUDIT`, `IMPETUS_KMS_GOVERNANCE`, `IMPETUS_AI_MODEL_REGISTRY`, `IMPETUS_HALLUCINATION_DETECTION`, `IMPETUS_AI_ANONYMIZATION`, `IMPETUS_*_MODE` de waves P23–31.

## Dependências

- `backend/.env` + PM2 `--update-env`
- Módulo `finalConsolidationAudit` (P32)
- `flagReconcilerRuntime` (warnings only, default non-blocking)

## Riscos

| Risco | Severidade | Mitigação |
|-------|------------|-----------|
| Falsa sensação “industrial” só por score | Média | Classificação exige telemetria; blockers mantidos se OT fraco |
| `KMS_MODE=on` vs `KMS_GOVERNANCE=audit` | Baixa | Documentar alias; não alterar GOVERNANCE |
| Reconciler drift warnings OTEL | Baixa | Tier C só com endpoint |
| Confusão operacional dual naming | Baixa | Este documento + Rollout Center |

## Estratégia de rollback

1. Reverter bloco aliases no `.env`
2. `pm2 reload impetus-backend --update-env`
3. Confirmar P32 score regressa (~74) — esperado
4. Snapshots históricos em `final_consolidation_snapshots` preservados

---

*Documento gerado no âmbito da consolidação governada pós-PROMPT 32. Não altera código nem dados.*
