import React from 'react';
import { Navigate } from 'react-router-dom';
import {
  isQualityKioskRuntimeEnabled,
  isQualityOperationalRuntimeEnabled
} from '../operational-runtime/qualityOperationalFeatureFlags.js';
import { QualityKioskRuntime } from '../operational-runtime/QualityKioskRuntime.jsx';

export default function QualityKioskRuntimePage() {
  if (!isQualityOperationalRuntimeEnabled()) {
    return <Navigate to="/app" replace />;
  }
  if (!isQualityKioskRuntimeEnabled()) {
    return <Navigate to="/app/quality/operational" replace />;
  }
  return <QualityKioskRuntime />;
}
