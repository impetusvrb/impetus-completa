import React from 'react';
import { useLocation } from 'react-router-dom';
import { SafetyOperationalWorkspace } from '../operational-runtime/SafetyOperationalWorkspace.jsx';

export default function SafetyOperationalWorkspacePage() {
  const location = useLocation();
  return <SafetyOperationalWorkspace key={`${location.pathname}${location.search || ''}`} />;
}
