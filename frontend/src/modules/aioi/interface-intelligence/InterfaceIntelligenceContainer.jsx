/**
 * AIOI-P5.7 — Interface Intelligence Container (READ ONLY · composição P5.3)
 */

import React from 'react';
import styles from './styles/InterfaceIntelligence.module.css';
import { useInterfaceIntelligenceViewModel } from './useInterfaceIntelligenceViewModel.js';
import InterfacePerspectiveCard from './InterfacePerspectiveCard.jsx';
import InterfaceConsistencyCard from './InterfaceConsistencyCard.jsx';
import InterfaceCoverageCard from './InterfaceCoverageCard.jsx';
import EnterpriseInterfaceIntelligenceCard from './EnterpriseInterfaceIntelligenceCard.jsx';

function InterfaceStatePanel({ status, error }) {
  return (
    <div
      className={styles.statePanel}
      role="status"
      aria-live="polite"
      data-testid={`interface-intel-state-${status}`}
    >
      {status === 'loading' && (
        <>
          <span className={styles.loadingDot} aria-hidden="true" />
          <p className={styles.stateLabel}>Carregando</p>
          <p className={styles.stateMessage}>A carregar view model P5.3…</p>
        </>
      )}
      {status === 'empty' && (
        <>
          <p className={styles.stateLabel}>Sem tenant</p>
          <p className={styles.stateMessage}>Selecione uma empresa para visualizar interface intelligence.</p>
        </>
      )}
      {status === 'error' && (
        <>
          <p className={styles.stateLabel}>Erro</p>
          <p className={`${styles.stateMessage} ${styles.stateError}`}>{error}</p>
        </>
      )}
    </div>
  );
}

export function InterfaceIntelligenceContainer({ companyId, fetcher }) {
  const { status, viewModel, error, readOnly } = useInterfaceIntelligenceViewModel(companyId, {
    fetcher
  });

  if (status === 'loading' || status === 'idle') {
    return <InterfaceStatePanel status="loading" />;
  }

  if (status === 'empty') {
    return <InterfaceStatePanel status="empty" />;
  }

  if (status === 'error') {
    return <InterfaceStatePanel status="error" error={error} />;
  }

  const data = viewModel?.contract?.data || {};

  return (
    <>
      {readOnly && (
        <div className={styles.readOnlyBadge} data-testid="interface-intel-read-only-badge">
          <span className={styles.readOnlyBadgeDot} aria-hidden="true" />
          Read Only
        </div>
      )}
      <section
        className={styles.grid}
        data-testid="interface-intelligence-grid"
        aria-label="Interface Intelligence"
      >
        <InterfacePerspectiveCard data={data.interface_perspective} />
        <InterfaceConsistencyCard data={data.interface_consistency} />
        <InterfaceCoverageCard data={data.interface_coverage} />
        <EnterpriseInterfaceIntelligenceCard data={data.enterprise_interface_intelligence} />
      </section>
    </>
  );
}

export default InterfaceIntelligenceContainer;
