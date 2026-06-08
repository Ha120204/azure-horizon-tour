'use client';

import type { ReactNode } from 'react';

type BadgeVariant = 'success' | 'warning' | 'error' | 'info' | 'neutral';
type BadgeSize    = 'sm' | 'md';
type BadgeShape   = 'pill' | 'chip';

const variantClasses: Record<BadgeVariant, string> = {
  success: 'bg-tertiary/10 text-tertiary',
  warning: 'bg-amber-500/10 text-amber-600',
  error:   'bg-error/10 text-error',
  info:    'bg-primary/10 text-primary',
  neutral: 'bg-surface-container text-on-surface-variant',
};

const sizeClasses: Record<BadgeSize, string> = {
  sm: 'px-2 py-0.5 text-[11px]',
  md: 'px-2.5 py-1 text-xs',
};

const shapeClasses: Record<BadgeShape, string> = {
  pill: 'rounded-full',
  chip: 'rounded-lg',
};

interface BadgeProps {
  variant?: BadgeVariant;
  size?: BadgeSize;
  shape?: BadgeShape;
  /** Material Symbol icon name shown before text */
  icon?: string;
  /** Show a colored dot before text (ignored when icon is set) */
  dot?: boolean;
  className?: string;
  children: ReactNode;
}

export default function Badge({
  variant = 'neutral',
  size = 'md',
  shape = 'pill',
  icon,
  dot = false,
  className = '',
  children,
}: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 font-bold ${variantClasses[variant]} ${sizeClasses[size]} ${shapeClasses[shape]} ${className}`}
    >
      {icon ? (
        <span className="material-symbols-outlined leading-none" style={{ fontSize: size === 'sm' ? 12 : 14 }} aria-hidden="true">
          {icon}
        </span>
      ) : dot ? (
        <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" aria-hidden="true" />
      ) : null}
      {children}
    </span>
  );
}
