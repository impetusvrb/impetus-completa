import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { AlertTriangle, ArrowRight, CheckCircle2, Clock3, Layers, Users, Building2, Settings } from 'lucide-react';
import { adminDepartments, adminUsers, adminStructural, companies } from '../services/api';
import './ImplementationGuide.css';

const STEP_STATUS = {
  NOT_STARTED: 'nao_iniciado',
  IN_PROGRESS: 'em_andamento',
  DONE: 'concluido'
};

function hasMeaningfulCompanyConfig(company) {
  if (!company || typeof company !== 'object') return false;
  const keys = [
    'company_policy_text',
    'company_description',
    'mission',
    'vision',
    'values_text',
    'operation_rules',
    'organizational_culture',
    'strategic_notes'
  ];
  return keys.some((k) => String(company[k] || '').trim() !== '');
}

function statusLabel(status) {
  if (status === STEP_STATUS.DONE) return 'Concluido';
  if (status === STEP_STATUS.IN_PROGRESS) return 'Em andamento';
  return 'Nao iniciado';
}

export default function ImplementationGuide() {
  const [loading, setLoading] = useState(true);
  const [deptCount, setDeptCount] = useState(0);
  const [userCount, setUserCount] = useState(0);
  const [hasStructuralBase, setHasStructuralBase] = useState(false);
  const [hasFinalConfigs, setHasFinalConfigs] = useState(false);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [depsRes, usersRes, companyRes, structuralRes] = await Promise.allSettled([
          adminDepartments.list(),
          adminUsers.list({ limit: 200 }),
          companies.getMe(),
          adminStructural.getCompanyData()
        ]);

        if (!mounted) return;

        const deps = depsRes.status === 'fulfilled' ? depsRes.value?.data?.data || [] : [];
        const users = usersRes.status === 'fulfilled' ? usersRes.value?.data?.data || [] : [];
        const company = companyRes.status === 'fulfilled' ? companyRes.value?.data?.company || {} : {};
        const structural = structuralRes.status === 'fulfilled' ? structuralRes.value?.data || {} : {};

        setDeptCount(Array.isArray(deps) ? deps.length : 0);
        setUserCount(Array.isArray(users) ? users.length : 0);

        const structuralSignals = [
          structural?.roles,
          structural?.production_lines,
          structural?.assets,
          structural?.processes,
          structural?.products,
          structural?.indicators
        ];
        const structuralHasData = structuralSignals.some((entry) => Array.isArray(entry) && entry.length > 0);
        setHasStructuralBase(structuralHasData);
        setHasFinalConfigs(hasMeaningfulCompanyConfig(company));
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  const steps = useMemo(() => {
    const s1 =
      deptCount > 0 ? STEP_STATUS.DONE : STEP_STATUS.NOT_STARTED;
    const s2 =
      userCount >= 2 ? STEP_STATUS.DONE : userCount === 1 ? STEP_STATUS.IN_PROGRESS : STEP_STATUS.NOT_STARTED;
    const s3 =
      hasStructuralBase ? STEP_STATUS.DONE : STEP_STATUS.NOT_STARTED;
    const s4 =
      hasFinalConfigs ? STEP_STATUS.DONE : STEP_STATUS.NOT_STARTED;

    return [
      {
        id: 1,
        icon: Building2,
        title: 'Departamentos / Setores',
        status: s1,
        description:
          'Comece pela estrutura organizacional. Cadastre departamentos e setores para criar a base do fluxo.',
        ctaLabel: 'Ir para cadastro',
        ctaTo: '/app/admin/departments'
      },
      {
        id: 2,
        icon: Users,
        title: 'Usuarios (hierarquia obrigatoria)',
        status: s2,
        description:
          'Cadastre os usuarios de cima para baixo: CEO, diretor, gerente, coordenador, supervisor e por ultimo colaboradores.',
        ctaLabel: 'Ir para cadastro',
        ctaTo: '/app/admin/users'
      },
      {
        id: 3,
        icon: Layers,
        title: 'Base Estrutural',
        status: s3,
        description:
          'Com os times definidos, organize a base estrutural para consolidar areas, ativos e elementos operacionais.',
        ctaLabel: 'Ir para cadastro',
        ctaTo: '/app/admin/structural'
      },
      {
        id: 4,
        icon: Settings,
        title: 'Finalizacao de configuracoes',
        status: s4,
        description:
          'Finalize com politica da empresa, conteudo da empresa, biblioteca tecnica e demais cadastros complementares.',
        ctaLabel: 'Ir para cadastro',
        ctaTo: '/app/admin/conteudo-empresa',
        extraLinks: [
          { to: '/app/admin/conteudo-empresa', label: 'Conteudo da empresa' },
          { to: '/app/admin/equipment-library', label: 'Biblioteca tecnica' },
          { to: '/app/biblioteca', label: 'Biblioteca de arquivos' }
        ]
      }
    ];
  }, [deptCount, userCount, hasStructuralBase, hasFinalConfigs]);

  const completed = steps.filter((s) => s.status === STEP_STATUS.DONE).length;
  const progress = Math.round((completed / steps.length) * 100);

  return (
    <section className="impl-guide-page">
      <header className="impl-guide-hero">
        <div className="impl-guide-hero__title-row">
          <h1>Guia de Implantacao</h1>
          <span className="impl-guide-progress-pill">{progress}% concluido</span>
        </div>
        <p>
          Este guia orienta a ordem correta de implantacao do sistema. Comece cadastrando os departamentos e setores.
          Em seguida, cadastre os usuarios respeitando a hierarquia de cima para baixo. Depois organize a base
          estrutural. Por ultimo, finalize com politicas da empresa, conteudos, biblioteca tecnica e demais
          configuracoes.
        </p>
        <div className="impl-guide-alert">
          <AlertTriangle size={16} />
          <span>
            Siga a ordem recomendada para garantir consistencia organizacional e evitar retrabalho.
          </span>
        </div>
        <div className="impl-guide-progress">
          <div className="impl-guide-progress__bar">
            <div className="impl-guide-progress__fill" style={{ width: `${progress}%` }} />
          </div>
          <small>{completed} de 4 etapas concluidas</small>
        </div>
      </header>

      <section className="impl-guide-order">
        <h2>Ordem Recomendada de Cadastro</h2>
        <ol>
          <li>Departamentos / Setores</li>
          <li>Usuarios (CEO &gt; Diretor &gt; Gerente &gt; Coordenador &gt; Supervisor &gt; Colaboradores)</li>
          <li>Base Estrutural</li>
          <li>Politica da empresa, conteudo da empresa, biblioteca tecnica e configuracoes complementares</li>
        </ol>
      </section>

      <section className="impl-guide-grid">
        {steps.map((step) => {
          const Icon = step.icon;
          const isDone = step.status === STEP_STATUS.DONE;
          const isInProgress = step.status === STEP_STATUS.IN_PROGRESS;
          return (
            <article key={step.id} className="impl-guide-card">
              <div className="impl-guide-card__top">
                <div className="impl-guide-card__step">
                  <Icon size={18} />
                  <span>Etapa {step.id}</span>
                </div>
                <span className={`impl-guide-status impl-guide-status--${step.status}`}>
                  {isDone ? <CheckCircle2 size={14} /> : <Clock3 size={14} />}
                  {statusLabel(step.status)}
                </span>
              </div>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
              <Link className="impl-guide-card__cta" to={step.ctaTo}>
                {step.ctaLabel}
                <ArrowRight size={15} />
              </Link>
              {step.extraLinks?.length ? (
                <div className="impl-guide-card__links">
                  {step.extraLinks.map((link) => (
                    <Link key={link.to} to={link.to}>
                      {link.label}
                    </Link>
                  ))}
                </div>
              ) : null}
              {isInProgress ? <small className="impl-guide-card__hint">Continue esta etapa antes de avancar.</small> : null}
            </article>
          );
        })}
      </section>

      {loading ? <p className="impl-guide-loading">Atualizando status da implantacao...</p> : null}
    </section>
  );
}
