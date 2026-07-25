# ENT-AUD-002 — Domain Maturity

O estágio formal e a realidade operacional são separados para evitar que `LOCKED` seja interpretado como `RUNNING`.

| Domínio | Estágio formal | Realidade operacional | Próximo gate |
|---|---|---|---|
| Finance | Business Evolution | Completo e certificado; energia diferida; cálculo preditivo no cliente | Business Case somente |
| WMS | Certified | Runtime transacional maduro; dual stack legacy | Retirement/volume real |
| Logistics | Certified | WMS implementado; Hub Wave 6 parcial | Remover fake data e completar views |
| Supply | Certified | Baseline v2.0; flags runtime/API off | Ativação business-scoped |
| Quality | Certified | Workspace amplo, condicionado por flags | Evidência operacional |
| Safety | Certified | Produto parcial e fallbacks sintéticos | Integridade de dados/homologação |
| Environment | Certified | Amplo, mas hardware/connectors não provados | Validação de infraestrutura |
| Maintenance | Certified | ManuIA e Twin ativos; guard/testes fracos | Validação operacional |
| Production | Planning | Runtime foundation existe; workspace não | Business Case/workspace |
| Prediction | Certified | Plataforma e consumidores; energia parcial | Coverage expansion |
| Cognitive/AIOI | Implementation | Foundation certificada; activation P17–P20 fechada | Piloto e governança real |
| Governance | Certified | DOMAIN-GOV e control planes ativos | Aplicação a novos Business Cases |
| Security | Certified | Certificado com ressalvas; Red Team/homologação pendentes | Evidência externa |
| Observability | Implementation | Instrumentação parcial; pipeline externo não comprovado | Sink/exporter/retention |
| RH | Planning | Runtime/capacidades dispersas, sem workspace formal | Business Case |
| Procurement | Planning | Sem domínio consolidado | Depende de Supply |
| Compliance | Planning | Capacidades em Q/S/E, sem workspace transversal | Reuse assessment |
| Projects | Discovery | Intenção futura apenas | Bloqueado por P0/P1 |

## Interpretação

- `Certified`: existe baseline/certificado formal.
- `Implementation`: há capacidade real, mas falta fechamento operacional.
- `Planning`: capability/runtime parcial não constitui domínio de produto certificado.
- `Business Evolution`: somente iniciativas justificadas por valor de negócio podem abrir evolução.

