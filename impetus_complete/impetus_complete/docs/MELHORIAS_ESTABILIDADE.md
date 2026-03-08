# Melhorias de Estabilidade - Impetus Comunica IA

**Data:** 2025-02-20  
**Objetivo:** Tornar o software referência em execução sem travamentos

---

## Implementações Concluídas

### 1. Error Boundary (React)
**Arquivo:** `frontend/src/components/ErrorBoundary.jsx`  
**O que faz:** Captura erros em componentes filhos e exibe tela de fallback em vez de tela branca.  
**Uso:** Envolve toda a árvore de rotas em `App.jsx`.

### 2. Timeout e Retry no Axios
**Arquivo:** `frontend/src/services/api.js`  
**O que faz:**
- **Timeout:** 60 segundos por requisição (evita requisições penduradas).
- **Retry:** Até 2 tentativas para erros 502, 503, 504 e falhas de rede (ECONNABORTED, ERR_NETWORK, ETIMEDOUT).
- **Backoff:** 1s, 2s entre tentativas (máx. 5s).
- Nunca faz retry em 401 ou 403.

### 3. Validação UUID em Rotas com :id
**Arquivos:** Diversas rotas do backend  
**O que faz:** Valida `req.params.id` com `isValidUUID()` antes de queries.  
**Rotas atualizadas:**
- `admin/users` (PUT) — já havia GET e DELETE
- `admin/departments` (PUT, DELETE)
- `admin/logs` (GET audit/:id)
- `admin/settings` (DELETE pops/:id, manuals/:id)

### 4. Proteção setState Após Unmount
**Arquivos:**  
- `frontend/src/hooks/useCachedFetch.js`  
- `frontend/src/hooks/useDashboardVisibility.js`  

**O que faz:** Usa `isMountedRef` para evitar chamar `setState` quando o componente já foi desmontado (evita warnings e possíveis vazamentos).

### 5. Fallback no useNotification()
**Arquivo:** `frontend/src/context/NotificationContext.jsx`  
**O que faz:** Retorna objeto com funções no-op quando o hook é usado fora do `NotificationProvider`. Em desenvolvimento, exibe aviso no console.

### 6. LRU no Cache (useCachedFetch)
**Arquivo:** `frontend/src/hooks/useCachedFetch.js`  
**O que faz:** Limita o cache a 100 entradas. Quando o limite é excedido, remove as entradas mais antigas (LRU). Evita crescimento indefinido de memória.

### 7. Tratamento de JSON Malformado
**Arquivo:** `backend/src/utils/errors.js`  
**O que faz:** Retorna 400 com mensagem clara quando o body da requisição contém JSON inválido (erro do body-parser).

---

## Resumo

| Melhoria               | Impacto                                      |
|-----------------------|----------------------------------------------|
| Error Boundary        | Alto — evita tela branca total               |
| Timeout + Retry       | Alto — evita travamento em rede instável     |
| Validação UUID        | Médio — evita erros 500 em rotas com ID     |
| setState após unmount | Médio — evita warnings e comportamento estranho |
| Fallback Notification | Médio — evita crash se usado fora do provider |
| LRU Cache             | Baixo — evita vazamento de memória           |
| JSON malformado       | Baixo — retorna erro amigável                |
