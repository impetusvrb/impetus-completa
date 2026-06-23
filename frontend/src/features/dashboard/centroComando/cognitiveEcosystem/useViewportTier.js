/**
 * CERT-01.1 — Breakpoints alinhados a CentroComando.css
 * mobile: ≤767px | tablet: 768–1023px | desktop: ≥1024px
 */
import { useEffect, useState } from 'react';

const MQ_MOBILE = '(max-width: 767px)';
const MQ_TABLET = '(min-width: 768px) and (max-width: 1023px)';

function readTier() {
  if (typeof window === 'undefined') {
    return { isMobile: false, isTablet: false, isDesktop: true, width: 1024 };
  }
  const w = window.innerWidth;
  return {
    isMobile: w <= 767,
    isTablet: w >= 768 && w <= 1023,
    isDesktop: w >= 1024,
    width: w
  };
}

export default function useViewportTier() {
  const [tier, setTier] = useState(readTier);

  useEffect(() => {
    const mobileMq = window.matchMedia(MQ_MOBILE);
    const tabletMq = window.matchMedia(MQ_TABLET);
    const update = () => setTier(readTier());
    mobileMq.addEventListener('change', update);
    tabletMq.addEventListener('change', update);
    window.addEventListener('resize', update);
    update();
    return () => {
      mobileMq.removeEventListener('change', update);
      tabletMq.removeEventListener('change', update);
      window.removeEventListener('resize', update);
    };
  }, []);

  return tier;
}
