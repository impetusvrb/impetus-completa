/**
 * IMPETUS - Skeleton Loader
 * Melhoria de UX - feedback visual durante carregamento
 */
import React from 'react';
import './Skeleton.css';

export function Skeleton({ variant = 'text', width, height, className = '' }) {
  const style = {};
  if (width) style.width = typeof width === 'number' ? `${width}px` : width;
  if (height) style.height = typeof height === 'number' ? `${height}px` : height;

  return (
    <div
      className={`skeleton skeleton-${variant} ${className}`}
      style={style}
      aria-hidden="true"
    />
  );
}

export function SkeletonCard() {
  return (
    <div className="skeleton-card">
      <Skeleton variant="rect" height={80} />
      <Skeleton width="70%" height={16} />
      <Skeleton width="50%" height={12} />
    </div>
  );
}

export function SkeletonTable({ rows = 5 }) {
  return (
    <div className="skeleton-table">
      <div className="skeleton-table-header">
        {[1, 2, 3, 4].map((i) => (
          <Skeleton key={i} variant="text" height={14} />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, i) => (
        <div key={i} className="skeleton-table-row">
          <Skeleton variant="text" height={12} />
          <Skeleton variant="text" height={12} />
          <Skeleton variant="text" height={12} />
          <Skeleton variant="text" height={12} />
        </div>
      ))}
    </div>
  );
}

export default Skeleton;
