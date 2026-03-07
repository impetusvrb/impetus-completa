# Proteção do Código - Ofuscação, Licenciamento e Segredos

## Resumo

Este documento descreve as medidas implementadas para proteger o software Impetus Comunica IA contra cópia e engenharia reversa.

---

## 1. Ofuscação

### Frontend

- **Build padrão:** `npm run build` – usa Terser (minificação, mangle de variáveis, remoção de comentários e `console`).
- **Build ofuscado:** `npm run build:obfuscated` – executa o build e aplica JavaScript Obfuscator nos arquivos gerados.
  - Ofuscação: `stringArray`, `controlFlowFlattening`, `identifierNamesGenerator: 'hexadecimal'`.

**Uso:**
```bash
cd frontend
npm run build:obfuscated
```
Os arquivos ofuscados ficam em `frontend/dist/`.

### Backend

- **Build ofuscado:** `npm run build:obfuscated` – ofusca todos os `.js` de `src/` e gera `dist/`.

**Uso:**
```bash
cd backend
npm run build:obfuscated
```

Para rodar o backend ofuscado:
```bash
node -r dotenv/config dist/index.js
```

---

## 2. Licenciamento

### Servidor central

A validação é feita contra uma API externa (`LICENSE_SERVER_URL`).

**Exemplo de API esperada:**
```
POST {LICENSE_SERVER_URL}
Body: { "license_key": "xxx" }
Headers: X-API-Key: {LICENSE_API_KEY}

Resposta esperada:
{ "valid": true, "company_id": "uuid", "expires_at": "2026-12-31", "plan": "essencial", "features": [] }
```

### Variáveis de ambiente

| Variável | Descrição |
|----------|-----------|
| `LICENSE_SERVER_URL` | URL da API de validação |
| `LICENSE_API_KEY` | Chave de autenticação da API |
| `LICENSE_KEY` | Chave de licença da instalação |
| `LICENSE_VALIDATION_ENABLED` | `true` em produção, `false` em desenvolvimento |

### Comportamento

- Com `LICENSE_VALIDATION_ENABLED=false`: validação desativada (uso em desenvolvimento).
- Com `LICENSE_VALIDATION_ENABLED=true` e licença inválida: todas as chamadas `/api/*` retornam 403.
- Cache de validação: 1 hora no serviço, 5 minutos no middleware.

### Página de licença expirada

Em caso de licença inválida ou expirada, o frontend redireciona para `/license-expired`.

---

## 3. Variáveis de ambiente e .gitignore

### Arquivo .env

- **Não versionado** – `.env` está no `.gitignore`.
- **Modelo:** `.env.example` – copiar para `.env` e preencher os valores reais.

### Itens incluídos no .gitignore

- `.env`, `.env.local`, `.env.*.local`
- `node_modules/`
- `dist/`, `build/`
- `uploads/`
- Logs e arquivos temporários
- Arquivos de IDE (`.idea/`, `.vscode/`)

### Credenciais em .env.example

O `.env.example` contém placeholders para:

- Banco de dados (`DB_*`, `DATABASE_URL`)
- OpenAI (`OPENAI_API_KEY`)
- Z-API (`ZAPI_*`)
- Licença (`LICENSE_*`)
- Salt e JWT
- SMTP, Sentry, Redis, etc.

---

## Resumo de implementação

| Item | Arquivos |
|------|----------|
| Ofuscação frontend | `vite.config.js`, `frontend/scripts/obfuscate-build.js`, `frontend/package.json` |
| Ofuscação backend | `backend/scripts/obfuscate.js`, `backend/package.json` |
| Licença | `backend/src/services/license.js`, `backend/src/middleware/license.js` |
| .gitignore | `.gitignore` (raiz do projeto) |
| .env | `.env.example` atualizado |
