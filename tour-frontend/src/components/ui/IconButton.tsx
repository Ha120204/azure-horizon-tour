'use client';

import type { ButtonHTMLAttributes } from 'react';

type IconButtonVariant = 'ghost' | 'outlined' | 'filled';
type IconButtonSize    = 'sm' | 'md' | 'lg';
type IconButtonShape   = 'rounded' | 'circle';

const sizeClasses: Record<IconButtonSize, { box: string; icon: string }> = {
  sm: { box: 'w-8 h-8',   icon: 'text-[18px]' },
  md: { box: 'w-9 h-9',   icon: 'text-xl'     },
  lg: { box: 'w-10 h-10', icon: 'text-2xl'    },
};

const shapeClasses: Record<IconButtonShape, string> = {
  rounded: 'rounded-xl',
  circle:  'rounded-full',
};

const variantClasses: Record<IconButtonVariant, string> = {
  ghost:    'text-on-surface-variant hover:bg-surface-container hover:text-on-surface',
  outlined: 'text-on-surface-variant border border-outline-variant/20 hover:bg-surface-container',
  filled:   'bg-surface-container text-on-surface hover:bg-surface-container-high',
};

interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  /** Material Symbol icon name */
  icon: string;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
  shape?: IconButtonShape;
}

export default function IconButton({
  icon,
  variant = 'ghost',
  size = 'md',
  shape = 'rounded',
  className = '',
  type = 'button',
  ...rest
}: IconButtonProps) {
  const { box, icon: iconSize } = sizeClasses[size];

  return (
    <button
      type={type}
      className={`flex shrink-0 items-center justify-center transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary disabled:pointer-events-none disabled:opacity-50 ${box} ${shapeClasses[shape]} ${variantClasses[variant]} ${className}`}
      {...rest}
    >
      <span className={`material-symbols-outlined leading-none ${iconSize}`} aria-hidden="true">
        {icon}
      </span>
    </button>
  );
}
