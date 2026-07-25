# ARCH-PLAN-001 — Executive Summary

**Programa:** Enterprise Evolution Planning  
**Data:** 2026-07-20  
**Princípio:** PLAN BEFORE BUILD  
**Baseline:** ENT-001

---

## Ponto de inflexão

A sequência disciplinada **OPM → CPL → FIN-AUD → REG → ENT** estabilizou a plataforma. O risco deixa de ser arquitectural e passa a ser de **priorização de negócio**.

A partir daqui:
- **Não** abrir novos programas horizontais
- **Sim** planear evolução por domínio com evidências
- **Não** iniciar FIN-001 imediatamente

---

## O que ARCH-PLAN-001 produz

Transforma a Baseline Oficial (ENT-001) num **roadmap corporativo** com:

1. Análise comparativa de 20 domínios
2. Mapa de dependências (técnica, funcional, cognitiva, operacional)
3. Análise de reaproveitamento
4. Gap analysis consolidada
5. **Estratégia de evolução por domínio** (não só prioridades)
6. Roadmap ordenado com riscos e pré-requisitos

---

## Resposta executiva

### Qual domínio primeiro?
**Finance** — rank 1 do roadmap.

### Como evoluir Finance?
**`integrate_then_develop`** — não greenfield.

Reutilizar: custos industriais, leakage (REG-002), Nexus billing, contextual modules, VIEW_FINANCIAL.  
Desenvolver depois: finance_native ERP scoped (AP/AR, tesouraria).

### O que NÃO fazer
- FIN-001 directo como domínio greenfield
- Recriar financialLeakageDetectorService ou industrialCostService
- Reabrir OPM, CPL, REG ou ENT

---

## Estratégias por domínio

| Estratégia | Domínios |
|------------|----------|
| maintenance_only | 9 (WMS, Q/S/E, CC, Nexus, …) |
| integrate_then_develop | finance, executive, compliance |
| recover_then_expand | supply, ppap, msa, ishikawa, purchasing |
| greenfield | production, maintenance, hr |

---

## Roadmap resumido

```
1. Finance (integrate_then_develop)
2. Supply (recover)
3. PPAP → MSA → Ishikawa (recover chain)
4. Purchasing (recover)
5. Executive (integrate)
6. Production → Maintenance → HR (greenfield)
```

---

## Validação

```bash
cd frontend && npm run test:arch-plan001
```

Esperado: `validateArchPlan001Integrity().valid === true` e ENT-001 baseline válida.

---

## Próximo passo organizacional

**Reunião de arquitectura** para:
1. Validar ranks 1-3 do roadmap
2. Aprovar escopo **FIN-EVOLVE-001** (fase A integração)
3. Confirmar que programas horizontais permanecem congelados

---

## Artefactos

| Camada | Path |
|--------|------|
| Planning API | `frontend/src/platform/planning/` |
| Documentação | `frontend/docs/roadmap/ARCH-PLAN-001-*.md` |
| Baseline fonte | `frontend/src/platform/knowledge/` (ENT-001 — intocável) |
