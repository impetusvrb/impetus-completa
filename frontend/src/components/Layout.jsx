/**
 * LAYOUT PRINCIPAL
 * Sidebar + Header + Conteúdo
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate, Navigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Zap,
  MessageSquare, 
  Brain, 
  MapPin, 
  Settings,
  Wrench,
  Bell,
  User,
  Users,
  Building2,
  FileText,
  FolderOpen,
  HelpCircle,
  LogOut,
  Menu,
  X,
  Target,
  AlertTriangle,
  Mail,
  ExternalLink,
  Layers,
  FileEdit,
  ClipboardList,
  Cpu,
  TrendingUp,
  TrendingDown,
  DollarSign,
  Package,
  Truck,
  Upload,
  Mic
} from 'lucide-react';
import { companies, onboarding } from '../services/api';
import { useVisibleModules } from '../hooks/useVisibleModules';
import { prefetchRoute } from '../utils/prefetchRoutes';
import OnboardingModal from './OnboardingModal';
import DashboardOnboardingModal from '../features/dashboard/components/DashboardOnboardingModal';
import { resolveMenuRole, isMaintenanceProfile, isColaboradorSimples, isMaintenanceTechnicianMenu } from '../utils/roleUtils';
import { useImpetusVoice } from '../voice/ImpetusVoiceContext';
import chatSidebarIcon from '../assets/chat-sidebar-icon.png';
import './Layout.css';

const IA_FACE_VIDEO = '/ia-face-1.mp4';

export default function Layout({ children }) {
  const { openOverlay } = useImpetusVoice();
  const [onboardingState, setOnboardingState] = useState({ show: false, tipo: null });
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [notificationCount] = useState(0);
  const [subscriptionOverdue, setSubscriptionOverdue] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  const [showHelp, setShowHelp] = useState(false);
  const [currentTime, setCurrentTime] = useState(() => {
    const now = new Date();
    return `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;
  });
  const headerDropdownRef = useRef(null);

  useEffect(() => {
    const tick = () => {
      const now = new Date();
      setCurrentTime(`${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`);
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  const iaVideoSrc = IA_FACE_VIDEO;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (headerDropdownRef.current && !headerDropdownRef.current.contains(e.target)) {
        setShowNotifications(false);
        setShowProfile(false);
        setShowHelp(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    companies.getMe().then((r) => {
      if (r?.data?.company?.subscription_status === 'overdue') {
        setSubscriptionOverdue(true);
      }
    }).catch(() => {});
  }, []);

  useEffect(() => {
    onboarding.getStatus().then((r) => {
      if (r?.data?.needsOnboarding && r?.data?.activeType) {
        setOnboardingState({ show: true, tipo: r.data.activeType });
      }
    }).catch(() => {});
  }, []);

  const handleMainOnboardingComplete = () => {
    setOnboardingState({ show: false, tipo: null });
  };


  
  // Pegar dados do usuário do localStorage
  const userStr = localStorage.getItem('impetus_user');
  const user = userStr ? JSON.parse(userStr) : { name: 'Usuário', role: 'colaborador' };

  const role = resolveMenuRole(user);
  const maintenanceProfile = isMaintenanceProfile(user);
  const { filterMenu, canAccessPath, loading: modulesLoading } = useVisibleModules();

  const rawPath = location.pathname || '/';
  const normalizedPath = rawPath.replace(/\/+$/, '') || '/';
  const allowManuiaByMaintenance = maintenanceProfile && normalizedPath.startsWith('/app/manutencao/manuia');

  let pathOk = canAccessPath(location.pathname);
  if (isColaboradorSimples(user)) {
    const allowedOperacional = [
      '/app',
      '/app/proacao',
      '/app/cadastrar-com-ia',
      '/app/biblioteca',
      '/app/registro-inteligente',
      '/app/chatbot',
      '/chat',
      '/app/settings'
    ];
    pathOk =
      allowedOperacional.includes(normalizedPath) || normalizedPath.startsWith('/app/proacao/');
  } else if (isMaintenanceTechnicianMenu(user)) {
    const allowMaint = [
      '/app',
      '/app/proacao',
      '/app/registro-inteligente',
      '/app/chatbot',
      '/chat',
      '/diagnostic',
      '/app/manutencao/manuia',
      '/app/biblioteca',
      '/app/almoxarifado-inteligente',
      '/app/settings'
    ];
    pathOk = allowMaint.includes(normalizedPath) || normalizedPath.startsWith('/app/proacao/');
  }

  if (!modulesLoading && !allowManuiaByMaintenance && !pathOk) {
    if ((user.role || '').toLowerCase() === 'admin') return <Navigate to="/app/chatbot" replace state={{ from: location }} />;
    if (isColaboradorSimples(user)) return <Navigate to="/app" replace state={{ from: location }} />;
    return <Navigate to="/app" replace state={{ from: location }} />;
  }
  if (!modulesLoading && location.pathname === '/app' && role === 'admin') return <Navigate to="/app/chatbot" replace />;

  /** Diretor, gerente, coordenador, supervisor — mesmo núcleo (sem Operacional, sem base estrutural) */
  const MENU_LIDERANCA = [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
    { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
    { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];

  /** Colaborador operacional (sem manutenção): dashboard + turno — não confundir com técnico de manutenção */
  const MENU_COLABORADOR_OPERACIONAL = [
    { path: '/app', icon: LayoutDashboard, label: 'Meu Dashboard' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Instruções e Procedimentos' },
    { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
    { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
    { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];

  /** Mecânico / eletricista / eletromecânico — dashboard técnico + ferramentas de campo */
  const MENU_MANUTENCAO_TECNICO = [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
    { path: '/app/manutencao/manuia', icon: Wrench, label: 'ManuIA' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
    { path: '/diagnostic', icon: ClipboardList, label: 'Diagnóstico / OS' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Manuais e Biblioteca' },
    { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
    { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
    { path: '/app/settings', icon: Settings, label: 'Configurações' }
  ];

  const MENUS = {
    admin: [
      { path: '/app/admin/users', icon: Users, label: 'Gestão de Usuários' },
      { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
      { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
      { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
      { path: '/app/admin/centro-custos', icon: DollarSign, label: 'Centro de Custos (Config)' },
      { path: '/app/admin/departments', icon: Building2, label: 'Departamentos' },
      { path: '/app/admin/structural', icon: Layers, label: 'Base Estrutural' },
      { path: '/app/admin/equipment-library', icon: Package, label: 'Biblioteca técnica' },
      { path: '/app/biblioteca', icon: FolderOpen, label: 'Biblioteca de Arquivos' },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Interno' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/app/admin/audit-logs', icon: FileText, label: 'Logs de Auditoria' },
      { path: '/app/admin/integrations', icon: Zap, label: 'Integração e Conectividade' },
      { path: '/app/admin/nexusia-custos', icon: Cpu, label: 'Nexus IA — Custos e carteira' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ],
    diretor: MENU_LIDERANCA,
    gerente: MENU_LIDERANCA,
    coordenador: MENU_LIDERANCA,
    supervisor: MENU_LIDERANCA,
    operador: [
      { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
      { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
      { path: '/app/biblioteca', icon: FolderOpen, label: 'Instruções e Procedimentos' },
      { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ],
    colaborador: MENU_COLABORADOR_OPERACIONAL,
    ceo: [
      { path: '/app', icon: LayoutDashboard, label: 'Visão Executiva' },
      { path: '/app/centro-previsao-operacional', icon: TrendingUp, label: 'Centro de Previsão' },
      { path: '/app/centro-custos-industriais', icon: DollarSign, label: 'Centro de Custos' },
      { path: '/app/mapa-vazamento-financeiro', icon: TrendingDown, label: 'Mapa de Vazamento' },
      { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Interno' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ]
  };

  let baseMenuItems;
  if (isMaintenanceTechnicianMenu(user)) {
    baseMenuItems = MENU_MANUTENCAO_TECNICO;
  } else {
    baseMenuItems = MENUS[role] || MENU_COLABORADOR_OPERACIONAL;
  }

  let menuItems = filterMenu(baseMenuItems);

  const handleLogout = () => {
    localStorage.removeItem('impetus_token');
    localStorage.removeItem('impetus_user');
    navigate('/');
  };

  const getFormattedDate = () => {
    const days = ['Domingo', 'Segunda-feira', 'Terça-feira', 'Quarta-feira', 'Quinta-feira', 'Sexta-feira', 'Sábado'];
    const months = ['Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho', 'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'];
    
    const now = new Date();
    const dayName = days[now.getDay()];
    const day = now.getDate();
    const month = months[now.getMonth()];
    
    return `${dayName}, ${day} de ${month}`;
  };

  return (
    <div className="layout">
      {/* Sidebar - Redesign IMPETUS */}
      <aside className={`sidebar ${sidebarOpen ? 'open' : 'closed'}`}>
        <div className="logo-area">
          {sidebarOpen ? (
            <>
              <button
                type="button"
                className="logo-ia-trigger"
                onClick={openOverlay}
                title="Abrir Impetus IA"
                aria-label="Abrir Impetus IA"
              >
                <video
                  className="logo-ia-face logo-ia-face--large"
                  src={iaVideoSrc}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="auto"
                />
              </button>
            </>
          ) : (
            <button
              type="button"
              className="logo-ia-trigger"
              onClick={openOverlay}
              title="Abrir Impetus IA"
              aria-label="Abrir Impetus IA"
            >
              <video
                className="logo-ia-face logo-ia-face--mini"
                src={iaVideoSrc}
                autoPlay
                muted
                loop
                playsInline
                preload="auto"
              />
            </button>
          )}
        </div>

        <nav className="sidebar-nav">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const pathNorm = location.pathname.replace(/\/+$/, '') || '/';
            const itemNorm = item.path.replace(/\/+$/, '') || '/';
            const isActive = pathNorm === itemNorm;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
                title={item.label}
                onMouseEnter={() => prefetchRoute(item.path)}
              >
                <span className="nav-dot" />
                {item.aiIcon
                  ? (
                    <video
                      className="nav-item-ia-icon"
                      src={iaVideoSrc}
                      autoPlay
                      muted
                      loop
                      playsInline
                      preload="auto"
                    />
                  )
                  : item.chatIcon
                  ? <img src={chatSidebarIcon} alt="Chat" className="nav-item-chat-icon" />
                  : <Icon size={18} />}
                {sidebarOpen && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <button 
          className="sidebar-toggle"
          onClick={() => setSidebarOpen(!sidebarOpen)}
        >
          {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </aside>

      {/* Main Content */}
      <div className="main-content">
        {/* Topbar - Redesign IMPETUS */}
        <header className="topbar header">
          <div className="header-left">
            <div className="welcome greeting">
              Bem-vindo, <span>{user.name}</span>
            </div>
            <p className="datetime date-time" title="Data e hora atual">
              {getFormattedDate()} {currentTime}
            </p>
          </div>

          <div className="topbar-brand-center" aria-hidden="true">
            <span className="topbar-brand-center__text">IMPETUS</span>
            <span className="topbar-brand-center__sub">Plataforma de Inteligência Operacional Industrial</span>
          </div>

          <div className="header-right" ref={headerDropdownRef}>
            <div className="sys-status" title="Status do sistema">
              <span className="pulse" />
              SISTEMA ATIVO
            </div>
            <div className="header-dropdown-wrapper">
              <button
                className={`icon-btn header-icon-btn ${showNotifications ? 'active' : ''} ${notificationCount > 0 ? 'has-alert' : ''}`}
                title="Notificações"
                onClick={() => { setShowNotifications(!showNotifications); setShowProfile(false); setShowHelp(false); }}
                aria-expanded={showNotifications}
              >
                <Bell size={20} />
                {notificationCount > 0 && (
                  <span className="notification-badge">{notificationCount}</span>
                )}
              </button>
              {showNotifications && (
                <div className="header-dropdown">
                  <h4 className="header-dropdown__title">Notificações</h4>
                  <div className="header-dropdown__empty">
                    <Mail size={32} />
                    <p>Nenhuma notificação nova</p>
                    <span className="header-dropdown__hint">Alertas e comunicados aparecerão aqui</span>
                  </div>
                </div>
              )}
            </div>

            <div className="header-dropdown-wrapper">
              <button
                className={`icon-btn header-icon-btn ${showProfile ? 'active' : ''}`}
                title="Perfil"
                onClick={() => { setShowProfile(!showProfile); setShowNotifications(false); setShowHelp(false); }}
                aria-expanded={showProfile}
              >
                <User size={20} />
              </button>
              {showProfile && (
                <div className="header-dropdown">
                  <h4 className="header-dropdown__title">Meu perfil</h4>
                  <div className="header-dropdown__profile">
                    <div className="header-dropdown__profile-avatar">
                      <User size={24} />
                    </div>
                    <div className="header-dropdown__profile-info">
                      <strong>{user.name}</strong>
                      <span>{user.email || '—'}</span>
                      <span className="header-dropdown__role">{user.role || user.area || 'Usuário'}</span>
                    </div>
                  </div>
                  <Link
                    to="/app/settings"
                    className="header-dropdown__link"
                    onClick={() => setShowProfile(false)}
                  >
                    <Settings size={16} /> Configurações
                  </Link>
                </div>
              )}
            </div>

            <div className="header-dropdown-wrapper">
              <button
                className={`icon-btn header-icon-btn ${showHelp ? 'active' : ''}`}
                title="Ajuda"
                onClick={() => { setShowHelp(!showHelp); setShowNotifications(false); setShowProfile(false); }}
                aria-expanded={showHelp}
              >
                <HelpCircle size={20} />
              </button>
              {showHelp && (
                <div className="header-dropdown">
                  <h4 className="header-dropdown__title">Ajuda e suporte</h4>
                  <Link
                    to="/app/chatbot"
                    className="header-dropdown__link"
                    onClick={() => setShowHelp(false)}
                  >
                    <MessageSquare size={16} /> Chat com Impetus
                  </Link>
                  <a
                    href="mailto:suporte@impetus.com.br"
                    className="header-dropdown__link"
                    onClick={() => setShowHelp(false)}
                  >
                    <Mail size={16} /> Contato por e-mail
                  </a>
                  <a
                    href="#"
                    className="header-dropdown__link"
                    onClick={(e) => { e.preventDefault(); setShowHelp(false); }}
                  >
                    <ExternalLink size={16} /> Documentação
                  </a>
                </div>
              )}
            </div>

            <button 
              className="icon-btn header-icon-btn"
              title="Sair"
              onClick={handleLogout}
            >
              <LogOut size={18} />
            </button>
          </div>
        </header>

        {subscriptionOverdue && (
          <div className="subscription-overdue-banner">
            <AlertTriangle size={20} />
            <span>Assinatura em atraso. Regularize o pagamento para manter o acesso.</span>
            <Link to="/subscription-expired" className="subscription-overdue-banner__link">Ver detalhes</Link>
          </div>
        )}

        {/* Content */}
        <main className="content">
          {children}
        </main>
      </div>

      {onboardingState.show && onboardingState.tipo ? (
        <OnboardingModal
          tipo={onboardingState.tipo}
          onComplete={handleMainOnboardingComplete}
        />
      ) : null}
      {!onboardingState.show && (
        <DashboardOnboardingModal onComplete={() => {}} />
      )}
    </div>
  );
}
