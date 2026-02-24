# Plano de Implementação – Formulário TPM no Pró-Ação

## Objetivo

Incorporar o formulário TPM (Total Productive Maintenance) ao módulo Pró-Ação, permitindo que a **IA interativa via WhatsApp Business** colete dados de perdas e manutenções em tempo real, quando uma falha gera desperdício e exige manutenção corretiva. Os dados são armazenados em banco auditável e enviados aos gestores (Manutenção, Produção, PCM).

---

## 1. Visão geral do fluxo

```
Falha + desperdício → WhatsApp → IA oferece formulário TPM
                                        ↓
              IA pergunta campo a campo (conversacional)
                                        ↓
              Dados salvos no banco + notificação aos gestores
```

O operador **não** precisa saber todos os campos de antemão: a IA vai solicitando e salvando progressivamente, como faria o preenchimento físico.

---

## 2. Campos do formulário TPM (mapeamento)

| Campo        | Sigla no form | Descrição |
|-------------|---------------|-----------|
| Data        | Data          | Data da ocorrência |
| Hora        | Hora          | Hora da ocorrência |
| Equipamento / Componente | C  | Qual equipamento e componente apresenta falha |
| Quem        | Quem          | Manutentor que efetuou a manutenção |
| Por quê     | Por quê        | Causa raiz (Comp / Ajuste / Oper) |
| Frequência  | Frequência    | Frequência ou tempo que o operador observou o problema |
| O quê onde  | O quê onde    | Peça específica que está falhando |
| Como onde   | Como onde     | Ação corretiva executada |
| Perdas antes| perd ant      | Perdas antes da manutenção atuar |
| Perdas durante | perd dur   | Perdas durante a manutenção |
| Perdas após | perd apó      | Perdas após liberação do equipamento |
| Total       | total         | Soma das perdas (calculado) |
| Responsável | responsável   | Nome do operador responsável |
| Observação  | Observação    | Observações adicionais |

**Por quê** (causa raiz): Comp (Componente) | Ajuste | Oper (Operacional)

**O quê onde**: componente | transportador (ou outras categorias conforme equipamento)

---

## 3. Arquitetura proposta

### 3.1 Banco de dados

**Nova tabela: `tpm_incidents`** (incidentes TPM – uma linha por falha/ocorrência)

```sql
CREATE TABLE tpm_incidents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
  
  -- Origem
  communication_id UUID REFERENCES communications(id),
  source_message_id TEXT,
  operator_phone TEXT,
  
  -- Data/hora
  incident_date DATE,
  incident_time TIME,
  
  -- Equipamento e componente
  equipment_code TEXT,
  component_name TEXT,
  
  -- Manutenção
  maintainer_name TEXT,
  root_cause TEXT,  -- comp | ajuste | oper
  frequency_observation TEXT,
  failing_part TEXT,
  corrective_action TEXT,
  
  -- Perdas
  losses_before INTEGER DEFAULT 0,
  losses_during INTEGER DEFAULT 0,
  losses_after INTEGER DEFAULT 0,
  losses_total INTEGER GENERATED ALWAYS AS (losses_before + losses_during + losses_after) STORED,
  
  -- Responsável e observação
  operator_name TEXT,
  observation TEXT,
  
  -- Turno (para perdas por turno)
  shift_id TEXT,
  
  -- Auditoria
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  filled_at TIMESTAMPTZ
);
```

**Tabela auxiliar: `tpm_shift_totals`** (perdas por turno – agregação)

```sql
CREATE TABLE tpm_shift_totals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  shift_date DATE,
  shift_number INTEGER,
  total_losses INTEGER,
  incident_count INTEGER,
  created_at TIMESTAMPTZ DEFAULT now()
);
```

### 3.2 Sessão conversacional (estado do preenchimento)

Para a IA ir coletando campo a campo, é necessário manter **estado da conversa**:

```sql
CREATE TABLE tpm_form_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id UUID REFERENCES companies(id),
  operator_phone TEXT,
  communication_id UUID,
  incident_id UUID REFERENCES tpm_incidents(id),
  current_step TEXT,
  collected_data JSONB DEFAULT '{}',
  status TEXT DEFAULT 'in_progress',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);
```

`current_step` pode ser: `date` → `time` → `equipment` → `maintainer` → `root_cause` → … → `observation` → `confirm`.

---

## 4. Fluxo da IA no WhatsApp

### 4.1 Gatilho

- Mensagem classificada como **falha_técnica** ou **alerta**.
- Opcional: detectar palavras como "perda", "desperdício", "parou", "quebrou".
- Ou: após criar tarefa/diagnóstico, enviar:  
  *"Houve perda ou desperdício nesta falha? Se sim, responda SIM para preencher o formulário TPM."*

### 4.2 Fluxo conversacional

1. **Início**: "Vou registrar os dados da falha no formulário TPM. Qual a **data** da ocorrência? (ex: 16/02/2025)"
2. **Hora**: "Qual a **hora**? (ex: 19:00)"
3. **Equipamento**: "Qual **equipamento** e **componente** apresentam falha? (ex: Tetra Pak CBP 32 - sensor empurrador)"
4. **Manutentor**: "Quem efetuou a manutenção? (nome do mecânico)"
5. **Causa raiz**: "Qual a causa raiz? Responda: COMP (componente), AJUSTE ou OPER"
6. **Frequência**: "Com que **frequência** o problema aparecia? (ex: 2x por dia, toda segunda)"
7. **Peça específica**: "Qual a **peça específica** que está falhando? (ex: sensor S3 do empurrador)"
8. **Ação corretiva**: "Qual **ação** foi executada para restabelecer o equipamento?"
9. **Perdas antes**: "Quantas **perdas antes** da manutenção? (número)"
10. **Perdas durante**: "Quantas **perdas durante** a manutenção?"
11. **Perdas após**: "Quantas **perdas após** liberar o equipamento?"
12. **Operador**: "Qual o seu **nome** (operador responsável)?"
13. **Observação**: "Há alguma **observação** a adicionar?"
14. **Confirmação**: "Registro concluído. Deseja confirmar? (SIM/NÃO)"

### 4.3 Salvamento

- A cada resposta: atualizar `tpm_form_sessions.collected_data` e `current_step`.
- Ao confirmar: inserir em `tpm_incidents`, calcular total, atualizar `tpm_shift_totals`.
- Marcar sessão como `completed`.

---

## 5. Notificações aos gestores

### 5.1 Destinatários

- Gerente de Manutenção  
- Gerente de Produção  
- PCM (Planejamento e Controle da Manutenção)

### 5.2 Canal

- **WhatsApp** (via Z-API), se o gestor tiver número cadastrado.
- **E-mail** (fallback).
- **Painel web** (lista de incidentes TPM e alertas).

### 5.3 Conteúdo da notificação

Resumo do incidente: equipamento, componente, causa raiz, perdas (antes/durante/depois), ação corretiva, operador, data/hora.

---

## 6. Integração com Pró-Ação

- Cada `tpm_incident` pode gerar um **alerta** em `alerts` (tipo `tpm_incident`).
- Opcional: criar **proposta** em `proposals` quando perdas forem altas ou padrão recorrente.
- O worker de Pró-Ação pode usar `tpm_incidents` para regras (ex.: X incidentes no mesmo componente em 7 dias).

---

## 7. Plano de implementação por fases

### Fase 1: Banco e modelo — ✅ Implementado

- [x] Migration `tpm_migration.sql`: `tpm_incidents`, `tpm_shift_totals`, `tpm_form_sessions`
- [x] Serviço `tpmFormService.js`: `createSession`, `updateStep`, `saveIncident`, parseDate, parseTime, parseRootCause

### Fase 2: Fluxo conversacional — ✅ Implementado

- [x] Serviço `tpmConversation.js`: interpreta mensagem e retorna próxima pergunta
- [x] Mapeamento de respostas (data, hora, COMP/AJUSTE/OPER, números)
- [x] Integrado em `zapi.processWebhook`

### Fase 3: Z-API e mensagens — ✅ Implementado

- [x] Após falha_técnica: oferece formulário TPM na confirmação
- [x] Operador responde SIM → sessão inicia, perguntas sequenciais
- [x] Ao confirmar: salvamento e notificações

### Fase 4: Notificações — ✅ Implementado

- [x] `tpmNotifications.js`: `getNotifyTargets` (config ou users com role gerente/pcm)
- [x] `notifyTpmIncident`: WhatsApp aos gestores + alerta em `alerts`
- [x] Chamado após `saveIncident`

### Fase 5: Painel e perdas por turno — ✅ Implementado

- [x] `GET /api/tpm/incidents` (filtros: from, to, limit)
- [x] `GET /api/tpm/shift-totals`
- [x] `GET /api/tpm/incidents/:id`

### Fase 6: Regras Pró-Ação — ✅ Implementado

- [x] `tpm_shift_high_losses`: alerta quando perdas no turno >= min_losses (padrão 50)
- [x] `tpm_component_repeated`: alerta quando mesmo equip/componente >= 3x em 7 dias

---

## 8. Pré-requisitos e dúvidas

### Já atendidos

- Z-API integrada
- `processIncomingMessage` para WhatsApp
- Classificação de mensagens (falha_técnica, alerta)
- Tabela `communications` e fluxo de resposta automática

### Pontos para definir

1. **Gatilho exato**: a IA deve sempre oferecer o formulário em toda falha_técnica, ou só quando o operador indicar que houve desperdício/perda?
2. **Perdas por turno**: como identificar turno (1, 2, 3)? Pelo horário (ex.: 6h–14h, 14h–22h, 22h–6h) ou o operador informa?
3. **Gestores**: os e-mails/telefones dos gerentes vêm de `users` (por role) ou de uma config específica (ex.: `company_settings.tpm_notify_emails`)?
4. **Formato de data/hora**: manter DD/MM/YYYY e HH:MM ou aceitar variações (ex.: "ontem", "19h")?

---

## 9. Esforço total estimado

| Fase            | Horas |
|----------------|-------|
| 1. Banco       | 2     |
| 2. Conversação| 4     |
| 3. Z-API       | 2     |
| 4. Notificações| 2     |
| 5. Painel      | 2     |
| 6. Regras      | 1     |
| **Total**      | **≈ 13h** |

---

## 10. Conclusão

A incorporação do formulário TPM ao Pró-Ação via WhatsApp e IA conversacional é viável e alinhada com o IMPETUS. O plano acima cobre banco, fluxo conversacional, notificações e integração com Pró-Ação. Com as respostas às dúvidas da seção 8, a implementação pode seguir de forma objetiva.
