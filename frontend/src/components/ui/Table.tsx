import React from 'react';
import { cn } from '@/lib/utils';
import { ChevronUp, ChevronDown, MoreHorizontal } from 'lucide-react';
import styles from './Table.module.css';
import { Button } from './Button';

interface Column<T> {
  key: string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
}

interface TableProps<T> extends React.HTMLAttributes<HTMLTableElement> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (row: T) => string;
  onSort?: (key: string, direction: 'asc' | 'desc') => void;
  sortKey?: string;
  sortDirection?: 'asc' | 'desc';
  loading?: boolean;
  emptyMessage?: string;
  pagination?: {
    currentPage: number;
    totalPages: number;
    onPageChange: (page: number) => void;
  };
}

export function Table<T>({
  className,
  columns,
  data,
  keyExtractor,
  onSort,
  sortKey,
  sortDirection,
  loading,
  emptyMessage = 'No results found',
  pagination,
  ...props
}: TableProps<T>) {
  
  const handleSort = (key: string) => {
    if (!onSort) return;
    if (sortKey === key) {
      onSort(key, sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      onSort(key, 'asc');
    }
  };

  return (
    <div className={styles.wrapper}>
      <div className={styles.tableContainer}>
        <table className={cn(styles.table, className)} {...props}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th 
                  key={col.key} 
                  className={cn(col.sortable && styles.sortable)}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <div className={styles.headerContent}>
                    {col.header}
                    {col.sortable && sortKey === col.key && (
                      sortDirection === 'asc' ? <ChevronUp size={16} /> : <ChevronDown size={16} />
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={columns.length} className={styles.loadingCell}>
                  <div className={styles.spinner} />
                </td>
              </tr>
            ) : data.length === 0 ? (
              <tr>
                <td colSpan={columns.length} className={styles.emptyCell}>
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              data.map((row) => (
                <tr key={keyExtractor(row)}>
                  {columns.map((col) => (
                    <td key={col.key}>
                      {col.render ? col.render(row) : (row as any)[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
      
      {pagination && (
        <div className={styles.pagination}>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={pagination.currentPage <= 1}
            onClick={() => pagination.onPageChange(pagination.currentPage - 1)}
          >
            Previous
          </Button>
          <span className={styles.pageInfo}>
            Page {pagination.currentPage} of {Math.max(1, pagination.totalPages)}
          </span>
          <Button 
            variant="outline" 
            size="sm" 
            disabled={pagination.currentPage >= pagination.totalPages}
            onClick={() => pagination.onPageChange(pagination.currentPage + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}
