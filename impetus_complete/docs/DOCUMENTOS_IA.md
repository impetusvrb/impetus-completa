# Documentos e IA – Impetus Comunica IA

## Visão geral

O Impetus Comunica IA garante que a IA integrada **sempre** consulte a documentação interna da empresa e a **Política Impetus** para que as sugestões estejam em conformidade e baseadas em procedimentos reais.

---

## 1. Onde carregar documentos

### Configurações → Política da Empresa
- **Política e normas gerais** da empresa
- NRs, procedimentos de segurança, diretrizes de manutenção
- Texto livre (sem upload de arquivo)
- A IA inclui este conteúdo em todo contexto de sugestão

### Configurações → POPs
- **Procedimentos Operacionais Padrão**
- Título, categoria e conteúdo (ou anexo PDF)
- A IA prioriza POPs da empresa sobre sugestões genéricas

### Configurações → Manuais
- **Manuais técnicos de máquinas e equipamentos**
- Tipo de equipamento, modelo, fabricante
- Upload de PDF – o sistema extrai o texto e gera embeddings para busca vetorial
- A IA usa estes manuais no diagnóstico assistido

---

## 2. Política Impetus (embutida no software)

A **Política Impetus** está em `backend/src/data/impetus-policy.md` e é carregada automaticamente. A IA **sempre** a consulta para garantir que:

- Nenhuma sugestão contrarie normas regulatórias (NRs, NBRs, ANVISA etc.)
- Segurança em primeiro lugar
- A documentação interna prevalece sobre conhecimento genérico
- Não há sugestões que exponham pessoas a risco
- LGPD e rastreabilidade são respeitados

Para alterar a política Impetus, edite o arquivo `backend/src/data/impetus-policy.md` e reinicie o backend.

---

## 3. Fluxo da IA

```
Usuário envia relato (ex: "prensa vazando óleo")
        ↓
documentContext.buildAIContext()
  ├── Política Impetus (sempre)
  ├── Política da empresa (company_policy_text)
  ├── POPs ativos
  └── Manuais (busca vetorial por embeddings)
        ↓
Prompt montado com contexto obrigatório
        ↓
IA gera sugestão em conformidade
```

---

## 4. Manual Operacional vs Manual de Máquina

- **Manual Operacional**: Procedimentos e processos gerais (ex.: troca de ferramenta, inspeção).
- **Manual de Máquina**: Documentação específica de equipamentos (modelo, fabricante).

Ao cadastrar em Configurações → Manuais, escolha o tipo. A biblioteca exibe cada um em sua categoria.

**Migration:** Execute `backend/src/models/manual_type_migration.sql` para adicionar a coluna `manual_type`.

---

## 5. Manutenção

- **Manuais:** o upload via admin extrai texto do PDF e gera embeddings. Manuais antigos (sem embeddings) podem não aparecer na busca.
- **POPs:** o conteúdo em texto é usado diretamente no contexto.
- **Política da empresa:** alterações têm efeito imediato nas próximas consultas.
