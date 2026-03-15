# Plano de Ação - Correção de Bugs e Rotas

**Data:** 07/03/2025  
**Objetivo:** Corrigir erros, bugs e ativar todas as rotas/ícones que levam a mensagens de erro.

## Problemas Identificados

### 1. Labels incorretos (Logs de Auditoria)
- **Admin menu:** Tinha apenas "Logs de Áudio" (`/app/admin/audio-logs`). Faltava "Logs de Auditoria" (`/app/admin/audit-logs`) para compliance. "Logs de Áudio" é funcionalidade distinta (em desenvolvimento).
- **Correção:** Adicionar "Logs de Auditoria" ao menu admin. Mantido também "Logs de Áudio".

### 2. Rotas inexistentes no App.jsx
As seguintes rotas estavam no Layout/sidebar mas **sem rota em App.jsx** (404 ao clicar):
| Rota | Componente | Perfis |
|------|------------|--------|
| `/app/admin/warehouse` | AdminWarehouse | admin, diretor, gerente, coordenador |
| `/app/admin/logistics` | AdminLogistics | admin, diretor, gerente, coordenador |
| `/app/almoxarifado-inteligente` | AlmoxarifadoInteligente | admin, diretor, gerente, coordenador, supervisor |
| `/app/logistica-inteligente` | LogisticaInteligente | admin, diretor, gerente, coordenador, supervisor |

### 3. CEORouteGuard bloqueando rotas do menu CEO
- CEO menu exibe: Centro de Previsão, Centro de Custos, Mapa de Vazamento, Configurações.
- CEORouteGuard permitia apenas: `/app`, `/app/chatbot`, `/app/registro-inteligente`.
- **Resultado:** CEO ao clicar nesses itens era redirecionado para `/app`.
- **Correção:** Incluir rotas do menu CEO na lista permitida do CEORouteGuard.

### 4. API clients faltando no frontend
- `adminWarehouse`, `adminLogistics`, `warehouseIntelligence`, `logisticsIntelligence` não estavam definidos em `api.js`.
- **Correção:** Adicionados todos os clientes em `frontend/src/services/api.js`.

### 5. Rotas já corrigidas em sessão anterior
- `/app/centro-previsao-operacional`
- `/app/centro-custos-industriais`
- `/app/mapa-vazamento-financeiro`

## Implementação realizada

1. ✅ Rotas warehouse, logistics, almoxarifado, logistica adicionadas no App.jsx
2. ✅ "Logs de Auditoria" adicionado ao menu admin no Layout.jsx
3. ✅ CEORouteGuard ajustado para permitir rotas do menu CEO
4. ✅ API clients adminWarehouse, adminLogistics, warehouseIntelligence, logisticsIntelligence em api.js
5. ✅ Design atual mantido (sem alterações visuais)
