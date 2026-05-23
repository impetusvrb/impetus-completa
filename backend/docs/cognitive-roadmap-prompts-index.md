# Roadmap Cognitivo IMPETUS — Índice de Prompts (Z.23 → Z.29)

**Data de referência:** 2026-05-22  
**Auditoria base:** [cognitive-cockpit-domain-specialization-audit.md](./cognitive-cockpit-domain-specialization-audit.md)

---

## A Z.23 é “tudo o que falta”?

**Não.** A Z.23 **não finaliza o projeto**. Finaliza a **fundação do primeiro cockpit cognitivo nativo de domínio** (Quality).

| Camada | Estado antes da Z.23 | Após Z.23 | Ainda por vir |
|--------|----------------------|-----------|---------------|
| Governança / determinismo / anti-leakage | Maduro | Mantém | Refino contínuo |
| Shadow → enrich → render (Z.19–Z.22) | Maduro | Base para consolidação | — |
| Cockpit semanticamente nativo | Híbrido | **Quality-native (piloto)** | SST, RH, Executive, … |
| Multi-domain foundation | — | — | **Z.24** |
| Orchestration adaptativa | Parcial | — | **Z.28** |
| Learning supervisionado | — | — | **Z.29** |
| Chat cognitivo global | OFF (correto) | OFF | Após maturidade |

**Conclusão:** depois da Z.23 o desenvolvimento deixa de ser “resolver caos arquitetural” e passa a **expansão cognitiva especializada** — replicável graças ao padrão Quality.

---

## Ordem obrigatória de execução

```text
Z.23  →  Z.24  →  Z.25 | Z.26 | Z.27 (paralelo possível após Z.24)
                    ↓
                  Z.28  →  Z.29
```

| Fase | Ficheiro prompt | Dependências |
|------|-----------------|--------------|
| **Z.23** | [prompts/Z23-specialized-cockpit-consolidation.md](./prompts/Z23-specialized-cockpit-consolidation.md) | Z.19–Z.22 activos |
| **Z.24** | [prompts/Z24-multi-domain-cockpit-foundation.md](./prompts/Z24-multi-domain-cockpit-foundation.md) | ✅ **Concluída** — ver [multi-domain-cognitive-cockpit-foundation-z24.md](./multi-domain-cognitive-cockpit-foundation-z24.md) |
| **Z.25** | [prompts/Z25-sst-cognitive-cockpit.md](./prompts/Z25-sst-cognitive-cockpit.md) | Z.24 registry |
| **Z.26** | [prompts/Z26-rh-cognitive-cockpit.md](./prompts/Z26-rh-cognitive-cockpit.md) | Z.24 registry |
| **Z.27** | [prompts/Z27-executive-strategic-boardroom.md](./prompts/Z27-executive-strategic-boardroom.md) | Z.24 + terminal governance |
| **Z.28** | [prompts/Z28-cognitive-orchestration-adaptive.md](./prompts/Z28-cognitive-orchestration-adaptive.md) | Z.24 + ≥1 domínio nativo |
| **Z.29** | [prompts/Z29-enterprise-governance-learning.md](./prompts/Z29-enterprise-governance-learning.md) | Z.28 |

---

## Invariantes em TODAS as fases (não negociável)

- Backend canónico: `backend/` (PM2 produção)
- Design System Industrial 4.0 no frontend (`tokens.css`, sem fundo branco)
- Gráficos: `ImpetusChart` + dados reais (sem `Math.random()`)
- **Aditivo**, shadow-first, rollback-safe, pilot-only onde indicado
- **Proibido:** replace global React, CSS estrutural, hard delete widgets, boundary global, auto-remediation, chat enforcement
- Terminal governance (Z.16) **depois** de enrich/consolidation nos canais sensíveis
- Commits/PRs só quando o utilizador pedir

---

## Flags globais (acumulativas)

Manter Z.19–Z.22 antes de avançar:

```env
# Z.19–Z.22 (já em produção piloto)
IMPETUS_QUALITY_COCKPIT_PILOT=shadow
IMPETUS_SPECIALIZED_DELIVERY_ENRICH=enrich
IMPETUS_COGNITIVE_RENDER_PROMOTION=controlled
IMPETUS_QUALITY_RENDER_PROMOTION=pilot
```

Z.23+ começam em `off` até validação:

```env
IMPETUS_SPECIALIZED_COCKPIT_RUNTIME=off
IMPETUS_MULTI_DOMAIN_FOUNDATION=off
IMPETUS_COGNITIVE_ORCHESTRATION=off
```

---

## Como usar no Cursor

1. Abrir o prompt da fase na pasta `backend/docs/prompts/`
2. Colar o conteúdo completo numa nova conversa (ou @-referenciar o ficheiro)
3. Exigir no final: testes npm + relatório obrigatório da secção “Relatório final”
4. Só activar flags `enrich`/`controlled`/`on` após testes verdes + PM2 `--update-env`
5. Não iniciar fase N+1 sem relatório da fase N com rollout readiness ≥ aceitável

---

## Documentação por fase (a criar na implementação)

| Fase | Doc principal |
|------|----------------|
| Z.23 | `specialized-cognitive-cockpit-z23.md` |
| Z.24 | `multi-domain-cognitive-foundation-z24.md` |
| Z.25 | `sst-native-cockpit-z25.md` |
| Z.26 | `rh-native-cockpit-z26.md` |
| Z.27 | `executive-boardroom-z27.md` |
| Z.28 | `cognitive-orchestration-z28.md` |
| Z.29 | `enterprise-cognitive-learning-z29.md` |
