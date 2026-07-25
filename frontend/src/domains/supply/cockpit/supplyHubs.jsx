import React from 'react';

const mono = { fontFamily: 'var(--font-mono)', fontSize: 11, color: 'var(--text-tertiary)' };

function HubStub({ label }) {
  return (
    <div className="cc-widget cc-kpi" style={{ minHeight: 100 }}>
      <div className="cc-kpi__header"><span>{label}</span></div>
      <p style={mono}>Supply hub — GF-027 homologation</p>
    </div>
  );
}

export function ProcurementOverviewHub() { return <HubStub label="Procurement Overview" />; }
export function SupplierOpsHub() { return <HubStub label="Supplier Ops" />; }
export function InboundOpsHub() { return <HubStub label="Inbound Ops" />; }
export function CommitmentsHub() { return <HubStub label="Commitments" />; }
export function ExceptionsHub() { return <HubStub label="Exceptions" />; }
export function SpendOpsHub() { return <HubStub label="Spend Analysis" />; }
export function NarrativeHub() { return <HubStub label="Narrative" />; }
