/**
 * GF-011 — Promoção visual msa_native Z.23 no Centro de Comando.
 */
import React, { Suspense, useMemo } from 'react';
import {
  MSA_HUB_COMPONENTS,
  resolveAllMsaHubsForPromotion
} from '../../../cognitiveRuntime/cockpit/msaNativeCockpitRegistry.js';
import { buildMsaHubContext } from '../../../domains/msa/cockpit/msaRuntimeHubAdapter.js';

function HubSkeleton({ label }) {
  return (
    <div className="cc-widget cc-kpi" style={{ minHeight: 120 }}>
      <div className="cc-kpi__header">
        <span>{label}</span>
      </div>
      <p className="cc-widget__empty" style={{ fontFamily: 'var(--font-mono)', fontSize: 11 }}>
        A carregar módulo MSA…
      </p>
    </div>
  );
}

export default function MsaNativeCockpitPromotion({
  centers = [],
  companyId,
  runtime,
  signalLoader,
  hubContext: hubContextProp
}) {
  const hubs = resolveAllMsaHubsForPromotion(centers);
  const hubContext = useMemo(
    () =>
      hubContextProp ||
      buildMsaHubContext({
        msa_cognitive_centers: centers,
        msa_cognitive_runtime: runtime,
        msa_signal_loader: signalLoader
      }),
    [hubContextProp, centers, runtime, signalLoader]
  );

  if (!hubs.length) return null;

  return (
    <>
      {hubs.map(({ hubKey, label }) => {
        const Hub = MSA_HUB_COMPONENTS[hubKey];
        if (!Hub) return null;
        return (
          <div
            key={hubKey}
            className="cc__cell cc__cell--alive"
            data-msa-native-hub={hubKey}
            data-whisper-focus-surface
            style={{ gridColumn: 'span 2' }}
          >
            <Suspense fallback={<HubSkeleton label={label} />}>
              <Hub hubContext={hubContext} companyId={companyId} />
            </Suspense>
          </div>
        );
      })}
    </>
  );
}
