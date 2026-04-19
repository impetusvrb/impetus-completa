const MANUAL_VERSION = '2026-04-16';

const modules = [
  {
    id: 'gestao-usuarios',
    title: 'Gestao de Usuarios',
    route: '/app/admin/users',
    description: 'Cadastro de usuarios, hierarquia, supervisor e dados de contato.'
  },
  {
    id: 'departamentos',
    title: 'Departamentos',
    route: '/app/admin/departments',
    description: 'Estrutura organizacional por setor, tipo e nivel.'
  },
  {
    id: 'equipes-operacionais',
    title: 'Equipes Operacionais',
    route: '/app/admin/equipes-operacionais',
    description: 'Gestao de equipes de turno, membros e login coletivo.'
  },
  {
    id: 'base-estrutural',
    title: 'Base Estrutural',
    route: '/app/admin/structural',
    description: 'Cargos, linhas, ativos, processos e referencias da empresa.'
  },
  {
    id: 'conteudo-configuracoes',
    title: 'Conteudo e Configuracoes',
    route: '/app/admin/conteudo-empresa',
    description: 'Politicas da empresa, POPs, manuais, notificacoes e visibilidade.'
  },
  {
    id: 'integracoes',
    title: 'Integracoes',
    route: '/app/admin/integrations',
    description: 'Conectores MES/ERP, Edge e digital twin.'
  },
  {
    id: 'logs-auditoria',
    title: 'Logs e Auditoria',
    route: '/app/admin/audit-logs',
    description: 'Consulta e exportacao de eventos de auditoria e acesso.'
  }
];

const fields = [
  {
    id: 'users-name',
    moduleId: 'gestao-usuarios',
    pageRoute: '/app/admin/users',
    pageName: 'Gestao de Usuarios',
    fieldName: 'name',
    label: 'Nome Completo',
    type: 'input:text',
    required: true,
    whatIs: 'Nome civil ou nome profissional do colaborador.',
    purpose: 'Identifica o usuario em listas, aprovacoes e trilhas de auditoria.',
    howToFill: 'Use nome completo sem abreviacoes ambiguas.',
    examples: ['Marcos Tavares Rocha', 'Joyce Silva'],
    commonErrors: ['Cadastrar apelido apenas', 'Trocar ordem nome/sobrenome sem padrao'],
    impact: {
      dashboards: 'Melhora leitura de cards e rankings.',
      permissions: 'Nao altera permissao diretamente.',
      reports: 'Aparece em exportacoes e logs.',
      ia: 'Contextualiza respostas e citacoes da IA.',
      operation: 'Facilita identificacao no dia a dia.'
    },
    keywords: ['nome', 'usuario', 'cadastro', 'colaborador']
  },
  {
    id: 'users-role',
    moduleId: 'gestao-usuarios',
    pageRoute: '/app/admin/users',
    pageName: 'Gestao de Usuarios',
    fieldName: 'role',
    label: 'Funcao',
    type: 'select',
    required: true,
    whatIs: 'Papel hierarquico principal do usuario no tenant.',
    purpose: 'Define nivel de acesso e escopo de telas.',
    howToFill: 'Selecione conforme cadeia real: ceo, diretor, gerente, coordenador, supervisor, colaborador.',
    examples: ['ceo para diretor geral', 'supervisor para lider de turno'],
    commonErrors: ['Marcar ceo para usuarios operacionais', 'Usar papel acima da funcao real'],
    impact: {
      dashboards: 'Determina visao e modulos carregados.',
      permissions: 'Afeta guards de hierarquia e acesso.',
      reports: 'Filtra indicadores por nivel.',
      ia: 'Muda profundidade da resposta e prioridade de alertas.',
      operation: 'Controla quem aprova e quem executa.'
    },
    keywords: ['funcao', 'role', 'hierarquia', 'nivel']
  },
  {
    id: 'users-area',
    moduleId: 'gestao-usuarios',
    pageRoute: '/app/admin/users',
    pageName: 'Gestao de Usuarios',
    fieldName: 'area',
    label: 'Area',
    type: 'select',
    required: true,
    whatIs: 'Area macro de atuacao do usuario.',
    purpose: 'Ajusta contexto funcional, linguagem da IA e recortes.',
    howToFill: 'Escolha area existente ou "Outra area" e informe nome da area.',
    examples: ['Direcao', 'Gerencia', 'Manutencao'],
    commonErrors: ['Deixar area generica para equipe tecnica', 'Nao preencher custom_area ao selecionar Outra area'],
    impact: {
      dashboards: 'Influencia widgets e resumo exibido.',
      permissions: 'Complementa filtros de visibilidade.',
      reports: 'Organiza comparativos por area.',
      ia: 'Direciona tom e vocabulario tecnico.',
      operation: 'Melhora roteamento de notificacoes.'
    },
    keywords: ['area', 'setor', 'escopo', 'dashboard']
  },
  {
    id: 'users-supervisor-id',
    moduleId: 'gestao-usuarios',
    pageRoute: '/app/admin/users',
    pageName: 'Gestao de Usuarios',
    fieldName: 'supervisor_id',
    label: 'Supervisor Imediato',
    type: 'select',
    required: false,
    whatIs: 'Vinculo direto do usuario com lider responsavel.',
    purpose: 'Suporta cadeia de aprovacao e leitura hierarquica.',
    howToFill: 'Escolha o lider direto na lista de supervisores ativos.',
    examples: ['Operador vinculado ao Supervisor de Producao'],
    commonErrors: ['Vincular usuario a si mesmo', 'Apontar supervisor inativo'],
    impact: {
      dashboards: 'Permite visao por equipe/lideranca.',
      permissions: 'Apoia filtros por subordinacao.',
      reports: 'Estrutura relatorios de performance por lider.',
      ia: 'Contextualiza recomendacoes por time.',
      operation: 'Organiza escalonamento operacional.'
    },
    keywords: ['supervisor', 'lider', 'hierarquia', 'aprovacao']
  },
  {
    id: 'users-whatsapp',
    moduleId: 'gestao-usuarios',
    pageRoute: '/app/admin/users',
    pageName: 'Gestao de Usuarios',
    fieldName: 'whatsapp_number',
    label: 'WhatsApp',
    type: 'input:tel',
    required: 'obrigatorio para ceo',
    whatIs: 'Numero de contato usado para canais executivos.',
    purpose: 'Habilita fluxos de notificacao e modo executivo.',
    howToFill: 'Use formato internacional com codigo do pais e DDD.',
    examples: ['5531999999999'],
    commonErrors: ['Salvar numero sem DDI', 'Informar menos de 10 digitos para CEO'],
    impact: {
      dashboards: 'Nao altera layout diretamente.',
      permissions: 'Pode participar de verificacoes executivas.',
      reports: 'Aparece em dados de contato.',
      ia: 'Permite experiencias omnichannel.',
      operation: 'Acelera comunicacao de alertas criticos.'
    },
    keywords: ['whatsapp', 'ceo', 'contato', 'executivo']
  },
  {
    id: 'departments-name',
    moduleId: 'departamentos',
    pageRoute: '/app/admin/departments',
    pageName: 'Departamentos',
    fieldName: 'name',
    label: 'Nome',
    type: 'input:text',
    required: true,
    whatIs: 'Nome oficial do departamento/setor.',
    purpose: 'Cria o no principal da estrutura organizacional.',
    howToFill: 'Use nomenclatura padrao da empresa.',
    examples: ['Producao', 'Manutencao', 'Qualidade'],
    commonErrors: ['Usar nomes duplicados com variacao minima', 'Nome muito curto ou generico'],
    impact: {
      dashboards: 'Segmenta cards e filtros.',
      permissions: 'Base para escopo de acesso por area.',
      reports: 'Estrutura visoes por departamento.',
      ia: 'Melhora contexto de recomendacoes.',
      operation: 'Define ownership de processos.'
    },
    keywords: ['departamento', 'setor', 'nome']
  },
  {
    id: 'departments-parent',
    moduleId: 'departamentos',
    pageRoute: '/app/admin/departments',
    pageName: 'Departamentos',
    fieldName: 'parent_department_ids',
    label: 'Departamento Pai',
    type: 'multi-select',
    required: false,
    whatIs: 'Relacionamento com departamento superior.',
    purpose: 'Monta arvore hierarquica organizacional.',
    howToFill: 'Selecione apenas pais validos para evitar ciclos.',
    examples: ['Manutencao Industrial subordinada a Operacoes'],
    commonErrors: ['Criar ciclo entre departamentos', 'Marcar muitos pais sem governanca'],
    impact: {
      dashboards: 'Permite agregacao por arvore.',
      permissions: 'Suporta heranca de escopo.',
      reports: 'Consolida KPIs por nivel.',
      ia: 'Ajuda IA a entender cadeia decisoria.',
      operation: 'Facilita escalonamento intersetorial.'
    },
    keywords: ['departamento pai', 'hierarquia', 'arvore']
  },
  {
    id: 'departments-level',
    moduleId: 'departamentos',
    pageRoute: '/app/admin/departments',
    pageName: 'Departamentos',
    fieldName: 'level',
    label: 'Nivel',
    type: 'select:number',
    required: true,
    whatIs: 'Profundidade hierarquica do departamento.',
    purpose: 'Padroniza governanca entre diretoria e operacao.',
    howToFill: 'Escolha 1 a 5 conforme posicao real.',
    examples: ['1 - Diretoria', '5 - Operacional'],
    commonErrors: ['Inverter nivel estrategico com operacional'],
    impact: {
      dashboards: 'Afeta ordenacao e filtros.',
      permissions: 'Interage com regras de hierarchy.',
      reports: 'Permite cortes por camada.',
      ia: 'Ajusta linguagem por nivel decisorio.',
      operation: 'Organiza fluxo de aprovacoes.'
    },
    keywords: ['nivel', 'hierarquia', 'camada']
  },
  {
    id: 'teams-main-shift',
    moduleId: 'equipes-operacionais',
    pageRoute: '/app/admin/equipes-operacionais',
    pageName: 'Equipes Operacionais',
    fieldName: 'main_shift_label',
    label: 'Turno principal',
    type: 'select',
    required: false,
    whatIs: 'Turno base da equipe.',
    purpose: 'Agrupa membros e atividades por janela operacional.',
    howToFill: 'Selecione o turno predominante (A/B/C ou equivalente).',
    examples: ['Turno A - 06:00 as 14:00'],
    commonErrors: ['Nao alinhar turno da equipe com membros'],
    impact: {
      dashboards: 'Exibe produtividade por turno.',
      permissions: 'Nao altera permissao diretamente.',
      reports: 'Apoia relatorios de atividade por janela.',
      ia: 'Relaciona alertas ao contexto de turno.',
      operation: 'Evita conflito de escala.'
    },
    keywords: ['turno', 'equipe', 'escala']
  },
  {
    id: 'structural-company-role',
    moduleId: 'base-estrutural',
    pageRoute: '/app/admin/structural',
    pageName: 'Base Estrutural',
    fieldName: 'company_role_id',
    label: 'Cargo formal (Base Estrutural)',
    type: 'select',
    required: false,
    whatIs: 'Vinculo do usuario ao cargo padronizado da empresa.',
    purpose: 'Conectar pessoa, responsabilidade formal e modelo operacional.',
    howToFill: 'Escolha cargo ja cadastrado e ativo na Base Estrutural.',
    examples: ['Supervisor de Manutencao'],
    commonErrors: ['Associar cargo inativo', 'Nao manter consistencia entre role e cargo formal'],
    impact: {
      dashboards: 'Melhora personalizacao por responsabilidade.',
      permissions: 'Apoia validacoes de contexto.',
      reports: 'Permite analises por cargo oficial.',
      ia: 'Aumenta precisao na resposta contextual.',
      operation: 'Clarifica ownership por funcao.'
    },
    keywords: ['cargo', 'base estrutural', 'funcao formal']
  },
  {
    id: 'settings-company-policy',
    moduleId: 'conteudo-configuracoes',
    pageRoute: '/app/admin/conteudo-empresa',
    pageName: 'Conteudo da Empresa',
    fieldName: 'companyPolicy',
    label: 'Texto da politica',
    type: 'textarea',
    required: false,
    whatIs: 'Documento base de diretrizes internas.',
    purpose: 'Padroniza condutas e reforca cultura operacional.',
    howToFill: 'Escreva politica objetiva com linguagem institucional.',
    examples: ['Politica de seguranca industrial e resposta a incidentes'],
    commonErrors: ['Texto genérico sem contexto da planta', 'Conteudo desatualizado'],
    impact: {
      dashboards: 'Pode influenciar mensagens institucionais.',
      permissions: 'Nao muda acesso diretamente.',
      reports: 'Serve de referencia em auditorias.',
      ia: 'Orienta respostas com regras internas.',
      operation: 'Reduz divergencia de procedimento.'
    },
    keywords: ['politica', 'empresa', 'diretrizes', 'manual']
  },
  {
    id: 'integrations-endpoint',
    moduleId: 'integracoes',
    pageRoute: '/app/admin/integrations',
    pageName: 'Integracoes',
    fieldName: 'connectorEndpoint',
    label: 'Endpoint do conector',
    type: 'input:url',
    required: true,
    whatIs: 'URL de entrada/saida para integracao externa.',
    purpose: 'Conectar IMPETUS a MES/ERP ou outra fonte.',
    howToFill: 'Informe URL valida e acessivel pelo ambiente do backend.',
    examples: ['https://erp.empresa.com/api/v1/events'],
    commonErrors: ['URL sem HTTPS', 'Endpoint interno inacessivel'],
    impact: {
      dashboards: 'Afeta atualizacao de dados integrados.',
      permissions: 'Exige perfil admin para manutencao.',
      reports: 'Interfere na qualidade dos dados de relatorio.',
      ia: 'Impacta contexto de analise em tempo real.',
      operation: 'Pode bloquear ingestao se mal configurado.'
    },
    keywords: ['integracao', 'endpoint', 'mes', 'erp']
  },
  {
    id: 'logs-severity-filter',
    moduleId: 'logs-auditoria',
    pageRoute: '/app/admin/audit-logs',
    pageName: 'Logs de Auditoria',
    fieldName: 'filters.severity',
    label: 'Severidade',
    type: 'select',
    required: false,
    whatIs: 'Filtro de criticidade do evento de auditoria.',
    purpose: 'Priorizar investigacao de eventos de risco.',
    howToFill: 'Selecione nivel conforme analise do incidente.',
    examples: ['high para tentativa de acesso indevido'],
    commonErrors: ['Analisar logs sem filtro em volume alto'],
    impact: {
      dashboards: 'Pode alimentar cards de seguranca.',
      permissions: 'Disponivel a perfis administrativos.',
      reports: 'Aprimora exportacao para compliance.',
      ia: 'Ajuda sumarizacao de eventos criticos.',
      operation: 'Acelera resposta a incidentes.'
    },
    keywords: ['logs', 'auditoria', 'severidade', 'compliance']
  }
];

function normalize(text) {
  return String(text || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function buildSearchableText(entry) {
  const parts = [
    entry.label,
    entry.fieldName,
    entry.pageName,
    entry.moduleId,
    entry.whatIs,
    entry.purpose,
    ...(entry.examples || []),
    ...(entry.commonErrors || []),
    ...Object.values(entry.impact || {}),
    ...(entry.keywords || [])
  ];
  return normalize(parts.join(' '));
}

const indexedFields = fields.map((entry) => ({
  ...entry,
  searchableText: buildSearchableText(entry)
}));

function searchManual(query, limit = 20) {
  const q = normalize(query).trim();
  if (!q) return indexedFields.slice(0, limit);

  const terms = q.split(/\s+/).filter(Boolean);
  const scored = indexedFields
    .map((item) => {
      let score = 0;
      for (const term of terms) {
        if (item.searchableText.includes(term)) score += 1;
        if (normalize(item.label).includes(term)) score += 2;
        if ((item.keywords || []).some((k) => normalize(k).includes(term))) score += 2;
      }
      return { item, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((entry) => entry.item);

  return scored;
}

module.exports = {
  MANUAL_VERSION,
  modules,
  fields: indexedFields,
  searchManual
};
