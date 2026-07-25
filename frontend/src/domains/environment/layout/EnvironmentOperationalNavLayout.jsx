import React from 'react';
import EoxDomainNavLayout from '../../../presentation/eox/EoxDomainNavLayout.jsx';
import { useEnvironmentOperationalNavigation } from '../../../presentation/eox/index.js';

/** ARC-003A — EOX shell + composição original de Meio Ambiente. */
export default function EnvironmentOperationalNavLayout() {
  return <EoxDomainNavLayout useNavigation={useEnvironmentOperationalNavigation} />;
}
