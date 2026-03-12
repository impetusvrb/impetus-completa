# Arquitetura IMPETUS + Z-API

## Webhook de recebimento

**URL:** `POST https://<sistema>/api/webhook/zapi`

Configure no painel Z-API como webhook de mensagens recebidas.

## Payload Z-API → IMPETUS

```json
{
  "event": "message",
  "instanceId": "0001",
  "phone": "5531999999999",
  "message": {
    "type": "chat",
    "body": "A máquina 3 parou de novo e está vibrando muito!",
    "senderName": "José Operador",
    "timestamp": 1713892021
  },
  "chatId": "5531999999999@c.us"
}
```

## Fluxo no backend

1. Recebe POST em `/api/webhook/zapi`
2. Identifica `company_id` por `instanceId` (zapi_configurations)
3. Salva em `communications`
4. Chama `processIncomingMessage` (classificação IA)
5. Se `falha_técnica`: busca manuais → gera diagnóstico → cria tarefa
6. Se `tarefa`: cria tarefa
7. Atualiza `communications` com `ai_classification`, `related_task_id`

## Tipos de classificação

tarefa | lembrete | comunicado | falha_técnica | autorização | alerta | dúvida | outro

## Respostas automáticas (opcional)

Use `zapiService.sendTextMessage(companyId, phone, message)` para enviar confirmação ou resultado do diagnóstico.
