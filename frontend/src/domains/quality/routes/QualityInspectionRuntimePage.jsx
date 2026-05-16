import React from 'react';
import { QualityInspectionRuntime } from '../operational-runtime/QualityInspectionRuntime.jsx';
import { QualityOfflineRuntime } from '../operational-runtime/QualityOfflineRuntime.jsx';

export default function QualityInspectionRuntimePage() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <QualityOfflineRuntime />
      <QualityInspectionRuntime />
    </div>
  );
}
