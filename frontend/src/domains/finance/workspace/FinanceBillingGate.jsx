import React from 'react';
import { Navigate } from 'react-router-dom';
import { canAccessFinanceBilling } from '../navigation/financeAccess.js';

function readUser() {
  try {
    return JSON.parse(localStorage.getItem('impetus_user') || '{}');
  } catch {
    return {};
  }
}

/** Reutiliza NexusIACustos — sem reimplementar billing */
export default function FinanceBillingGate({ children }) {
  if (!canAccessFinanceBilling(readUser())) {
    return <Navigate to="/app/finance" replace />;
  }
  return children;
}
