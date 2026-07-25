import React from 'react';
import EoxDomainNavLayout from '../../../presentation/eox/EoxDomainNavLayout.jsx';
import { useLogisticsHubNavigation } from '../../../presentation/eox/index.js';

/** ARC-003A — EOX shell + composição original do hub Logística. */
export default function LogisticsOperationalNavLayout() {
  return <EoxDomainNavLayout useNavigation={useLogisticsHubNavigation} />;
}
