import React from 'react';
import { cn } from '@/lib/utils';
import styles from './EmptyState.module.css';

interface EmptyStateProps extends React.HTMLAttributes<HTMLDivElement> {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export const EmptyState = ({ className, icon, title, description, action, ...props }: EmptyStateProps) => {
  return (
    <div className={cn(styles.wrapper, className)} {...props}>
      {icon && <div className={styles.icon}>{icon}</div>}
      <h3 className={styles.title}>{title}</h3>
      {description && <p className={styles.description}>{description}</p>}
      {action && <div className={styles.action}>{action}</div>}
    </div>
  );
};
