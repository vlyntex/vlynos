import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Input.module.css';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, error, ...props }, ref) => {
    return (
      <div className={cn(styles.wrapper, className)}>
        {label && <label className={styles.label}>{label}</label>}
        <input
          ref={ref}
          className={cn(styles.input, error && styles.inputError)}
          {...props}
        />
        {error && <span className={styles.errorText}>{error}</span>}
      </div>
    );
  }
);
Input.displayName = 'Input';
