import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import EoxActionBar from './EoxActionBar.jsx';
import { EOX_PHASE, mono } from './eoxTokens.js';
import {
  trackEoxHeaderRender,
  trackEoxBreadcrumbNavigation,
  trackEoxDomainReturn,
  trackEoxGlobalReturn
} from './eoxObservability.js';
import '../operational-navigation/operational-navigation.css';
import './eox.css';

/**
 * ARC-003 — Cabeçalho corporativo único (breadcrumb integrado + retornos + meta + acções).
 */
export default function EoxHeader({
  module: moduleLabel,
  subtitle,
  version,
  phase,
  breadcrumb = [],
  backTarget,
  ccBackTarget = null,
  domainId,
  deepLink = null,
  actions = [],
  onAction,
  actionBarDisabled = false
}) {
  const backShort = backTarget?.shortLabel || backTarget?.label?.replace(/^Voltar para\s+/i, '') || 'Domínio';

  useEffect(() => {
    trackEoxHeaderRender({ domainId, module: moduleLabel, phase: phase || EOX_PHASE });
  }, [domainId, moduleLabel, phase]);

  return (
    <header
      className="eox-header operational-navigation-header"
      data-eox-phase={EOX_PHASE}
      data-eox-domain={domainId}
      role="banner"
      aria-label="Cabeçalho operacional EOX"
    >
      <div className="eox-top-row onx-top-row">
        <nav className="eox-breadcrumb onx-breadcrumb" aria-label="Breadcrumb">
          <ol className="eox-breadcrumb-list onx-breadcrumb-list">
            {breadcrumb.map((item, i) => (
              <li key={`${item.label}-${i}`} className="eox-breadcrumb-item onx-breadcrumb-item">
                {item.current ? (
                  <span className="eox-breadcrumb-current onx-breadcrumb-current" aria-current="page" title={item.title}>
                    {item.label}
                  </span>
                ) : (
                  <Link
                    to={item.path}
                    className="eox-breadcrumb-link onx-breadcrumb-link"
                    title={item.title}
                    onClick={() => trackEoxBreadcrumbNavigation(item)}
                  >
                    {item.label}
                  </Link>
                )}
                {i < breadcrumb.length - 1 && (
                  <span className="eox-breadcrumb-sep onx-breadcrumb-sep" aria-hidden="true">
                    ›
                  </span>
                )}
              </li>
            ))}
          </ol>
        </nav>

        <div className="eox-top-actions onx-top-actions">
          {ccBackTarget?.path && (
            <Link
              to={ccBackTarget.path}
              className="eox-back-link onx-back-link onx-back-link--cc"
              title={ccBackTarget.label}
              onClick={() => trackEoxGlobalReturn(ccBackTarget)}
            >
              ← {ccBackTarget.shortLabel || 'Centro Cognitivo'}
            </Link>
          )}
          {backTarget?.path && (
            <Link
              to={backTarget.path}
              className="eox-back-link onx-back-link onx-back-link--domain"
              title={backTarget.label}
              onClick={() => trackEoxDomainReturn(backTarget)}
            >
              ← {backShort}
            </Link>
          )}
        </div>
      </div>

      <div className="eox-title-row">
        <div className="eox-title-block onx-title-block">
          <h1 className="eox-module-title onx-module-title">{moduleLabel}</h1>
          {subtitle && <p className="eox-subtitle onx-subtitle">{subtitle}</p>}
          {(version || phase) && (
            <p className="eox-meta onx-meta">
              {[version, phase].filter(Boolean).join(' · ')}
            </p>
          )}
        </div>
        {(actions.length > 0 || onAction) && (
          <EoxActionBar actions={actions} onAction={onAction} disabled={actionBarDisabled} />
        )}
      </div>

      {deepLink?.source && (
        <div className="eox-deeplink-slot onx-deeplink-slot" data-eox-deeplink="reserved">
          <span style={{ ...mono, fontSize: 9, color: 'var(--text-tertiary)' }}>Deep link · {deepLink.source}</span>
        </div>
      )}
    </header>
  );
}
