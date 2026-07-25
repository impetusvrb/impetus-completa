import React from 'react';
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

export default function AdminLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const isSocPage = /\/seguranca\/?$/.test(location.pathname);
  const navItems = [
    ['/', 'Dashboard'],
    ['/empresas', 'Empresas'],
    ['/usuarios-internos', 'Usuários internos'],
    ['/logs', 'Logs'],
    ['/conta-seguranca', '2FA da conta'],
    ...(user?.perfil === 'super_admin'
      ? [['/dispositivos-autorizados', 'Dispositivos autorizados']]
      : []),
    ...(user?.perfil === 'super_admin' || user?.perfil === 'admin_suporte'
      ? [['/recuperacao-tenant', 'Recuperação tenant']]
      : []),
    ...(user?.perfil === 'super_admin'
      ? [
          ['/seguranca', 'Centro de Segurança'],
          ['/governanca-ia', 'Governança IA'],
          ['/risco-ia', 'Risco IA'],
          ['/conformidade-ia', 'Conformidade IA']
        ]
      : [])
  ];

  const handleSair = async () => {
    await logout();
    navigate('/login', { replace: true });
  };

  const perfilLabel = {
    super_admin: 'Super admin',
    admin_comercial: 'Comercial',
    admin_suporte: 'Suporte'
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <aside
        className={isSocPage ? 'admin-aside--soc' : undefined}
        style={{
          width: isSocPage ? 185 : 230,
          flexShrink: 0,
          background: 'linear-gradient(180deg, #060f1d, #070c14)',
          borderRight: '1px solid var(--line)',
          padding: isSocPage ? '0.75rem 0' : '1.25rem 0',
          display: 'flex',
          flexDirection: 'column',
          transition: 'width 0.15s ease',
        }}
      >
        <div style={{ padding: isSocPage ? '0 0.7rem 0.6rem' : '0 1.25rem 1rem', borderBottom: '1px solid var(--line)' }}>
          <div style={{ fontWeight: 700, letterSpacing: 2, color: 'var(--cyan)', fontSize: isSocPage ? '0.85rem' : undefined }}>IMPETUS</div>
          <div className="muted" style={{ fontSize: '0.65rem', marginTop: 3 }}>
            {isSocPage ? 'Security' : 'Painel administrativo'}
          </div>
        </div>
        <nav style={{ flex: 1, paddingTop: 8 }}>
          {navItems.map(([to, label]) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/'}
              style={({ isActive }) => ({
                display: 'block',
                padding: isSocPage ? '7px 0.7rem' : '10px 1.25rem',
                fontSize: isSocPage ? '0.78rem' : undefined,
                color: isActive ? 'var(--cyan)' : 'var(--text2)',
                textDecoration: 'none',
                borderLeft: isActive ? '2px solid var(--cyan)' : '2px solid transparent',
                background: isActive ? 'rgba(0, 212, 255, 0.06)' : 'transparent'
              })}
            >
              {label}
            </NavLink>
          ))}
        </nav>
        <div style={{ padding: isSocPage ? '0 0.7rem' : '0 1.25rem' }}>
          <button type="button" className="btn" style={{ width: '100%', fontSize: isSocPage ? '0.78rem' : undefined, padding: isSocPage ? '6px 8px' : undefined }} onClick={handleSair}>
            Sair
          </button>
        </div>
      </aside>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <header
          className={isSocPage ? 'admin-header--soc' : undefined}
          style={{
            height: 54,
            borderBottom: '1px solid var(--line)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            padding: '0 1.5rem',
            background: 'var(--bg1)'
          }}
        >
          <span className="muted" style={{ fontSize: '0.8rem' }}>
            {isSocPage
              ? 'IMPETUS · Security Intelligence Center'
              : 'Gestão comercial e administrativa de clientes'}
          </span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontWeight: 600 }}>{user?.nome}</span>
            <span className="badge" style={{ color: 'var(--text3)' }}>
              {perfilLabel[user?.perfil] || user?.perfil}
            </span>
            <button type="button" className="btn" onClick={handleSair}>
              Sair
            </button>
          </div>
        </header>
        <main className={isSocPage ? 'admin-main--soc' : undefined} style={{ flex: 1, padding: isSocPage ? undefined : '1.5rem', overflow: 'auto' }}>
          <Outlet />
        </main>
      </div>
    </div>
  );
}
