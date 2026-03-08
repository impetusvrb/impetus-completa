# Plano para Conclusão dos Itens Pendentes

## Visão geral

Este plano cobre o que falta para deixar o fluxo Z-API + IA totalmente funcional e o OCR habilitado para PDFs escaneados.

---

## Fase 1: Ambiente de Desenvolvimento (≈ 15 min)

### 1.1 Instalar dependências do backend

```powershell
cd "G:\Meu Drive\impetus_complete\backend"
npm install
```

- Confirma instalação de `tesseract.js` e `pdf2pic`
- Se der erro de `node` ou `npm` não encontrado, abra o terminal integrado do Cursor ou um terminal onde Node.js esteja no PATH

### 1.2 Instalar ImageMagick (para OCR em PDFs)

**Opção A – winget (recomendado no Windows):**
```powershell
winget install ImageMagick.ImageMagick
```

**Opção B – Download manual:**
- Acesse https://imagemagick.org/script/download.php
- Baixe o instalador para Windows
- Durante a instalação, marque a opção **“Add to PATH”**

**Verificação:** Após instalar, feche e reabra o terminal. Rode:
```powershell
magick -version
```

---

## Fase 2: Banco de Dados (≈ 10 min)

### 2.1 Verificar schema da tabela `communications`

```powershell
cd "G:\Meu Drive\impetus_complete\backend"
npm run check-schema
```

**Resultado esperado:**
```
✅ Tabela communications OK. Colunas presentes: ai_classification, related_task_id, processed_at
```

### 2.2 Se a tabela não existir ou faltar colunas

1. Verificar se o PostgreSQL está rodando
2. Checar credenciais no `.env`:
   - `DB_HOST`, `DB_PORT`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`
3. Executar o schema completo:

```powershell
# Ajuste host, usuário e banco conforme seu .env
psql -h localhost -U postgres -d impetus_db -f src/models/complete_schema.sql
```

**Ou** criar uma migration incremental para adicionar somente as colunas faltantes (se a tabela já existir sem elas).

---

## Fase 3: Configuração e Testes (≈ 30 min)

### 3.1 Variáveis de ambiente

No `.env` do backend:

```env
# OCR para PDFs escaneados
OCR_ENABLED=true

# Z-API (ajuste conforme sua instalação)
# ZAPI_DEFAULT_URL, ZAPI_INSTANCE_ID, etc.
```

### 3.2 Teste do webhook genérico (`POST /api/webhook`)

```powershell
curl -X POST http://localhost:4000/api/webhook -H "Content-Type: application/json" -d "{\"source\":\"test\",\"sender\":\"5531999999999\",\"text\":\"Máquina parada, preciso de manutenção\"}"
```

**Critérios de sucesso:**
- HTTP 200
- Mensagem salva em `messages`
- Se houver `companyId` no payload, `processIncomingMessage` é chamado

### 3.3 Teste do webhook Z-API (`POST /api/webhook/zapi`)

Pré-requisito: configurar `instance_id` em `zapi_configurations` para alguma empresa.

Exemplo de payload:

```json
{
  "event": "message",
  "instanceId": "SUA_INSTANCE_ID",
  "phone": "5531999999999",
  "message": {
    "type": "chat",
    "body": "A máquina 3 parou e está vibrando!"
  }
}
```

**Critérios de sucesso:**
- HTTP 200 com `{ "ok": true, "processed": true }`
- Registro criado em `communications`
- `ai_classification` e `related_task_id` preenchidos (em caso de falha_técnica ou tarefa)
- Tarefa criada em `tasks` quando aplicável

### 3.4 Teste do OCR (opcional)

1. Fazer upload de um manual PDF escaneado pelo sistema
2. Verificar se o texto foi extraído e indexado em `manual_chunks`
3. Checar logs por mensagens como `[MANUALS] OCR fallback` se o pdf-parse falhar

---

## Fase 4: Opcional – Resposta automática via Z-API

Quando uma tarefa ou diagnóstico for criado a partir de uma mensagem WhatsApp, enviar resposta automática ao remetente.

**Implementação sugerida:**
- Em `ai.processIncomingMessage`, ao retornar `taskId` ou `diagnosticId`
- Chamar `zapiService.sendTextMessage(companyId, senderPhone, mensagem)` com mensagem de confirmação
- Garantir que o `companyId` e o telefone de destino estejam corretos

---

## Checklist final

- [ ] `npm install` executado sem erros
- [ ] ImageMagick instalado e `magick -version` funciona
- [ ] `npm run check-schema` retorna OK
- [ ] Banco com schema correto (ou `complete_schema.sql` aplicado)
- [ ] `.env` com `OCR_ENABLED=true` (se for usar OCR)
- [ ] Webhook genérico testado com sucesso
- [ ] Webhook Z-API testado com sucesso
- [ ] (Opcional) OCR testado com PDF escaneado
- [ ] (Opcional) Resposta automática via Z-API implementada

---

## Ordem sugerida de execução

1. **Fase 1** (ambiente) – base para o restante
2. **Fase 2** (banco) – necessário para os webhooks Z-API
3. **Fase 3** (configuração e testes) – validação do fluxo completo
4. **Fase 4** (opcional) – apenas se for requisito do negócio
