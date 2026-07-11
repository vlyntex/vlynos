import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Card.module.css';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  padding?: 'none' | 'sm' | 'md' | 'lg';
  elevated?: boolean;
}

export const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, padding = 'md', elevated = false, ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(
          styles.card,
          styles[`p-${padding}`],
          elevated && styles.elevated,
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';
