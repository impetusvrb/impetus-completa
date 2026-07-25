import React, { useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { resolveFinanceWorkspace } from '../experience/financeWorkspaceResolver.js';
import { FINANCE_DOMAIN_IDENTITY } from '../metadata/financeDomainMetadata.js';
import { trackFinanceWorkspaceView, trackFinanceCapabilityNavigate } from '../observability/financeObservability.js';
import FinanceExecutiveDashboard from '../dashboard/FinanceExecutiveDashboard.jsx';

const mono = {
  fontFamily: 'var(--font-mono)',
  fontSize: 11,
  letterSpacing: '0.06em',
  textTransform: 'uppercase'
};

function getUser() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

/**
 * FIN-EVOLVE-002 — Hub = painel executivo + ferramentas (catálogo abaixo).
 */
export default function FinanceWorkspacePage() {
  const user = getUser();
  const workspace = useMemo(() => resolveFinanceWorkspace(user), [user]);

  useEffect(() => {
    trackFinanceWorkspaceView('hub');
  }, []);

  return (
    <div style={{ padding: '0.5rem' }}>
      <div className="impetus-card" style={{ padding: '1rem', borderRadius: 4, marginBottom: '0.75rem' }}>
        <p style={{ ...mono, color: 'var(--cyan)', margin: 0 }}>
          {FINANCE_DOMAIN_IDENTITY.displayName} · Release 2.0
        </p>
        <h2 style={{ margin: '8px 0 4px', fontSize: 18, letterSpacing: '0.04em' }}>
          {workspace.workspaceName}
        </h2>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>
          Estado financeiro da empresa — visão executiva antes das ferramentas operacionais.
        </p>
      </div>

      <FinanceExecutiveDashboard />

      <div style={{ ...mono, color: 'var(--text-tertiary)', margin: '1rem 0 0.5rem', fontSize: 10 }}>
        Ferramentas do domínio · {FINANCE_DOMAIN_IDENTITY.displayName}
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))',
          gap: '0.75rem',
          paddingLeft: '0.5rem',
          borderLeft: '2px solid var(--border-subtle)'
        }}
      >
        {workspace.modules.map((mod) => (
          <Link
            key={mod.id}
            to={mod.path}
            onClick={() => trackFinanceCapabilityNavigate(mod.capabilityId || mod.moduleId, mod.path)}
            className="impetus-card"
            style={{
              padding: '1rem',
              borderRadius: 4,
              textDecoration: 'none',
              color: 'inherit',
              border: '1px solid var(--border-subtle)',
              display: 'block'
            }}
          >
            <h3 style={{ margin: '0 0 6px', fontSize: 15, letterSpacing: '0.03em' }}>{mod.label}</h3>
            <p style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 8px' }}>{mod.subtitle}</p>
            {mod.component && (
              <p style={{ ...mono, color: 'var(--text-tertiary)', fontSize: 10 }}>
                reutiliza: {mod.component}
              </p>
            )}
            {mod.composeOnly && (
              <p style={{ ...mono, color: 'var(--amber)', fontSize: 10, marginTop: 4 }}>
                composição · billing
              </p>
            )}
            {mod.apiContract && (
              <p style={{ ...mono, color: 'var(--green)', fontSize: 10, marginTop: 4 }}>
                {mod.apiContract}
              </p>
            )}
          </Link>
        ))}
      </div>
    </div>
  );
}
