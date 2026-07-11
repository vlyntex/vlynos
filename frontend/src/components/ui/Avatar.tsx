import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Avatar.module.css';

interface AvatarProps extends React.HTMLAttributes<HTMLDivElement> {
  src?: string;
  fallback?: string;
  size?: 'sm' | 'md' | 'lg';
}

export const Avatar = React.forwardRef<HTMLDivElement, AvatarProps>(
  ({ className, src, fallback, size = 'md', ...props }, ref) => {
    return (
      <div
        ref={ref}
        className={cn(styles.avatar, styles[size], className)}
        {...props}
      >
        {src ? (
          <img src={src} alt="Avatar" className={styles.image} />
        ) : (
          <span className={styles.fallback}>{fallback?.substring(0, 2).toUpperCase()}</span>
        )}
      </div>
    );
  }
);
Avatar.displayName = 'Avatar';
