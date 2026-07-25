# FIN-CONCEPT-001 — Evolutionary Roadmap (draft for FIN-PLAN-001)

Classificação das capacidades avaliadas. **Não é aprovação de implementação** — input para FIN-PLAN-001 (Capability Release Planning).

---

## 1. Reutilização imediata

*Já existem; apenas integrar / curar no domínio Finance.*

| ID | Capacidade | Notas |
|----|------------|-------|
| `role_based_dashboards` | Dashboards por papel | Profiles + CC + hub 001A |
| `smart_financial_alerts` | Alertas financeiros inteligentes | Leakage + forecasting alerts |
| `executive_financial_kpis` | Indicadores financeiros executivos | Costs + economics + charts |

**Pré-requisito sugerido:** FIN-STAB-001 (estabilizar identidade/navegação/redirects em produção).

---

## 2. Expansão incremental

*Evolução de componentes existentes — sem módulo paralelo.*

| ID | Capacidade | Âncora de reuso |
|----|------------|-----------------|
| `financial_digital_twin` | Financial Digital Twin | Twin + costs + leakage + forecast + CPL |
| `smart_costing` | Smart Costing | industrialCost* |
| `predictive_maintenance_financial` | Manutenção Preditiva Financeira | ManuIA/Twin + cost impact |
| `scenario_planning_whatif` | What-if | CPL Scenario + OPM-008 + forecasting |
| `economic_performance` | Performance económica | economic* engines |
| `inventory_financial_optimization` | Optimização financeira de estoque | WMS inventory adapters |
| `natural_language_analysis` | Análise NL | chat / smartPanel + contracts |

**Ordem conceptual sugerida (não binding):**

1. Financial Digital Twin (backbone)  
2. What-if financeiro (overlay)  
3. Smart Costing + PdM financeira (drivers)  
4. Performance económica (score)  
5. Inventário $ / NL (secundários)

---

## 3. Novos módulos

*Somente quando não há equivalente — adiar.*

| ID | Capacidade | Motivo do adiamento |
|----|------------|---------------------|
| `capex_opex_investment` | CAPEX/OPEX | Ausente; risco ERP; Fase C ARCH-PLAN |
| `managerial_consolidation` | Consolidação gerencial | Ausente; ERP-class |

---

## Sequência de programas

```
FIN-EVOLVE-001A ✓
      → FIN-STAB-001
      → FIN-CONCEPT-001 ✓ (esta auditoria)
      → FIN-PLAN-001 (capability releases 2.0–2.3)
      → FIN-EVOLVE-002 (inicia pelo Release 2.0; classe 3 só via backlog gate)
```

## Gate para FIN-EVOLVE-002

Abrir EVOLVE-002 **apenas se**:

1. FIN-STAB-001 validado em produção  
2. FIN-PLAN-001 definiu o pacote de release (começar por 2.0)  
3. Nenhum item classe 3 sem justificação de gap real  
4. Financial Digital Twin permanece no Release 2.2 (não greenfield paralelo)
