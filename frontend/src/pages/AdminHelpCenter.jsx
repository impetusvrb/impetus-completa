import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { BookOpen, Sparkles } from 'lucide-react';
import Layout from '../components/Layout';
import { isStrictAdminRole } from '../utils/roleUtils';
import './AdminHelpCenter.css';

const ADMIN_TOPICS = [
  {
    id: 'topic-guia-implantacao',
    label: 'Guia de Implantacao',
    pageRoute: '/app/admin/implantacao-guia',
    pageName: 'Guia de Implantacao',
    whatIs: 'Roteiro oficial de ativacao do sistema no tenant.',
    purpose: 'Orientar a ordem correta: base estrutural, departamentos, usuarios e configuracoes finais.',
    howToFill: 'Siga as etapas na sequencia e conclua cada bloco antes do proximo.',
    keywords: ['implantacao', 'guia', 'ordem de cadastro', 'onboarding admin']
  },
  {
    id: 'topic-gestao-usuarios',
    label: 'Gestao de Usuarios',
    pageRoute: '/app/admin/users',
    pageName: 'Gestao de Usuarios',
    whatIs: 'Tela de cadastro, edicao e desativacao de usuarios.',
    purpose: 'Controlar hierarquia, supervisor, area funcional e acessos.',
    howToFill: 'Cadastre de cima para baixo (CEO ate colaborador), mantendo funcao e supervisor coerentes.',
    keywords: ['usuarios', 'funcao', 'role', 'supervisor', 'hierarquia']
  },
  {
    id: 'topic-proacao',
    label: 'Pro-Acao',
    pageRoute: '/app/proacao',
    pageName: 'Pro-Acao',
    whatIs: 'Modulo de tratamento de ocorrencias e melhorias operacionais.',
    purpose: 'Registrar, avaliar, encaminhar e finalizar acoes de melhoria.',
    howToFill: 'Descreva o problema, contexto, risco e acompanhe fases ate fechamento.',
    keywords: ['pro-acao', 'ocorrencia', 'melhoria', 'acao corretiva']
  },
  {
    id: 'topic-registro-inteligente',
    label: 'Registro Inteligente',
    pageRoute: '/app/registro-inteligente',
    pageName: 'Registro Inteligente',
    whatIs: 'Canal estruturado para registrar fatos operacionais importantes.',
    purpose: 'Manter historico confiavel para analise, auditoria e IA.',
    howToFill: 'Informe descricao objetiva, setor, impacto e evidencias relevantes.',
    keywords: ['registro inteligente', 'registro', 'apontamento', 'historico']
  },
  {
    id: 'topic-cadastrar-ia',
    label: 'Cadastrar com IA',
    pageRoute: '/app/cadastrar-com-ia',
    pageName: 'Cadastrar com IA',
    whatIs: 'Fluxo de cadastro assistido por IA para registrar informacoes operacionais com texto, imagem, audio e contexto.',
    purpose: 'Acelerar o registro de ocorrencias e padronizar dados para dashboards e historico.',
    howToFill: 'Abra o modulo, descreva o evento com detalhes, anexe evidencias quando necessario e confirme o envio.',
    keywords: ['cadastrar com ia', 'cadastra ia', 'cadastro ia', 'registro inteligente', 'ocorrencia']
  },
  {
    id: 'topic-centro-custos',
    label: 'Centro de Custos (Config)',
    pageRoute: '/app/admin/centro-custos',
    pageName: 'Centro de Custos',
    whatIs: 'Cadastro de itens e parametros de custos operacionais.',
    purpose: 'Quantificar perdas, downtime e impacto financeiro por processo/ativo.',
    howToFill: 'Cadastre categoria, nome do item e valores de custo por periodo e impacto.',
    keywords: ['centro de custos', 'custos', 'downtime', 'perda financeira']
  },
  {
    id: 'topic-departamentos',
    label: 'Departamentos',
    pageRoute: '/app/admin/departments',
    pageName: 'Departamentos',
    whatIs: 'Gestao da estrutura organizacional por setor, tipo e nivel.',
    purpose: 'Organizar governanca e relatorios por area.',
    howToFill: 'Defina nome, tipo, nivel e relacao com departamento pai quando houver.',
    keywords: ['departamento', 'setor', 'nivel', 'estrutura']
  },
  {
    id: 'topic-equipes-operacionais',
    label: 'Equipes Operacionais',
    pageRoute: '/app/admin/equipes-operacionais',
    pageName: 'Equipes Operacionais',
    whatIs: 'Cadastro de equipes, membros e acessos coletivos.',
    purpose: 'Gerenciar turnos e estrutura operacional de campo.',
    howToFill: 'Cadastre equipe, turno principal e membros com matricula e perfil.',
    keywords: ['equipe operacional', 'turno', 'matricula', 'login coletivo']
  },
  {
    id: 'topic-base-estrutural',
    label: 'Base Estrutural',
    pageRoute: '/app/admin/structural',
    pageName: 'Base Estrutural',
    whatIs: 'Base mestra de cargos, linhas, ativos, processos e referencias da empresa.',
    purpose: 'Padronizar o contexto que alimenta dashboards e IA.',
    howToFill: 'Cadastre dados da empresa e depois complete modulos estruturais principais.',
    keywords: ['base estrutural', 'cargos', 'ativos', 'linhas', 'processos']
  },
  {
    id: 'topic-conteudo-empresa',
    label: 'Conteudo da Empresa',
    pageRoute: '/app/admin/conteudo-empresa',
    pageName: 'Conteudo da Empresa',
    whatIs: 'Configuracao de politicas, POPs, manuais e contatos de notificacao.',
    purpose: 'Consolidar conhecimento institucional e governanca operacional.',
    howToFill: 'Preencha politica, anexe documentos e configure contatos/visibilidade.',
    keywords: ['conteudo empresa', 'politica', 'pop', 'manual']
  },
  {
    id: 'topic-biblioteca-tecnica',
    label: 'Biblioteca Tecnica',
    pageRoute: '/app/admin/equipment-library',
    pageName: 'Biblioteca Tecnica',
    whatIs: 'Repositorio tecnico de ativos, manuais, modelos 3D e pecas.',
    purpose: 'Apoiar manutencao assistida e consulta tecnica.',
    howToFill: 'Cadastre ativo e envie documentos/modelos com metadados corretos.',
    keywords: ['biblioteca tecnica', 'equipamento', 'modelo 3d', 'peca']
  },
  {
    id: 'topic-logs-auditoria',
    label: 'Logs de Auditoria',
    pageRoute: '/app/admin/audit-logs',
    pageName: 'Logs de Auditoria',
    whatIs: 'Painel de rastreabilidade de acoes e eventos sensiveis.',
    purpose: 'Suportar compliance, seguranca e investigacao de incidentes.',
    howToFill: 'Use filtros de periodo, severidade e termo para localizar eventos.',
    keywords: ['log', 'auditoria', 'compliance', 'seguranca']
  },
  {
    id: 'topic-integracoes',
    label: 'Integracao e Conectividade',
    pageRoute: '/app/admin/integrations',
    pageName: 'Integracoes',
    whatIs: 'Configura conectores e edge para ingestao de dados externos.',
    purpose: 'Integrar o IMPETUS com MES, ERP e fontes industriais.',
    howToFill: 'Cadastre endpoint, modo de recebimento e autenticacao do conector.',
    keywords: ['integracao', 'conector', 'mes', 'erp', 'edge']
  },
  {
    id: 'topic-nexus-custos',
    label: 'Nexus IA - Custos e Carteira',
    pageRoute: '/app/admin/nexusia-custos',
    pageName: 'Nexus IA',
    whatIs: 'Painel de consumo de creditos, recarga e taxas de servico de IA.',
    purpose: 'Controlar custo operacional de uso de recursos inteligentes.',
    howToFill: 'Ajuste taxas por servico, limiar de alerta e acompanhe consumo por periodo.',
    keywords: ['nexus', 'carteira', 'tokens', 'custos ia']
  }
];

const QUESTION_STOPWORDS = new Set([
  'o', 'a', 'os', 'as', 'de', 'do', 'da', 'dos', 'das', 'e', 'ou', 'que', 'qual', 'quais', 'como', 'para', 'por',
  'no', 'na', 'nos', 'nas', 'um', 'uma', 'sobre', 'ser', 'eh', 'é', 'ali', 'isso'
]);

function normalize(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function localSearch(fields, query, limit = 50) {
  const list = Array.isArray(fields) ? fields : [];
  const q = normalize(query).trim();
  if (!q) return list.slice(0, limit);
  const terms = q.split(/\s+/).filter(Boolean);
  const scored = list
    .map((item) => {
      const haystack = normalize(
        [
          item.label,
          item.fieldName,
          item.moduleId,
          item.pageName,
          item.whatIs,
          item.purpose,
          item.howToFill,
          ...(item.keywords || [])
        ].join(' ')
      );
      let score = 0;
      for (const term of terms) {
        if (haystack.includes(term)) score += 1;
        if (normalize(item.label).includes(term)) score += 2;
      }
      return { item, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.item);
  return scored;
}

function askManual(question, corpus) {
  if (!question.trim()) return 'Digite uma pergunta para consultar o manual.';
  const cleaned = normalize(question);
  const terms = cleaned
    .split(/\s+/)
    .filter(Boolean)
    .filter((t) => !QUESTION_STOPWORDS.has(t));

  const matches = localSearch(corpus, terms.join(' '), 5);
  if (!matches.length) {
    return {
      text: 'Nao encontrei um assunto exato. Tente citar o modulo ou objetivo, por exemplo: "usuarios", "departamentos", "pro-acao", "registro inteligente", "integracoes".',
      matches: []
    };
  }
  const top = matches[0];
  return {
    text: `${top.label}: ${top.whatIs} Para que serve: ${top.purpose} Como preencher: ${top.howToFill}`,
    matches
  };
}

export default function AdminHelpCenter() {
  const [question, setQuestion] = useState('');
  const [askText, setAskText] = useState('Digite uma pergunta para consultar o manual.');
  const [askMatches, setAskMatches] = useState([]);
  const adminTopicsVisible = useMemo(() => {
    try {
      const u = JSON.parse(localStorage.getItem('impetus_user') || '{}');
      if (!isStrictAdminRole(u)) {
        return ADMIN_TOPICS.filter((t) => t.id !== 'topic-guia-implantacao');
      }
    } catch {
      /* fallthrough */
    }
    return ADMIN_TOPICS;
  }, []);
  const askCorpus = adminTopicsVisible;

  const handleAsk = (e) => {
    e?.preventDefault?.();
    const response = askManual(question, askCorpus);
    if (typeof response === 'string') {
      setAskText(response);
      setAskMatches([]);
      return;
    }
    setAskText(response.text);
    setAskMatches(response.matches || []);
  };

  return (
    <Layout>
      <section className="admin-help-page">
        <header className="admin-help-header impetus-card">
          <div className="admin-help-header__title">
            <BookOpen size={20} />
            <h1>Central de Ajuda do Admin</h1>
          </div>
          <p>
            Pergunte qualquer assunto do admin e receba explicacao direta do modulo correspondente.
          </p>
          <div className="admin-help-stats">
            <span>{adminTopicsVisible.length} assuntos admin mapeados</span>
            <span>Modo pergunta</span>
            <span>Resposta instantanea</span>
          </div>
        </header>

        <section className="admin-help-ask impetus-card">
          <div className="admin-help-ask__title">
            <Sparkles size={18} />
            <h2>Pergunte ao manual</h2>
          </div>
          <form className="admin-help-search__row" onSubmit={handleAsk}>
            <input
              type="text"
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              placeholder='Ex: "O que e cadastrar com IA?"'
            />
            <button type="submit" className="btn btn-primary">Perguntar</button>
          </form>
          <p className="admin-help-ask__answer">{askText}</p>
          {askMatches.length > 0 ? (
            <p className="admin-help-ask__answer">
              Assuntos relacionados: {askMatches.map((m) => m.label).join(', ')}.
            </p>
          ) : null}
          {askMatches[0]?.pageRoute ? (
            <p className="admin-help-ask__answer">
              Abrir modulo: <Link to={askMatches[0].pageRoute}>{askMatches[0].pageName}</Link>
            </p>
          ) : null}
        </section>
      </section>
    </Layout>
  );
}
