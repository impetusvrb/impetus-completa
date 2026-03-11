# Plano de Ação – Verificação do Fluxo de Comunicação

**Data:** Março 2025

---

## 1. Verificação de migrations

**Objetivo:** Garantir que todas as migrations executam sem erro.

**Ação:** Executar `run-all-migrations.js` em ambiente com banco disponível.

**Critério de sucesso:** Exit code 0, sem erros de SQL.

---

## 2. Verificação de .env.example

**Objetivo:** Não expor variáveis obsoletas (Z-API).

**Ação:** Checar se há ZAPI_* ou referências WhatsApp.

**Critério de sucesso:** Documentação alinhada ao canal App Impetus.

---

## 3. Verificação de estrutura duplicada

**Objetivo:** Entender e documentar `impetus_complete/impetus_complete/`.

**Ação:** Comparar diretórios e verificar se é intencional.

---

## 4. Testes automatizados

**Objetivo:** Validar que as alterações não quebraram testes.

**Ação:** `npm test` em backend e frontend.

**Critério de sucesso:** Testes passam ou não existem (documentar).

---

## 5. Smoke test – Backend e rotas

**Objetivo:** Validar que o backend sobe e as rotas respondem.

**Ação:**
- Iniciar backend
- `GET /health`, `GET /api/app-impetus/status` (com auth)

**Critério de sucesso:** HTTP 200 nas rotas verificadas.

---

## 6. Referências antigas

**Objetivo:** Garantir que não há chamadas às rotas/métodos removidos.

**Ação:** Grep por `whatsapp-contacts`, `listWhatsappContacts`, `addWhatsappContact`, `deleteWhatsappContact`.

**Critério de sucesso:** Sem referências em código ativo (exceto em docs históricos).

---

## Resultados

*(Preenchido durante a execução)*
