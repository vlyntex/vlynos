import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Badge.module.css';

interface BadgeProps extends React.HTMLAttributes<HTMLSpanElement> {
  variant?: 'primary' | 'success' | 'warning' | 'danger' | 'neutral';
  size?: 'sm' | 'md';
}

export const Badge = React.forwardRef<HTMLSpanElement, BadgeProps>(
  ({ className, variant = 'primary', size = 'md', ...props }, ref) => {
    return (
      <span
        ref={ref}
        className={cn(
          styles.badge,
          styles[variant],
          styles[size],
          className
        )}
        {...props}
      />
    );
  }
);
Badge.displayName = 'Badge';
