# OPM-000 — Roadmap Recommendation & Functional Backlog

**Modo:** READ ONLY · **Data:** 2026-07-19

---

## Princípio

Expansão via **OPM-00N** (produto operacional), **não** WMS-008 arquitectural. Preservar componentes certificados; evolução incremental aditiva.

---

## Backlog priorizado OPM

### OPM-001 — Warehouse Functional Expansion

| Campo | Valor |
|-------|-------|
| **Prioridade** | Alta (P0) |
| **Objectivo** | CRUD UI armazéns + localizações + capacidade |
| **Justificativa** | API completa; FE list-only (GAP-OPM-W01) |
| **Impacto** | Base para todos os fluxos WMS |
| **Dependências** | Nenhuma arquitectural |
| **Risco** | Baixo — aditivo sobre APIs certificadas |
| **Estimativa** | Médio (1 sprint produto) |
| **Critérios aceite** | Criar/editar armazém na UI; listar localizações; RBAC preserved; sem alterar OCL |

---

### OPM-002 — Inventory Intelligence

| Prioridade | Alta (P0) |
| Objectivo | UI saldos, movimentos, detalhe item; preparar rotativo |
| Justificativa | GAP-OPM-W07 parcial; API movements/balances unused in FE |
| Impacto | Operador de inventário autónomo |
| Dependências | OPM-001 recomendado |
| Risco | Médio — complexidade UX |
| Estimativa | Médio-alto |
| Critérios aceite | Tabs saldo/movimento; create movement UI; estados industriais |

---

### OPM-003 — Receiving Operations

| Prioridade | Alta (P0) |
| Objectivo | UI create receiving + PATCH status + detalhe documento |
| Justificativa | Workflow API certificado WMS-005; zero UI transaccional |
| Impacto | Fecha cenário procurement_receiving na UI |
| Dependências | OPM-001 |
| Risco | Baixo |
| Estimativa | Médio |
| Critérios aceite | Receber mercadoria end-to-end na UI; integração Supply read-only preserved |

---

### OPM-004 — Picking Intelligence

| Prioridade | Alta (P0) |
| Objectivo | UI create/execute/complete picking |
| Justificativa | AUD-001 picking era NOT_IMPLEMENTED; API agora ✅ |
| Impacto | Operação armazém crítica |
| Dependências | OPM-002 |
| Risco | Médio |
| Estimativa | Médio-alto |
| Critérios aceite | Fluxo pick completo UI; sem mock |

---

### OPM-005 — Shipping Control

| Prioridade | Alta (P0) |
| Objectivo | UI create shipping + dispatch |
| Justificativa | GAP-OPM-W04 |
| Impacto | Expedição operacional |
| Dependências | OPM-003 |
| Risco | Baixo-médio |
| Estimativa | Médio |
| Critérios aceite | Dispatch visível; estados operacionais |

---

### OPM-006 — Transfer Management

| Prioridade | Alta (P1) |
| Objectivo | UI create/complete transfer inter-armazém |
| Justificativa | API certificada; FE list-only |
| Impacto | Movimentação stock |
| Dependências | OPM-001, OPM-002 |
| Risco | Baixo |
| Estimativa | Médio |
| Critérios aceite | Transfer A→B UI completo |

---

### OPM-007 — Cognitive Logistics (Product Layer)

| Prioridade | Média (P1) |
| Objectivo | Pontes UX ops ↔ logistics_native (insights em módulos, não só CC) |
| Justificativa | Industry 4.0 gap; CC homologado separado |
| Impacto | Diferenciação Industrial 4.0 |
| Dependências | OPM-001…006 parcial |
| Risco | Alto — não alterar logistics_native LOCKED |
| Estimativa | Alto |
| Critérios aceite | Widgets IA read-only nos módulos; CC unchanged |

---

### OPM-008 — Supply Functional Expansion

| Prioridade | Alta (P0) |
| Objectivo | Substituir workspace shell por módulos FE (suppliers, PR, PO, approvals) |
| Justificativa | GAP-OPM-S01…S04; GF-027 arch ✅ UI 18% |
| Impacto | Produto Supply utilizável |
| Dependências | Nenhuma WMS |
| Risco | Médio |
| Estimativa | Alto (multi-entidade) |
| Critérios aceite | CRUD UI por entidade REST v1; pilot layer preserved |

---

### OPM-009 — Cross-Domain Operations UI (opcional pós-008)

| Prioridade | Média (P2) |
| Objectivo | UI visível fluxo PR→PO→Receiving (INC-048) |
| Dependências | OPM-003, OPM-008 |
| Risco | Médio |

---

### OPM-010 — Finance Readiness Gate (pré-domínio Finance)

| Prioridade | Média (P2) |
| Objectivo | Auditoria OPM Finance quando WMS/Supply ≥ 60% produto |
| Dependências | OPM-001…008 substancial |

---

## Sequência recomendada

```
OPM-000 ✅ (esta auditoria)
    ↓
OPS-003 (verificação navegação produção — READ ONLY recomendado)
    ↓
OPM-001 → OPM-003 → OPM-004 → OPM-005 → OPM-006
    ∥
OPM-002 (inventory parallel after OPM-001)
    ↓
OPM-008 (Supply FE — frente paralela)
    ↓
OPM-007 (cognitive product layer)
    ↓
Finance domain (após OPM-010 gate)
```

**Não recomendado agora:** WMS-008 arquitectural · refactor certificados · Finance antes de OPM backlog P0.

---

## Estimativa agregada (ordem de grandeza)

| Fase | Escopo | Esforço relativo |
|------|--------|:----------------:|
| OPM-001…006 | WMS produto core | 6–8 ciclos |
| OPM-008 | Supply produto | 4–6 ciclos |
| OPM-007 | IA product layer | 2–3 ciclos |

---

*Backlog gerado por auditoria — implementação requer prompts OPM-00N dedicados.*
