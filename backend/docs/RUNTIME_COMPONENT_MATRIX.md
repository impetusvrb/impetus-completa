# RUNTIME COMPONENT MATRIX — Enterprise Runtime Promotion

**Certificação:** PROMOTION-01  
**Baseline:** Event Governance v1 + Enterprise v1  
**Data:** 2026-07-02

---

## Legenda de estados

| Estado | Significado |
|--------|-------------|
| **Shadow** | Activo em modo observação; legado paralelo ou decisão não efectiva |
| **Passive** | Hook no pipeline sem efeito (flag OFF) |
| **Parallel** | Subsistema independente; sem integração EG directa |
| **Disabled** | Não activo / dry-run global |
| **Ready** | Elegível para promoção via flag + controlled restart |

## Classificação de elegibilidade

| Classificação | Critério |
|---------------|----------|
| **READY** | Testes EG aprovados; sem NC Alta/Crítica directa; integração comprovada |
| **BLOCKED** | NC Média de bypass ou dependência não resolvida |
| **NOT ELIGIBLE** | Integração arquitectural futura (Grupo B) |

---

## Grupo A — Camadas cognitivas EG (promovíveis)

| Componente | Flag | Estado actual | Motivo | Dependências | Classificação |
|------------|------|---------------|--------|--------------|---------------|
| Learning | `EVENT_GOVERNANCE_LEARNING` | Passive | Default OFF; hook pipeline activo | EG-12 AIOI (opcional), EG-03 execução | **READY** |
| Memory | `EVENT_GOVERNANCE_MEMORY` | Passive | Default OFF | Learning (recomendado antes) | **READY** |
| Explainability | `EVENT_GOVERNANCE_EXPLAINABILITY` | Passive | Default OFF | Memory context | **READY** |
| Intelligence | `EVENT_GOVERNANCE_INTELLIGENCE` | Passive | Default OFF | Explainability snapshots | **READY** |
| Policy Optimization | `EVENT_GOVERNANCE_POLICY_OPTIMIZATION` | Passive | Default OFF | Intelligence snapshots | **READY** |
| Executive Insights | `EVENT_GOVERNANCE_EXECUTIVE_INSIGHTS` | Passive | On-demand; não no pipeline | Intelligence + Optimization | **READY** |
| Knowledge Base | `EVENT_GOVERNANCE_KNOWLEDGE_BASE` | Passive | On-demand; referências read-only | EG-13→18 | **READY** |

**Testes:** EG-13 a EG-19 — 15/15 cada (regressão EG-20).

---

## Grupo A — Cognição consumo (EG-12)

| Componente | Flag | Estado actual | Classificação |
|------------|------|---------------|---------------|
| AIOI Governance Feed | `EVENT_GOVERNANCE_AIOI` | Shadow/Passive | **READY** (recomendado antes de Learning) |

---

## Núcleo Event Governance

| Componente | Flag | Estado actual | Motivo | Classificação |
|------------|------|---------------|--------|---------------|
| Decisão global | `EVENT_GOVERNANCE_ENABLED` | Shadow | Decisões shadow se OFF | **BLOCKED**¹ |
| Execução real | `EVENT_GOVERNANCE_EXECUTION_ENABLED` | Disabled (dry-run) | Sem envio real se OFF | **BLOCKED**¹ |

¹ Promoção do núcleo requer plano de migração por domínio separado (pós Grupo A cognitivo).

---

## Domínios — Adapters (EG-04 a EG-11C)

| Domínio | Flag | Estado | Classificação |
|---------|------|--------|---------------|
| Operational Alerts | `EVENT_GOVERNANCE_OPERATIONAL_ALERTS` | Shadow | **BLOCKED** (NC-INT-004) |
| AI Proactive | `EVENT_GOVERNANCE_AI_PROACTIVE` | Shadow | **BLOCKED** |
| TPM | `EVENT_GOVERNANCE_TPM` | Shadow | **BLOCKED** |
| Executive messaging | `EVENT_GOVERNANCE_EXECUTIVE` | Shadow | **BLOCKED** |
| Billing | `EVENT_GOVERNANCE_BILLING` | Shadow | **BLOCKED** |
| DSR | `EVENT_GOVERNANCE_DSR` | Shadow | **BLOCKED** |
| Manu IA | `EVENT_GOVERNANCE_MANUIA` | Shadow | **BLOCKED** |
| Quality | `EVENT_GOVERNANCE_QUALITY` | Shadow | **BLOCKED** |
| SST | `EVENT_GOVERNANCE_SST` | Shadow | **BLOCKED** |
| ESG | `EVENT_GOVERNANCE_ESG` | Shadow | **BLOCKED** |

**Motivo BLOCKED:** NC-INT-007 (shadow default) + validação shadow/migrated por domínio ainda não executada em produção. Promoção domínio-a-domínio é ciclo **PROMOTION-02+**, não esta fase.

---

## Grupo B — Integração arquitectural (NOT ELIGIBLE)

| Componente | Estado | Motivo | NC | Classificação |
|------------|--------|--------|-----|---------------|
| Cognitive Controller | Parallel | Sem `evaluateEvent` | NC-INT-001 | **NOT ELIGIBLE** |
| Pulse Cognitive | Parallel | Governança interna Pulse | NC-INT-006 | **NOT ELIGIBLE** |
| Event Backbone (`cognitiveEventBackboneService`) | Parallel | Domínio separado do EG | NC-INT-002 | **NOT ELIGIBLE** |

**Nota:** Estes subsistemas **não devem ser "desligados"**. O objectivo futuro é consolidar **pontos de integração**, não eliminar paralelismo arquitectural.

---

## Outros

| Componente | Estado | Classificação |
|------------|--------|---------------|
| Frontend audit EG | Disabled (sem UI) | **BLOCKED** (NC-INT-003) — não bloqueia Grupo A |
| Políticas `CHAT_OPERATIONAL` / `NC_BRIDGE_MIRROR` | Catálogo sem adapter | **BLOCKED** (NC-INT-005) |
| `notificationBridge` (legado) | Shadow fallback | **BLOCKED** até migração domínio |

---

## Resumo quantitativo

| Classificação | Quantidade |
|---------------|------------|
| READY | 8 (AIOI + 7 camadas cognitivas) |
| BLOCKED | 12 (núcleo + 10 domínios + frontend) |
| NOT ELIGIBLE | 3 (Grupo B) |
