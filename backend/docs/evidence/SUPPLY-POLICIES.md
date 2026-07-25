# SUPPLY — Domain Policies

**Programa:** GF-023  
**Ficheiro:** `policies/supplyDomainPolicies.js`  
**Natureza:** Determinísticas · pure functions

---

| Política | Função |
|----------|--------|
| **approvalPolicy** | Escalonamento aprovadores por valor |
| **quotationSelectionPolicy** | Menor custo · desempate score |
| **supplierEligibilityPolicy** | Score mínimo · status bloqueado |
| **budgetCompliancePolicy** | Verificação orçamento disponível |
| **contractRenewalPolicy** | Expiração · aviso renovação |

---

## Exemplos

- Amount ≤ 10k → 1 aprovador  
- Amount > 50k → 3 aprovadores (buyer_supervisor, procurement_manager, finance_controller)  
- Quotation: lowest `totalAmount.amount` wins  

---

*Testes:* `npm run test:supply-core-domain`
