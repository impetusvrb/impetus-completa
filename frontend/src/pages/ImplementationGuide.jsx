import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertTriangle, ArrowRight, ArrowLeft, CheckCircle2, Clock3, Layers, Users, Building2, Settings } from 'lucide-react';
import { adminDepartments, adminUsers, adminStructural, adminSettings, equipmentLibraryAdmin } from '../services/api';
import './ImplementationGuide.css';

const STEP_STATUS = {
  NOT_STARTED: 'nao_iniciado',
  IN_PROGRESS: 'em_andamento',
  DONE: 'concluido'
};

function textFilled(value) {
  return String(value || '').trim().length > 0;
}

function scoreToStatus(score) {
  if (score >= 100) return STEP_STATUS.DONE;
  if (score > 0) return STEP_STATUS.IN_PROGRESS;
  return STEP_STATUS.NOT_STARTED;
}

/** Extrai array da resposta axios ({ ok, departments } | { success, data: [] } | { ok, data: [] }). */
function unwrapApiList(result, listKeys = []) {
  const body = result?.data;
  if (!body || typeof body !== 'object') return [];
  for (const key of listKeys) {
    if (Array.isArray(body[key])) return body[key];
  }
  if (body.success === true && Array.isArray(body.data)) return body.data;
  if (body.ok === true && Array.isArray(body.data)) return body.data;
  if (Array.isArray(body.data)) return body.data;
  return [];
}

/** Extrai objeto da resposta axios ({ success, data } | { company }). */
function unwrapApiObject(result) {
  const body = result?.data;
  if (!body || typeof body !== 'object') return {};
  if (body.success === true && body.data && typeof body.data === 'object' && !Array.isArray(body.data)) {
    return body.data;
  }
  if (body.company && typeof body.company === 'object') return body.company;
  return body;
}

/** Etapa 1: cargos + operação (linhas/ativos) + processo/produto/turno. */
function evaluateStructuralBase(refs = {}) {
  const roles = Array.isArray(refs.roles) ? refs.roles.length : 0;
  const lines = Array.isArray(refs.productionLines) ? refs.productionLines.length : 0;
  const assets = Array.isArray(refs.assets) ? refs.assets.length : 0;
  const processes = Array.isArray(refs.processes) ? refs.processes.length : 0;
  const products = Array.isArray(refs.products) ? refs.products.length : 0;
  const shifts = Array.isArray(refs.shifts) ? refs.shifts.length : 0;

  let score = 0;
  if (roles >= 1) score += 10;
  if (roles >= 3) score += 15;
  if (roles >= 5) score += 10;
  if (lines >= 1) score += 25;
  if (assets >= 1) score += 20;
  if (processes >= 1 || products >= 1) score += 10;
  if (shifts >= 1) score += 10;

  const missing = [];
  if (roles < 3) missing.push('cadastre ao menos 3 cargos');
  if (lines < 1 && assets < 1) missing.push('cadastre linhas de producao ou ativos');
  if (processes < 1 && products < 1) missing.push('cadastre processos ou produtos');
  if (shifts < 1) missing.push('cadastre turnos de trabalho');

  return { score: Math.min(100, score), missing };
}

/** Etapa 2: departamentos E setores (ambos obrigatorios para 100%). */
function evaluateOrgStructure(deptCount, sectorCount) {
  let score = 0;
  if (deptCount >= 1) score += 50;
  if (deptCount >= 2) score += 10;
  if (sectorCount >= 1) score += 40;

  const missing = [];
  if (deptCount < 1) missing.push('cadastre departamentos');
  if (sectorCount < 1) missing.push('cadastre setores');
  if (deptCount < 2) missing.push('considere mais de um departamento');

  return { score: Math.min(100, score), missing };
}

/** Etapa 3: hierarquia real (CEO + diretor + demais niveis). */
function evaluateUserHierarchy(users = []) {
  const list = Array.isArray(users) ? users : [];
  const roles = new Set(list.map((u) => String(u.role || '').toLowerCase()));
  const levels = new Set(
    list.map((u) => u.hierarchy_level).filter((l) => l !== null && l !== undefined)
  );

  const has = (role, level) => roles.has(role) || levels.has(level);

  let score = 0;
  if (list.length >= 1) score += 5;
  if (list.length >= 3) score += 10;
  if (list.length >= 5) score += 10;
  if (has('ceo', 0)) score += 25;
  if (has('diretor', 1)) score += 25;
  if (has('gerente', 2)) score += 15;
  if (has('coordenador', 3) || has('supervisor', 4)) score += 10;
  if (has('colaborador', 5)) score += 10;

  const missing = [];
  if (!has('ceo', 0)) missing.push('cadastre o CEO');
  if (!has('diretor', 1)) missing.push('cadastre ao menos um diretor');
  if (!has('gerente', 2)) missing.push('cadastre ao menos um gerente');
  if (!has('coordenador', 3) && !has('supervisor', 4)) {
    missing.push('cadastre coordenador ou supervisor');
  }
  if (!has('colaborador', 5)) missing.push('cadastre colaboradores operacionais');
  if (list.length < 5) missing.push(`faltam usuarios (atual: ${list.length}, recomendado: 5+)`);

  return { score: Math.min(100, score), missing };
}

/** Etapa 4: politica + conteudo institucional + biblioteca tecnica. */
function evaluateFinalConfigs(company = {}, equipmentCount = 0) {
  const policyOk =
    textFilled(company.company_policy_text) || textFilled(company.internal_policy);
  const missionOk = textFilled(company.mission);
  const visionOk = textFilled(company.vision);
  const descriptionOk = textFilled(company.company_description);
  const valuesOk = textFilled(company.values_text);
  const cultureOk = textFilled(company.organizational_culture);
  const contentFields = [missionOk, visionOk, descriptionOk, valuesOk, cultureOk].filter(Boolean).length;

  let score = 0;
  if (policyOk) score += 35;
  if (contentFields >= 1) score += 15;
  if (contentFields >= 2) score += 20;
  if (contentFields >= 3) score += 15;
  if (equipmentCount >= 1) score += 15;

  const missing = [];
  if (!policyOk) missing.push('defina a politica da empresa');
  if (contentFields < 2) missing.push('preencha missao, visao e descricao da empresa');
  if (contentFields < 3) missing.push('complete valores e cultura organizacional');
  if (equipmentCount < 1) missing.push('cadastre equipamentos na biblioteca tecnica');

  return { score: Math.min(100, score), missing };
}

function statusLabel(status) {
  if (status === STEP_STATUS.DONE) return 'Concluido';
  if (status === STEP_STATUS.IN_PROGRESS) return 'Em andamento';
  return 'Nao iniciado';
}

export default function ImplementationGuide() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [users, setUsers] = useState([]);
  const [refs, setRefs] = useState({});
  const [deptCount, setDeptCount] = useState(0);
  const [sectorCount, setSectorCount] = useState(0);
  const [equipmentCount, setEquipmentCount] = useState(0);
  const [companyProfile, setCompanyProfile] = useState({});

  const loadProgress = async () => {
    setLoading(true);
    try {
      const [depsRes, usersRes, companyRes, refsRes, structuralRes, equipmentRes] = await Promise.allSettled([
        adminDepartments.list(),
        adminUsers.list({ limit: 200, active: 'true' }),
        adminSettings.getCompany(),
        adminStructural.getReferences(),
        adminStructural.getCompanyData(),
        equipmentLibraryAdmin.assets.list()
      ]);

      const deps = depsRes.status === 'fulfilled' ? unwrapApiList(depsRes.value, ['departments']) : [];
      const userList = usersRes.status === 'fulfilled' ? unwrapApiList(usersRes.value, ['users']) : [];
      const companySettings = companyRes.status === 'fulfilled' ? unwrapApiObject(companyRes.value) : {};
      const refsData = refsRes.status === 'fulfilled' ? unwrapApiObject(refsRes.value) : {};
      const structuralCompany =
        structuralRes.status === 'fulfilled' ? unwrapApiObject(structuralRes.value) : {};
      const equipmentList =
        equipmentRes.status === 'fulfilled' ? unwrapApiList(equipmentRes.value, ['assets', 'items', 'data']) : [];

      const sectors = Array.isArray(refsData.sectors) ? refsData.sectors : [];

      setUsers(userList);
      setRefs(refsData);
      setDeptCount(deps.length);
      setSectorCount(sectors.length);
      setEquipmentCount(equipmentList.length);
      setCompanyProfile({ ...structuralCompany, ...companySettings });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProgress();
    const onVisible = () => {
      if (document.visibilityState === 'visible') loadProgress();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const steps = useMemo(() => {
    const s1Eval = evaluateStructuralBase(refs);
    const s2Eval = evaluateOrgStructure(deptCount, sectorCount);
    const s3Eval = evaluateUserHierarchy(users);
    const s4Eval = evaluateFinalConfigs(companyProfile, equipmentCount);

    const buildStep = (id, icon, title, description, ctaTo, evaluation, extraLinks) => ({
      id,
      icon,
      title,
      description,
      ctaLabel: 'Ir para cadastro',
      ctaTo,
      extraLinks,
      score: evaluation.score,
      status: scoreToStatus(evaluation.score),
      missing: evaluation.missing
    });

    return [
      buildStep(
        1,
        Layers,
        'Base Estrutural',
        'Comece organizando a base estrutural para consolidar areas, ativos e elementos operacionais.',
        '/app/admin/structural',
        s1Eval
      ),
      buildStep(
        2,
        Building2,
        'Departamentos / Setores',
        'Cadastre departamentos e setores para estruturar a organizacao e o fluxo das areas.',
        '/app/admin/departments',
        s2Eval
      ),
      buildStep(
        3,
        Users,
        'Usuarios (hierarquia obrigatoria)',
        'Cadastre os usuarios de cima para baixo: CEO, diretor, gerente, coordenador, supervisor e por ultimo colaboradores.',
        '/app/admin/users',
        s3Eval
      ),
      buildStep(
        4,
        Settings,
        'Finalizacao de configuracoes',
        'Finalize com politica da empresa, conteudo da empresa, biblioteca tecnica e demais cadastros complementares.',
        '/app/admin/conteudo-empresa',
        s4Eval,
        [
          { to: '/app/admin/conteudo-empresa', label: 'Conteudo da empresa' },
          { to: '/app/admin/equipment-library', label: 'Biblioteca tecnica' },
          { to: '/app/biblioteca', label: 'Biblioteca de arquivos' }
        ]
      )
    ];
  }, [deptCount, sectorCount, users, refs, companyProfile, equipmentCount]);

  const completed = steps.filter((s) => s.score >= 100).length;
  const progress = Math.round(steps.reduce((sum, s) => sum + s.score, 0) / steps.length);
  const handleGoBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
      return;
    }
    navigate('/app');
  };

  return (
    <section className="impl-guide-page">
      <header className="impl-guide-hero">
        <button type="button" className="impl-guide-back-btn" onClick={handleGoBack}>
          <ArrowLeft size={14} />
          Voltar
        </button>
        <div className="impl-guide-hero__title-row">
          <h1>Guia de Implantacao</h1>
          <span className="impl-guide-progress-pill">{progress}% concluido</span>
        </div>
        <p>
          Este guia orienta a ordem correta de implantacao do sistema. Comece pela base estrutural. Em seguida,
          cadastre departamentos e setores. Depois, cadastre os usuarios respeitando a hierarquia de cima para baixo.
          Por ultimo, finalize com politicas da empresa, conteudos, biblioteca tecnica e demais
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
          <li>Base Estrutural</li>
          <li>Departamentos / Setores</li>
          <li>Usuarios (CEO &gt; Diretor &gt; Gerente &gt; Coordenador &gt; Supervisor &gt; Colaboradores)</li>
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
              <p className="impl-guide-card__score">{step.score}% desta etapa</p>
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
              {step.missing?.length && step.score < 100 ? (
                <ul className="impl-guide-card__missing">
                  {step.missing.slice(0, 3).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              ) : null}
            </article>
          );
        })}
      </section>

      {loading ? <p className="impl-guide-loading">Atualizando status da implantacao...</p> : null}
    </section>
  );
}
