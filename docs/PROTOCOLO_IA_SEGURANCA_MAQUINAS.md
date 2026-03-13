# Protocolo IA de Controle e Segurança de Máquinas (IMPETUS)

## Prioridade

1. **Segurança humana**
2. Integridade do equipamento  
3. Continuidade operacional  
4. Automação  

---

## Função da IA

- Monitorar equipamentos
- Detectar falhas e anomalias
- Acionar equipamentos automaticamente quando necessário (queda de pressão, compressor offline, etc.)
- Bloquear automação imediatamente quando houver intervenção humana

---

## Fluxo de Intervenção

1. **Técnico registra intervenção** → Automação bloqueada naquele equipamento  
2. **Sistema exibe procedimentos de segurança** → LOTOTO, desligar chave, sinalizar  
3. **Técnico conclui manutenção e libera** → Automação volta a operar  

---

## Componentes Implementados

| Componente | Descrição |
|------------|-----------|
| `machine_safety_intervention_migration.sql` | Tabelas `machine_human_interventions` e `machine_automation_block_log` |
| `machineSafetyService.js` | Registro, liberação, verificação de bloqueio, instruções de segurança |
| `machineControlService.js` | Verifica intervenção antes de executar qualquer comando |
| `automationTriggerService.js` | IA aciona compressor/equipamento em eventos (pressão baixa, etc.) |
| `IndustrialOperationsCenter.jsx` | Aba Intervenção, aviso de segurança, formulário de registro e liberação |

---

## Rotas API

- `POST /dashboard/industrial/intervention` — Registrar intervenção  
- `POST /dashboard/industrial/intervention/:id/confirm-safety` — Confirmar passos de segurança  
- `POST /dashboard/industrial/release` — Liberar equipamento  
- `GET /dashboard/industrial/interventions` — Listar ativas e histórico  
- `GET /dashboard/industrial/safety-instructions` — Instruções de segurança  

---

## Automação Permitida

- Apenas equipamentos auxiliares: compressor, bomba, ventilação, refrigeração  
- Nunca: prensa, torno, fresadora, guilhotina, dobradeira  
- Modo deve estar em `automatic`  
- Sem intervenção humana ativa no equipamento alvo  
