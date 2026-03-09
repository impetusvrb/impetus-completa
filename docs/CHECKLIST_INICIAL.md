# Checklist para rodar o IMPETUS sem falhas

## Pré-requisitos obrigatórios

| Item | Status | Comando/Ação |
|------|--------|--------------|
| **Node.js** (v18+) | ⬜ | `node -v` |
| **npm install** | ⬜ | `cd backend && npm install` |
| **PostgreSQL** rodando | ⬜ | Serviço ativo |
| **Arquivo .env** | ⬜ | Copiar de `.env.example` e preencher |
| **Banco criado** | ⬜ | `createdb impetus_db` (ou nome em DB_NAME) |
| **Schema base** | ⬜ | `psql -f backend/src/models/complete_schema.sql` |
| **Migration TPM** | ⬜ | `npm run tpm-migrate` |

---

## Variáveis .env mínimas

```env
# Banco (obrigatório)
DB_HOST=localhost
DB_PORT=5432
DB_NAME=impetus_db
DB_USER=postgres
DB_PASSWORD=sua_senha

# Licença (desabilitar em dev)
LICENSE_VALIDATION_ENABLED=false

# OpenAI (opcional - IA usa fallback sem chave)
OPENAI_API_KEY=sk-...
```

---

## O que funciona sem configurar

- **Webhook genérico** – salva em `messages`, classifica, cria tarefas
- **Webhook Z-API** – requer `zapi_configurations` preenchido e `instanceId` no payload
- **Licença** – com `LICENSE_VALIDATION_ENABLED=false`, todas as rotas passam
- **IA** – sem `OPENAI_API_KEY`, usa classificação por palavras-chave e respostas fallback
- **OCR** – sem `OCR_ENABLED=true` e ImageMagick, só usa pdf-parse
- **TPM** – sem migration, o fluxo TPM falha graciosamente (mensagem segue para IA)

---

## Pontos de falha comuns

| Situação | Sintoma | Solução |
|----------|---------|---------|
| npm install não executado | `Cannot find module 'express'` | Rodar `npm install` no backend |
| Banco não conecta | Erro ao acessar qualquer rota | Verificar DB_HOST, senha, serviço Postgres |
| Schema não aplicado | `relation "communications" does not exist` | Executar `complete_schema.sql` |
| TPM sem migration | `relation "tpm_incidents" does not exist` ao preencher form | Rodar `npm run tpm-migrate` |
| Z-API sem config | Webhook retorna "Instance not configured" | Inserir em `zapi_configurations` |
| Licença ativa sem chave | 403 em rotas (exceto webhook) | `LICENSE_VALIDATION_ENABLED=false` ou configurar LICENSE_KEY |

---

## Teste rápido de subida

```powershell
cd backend
npm install
# Configurar .env com DB_* corretos
node -r dotenv/config src/index.js
```

Se aparecer `Backend listening on 4000`, o servidor subiu. Teste:

```
GET http://localhost:4000/health
GET http://localhost:4000/
```

Se retornarem JSON, o básico está OK. Rotas em `/api/*` exigem schema aplicado.
