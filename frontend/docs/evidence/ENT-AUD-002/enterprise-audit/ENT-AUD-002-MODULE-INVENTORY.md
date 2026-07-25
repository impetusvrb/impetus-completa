# ENT-AUD-002 — Module Inventory

O router principal contém 99 declarações `<Route>` e 89 paths explícitos. A tabela consolida módulos por experiência; query views são agrupadas.

| Módulo | Rota | Guard/publicação | Backend | Observabilidade/teste | Maturidade |
|---|---|---|---|---|---|
| Centro de Comando | `/app` | Private + Setup + módulos/perfil | Dashboard/charts/AIOI | Boot/REG/AIOI | implemented |
| Dashboard vivo | `/app/dashboard-vivo` | Metadata CEO | Redirect para `/app` | REG | alias |
| Cérebro operacional | `/app/cerebro-operacional` | Industrial core | Operational brain | Console/REG | implemented |
| Mapa industrial | `/app/centro-operacoes-industrial` | Industrial core | Industrial points | Polling/REG | implemented |
| Insights | `/app/insights` | Industrial core | Dashboard insights | REG | partial: fallback fictício |
| Centro de Previsão | `/app/centro-previsao-operacional` | CEO guard | Forecasting | Console | implemented |
| AIOI Executive | `/executive-portal` e aliases | Executive guard | `/aioi/*` | Suites AIOI | implemented |
| Finance Hub | `/app/finance` | Perfil/capability | Costs/leakage/wallet/twin | 18 suites | implemented |
| Finance Costs | `/app/finance/costs` | Finance | Costs | Finance events | implemented |
| Finance Leakage | `/app/finance/leakage` | Finance | Leakage | Finance events | implemented |
| Finance Billing | `/app/finance/billing` | Billing gate | Nexus wallet | Audit | implemented |
| Finance Twin | `/app/finance/twin` | Compose-only | Costs/twin/prediction | FIN 2.2 | implemented |
| Finance What-if | `/app/finance/whatif` | Finance | Engines certificados | FIN 2.3 | implemented |
| Finance Prediction | `/app/finance/prediction` | Finance | Platform prediction | FIN 2.4 | implemented |
| Logistics Hub | `/app/logistics/operational` | Publication/audience | Overview | 22 WMS/OPM | partial |
| Logistics dock/telemetry/governance | Query views | Flags | Ausente/parcial | Indireto | partial/missing |
| WMS Warehouses | `/app/logistics/warehouses` | `warehouse.read` | WMS v1 | OPM | implemented |
| WMS Inventory | `/app/logistics/inventory` | `inventory.read` | WMS v1 | OPM | implemented |
| WMS Receiving | `/app/logistics/receiving` | execute | WMS v1 | OPM | implemented |
| WMS Picking | `/app/logistics/picking` | execute | WMS v1 | OPM | implemented |
| WMS Shipping | `/app/logistics/shipping` | execute | WMS v1 | OPM | implemented |
| WMS Transfers | `/app/logistics/transfers` | execute | WMS v1 | OPM | implemented |
| WMS Intelligence/Cognitive | Duas rotas | warehouse read | WMS read/advisory | OPM-007/008 | implemented |
| WMS legacy | `/app/logistics-operational/workspace/*` | Compatibilidade | WMS | Compatibilidade | deprecated |
| Quality workspace | `/app/quality/operational` | Team + flags | Q operational | 13 suites | implemented/flagged |
| Quality governance/telemetry/cognitive | Query views | Governance/executive | Q services | Suites Q | implemented/flagged |
| Safety workspace | `/app/safety/operational` | Team + flags | Safety services | 2 suites | partial |
| Safety telemetry/cognitive | Query views | Flags | Health/cognitive | Limitada | partial: sintético |
| Environment workspace | `/app/environment/operational` | Audience/flags | Environment | 9 suites | implemented/flagged |
| Environment governance/cognitive | Query views | Governance/executive | Environment | Validation packs | implemented/flagged |
| ManuIA | `/app/manutencao/manuia` | Menu por perfil; rota genérica | Maintenance IA | Sem suite nomeada | implemented |
| ManuIA Field | `/app/manutencao/manuia-app` | Perfil técnico | Maintenance app | Sem suite | implemented |
| Diagnóstico/OS | `/diagnostic` | Colaborador guard | Diagnostic | Sem suite | implemented |
| Production | metadata `/app/production/operational` | Inactive/planned | Runtime existe | Sem suite | planned |
| Supply workspace | `/app/supply/workspace` | Metadata off | Supply flags | Testes backend | partial/planned |
| Audit logs | `/app/admin/audit-logs` | Strict admin | Logs/audit | Backend audit | implemented |
| AI incidents | `/app/admin/ai-incidents` | Strict admin | Incidents | UI própria | implemented |
| Cognitive governance | `/app/admin/cognitive-governance` | Strict admin | Learning/flags | Local | implemented/flagged |
| HITL approvals | `/app/admin/action-approvals` | Strict admin | Action runtime | Trace/rollback | implemented |
| Rollout/certification/consolidation | Três rotas admin | Strict admin | Audit services | Snapshots | implemented |
| Structural/org validation | Duas rotas | Admin/liderança | Structural/roles | Guard logs | implemented |
| Admin Portal standalone | App separada | Auth própria | Admin backend | Sem suite registrada | partial |
| Lipsync runtime | Sem módulo frontend canônico | N/A | Express/Socket.IO | Sem testes | partial |

## Findings de navegação e guard

- `SettingsAccessGuard` permite sempre.
- O parent Finance não aplica explicitamente `canAccessFinanceDomain`.
- ManuIA depende mais do menu/backend do que de guard de rota dedicado.
- `/app/finance/twin` gera `tab=digital-twin`, mas ManuIA não consome esse tab.
- Logistics `dock` é publicado sem branch dedicada.
- Environment `view=rollout` resolve para um branch diferente do manifesto.
- Supply está montado apesar de metadata `published:false`.

