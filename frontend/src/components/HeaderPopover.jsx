/**
 * UI-GLOBAL-OVERLAY-001 — Popover global do cabeçalho (portal + viewport-aware).
 * Usado por Notificações, Perfil, Ajuda e demais menus do header.
 */
import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './HeaderPopover.css';

const GAP = 8;
const VIEWPORT_MARGIN = 8;
const Z_INDEX = 6500;
const SAFE_BUFFER = 12;

function getViewportBox() {
  const vv = window.visualViewport;
  if (vv) {
    return {
      width: vv.width,
      height: vv.height,
      offsetTop: vv.offsetTop,
      offsetLeft: vv.offsetLeft
    };
  }
  return {
    width: window.innerWidth,
    height: window.innerHeight,
    offsetTop: 0,
    offsetLeft: 0
  };
}

function computePopoverStyle(anchorEl, panelEl) {
  const rect = anchorEl.getBoundingClientRect();
  const panelRect = panelEl.getBoundingClientRect();
  const panelW = panelRect.width || Math.min(320, window.innerWidth - VIEWPORT_MARGIN * 2);
  const { width: vw, height: vh, offsetTop, offsetLeft } = getViewportBox();

  const safeTop = SAFE_BUFFER;
  const safeBottom = SAFE_BUFFER;
  const safeLeft = SAFE_BUFFER;
  const safeRight = SAFE_BUFFER;

  const margin = VIEWPORT_MARGIN;
  const minLeft = offsetLeft + margin + safeLeft;
  const maxRight = offsetLeft + vw - margin - safeRight;

  let left = rect.right - panelW;
  left = Math.max(minLeft, Math.min(left, maxRight - panelW));

  const spaceBelow = offsetTop + vh - rect.bottom - margin - safeBottom - GAP;
  const spaceAbove = rect.top - offsetTop - margin - safeTop - GAP;
  const placeBelow = spaceBelow >= spaceAbove;

  const maxHeight = Math.max(96, Math.floor(placeBelow ? spaceBelow : spaceAbove));

  let top;
  let transform;
  if (placeBelow) {
    top = rect.bottom + GAP;
    transform = 'none';
  } else {
    top = rect.top - GAP;
    transform = 'translateY(-100%)';
  }

  return {
    style: {
      position: 'fixed',
      top: `${top}px`,
      left: `${left}px`,
      maxHeight: `${maxHeight}px`,
      transform,
      zIndex: Z_INDEX
    },
    placement: placeBelow ? 'below' : 'above'
  };
}

export default function HeaderPopover({
  open,
  anchorRef,
  title,
  header,
  children,
  className = '',
  id,
  'aria-label': ariaLabel
}) {
  const panelRef = useRef(null);
  const [position, setPosition] = useState({ style: {}, placement: 'below' });
  const [ready, setReady] = useState(false);

  const reposition = useCallback(() => {
    const anchor = anchorRef?.current;
    const panel = panelRef.current;
    if (!anchor || !panel || !open) return;
    setPosition(computePopoverStyle(anchor, panel));
    setReady(true);
  }, [anchorRef, open]);

  useLayoutEffect(() => {
    if (!open) {
      setReady(false);
      return undefined;
    }
    reposition();
    const raf = requestAnimationFrame(reposition);
    return () => cancelAnimationFrame(raf);
  }, [open, reposition, title, header, children]);

  useEffect(() => {
    if (!open) return undefined;
    const onViewportChange = () => reposition();
    window.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('resize', onViewportChange);
    window.visualViewport?.addEventListener('scroll', onViewportChange);
    window.addEventListener('scroll', onViewportChange, true);
    return () => {
      window.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('resize', onViewportChange);
      window.visualViewport?.removeEventListener('scroll', onViewportChange);
      window.removeEventListener('scroll', onViewportChange, true);
    };
  }, [open, reposition]);

  useEffect(() => {
    if (!open) return undefined;
    document.documentElement.classList.add('impetus-header-popover-open');
    return () => {
      document.documentElement.classList.remove('impetus-header-popover-open');
    };
  }, [open]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      ref={panelRef}
      id={id}
      className={`header-popover header-dropdown ${className} header-popover--${position.placement}${
        ready ? ' header-popover--ready' : ''
      }`}
      style={position.style}
      role="dialog"
      aria-label={ariaLabel || title || 'Menu do cabeçalho'}
    >
      {title ? <h4 className="header-dropdown__title header-popover__title">{title}</h4> : null}
      {header ? <div className="header-popover__header">{header}</div> : null}
      <div className="header-popover__body">{children}</div>
    </div>,
    document.body
  );
}
