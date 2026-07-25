import React from 'react';
import EoxDomainNavLayout from '../../../presentation/eox/EoxDomainNavLayout.jsx';
import { useFinanceOperationalNavigation } from './useFinanceOperationalNavigation.js';

/** FIN-EVOLVE-001 — EOX shell Finance (composição · não substitui páginas reutilizadas). */
export default function FinanceNavLayout() {
  return <EoxDomainNavLayout useNavigation={useFinanceOperationalNavigation} />;
}
