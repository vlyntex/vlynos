import React from 'react';
import { cn } from '@/lib/utils';
import styles from './Skeleton.module.css';

interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {}

export const Skeleton = ({ className, ...props }: SkeletonProps) => {
  return <div className={cn(styles.skeleton, className)} {...props} />;
};
