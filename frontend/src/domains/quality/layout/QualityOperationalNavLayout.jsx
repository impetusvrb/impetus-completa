import React from 'react';
import EoxDomainNavLayout from '../../../presentation/eox/EoxDomainNavLayout.jsx';
import { useQualityOperationalNavigation } from '../../../presentation/eox/index.js';

/** ARC-003A — EOX shell + composição original de Qualidade (sem substituir layout interno). */
export default function QualityOperationalNavLayout() {
  return <EoxDomainNavLayout useNavigation={useQualityOperationalNavigation} />;
}
