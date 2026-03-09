/**
 * CARD UI Component
 * Base para cards com estados hover e active
 */
import React from 'react';
import clsx from 'clsx';
import './Card.css';

export default function Card({ 
  children, 
  className, 
  hoverable = true, 
  active = false, 
  onClick,
  padding = 'md' 
}) {
  const isInteractive = !!onClick;

  return (
    <div
      className={clsx(
        'ui-card',
        hoverable && 'ui-card--hoverable',
        active && 'ui-card--active',
        isInteractive && 'ui-card--interactive',
        `ui-card--padding-${padding}`,
        className
      )}
      onClick={onClick}
      role={isInteractive ? 'button' : undefined}
      tabIndex={isInteractive ? 0 : undefined}
      onKeyDown={isInteractive && ((e) => e.key === 'Enter' && onClick?.(e))}
    >
      {children}
    </div>
  );
}
