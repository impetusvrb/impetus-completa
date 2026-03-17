# Arquivo – Versões anteriores às correções (15/03/2026)

Cópias preservadas antes das correções aplicadas em módulos e middlewares.

## Conteúdo

### impetus_complete/routes/
- `chat.js` – versão sem `router.use(requireAuth)`
- `tpm.js` – versão sem `router.use(requireAuth)`
- `tasks.js` – versão sem `router.use(requireAuth)`
- `diagnostic.js` – versão sem `router.use(requireAuth)`

### impetus_complete/middleware/
- `roleVerification.js` – versão com `/proacao` e `/plc-alerts` em STRATEGIC_PATHS

### backend_root/
- `auth.js` – cópia de segurança do middleware de autenticação

### backend_root/middleware/
- `roleVerification.js` – versão com `/plc-alerts` em STRATEGIC_PATHS

## Restaurar versão original

Para restaurar um arquivo a partir deste arquivo:

```bash
# Exemplo: restaurar chat.js
cp arquivo_pre_correcoes_20260315/impetus_complete/routes/chat.js ../../impetus_complete/backend/src/routes/
```
