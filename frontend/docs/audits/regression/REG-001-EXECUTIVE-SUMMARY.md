# REG-001 — Executive Summary

**Programa:** REG-001 — Enterprise Regression Audit & Functional Recovery  
**Data:** 2026-07-20  
**Tipo:** Auditoria de integridade funcional — **zero remediação nesta fase**

---

## Porquê agora (antes de Finance)

O FIN-AUD-001 revelou um padrão: **código preservado, ligação quebrada**.  
Os quatro casos observados (Vazamentos, Mapa Industrial, Insights, Cérebro) confirmam que o risco imediato não é desenvolver Finance — é **recuperar a plataforma**.

---

## Functional Recovery Matrix (resumo)

| Funcionalidade | UI | Rota | API client | Backend | Service | Status | Acção |
|----------------|----|------|------------|---------|---------|--------|-------|
| Mapa Vazamentos | ✅ | ✅ | ✅ | ❌ | ✅ | Regressão | Montar rotas |
| Mapa Industrial | ✅ | ✅ | ✅ | ❌ | ✅ | Regressão | Montar rotas |
| Operational Insights | ✅ | ✅ | ✅ | ✅ | ✅ | Parcial | Alinhar guard |
| Cérebro Operacional | ✅ | ✅ | ✅ | ✅ | ✅ | Parcial | Alinhar guard + deep-link |
| Centro Previsão | ✅ | ✅ | ✅ | ⚠️ | ✅ | Regressão | Completar mounts |
| KPI /app/industrial | — | ❌ | — | — | — | Órfão | Redirect path |

---

## Hipótese arquitectural

**Parcialmente confirmada.**  
Padrão dominante: `service_without_http_mount` + `menu_route_guard_divergence`.  
CPL/EOX não causam directamente os gaps HTTP; a janela pós-18/07 correlaciona com mudanças App/Layout.

---

## Inventário auditado

| Artefacto | Conteúdo |
|-----------|----------|
| Navigation audit | 8 entradas clicáveis |
| Route audit | React + backend mounts |
| Registry audit | EOX, contextual, CPL, guards, CenterWidget |
| Connectivity matrix | 5 cadeias UI→Data |
| Orphan API clients | 8 famílias |
| Recovery plan | 6 itens (R1–R6) |

---

## O que REG-001 **não** fez

- ❌ Remediação de rotas  
- ❌ Novos módulos / engines / dashboards  
- ❌ Alterações OPM / CPL / EOX  

---

## Próximo passo recomendado

Abrir **REG-001-RECOVERY** (fase de remediação) seguindo R1→R3 primeiro:

1. Montar financial-leakage  
2. Montar industrial  
3. Unificar guards  

Só depois retomar evolução Finance sobre plataforma consistente.

---

## Testes

```bash
npm run test:reg001
```

## Documentação

- [REG-001-NAVIGATION-AUDIT.md](./REG-001-NAVIGATION-AUDIT.md)
- [REG-001-ROUTE-AUDIT.md](./REG-001-ROUTE-AUDIT.md)
- [REG-001-REGISTRY-AUDIT.md](./REG-001-REGISTRY-AUDIT.md)
- [REG-001-CONNECTIVITY-MATRIX.md](./REG-001-CONNECTIVITY-MATRIX.md)
- [REG-001-ROOT-CAUSE.md](./REG-001-ROOT-CAUSE.md)
- [REG-001-RECOVERY-PLAN.md](./REG-001-RECOVERY-PLAN.md)
