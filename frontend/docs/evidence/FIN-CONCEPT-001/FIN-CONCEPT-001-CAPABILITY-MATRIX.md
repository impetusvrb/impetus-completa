# FIN-CONCEPT-001 — Capability Matrix

Resposta canónica por ideia: **Existe? Parcial? Reutiliza? Novo módulo?**

| Ideia | Existe? | Parcial? | Reutiliza? | Novo módulo? | Prioridade | Estratégia | Classe roadmap |
|-------|---------|----------|------------|--------------|------------|------------|----------------|
| Smart Costing (Custo Unitário Dinâmico) | Não | **Sim** | **Sim** | Não | P1 | integrate_then_develop | Expansão incremental |
| Manutenção Preditiva Financeira | Não | **Sim** | **Sim** | Não | P1 | integrate_then_develop | Expansão incremental |
| Planejamento de Cenários (What-if) | Não | **Sim** | **Sim** | Não | P1 | integrate_then_develop | Expansão incremental |
| Otimização Financeira de Estoque | Não | **Sim** | **Sim** | Não | P2 | integrate_then_develop | Expansão incremental |
| Dashboards por papel | Não | **Sim** | **Sim** | Não | **P0** | integrate_then_develop | **Reutilização imediata** |
| Análise em linguagem natural | Não | **Sim** | **Sim** | Não | P2 | integrate_then_develop | Expansão incremental |
| Alertas financeiros inteligentes | Não | **Sim** | **Sim** | Não | **P0** | integrate_then_develop | **Reutilização imediata** |
| Indicadores financeiros executivos | Não | **Sim** | **Sim** | Não | **P0** | integrate_then_develop | **Reutilização imediata** |
| Gestão de investimentos (CAPEX/OPEX) | Não | Não | Parcial (vestigial) | **Sim** | P3 | greenfield | **Novo módulo** |
| Performance económica | Não | **Sim** | **Sim** | Não | P1 | integrate_then_develop | Expansão incremental |
| Consolidação gerencial | Não | Não | Mínimo | **Sim** | P3 | greenfield | **Novo módulo** |
| **Financial Digital Twin** | Não | **Sim** | **Sim** | Não | **P1** | integrate_then_develop | Expansão incremental |

## Leitura rápida

- **0** capacidades propostas existem “completas” como produto Finance dedicado.
- **10/12** são **parciais** com reutilização forte.
- **2/12** são verdadeiros **novos módulos** (adiar).
- Nenhuma ideia P0/P1 justifica greenfield imediato.

## Nota sobre FIN-AUD-001

Documentos FIN-AUD ainda referem gap de rotas `/financial-leakage/*`. Esse gap foi recuperado em **REG-002 R1** e integrado em **FIN-EVOLVE-001**. Tratar leakage como **disponível para reutilização**.
