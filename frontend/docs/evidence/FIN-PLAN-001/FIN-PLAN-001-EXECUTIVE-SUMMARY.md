# FIN-PLAN-001 — Executive Summary

**Programa:** FIN-PLAN-001 — Finance Capability Release Planning  
**Princípio:** DELIVER CAPABILITIES, NOT MODULES  
**Data:** 2026-07-20  
**Modo:** READ ONLY — zero implementação de produto

## Mudança conceptual

Não é um novo roadmap arquitectural (isso é **ARCH-PLAN-001**).  
É o **plano de entregas incrementais** do domínio Finance a partir do FIN-CONCEPT-001.

```
Capability → Business Value → Reuse Platform → Capability Release → Validation → Next
```

## Sequência de programas

```
FIN-EVOLVE-001A → FIN-STAB-001 → FIN-CONCEPT-001 → FIN-PLAN-001 → FIN-EVOLVE-002
```

(`FIN-ROADMAP-001` foi renomeado/substituído por **FIN-PLAN-001**.)

## Plano oficial de releases

| Release | Foco | Capacidades |
|---------|------|-------------|
| **2.0** | Visão executiva CFO | Dashboards · KPIs · Alertas |
| **2.1** | Inteligência económica | Smart Costing · Performance económica |
| **2.2** | Twin financeiro + cenários | Financial Digital Twin · What-if |
| **2.3** | Operação ↔ Finanças | Inventário $ · PdM $ · NL |
| **Backlog** | Greenfield adiado | CAPEX/OPEX · Consolidação |

## Critérios de aceite

| Critério | Estado |
|----------|--------|
| Plano oficial de releases | ✓ |
| Capability packages por valor | ✓ |
| Matriz de decisões de negócio | ✓ |
| Matriz de dependências | ✓ |
| Backlog estratégico separado | ✓ |
| Readiness por release | ✓ |
| Zero funcionalidade implementada | ✓ |

## Artefactos

**Docs:** `frontend/docs/evidence/FIN-PLAN-001/`  
**API read-only:** `frontend/src/platform/planning/finance-release/`

```bash
cd frontend && npm run test:fin-plan-001
```

## Resultado

O desenvolvimento pode seguir **release a release** com escopo claro, baixo risco e preservação da Baseline PLATFORM-2026.1 — sem revisitar decisões arquitecturais do ARCH-PLAN-001.
