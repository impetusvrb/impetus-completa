# Safety (Z.25) + Environment (P1) — FULL ON Blocking Report

**Data:** 2026-05-29  
**Decisão:** **NÃO PROMOVER** `ACTIVATION_STAGE` nem `PUBLICATION_SHADOW_MODE` para modo governado pleno.  
**Acção executada:** Inspecção de código + validação de premissas. **Nenhuma alteração em `.env` nem `pm2 reload`.**

---

## Objetivo pedido vs estado actual

| Dimensão | Estado actual (facto) | FULL ON pedido |
|----------|----------------------|----------------|
| Native cockpit | `on` | `on` (já) |
| Render | `on` | `on` (já) |
| Cognitive runtime | `shadow` | **manter `shadow`** |
| `ACTIVATION_STAGE` | `shadow` | `on` / `full` |
| `PUBLICATION_SHADOW_MODE` | `true` | `false` |

A promoção pendente **não é** ligar UI (já ON). É **autorizar publicação definitiva governada** — isso exige as quatro camadas abaixo.

---

## Resultado da inspecção (A–D)

### A. Policy Engine explícito — **INSUFICIENTE**

| Evidência | Avaliação |
|-----------|-----------|
| `safetyRiskMatrixEngine.js` | Matriz **determinística** (`severity × probability`), versão fixa `matrix_version: 'safety_risk_v1'`. **Não** há catálogo versionado NR/ISO, nem `ai_policies` scoped ao domínio Safety. |
| `environmentComplianceRuntime.js` | Lógica **assistiva** sobre licenças/obrigações em memória de input; `assistive_only: true`, `no_auto_enforcement: true`. Sem motor de regras formais versionadas. |
| `policyEngineService.js` / `unifiedExposureResolver` | Motor **genérico** de exposição UI/IA (deny-first). **Sem** `policy_type` Safety/Environment nem avaliação determinística de limites regulatórios por tenant. |
| `environmentGovernanceOrchestrator.js` | `shadow: true`, `assistive_only: true`, `auto_promotion: false` — explicitamente **não autoritativo**. |

**Gap:** não existe fonte de verdade versionada (ex.: `safety_policy_rules_v{n}`, limites ambientais por licença) com avaliação determinística ligada à publicação.

---

### B. Accountability / responsável humano — **AUSENTE**

| Evidência | Avaliação |
|-----------|-----------|
| `grep` em `backend/src/domains/safety` e `.../environment` | **Zero** ocorrências de `responsible_engineer`, `approval_required`, `approver`, `signature`, `HITL`. |
| `environmentPublicationRuntime.js` | `assistive_only: true`, `auto_promotion: false` — **sem** fila de aprovação nem `responsible_engineer_id`. |
| `safetyNavigationPublicationService.js` | Contexto de publicação **assistivo, sem authority** — sem workflow de aprovação. |
| `actionRuntime` / `approvalQueueService` | HITL existe para **ferramentas IA** (`criar_tarefa`, etc.), **não** integrado à publicação SST/Ambiental. |
| `qualityDomainContract.js` (referência) | Eventos `quality.rollout.activation_approved` — **equivalente inexistente** em `safetyDomainContract` / `environmentDomainContract`. |

**Gap:** qualquer publicação governante pode ser calculada sem assinatura humana obrigatória nem papel de engenheiro responsável.

---

### C. Audit trail imutável — **AUSENTE no domínio**

| Evidência | Avaliação |
|-----------|-----------|
| `environmentPublicationAuditRuntime.js` | Buffer **in-memory** (`auditTail`, `MAX=200`), **não** append-only em BD. |
| `safetyActivationAudit.js` | Idem (`_entries`, `MAX=200`). |
| `industrialAuditStructure.js` | `INSERT` em `industrial_audit_events` — desenho correcto, mas `IMPETUS_INDUSTRIAL_AUDIT_ENABLED` **default `false`** e **não referenciado** em `domains/safety` nem `domains/environment`. |
| Migrações | Sem tabelas `safety_publication_audit` / `environment_publication_audit` dedicadas. |
| Campos exigidos (quem viu, quem aprovou, regra, consequência) | **Não modelados** no pipeline de publicação actual. |

**Gap:** risco jurídico — decisões de publicação não ficam em trilho imutável ligado ao domínio.

---

### D. RBAC reforçado (viewer × operador × aprovador) — **PARCIAL**

| Evidência | Avaliação |
|-----------|-----------|
| Perfis (`coordinator_safety`, `supervisor_safety`, etc.) | Existem em `dashboardProfiles` / `phaseZ25FeatureFlags`. |
| `ehsPublicationGuard.js` | Isolamento **Safety vs Environment menu** (cross-domain bleed) — útil, **não** separação viewer/operator/approver. |
| `dashboardAccessService` / `moduleAccessGovernance` | RBAC **genérico** de módulos; **sem** privilégios explícitos `safety.publication.approve` vs `safety.publication.view`. |
| Autoexecução | Cognitive shadow + `auto_promotion: false` mitigam IA; **não** bloqueiam operador de disparar publicação definitiva se flags forem alteradas. |

**Gap:** falta matriz RBAC de publicação com três papéis distintos e enforcement no runtime de publicação.

---

## Detalhe técnico adicional (flags pedidas)

O prompt sugere `ACTIVATION_STAGE=on`. O código **não reconhece** `on`:

```6:8:backend/src/domains/safety/activation/safetyActivationRolloutEngine.js
function resolveActivationStage() {
  const s = String(process.env.IMPETUS_SAFETY_ACTIVATION_STAGE || 'shadow').toLowerCase();
  return STAGES.includes(s) ? s : 'shadow';
```

Stages válidos Safety: `shadow`, `pilot`, `canary`, `staged`, `partial`, `full`.  
Valor inválido → **reverte para `shadow`** (promoção falharia silenciosamente).

`allowsDefinitivePublication` exige **ambos**:

- `PUBLICATION_SHADOW_MODE !== true`
- `stage` ∈ `{ pilot, canary, staged, partial, full }` (e **não** `shadow`)

```10:16:backend/src/domains/safety/activation/safetyActivationRolloutEngine.js
function allowsDefinitivePublication(stage, shadowModeEnv) {
  const shadow =
    String(shadowModeEnv || process.env.IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE || '').toLowerCase() ===
    'true';
  if (shadow) return false;
  if (stage === 'shadow') return false;
  return ['staged', 'partial', 'full', 'pilot', 'canary'].includes(stage);
}
```

Alterar só flags **sem** as camadas A–D activaria `definitive_publication: true` no health check **sem** garantias legais/operacionais — **viola o constraint do prompt**.

---

## Alinhamento com governança existente (P32)

`PROMPT_32_FLAG_GOVERNANCE_CONSOLIDATION.md` lista explicitamente como **excluídas**:

- `IMPETUS_SAFETY_ACTIVATION_STAGE` → `on`
- `IMPETUS_ENVIRONMENT_ACTIVATION_STAGE` → `on`
- `IMPETUS_*_PUBLICATION_SHADOW_MODE=false`

Motivos registados: domínio fora de Quality, publicação cross-domain, OT não validado 90d.

---

## O que permanece seguro (estado actual)

- UI/ingest: native + render **ON**
- Cognição: **SHADOW** (sem autonomia)
- Publicação: **SHADOW** + activation **shadow**
- `IMPETUS_COGNITIVE_RUNTIME=off` (inalterado nesta avaliação)

Isto corresponde ao **máximo seguro actual** sem as quatro camadas obrigatórias.

---

## Plano mínimo para desbloquear FULL ON (governado)

### Fase 1 — Policy + accountability (≈ 2–3 semanas)

1. **Tabelas + API** `domain_policy_rules` (company_id, domain, rule_version, rule_body JSON, effective_from, retired_at).
2. **Motores determinísticos** Safety (NR/limites configuráveis) e Environment (licenças/limites emissão/efluente) que **só leem** regras versionadas.
3. **Publication gate:** `approval_required: true`, `responsible_engineer_id` obrigatório em `POST .../publication/submit`.
4. Integrar **approvalQueueService** (ou workflow industrial) com eventos de domínio:
   - `safety.publication.submitted` / `safety.publication.approved`
   - `environment.publication.submitted` / `environment.publication.approved`

### Fase 2 — Audit imutável (≈ 3–5 dias)

1. Activar `IMPETUS_INDUSTRIAL_AUDIT_ENABLED=true` **após** wiring.
2. Em cada transição de publicação, `writeIndustrialAuditEvent` com: `actor_id`, `approver_id`, `rule_version`, `rule_id`, `effect`, `payload_hash`.
3. Deprecar buffers in-memory ou limitá-los a telemetria não-legal.
4. Opcional: `IMPETUS_AUDIT_HASH_CHAIN_ENABLED=true` para tamper-evidence.

### Fase 3 — RBAC publicação (≈ 1 semana)

1. Permissões: `safety.publication.view`, `.operate`, `.approve` (idem Environment).
2. Enforcement em `buildPublicationContext` / `environmentPublicationRuntime` — negar `publication_allowed` sem papel.
3. Testes: operador não aprova; viewer não publica; aprovador ≠ autor da submissão (four-eyes).

### Fase 4 — Promoção controlada de flags (≈ 1 dia + UAT)

Ordem sugerida (tenant piloto `21dd3cee-…` primeiro):

```env
# NÃO usar ACTIVATION_STAGE=on — usar full após UAT
IMPETUS_SAFETY_ACTIVATION_STAGE=full
IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=full
IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=false
IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=false
# Manter obrigatoriamente:
IMPETUS_SAFETY_COGNITIVE_RUNTIME=shadow
IMPETUS_ENVIRONMENTAL_COGNITIVE_RUNTIME=shadow
IMPETUS_COGNITIVE_RUNTIME=off
```

```bash
pm2 reload impetus-backend --update-env
```

Validar: `allowsDefinitivePublication === true`, audit rows em BD, aprovação HITL obrigatória, sem `auto_promotion`.

### Esforço total estimado

| Fase | Esforço |
|------|---------|
| Policy + accountability | 10–15 d úteis |
| Audit imutável | 3–5 d |
| RBAC publicação | 5 d |
| UAT + promoção flags | 2–3 d |
| **Total** | **≈ 4–6 semanas** (1 dev backend + revisão compliance) |

---

## Rollback (se promoção futura for aplicada)

Manter documentado em `COCKPIT_FACTORY_PROMOTION_REPORT.md`:

```env
IMPETUS_SAFETY_ACTIVATION_STAGE=shadow
IMPETUS_ENVIRONMENT_ACTIVATION_STAGE=shadow
IMPETUS_SAFETY_PUBLICATION_SHADOW_MODE=true
IMPETUS_ENVIRONMENT_PUBLICATION_SHADOW_MODE=true
```

```bash
pm2 reload impetus-backend --update-env
```

Tempo: **&lt; 15 minutos**.

---

## Critério de sucesso para relatório tipo 1 (FULL PROMOTION)

Só emitir **FULL PROMOTION REPORT** quando **todos** forem verdadeiros em produção no tenant piloto:

- [ ] Regras versionadas avaliadas deterministicamente antes de publicar
- [ ] Submissão sem `responsible_engineer_id` → rejeitada
- [ ] Publicação definitiva sem registo em `industrial_audit_events` (ou equivalente dedicado) → bloqueada
- [ ] Operador não consegue auto-aprovar
- [ ] `allowsDefinitivePublication(full, shadow=false)` com testes automatizados verdes
- [ ] UAT SST + ambiental assinado (compliance/legal)

---

## Conclusão

**Tipo de output:** **2 — BLOCKING REPORT**

Promover apenas flags (`ACTIVATION_STAGE`, `PUBLICATION_SHADOW_MODE`) **violaria** os constraints absolutos do prompt (“não contornar governança com flags apenas”) e o plano P32. O estado actual (native/render ON + shadow publication) é o **teto seguro** até implementar as quatro camadas obrigatórias.
