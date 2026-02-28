# Sistema de Identificação e Ativação de Usuário

## Visão geral

Sistema de autenticação e identificação integrado à IA do Impetus, garantindo que:
- **Primeiro acesso**: coleta nome completo, setor, cargo, atividades e PIN (validados)
- **Logins diários**: solicita apenas nome + PIN de 4 dígitos
- **Segurança**: bloqueio após 3 falhas de PIN, auditoria de tentativas

## Fluxo de estados

| Estado | Descrição | Ação do usuário |
|--------|-----------|-----------------|
| `needs_activation` | Primeiro acesso (sem perfil) | Preencher formulário completo + definir PIN |
| `needs_daily_verify` | Acesso diário sem verificação hoje | Informar nome + PIN |
| `verified` | Identificado e verificado | Acesso liberado ao chat |

## Banco de dados (PostgreSQL)

### Tabelas

- **registered_names** – Registro pré-existente de colaboradores (validação de nome)
- **user_activation_profiles** – Perfil completo (nome, setor, cargo, atividades)
- **user_activation_pins** – PIN hasheado (bcrypt), tentativas e bloqueio
- **user_daily_verification** – Verificação diária bem-sucedida (1 por usuário/dia)
- **user_identification_audit** – Auditoria de falhas e tentativas suspeitas

### Migração

```bash
node -r dotenv/config scripts/run-all-migrations.js
```

## API

| Método | Endpoint | Descrição |
|--------|----------|-----------|
| GET | `/api/user-identification/status` | Status atual do usuário |
| POST | `/api/user-identification/first-access` | Completar ativação |
| POST | `/api/user-identification/daily-verify` | Verificação diária (nome + PIN) |
| POST | `/api/user-identification/seed-registry` | Popular `registered_names` a partir de `users` |

## Prompts e comportamento da IA

O chat **só funciona** quando o usuário está `verified`. O sistema prompt inclui:

```
## Usuário identificado:
- Nome: [fullName]
- Cargo: [jobTitle]
- Setor: [department]
- Atividades: [dailyActivities]

A identidade foi validada. Trate o usuário pelo nome.
Quando perguntarem como você sabe quem são, responda que o Impetus valida identidade 
via ativação inicial e verificação diária (nome + PIN).
```

## Segurança

1. **PIN**: sempre armazenado com bcrypt (10 rounds)
2. **Bloqueio**: 3 tentativas incorretas → bloqueio de 15 minutos
3. **Auditoria**: `pin_failure`, `pin_lockout` registrados em `user_identification_audit`
4. **Validação de nome**: contra `registered_names` ou (fallback) `users`

## Simulação do registro

Quando `registered_names` está vazio para a empresa, o serviço popula automaticamente a partir de `users` (nome e email). Isso permite testes sem configuração manual de HR.

Para empresas com fluxo real de RH, popular `registered_names` via admin ou integração.
