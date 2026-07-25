import React from 'react';
import EoxDomainNavLayout from '../../../presentation/eox/EoxDomainNavLayout.jsx';
import { useSafetyOperationalNavigation } from '../../../presentation/eox/index.js';

/** ARC-003A — EOX shell + composição original de Segurança (SST). */
export default function SafetyOperationalNavLayout() {
  return <EoxDomainNavLayout useNavigation={useSafetyOperationalNavigation} />;
}
