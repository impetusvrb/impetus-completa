# Claude Analytics - Cérebro de Dados e Memória Operacional

## Visão Geral

O IMPETUS utiliza uma arquitetura dual de IA:

- **ChatGPT (OpenAI)** – Camada de conversação com o usuário
- **Claude (Anthropic)** – Camada analítica em bastidor: interpreta, memoriza, cruza e estrutura dados internos

Claude processa dados do sistema e constrói uma memória operacional estruturada, que alimenta o contexto do ChatGPT para respostas mais inteligentes.

## Configuração

### Variáveis de Ambiente

```env
ANTHROPIC_API_KEY=sk-ant-...
OPERATIONAL_MEMORY_ENABLED=true          # false para desabilitar
OPERATIONAL_MEMORY_RETENTION_DAYS=180    # dias até desativar fatos antigos
```

Sem `ANTHROPIC_API_KEY`, o sistema continua funcionando normalmente:
- O ChatGPT permanece como interface principal
- A memória operacional não é enriquecida por Claude
- A ingestão assíncrona é desativada (não há erros)

## Fluxo de Dados

1. **Ingestão** – Dados brutos (chat, registro inteligente, chat interno) são enviados a Claude em modo assíncrono
2. **Extração** – Claude identifica fatos relevantes (pendências, riscos, decisões, falhas, etc.)
3. **Persistência** – Fatos são gravados em `operational_memory` no banco do IMPETUS
4. **Consulta** – Ao conversar com o ChatGPT, o sistema busca fatos relevantes para a pergunta
5. **Enriquecimento** – Claude (ou fallback) monta um bloco de contexto para o prompt do ChatGPT

## Fontes de Ingestão

| Fonte                  | Trigger                    | Descrição                          |
|------------------------|----------------------------|------------------------------------|
| Chat Impetus           | Após cada mensagem do chat | Interações com a IA                |
| Chat Interno           | Após enviar mensagem       | Conversas entre colaboradores      |
| Registro Inteligente   | Após criar registro        | Relatos do dia a dia               |
| Pró-Ação               | (via `ingestProacao`)      | Ações e melhorias                  |
| Ordem de Serviço       | (via `ingestOrdemServico`) | Manutenção e falhas                |

## Segurança e Governança

- **Multi-tenant**: Isolamento por `company_id`
- **Auditoria**: Toda consulta à memória é registrada em `memory_audit_log`
- **Minimização**: Claude prioriza fatos úteis, evita ruído
- **Permissões**: O contexto retornado deve respeitar o perfil do usuário (futuro)

## Tabelas

- `operational_memory` – Fatos estruturados extraídos
- `memory_audit_log` – Log de consultas e uso

## Migration

A migration `operational_memory_migration.sql` é executada automaticamente por `npm run migrate`.

## Robustez e Operação

- **Startup**: Em produção, aviso se a tabela `operational_memory` não existir
- **plainto_tsquery**: Query sanitizada; fallback para busca simples em caso de erro
- **IP no audit**: Validação e fallback para `NULL` se inválido
- **Unhandled rejection**: `.catch()` em todas as cadeias assíncronas da ingestão
- **Rate limit**: Máx 1 ingestão por empresa a cada 2 segundos
- **Timeout**: `getContextForChat` com limite de 6s; timeout não bloqueia o chat
- **Feature flag**: `OPERATIONAL_MEMORY_ENABLED=false` desativa busca e ingestão
- **scope_id**: Validação UUID antes do insert
- **Health**: `/health` retorna `claude: available | circuit_open | not_configured`
- **Retenção**: Job de manutenção desativa fatos com mais de N dias (configurável)
