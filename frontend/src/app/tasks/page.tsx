'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import Link from 'next/link';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Plus, Search, Filter } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function TasksPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [lockedFilter, setLockedFilter] = useState('');
  const [role, setRole] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchTasks = async () => {
    setLoading(true);
    try {
      const data = await api.get(`/tasks?search=${encodeURIComponent(search)}&status=${encodeURIComponent(statusFilter)}&isLocked=${encodeURIComponent(lockedFilter)}`);
      setTasks(data.tasks);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    api.get('/auth/me').then(d => setRole(d.user.role)).catch(console.error);
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchTasks();
    }, 300);
    return () => clearTimeout(timer);
  }, [search, statusFilter, lockedFilter]);

  const columns = [
    { key: 'taskId', header: 'Task ID', render: (t: any) => <strong>{t.taskId}</strong> },
    { key: 'taskName', header: 'Task Name' },
    ...(role === 'MANAGEMENT' || role === 'VENDOR' ? [{ 
      key: 'worker', 
      header: 'Developer',
      render: (t: any) => `${t.worker.firstName} ${t.worker.lastName}` 
    }] : []),
    ...(role === 'MANAGEMENT' ? [{ 
      key: 'vendor', 
      header: 'Vendor',
      render: (t: any) => t.vendor.name 
    }] : []),
    {
      key: 'status',
      header: 'Status',
      render: (t: any) => (
        <Badge variant={t.status === 'IN_REVIEW' || t.status === 'PENDING' || t.status === 'IN_PROGRESS' ? 'warning' : t.status === 'APPROVED' || t.status === 'ACCEPTED' ? 'success' : 'danger'}>
          {t.status}
        </Badge>
      )
    },
    {
      key: 'isLocked',
      header: 'Locked',
      render: (t: any) => (
        <Badge variant={t.isLocked ? 'neutral' : 'success'}>
          {t.isLocked ? 'Yes' : 'Editable'}
        </Badge>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      render: (t: any) => (
        <Button variant="outline" size="sm" onClick={() => router.push(`/tasks/${t.id}`)}>
          View
        </Button>
      )
    }
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Tasks</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Manage and track all organizational tasks.</p>
        </div>
        {role === 'WORKER' && (
          <Link href="/tasks/new">
            <Button>
              <Plus size={16} style={{ marginRight: '0.5rem' }} /> Submit Task
            </Button>
          </Link>
        )}
      </div>

      <Card padding="sm" style={{ display: 'flex', gap: '1rem', alignItems: 'center', flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: '250px', position: 'relative' }}>
          <Search size={18} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-tertiary)' }} />
          <input 
            type="text" 
            placeholder="Search by task name or ID..." 
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ 
              width: '100%', padding: '0.5rem 1rem 0.5rem 2.5rem', 
              borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)',
              fontFamily: 'inherit', fontSize: 'var(--text-sm)'
            }}
          />
        </div>
        
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <Filter size={18} color="var(--text-secondary)" />
          <select 
            value={statusFilter} 
            onChange={e => setStatusFilter(e.target.value)} 
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', fontSize: 'var(--text-sm)' }}
          >
            <option value="">All Status</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="IN_REVIEW">In Review</option>
            <option value="APPROVED">Approved</option>
            <option value="REJECTED">Rejected</option>
          </select>
          <select 
            value={lockedFilter} 
            onChange={e => setLockedFilter(e.target.value)} 
            style={{ padding: '0.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-medium)', fontSize: 'var(--text-sm)' }}
          >
            <option value="">All Lock States</option>
            <option value="true">Locked</option>
            <option value="false">Editable</option>
          </select>
        </div>
      </Card>

      <Table 
        columns={columns} 
        data={tasks} 
        keyExtractor={(t: any) => t.id}
        loading={loading}
        emptyMessage={search ? "No tasks found matching your search." : "No tasks available."}
      />
    </div>
  );
}
