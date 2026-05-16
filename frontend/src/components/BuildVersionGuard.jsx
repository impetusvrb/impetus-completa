import useBuildVersionGuard from '../hooks/useBuildVersionGuard';

/** Wrapper invisível — activa detecção de build stale (sem alterar layout). */
export default function BuildVersionGuard({ children }) {
  useBuildVersionGuard();
  return children;
}
