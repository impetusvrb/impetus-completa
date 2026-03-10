# Ativação Comercial Controlada

Fluxo B2B: **Venda → Ativação → Setup Empresa → Operação**

---

## 1. Executar Migrations + Seed

```bash
cd backend
npm run setup:ativacao
```

O script executa automaticamente `npm install` se as dependências não estiverem instaladas, seguido de migrations e seed.

Ou em passos manuais: `npm install`, `npm run migrate`, `npm run seed`.

Cria o usuário **internal_admin**:

| Campo   | Valor padrão             |
|---------|---------------------------|
| Email   | `comercial@impetus.local` |
| Senha   | `Impetus@Comercial2025!`   |
| Nome    | Equipe Comercial          |

Variáveis de ambiente (opcionais):

- `SEED_INTERNAL_EMAIL` – email do internal_admin
- `SEED_INTERNAL_PASSWORD` – senha
- `SEED_INTERNAL_NAME` – nome

---

## 3. Configurar SMTP (opcional)

Para envio automático de credenciais por email ao ativar clientes, configure no `.env`:

```env
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASSWORD=sua_senha_app
SMTP_FROM=noreply@impetus.com.br
```

**Sem SMTP:** as credenciais são exibidas na resposta da API e logadas no console para envio manual.

---

## 4. Ativar Cliente via API

> **Windows (PowerShell):** use aspas duplas e escape interno com `\"` ou use variáveis.

### Login como internal_admin

```bash
# Linux/Mac
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"comercial@impetus.local","password":"Impetus@Comercial2025!"}'

# Windows PowerShell
Invoke-RestMethod -Uri "http://localhost:4000/api/auth/login" -Method POST -ContentType "application/json" -Body '{"email":"comercial@impetus.local","password":"Impetus@Comercial2025!"}'
```

Copie o campo `token` da resposta.

### Ativar cliente

```bash
# Linux/Mac (substitua SEU_TOKEN_AQUI)
curl -X POST http://localhost:4000/api/internal/sales/activate-client \
  -H "Authorization: Bearer SEU_TOKEN_AQUI" \
  -H "Content-Type: application/json" \
  -d '{"company_name":"Indústria ABC Ltda","cnpj":"12345678000199","contact_name":"João Silva","contact_email":"joao@industriaabc.com.br","plan_type":"essencial"}'

# Windows PowerShell
$token = "SEU_TOKEN_AQUI"
$body = '{"company_name":"Indústria ABC Ltda","cnpj":"12345678000199","contact_name":"João Silva","contact_email":"joao@industriaabc.com.br","plan_type":"essencial"}'
Invoke-RestMethod -Uri "http://localhost:4000/api/internal/sales/activate-client" -Method POST -Headers @{Authorization="Bearer $token"} -ContentType "application/json" -Body $body
```

**Planos:** `essencial` | `profissional` | `estratégico` | `enterprise`

### Resposta esperada

```json
{
  "ok": true,
  "user": {
    "id": "uuid",
    "email": "joao@industriaabc.com.br",
    "name": "João Silva",
    "is_first_access": true
  },
  "emailSent": true,
  "message": "Cliente ativado. Email com credenciais enviado."
}
```

Se SMTP não estiver configurado, a resposta inclui `_internalTempPassword` com a senha temporária.

---

## Fluxo do Cliente

1. Recebe email com login, senha temporária e link
2. Acessa a plataforma
3. É redirecionado para `/setup-empresa`
4. Troca a senha e preenche os dados da empresa
5. Após confirmar, é redirecionado ao dashboard

---

## Segurança

- Senha temporária expira em **24 horas**
- Troca de senha obrigatória no primeiro acesso
- Rota `/api/internal/sales/activate-client` acessível apenas com `role = internal_admin`
- Cadastro público desabilitado (`/api/auth/register` e `POST /api/companies` retornam 403)
