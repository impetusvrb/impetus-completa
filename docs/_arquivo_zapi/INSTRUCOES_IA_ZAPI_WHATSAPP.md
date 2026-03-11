# Instruções detalhadas: IA no Z-API WhatsApp

**Sistema:** IMPETUS Comunica IA  
**Registro INPI:** BR512025007048-9

---

## 1. Visão geral

O Impetus usa a **Z-API** como ponte entre o WhatsApp Business e o backend. Todas as mensagens recebidas passam por um webhook e são processadas por camadas de IA em ordem de prioridade.

### Fluxo simplificado

```
WhatsApp → Z-API → Webhook Impetus → Ordem de processamento:
  1. Modo Executivo (CEO)
  2. Formulário TPM (perdas/manutenção)
  3. IA Organizacional (eventos operacionais)
  4. IA de classificação + diagnóstico (falha, tarefa, etc.)
```

---

## 2. Configuração inicial

### 2.1 Requisitos

- **Conta Z-API** em https://z-api.io  
- **WhatsApp Business** (número usado pela empresa)  
- **OPENAI_API_KEY** no `.env` (obrigatório para IA)  
- **URL pública** do backend para o webhook (ex: `https://seu-dominio.com`)

### 2.2 Conectar WhatsApp no painel

1. Acesse **Configurações** → aba **Z-API** no Impetus.
2. Clique em **Conectar WhatsApp**.
3. Escaneie o QR Code com o WhatsApp Business.
4. Aguarde a confirmação de conexão.

### 2.3 Webhook na Z-API

A URL do webhook deve ser:

```
https://SEU-DOMINIO/api/webhook/zapi
```

No painel da Z-API, configure:

- **Evento:** Mensagens recebidas  
- **Webhook:** a URL acima  
- O Impetus identifica a empresa pelo `instanceId` de cada instância.

---

## 3. Ordem de processamento das mensagens

Ao receber uma mensagem, o sistema tenta processá-la nesta ordem:

### 3.1 Modo Executivo (CEO)

- **Condição:** número de WhatsApp cadastrado do usuário com role `ceo`.  
- **Primeiro contato:** pede envio do documento IPC para verificação.  
- **Após verificação:** permite perguntas estratégicas via IA (resumo, riscos, produção, falhas, indicadores).

**Exemplo de respostas automáticas:**
- "Qual o resumo da semana?"
- "Quais setores têm risco?"
- "Principais falhas do mês?"

### 3.2 Formulário TPM (perdas e manutenção)

- **Condição:** operador inicia o fluxo após receber diagnóstico de falha técnica.  
- **Gatilho:** mensagem que aceite registrar dados (ex.: "sim", "quero registrar", etc.).  
- **Fluxo:** 14 perguntas sequenciais (data, hora, equipamento, causa raiz, perdas, etc.).  
- **Final:** confirma envio e notifica gestores (Manutenção, Produção, PCM).

**Passos do formulário TPM:**

| # | Campo      | Pergunta |
|---|------------|----------|
| 1 | Data       | Qual a data da ocorrência? |
| 2 | Hora       | Qual a hora? |
| 3 | Equipamento| Qual equipamento e componente apresentam falha? |
| 4 | Mantenedor | Quem efetuou a manutenção? |
| 5 | Causa raiz | COMP, AJUSTE ou OPER? |
| 6 | Frequência | Com que frequência o problema aparecia? |
| 7 | Peça       | Qual a peça específica que está falhando? |
| 8 | Ação       | Qual ação foi executada? |
| 9 | Perdas antes | Quantas perdas antes da manutenção? |
| 10| Perdas durante | Quantas perdas durante a manutenção? |
| 11| Perdas após   | Quantas perdas após liberar? |
| 12| Operador   | Qual seu nome? |
| 13| Obs        | Alguma observação? |
| 14| Confirmar  | Confirma o envio? (SIM ou NÃO) |

### 3.3 IA Organizacional

- **Eventos:** quebra de peça, falha de máquina, falta de insumo, atraso, pedido de material, parada de produção, alertas, etc.  
- **Comportamento:** classifica, extrai dados (máquina, peça, quantidade) e faz perguntas de complemento se a informação estiver incompleta.  
- **Perguntas automáticas (exemplo):**

  - "Qual máquina?"  
  - "Qual o código da peça?"  
  - "Houve parada de produção?"  
  - "Qual insumo? Quantidade? Urgência?"

- **Dados completos:** grava em `operational_events` e `machine_history`, e pode sugerir reposição de peças.

### 3.4 IA de classificação e diagnóstico (padrão)

Se nenhuma camada acima tratar a mensagem, entra a IA padrão.

#### Tipos de classificação

| Tipo             | Exemplo de mensagem           | Ação |
|------------------|-------------------------------|------|
| `falha_técnica`  | "A máquina 3 parou e está vibrando" | Diagnóstico com manuais + tarefa criada + oferta TPM |
| `tarefa`         | "Preciso entregar até sexta"  | Cria tarefa |
| `lembrete`       | "Lembrar reunião às 14h"     | Registrado |
| `alerta`         | "Urgente: vazamento na linha 2" | Registrado |
| `autorização`    | "Pode fazer a parada?"       | Registrado |
| `comunicado`     | "Comunicado: manutenção amanhã" | Registrado |
| `dúvida`         | "Como trocar o filtro?"      | Registrado |
| `outro`          | Demais mensagens             | Registrado |

#### Para `falha_técnica`

1. Busca trechos de manuais (POPs/manuais operacionais).  
2. Gera relatório de diagnóstico com: causas prováveis, passos de verificação, checklist de segurança, referências.  
3. Cria tarefa com o diagnóstico.  
4. Responde ao usuário: "✓ Diagnóstico gerado e tarefa criada."  
5. Oferece o formulário TPM: "Quer registrar os dados de perda e manutenção?"

---

## 4. Respostas automáticas (rate limit)

- **Limite:** 20 mensagens/minuto por instância.  
- **Delay:** 2–5 segundos entre envios para evitar bloqueio pelo WhatsApp.  
- **Função:** `sendAutoReply(companyId, phone, message)`.

---

## 5. Eventos tratados pelo webhook

| Evento             | Ação |
|--------------------|------|
| `message`          | Processamento completo (CEO, TPM, OrgAI, IA padrão) |
| `ConnectedCallback`| Atualiza status conectado e número do negócio |
| `DisconnectedCallback` | Marca instância como desconectada |
| `status` (DELIVERED/READ) | Atualiza status de mensagens enviadas |

---

## 6. Onde a IA é usada

| Componente          | Uso da IA |
|---------------------|-----------|
| **ai.js**           | `chatCompletion` (GPT), classificação, diagnóstico com manuais |
| **organizationalAI.js** | Classificação de eventos, extração de dados, perguntas de complemento |
| **executiveMode.js**| Perguntas estratégicas do CEO com dados do banco |
| **onboardingService.js** | Entrevista estratégica (empresa/usuário) |
| **tpmConversation.js** | Interpretação de datas, horas, causas raiz (parsing + IA quando necessário) |

---

## 7. Variáveis de ambiente

```env
# IA (obrigatório)
OPENAI_API_KEY=sk-...

# Z-API (configurada por empresa no painel)
# Não precisa em .env - cada empresa tem sua config em zapi_configurations / whatsapp_instances

# URL base (para links nas respostas)
BASE_URL=https://seu-dominio.com
FRONTEND_URL=https://app.seu-dominio.com
```

---

## 8. Contatos WhatsApp (gestão de notificações)

Em **Configurações** → **Contatos WhatsApp**, cadastre colaboradores com:

- Nome  
- Telefone  
- Cargo  
- Setor  

A IA usa esses contatos para:

- Escalonamento (Manutenção, Produção, PCM)  
- Notificações TPM  
- Notificações de assinatura  

---

## 9. Fluxograma resumido

```
[Mensagem WhatsApp]
        │
        ▼
┌───────────────────┐
│ É CEO verificado? │──SIM──► Resposta estratégica IA
└───────────────────┘
        │ NÃO
        ▼
┌───────────────────┐
│ Sessão TPM ativa? │──SIM──► Próxima pergunta TPM
└───────────────────┘
        │ NÃO
        ▼
┌───────────────────┐
│ IA Org detecta    │──SIM──► Perguntas ou registro
│ evento incompleto? │
└───────────────────┘
        │ NÃO
        ▼
┌───────────────────┐
│ IA Org trata      │──SIM──► Resposta + registro
│ evento completo?  │
└───────────────────┘
        │ NÃO
        ▼
┌───────────────────┐
│ Classificar IA    │
│ (falha/tarefa/..) │
└───────────────────┘
        │
        ├─ falha_técnica ──► Diagnóstico + tarefa + oferta TPM
        ├─ tarefa ─────────► Criar tarefa + confirmação
        └─ outro ──────────► Apenas registrar
```

---

## 10. Troubleshooting

| Problema | Verificação |
|----------|-------------|
| Mensagens não chegam | Webhook configurado na Z-API? URL acessível? |
| Sem resposta da IA | `OPENAI_API_KEY` no `.env`? Logs com `[AI_ERROR]`? |
| CEO não reconhecido | `whatsapp_number` preenchido no usuário CEO? Número no formato internacional? |
| Formulário TPM não inicia | Mensagem deve aceitar o registro; verificar `tryStartFromOffer` em `tpmConversation.js` |
| Rate limit excedido | Aguardar ou ajustar `RATE_LIMIT_MSGS_PER_MIN` em `zapiRateLimit.js` |
| Empresa não identificada | `instanceId` do payload corresponde a `zapi_configurations` ou `whatsapp_instances`? |

---

*Documento gerado com base no código do Impetus Comunica IA.*
