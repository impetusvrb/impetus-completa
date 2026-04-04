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
  Settings,
  Wrench,
  Bell,
  User,
  Users,
  Building2,
  ScrollText,
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
  Upload,
  Mic,
  Smartphone,
  Shield,
  Activity,
  ChevronLeft,
  KeyRound,
  Palette,
  Monitor
} from 'lucide-react';
import { companies, onboarding } from '../services/api';
import { useVisibleModules } from '../hooks/useVisibleModules';
import { prefetchRoute } from '../utils/prefetchRoutes';
import OnboardingModal from './OnboardingModal';
import DashboardOnboardingModal from '../features/dashboard/components/DashboardOnboardingModal';
import { resolveMenuRole, isMaintenanceProfile, isColaboradorSimples, isMaintenanceTechnicianMenu } from '../utils/roleUtils';
import ImpetusPulseModal from '../features/pulse/ImpetusPulseModal';
import ImpetusPulseSupervisorModal from '../features/pulse/ImpetusPulseSupervisorModal';
import { useImpetusPulse } from '../features/pulse/useImpetusPulse';
import { useImpetusPulseSupervisor } from '../features/pulse/useImpetusPulseSupervisor';
import { useImpetusVoice } from '../voice/ImpetusVoiceContext';
import chatSidebarIcon from '../assets/chat-sidebar-icon.png';
import './Layout.css';

const IA_FACE_VIDEO = '/ia-face-1.mp4';

/** Na tela de configurações do usuário, sidebar mostra só navegação da conta (sem admin/IA/conteúdo institucional). */
const USER_SETTINGS_FOCUS_NAV = [
  { hash: 'us-perfil', label: 'Perfil', icon: User },
  { hash: 'us-seguranca', label: 'Segurança', icon: Shield },
  { hash: 'us-notificacoes', label: 'Notificações', icon: Bell },
  { hash: 'us-canais', label: 'Canais de acesso', icon: KeyRound },
  { hash: 'us-preferencias', label: 'Preferências', icon: Palette },
  { hash: 'us-dispositivos', label: 'Dispositivos', icon: Monitor }
];

export default function Layout({ children }) {
  const { openOverlay, voiceEnabled: voiceUiEnabled, wakePhraseIssue } = useImpetusVoice();
  const [wakeHttpBannerDismissed, setWakeHttpBannerDismissed] = useState(() => {
    try {
      return sessionStorage.getItem('impetus_wake_http_dismiss') === '1';
    } catch {
      return false;
    }
  });
  const showWakeHttpBanner =
    voiceUiEnabled && wakePhraseIssue === 'insecure' && !wakeHttpBannerDismissed;
  const pulseUi = useImpetusPulse();
  const pulseSup = useImpetusPulseSupervisor();
  const [pulseSupItem, setPulseSupItem] = useState(null);
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

  const pathNormRoot = (location.pathname || '').replace(/\/+$/, '') || '/';
  const isUserSettingsFocus = pathNormRoot === '/app/settings';
  const [settingsNavHash, setSettingsNavHash] = useState('us-perfil');

  useEffect(() => {
    if (!isUserSettingsFocus) return;
    const sync = () => setSettingsNavHash((window.location.hash || '').replace(/^#/, '') || 'us-perfil');
    sync();
    window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, [isUserSettingsFocus, location.pathname]);

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
  const allowManuiaByMaintenance =
    maintenanceProfile &&
    (normalizedPath.startsWith('/app/manutencao/manuia') || normalizedPath.startsWith('/app/manutencao/manuia-app'));

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
      '/app/cadastrar-com-ia',
      '/app/registro-inteligente',
      '/app/chatbot',
      '/chat',
      '/diagnostic',
      '/app/manutencao/manuia',
      '/app/manutencao/manuia-app',
      '/app/biblioteca',
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

  /** Industrial / operacional — filtrado por visible_modules (operational) */
  const MENU_BLOCO_INDUSTRIAL = [
    { path: '/app/centro-operacoes-industrial', icon: Building2, label: 'Centro de Operações' },
    { path: '/app/cerebro-operacional', icon: Brain, label: 'Cérebro operacional' },
    { path: '/app/insights', icon: TrendingUp, label: 'Insights operacionais' }
  ];

  /** Diretor, gerente, coordenador, supervisor — núcleo + módulos operacionais (matriz de perfil no backend) */
  const MENU_LIDERANCA = [
    { path: '/app', icon: LayoutDashboard, label: 'Dashboard · IA integrada' },
    ...MENU_BLOCO_INDUSTRIAL,
    { path: '/app/pulse-gestao', icon: Activity, label: 'Impetus Pulse (visão coletiva)' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
    { path: '/app/biblioteca', icon: FolderOpen, label: 'Instruções e Procedimentos' },
    { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
    { path: '/app/validacao-organizacional', icon: Shield, label: 'Validação organizacional' },
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
    { path: '/app/manutencao/manuia-app', icon: Smartphone, label: 'ManuIA Campo' },
    { path: '/app/manutencao/manuia', icon: Wrench, label: 'ManuIA' },
    { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
    { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
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
      { path: '/app/admin/conteudo-empresa', icon: ScrollText, label: 'Conteúdo da empresa' },
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
      ...MENU_BLOCO_INDUSTRIAL,
      { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
      { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
      { path: '/app/biblioteca', icon: FolderOpen, label: 'Instruções e Procedimentos' },
      { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ],
    colaborador: MENU_COLABORADOR_OPERACIONAL,
    rh: [
      { path: '/app', icon: LayoutDashboard, label: 'Dashboard' },
      { path: '/app/pulse-rh', icon: Activity, label: 'Impetus Pulse (RH)' },
      { path: '/app/proacao', icon: Target, label: 'Pró-Ação' },
      { path: '/app/chatbot', icon: null, label: 'Impetus IA', aiIcon: true },
      { path: '/chat', icon: null, chatIcon: true, label: 'Chat Impetus' },
      { path: '/app/settings', icon: Settings, label: 'Configurações' }
    ],
    ceo: [
      { path: '/app', icon: LayoutDashboard, label: 'Dashboard · IA integrada' },
      ...MENU_BLOCO_INDUSTRIAL,
      { path: '/app/centro-previsao-operacional', icon: TrendingUp, label: 'Centro de Previsão' },
      { path: '/app/centro-custos-industriais', icon: DollarSign, label: 'Centro de Custos' },
      { path: '/app/mapa-vazamento-financeiro', icon: TrendingDown, label: 'Mapa de Vazamento' },
      { path: '/app/cadastrar-com-ia', icon: Upload, label: 'Cadastrar com IA' },
      { path: '/app/biblioteca', icon: FolderOpen, label: 'Biblioteca' },
      { path: '/app/registro-inteligente', icon: FileEdit, label: 'Registro Inteligente' },
      { path: '/app/validacao-organizacional', icon: Shield, label: 'Validação organizacional' },
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

  if (isUserSettingsFocus) {
    menuItems = [
      { path: '/app', icon: ChevronLeft, label: 'Voltar ao painel', settingsBack: true },
      ...USER_SETTINGS_FOCUS_NAV.map((item) => ({ ...item, settingsAnchor: true }))
    ];
  }

  const scrollToSettingsSection = (hash) => {
    const el = document.getElementById(hash);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'start' });
      window.history.replaceState(null, '', `#${hash}`);
      setSettingsNavHash(hash);
    }
  };

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

  const dismissWakeHttpBanner = () => {
    try {
      sessionStorage.setItem('impetus_wake_http_dismiss', '1');
    } catch (_) {}
    setWakeHttpBannerDismissed(true);
  };

  return (
    <div className={`layout${showWakeHttpBanner ? ' layout--wake-hint' : ''}`}>
      {showWakeHttpBanner && (
        <div className="layout-wake-banner" role="status">
          <Mic size={16} aria-hidden />
          <span>
            Comando «Ok Impetus» não está disponível neste endereço (HTTP). Use{' '}
            <strong>HTTPS</strong>, ou abra a IA pelo vídeo no menu, pelo botão de microfone ao lado, ou{' '}
            <kbd>Alt</kbd>+<kbd>Shift</kbd>+<kbd>V</kbd>.
          </span>
          <button type="button" className="layout-wake-banner__close" onClick={dismissWakeHttpBanner} aria-label="Fechar aviso">
            <X size={16} />
          </button>
        </div>
      )}
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
            const pathNorm = location.pathname.replace(/\/+$/, '') || '/';
            if (item.settingsBack) {
              const Icon = item.icon;
              return (
                <Link
                  key="settings-back"
                  to={item.path}
                  className="nav-item nav-item--settings-back"
                  title={item.label}
                >
                  <span className="nav-dot" />
                  <Icon size={18} />
                  {sidebarOpen && <span>{item.label}</span>}
                </Link>
              );
            }
            if (item.settingsAnchor) {
              const Icon = item.icon;
              const isActive = settingsNavHash === item.hash;
              return (
                <a
                  key={item.hash}
                  href={`#${item.hash}`}
                  className={`nav-item ${isActive ? 'active' : ''}`}
                  title={item.label}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToSettingsSection(item.hash);
                  }}
                >
                  <span className="nav-dot" />
                  <Icon size={18} />
                  {sidebarOpen && <span>{item.label}</span>}
                </a>
              );
            }
            const Icon = item.icon;
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
                  : Icon
                  ? <Icon size={18} />
                  : null}
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
            {voiceUiEnabled && (
              <button
                type="button"
                className="icon-btn header-icon-btn header-icon-btn--mic"
                title="IA operacional ao vivo — Alt+Shift+V"
                aria-label="Abrir IA operacional ao vivo"
                onClick={() => void openOverlay()}
              >
                <Mic size={20} />
              </button>
            )}
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

        {pulseUi.motivation && (
          <div className="impetus-pulse-motivation-banner" role="status">
            <Activity size={18} aria-hidden />
            <span>{pulseUi.motivation}</span>
            <button type="button" className="impetus-pulse-motivation-banner__close" onClick={pulseUi.dismissMotivation} aria-label="Fechar">
              ×
            </button>
          </div>
        )}

        {pulseSup.pending?.length > 0 && (
          <div className="impetus-pulse-sup-banner">
            <strong>Impetus Pulse:</strong> {pulseSup.pending.length} complemento(s) de percepção pendente(s).{' '}
            <button type="button" className="link-button" onClick={() => setPulseSupItem(pulseSup.pending[0])}>
              Preencher agora
            </button>
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

      <ImpetusPulseModal
        isOpen={pulseUi.promptOpen}
        evaluation={pulseUi.evaluation}
        onClose={pulseUi.closePrompt}
        onSubmitted={pulseUi.onSubmitted}
      />
      <ImpetusPulseSupervisorModal
        isOpen={!!pulseSupItem}
        item={pulseSupItem}
        onClose={() => setPulseSupItem(null)}
        onDone={() => pulseSup.refresh()}
      />
    </div>
  );
}
