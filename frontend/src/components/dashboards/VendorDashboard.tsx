import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { Loader } from '../ui/Loader';
import { Users, CheckSquare, Clock, CheckCircle } from 'lucide-react';

export function VendorDashboard({ profile }: { profile: any }) {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [tasksRes, workersRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/workers')
        ]);
        
        const tasks = tasksRes.tasks || [];
        const pendingTasks = tasks.filter((t: any) => t.status === 'IN_REVIEW').length;
        const rejectedTasks = tasks.filter((t: any) => t.status === 'REJECTED').length;
        const approvedTasks = tasks.filter((t: any) => t.status === 'APPROVED').length;
        
        setData({
          pendingTasks,
          rejectedTasks,
          approvedTasks,
          workers: workersRes.workers || [],
          recentTasks: tasks.slice(0, 5)
        });
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  if (!data) return <Loader text="Loading Partner Dashboard..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Partner Dashboard</h2>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>My Developers</span>
            <Users size={20} color="var(--color-primary-500)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.workers.length}</div>
        </Card>
        
        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Pending Tasks</span>
            <Clock size={20} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.pendingTasks}</div>
        </Card>

        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Approved Tasks</span>
            <CheckCircle size={20} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.approvedTasks}</div>
        </Card>

        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Rejected Tasks</span>
            <CheckSquare size={20} color="var(--color-danger)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--color-danger)' }}>{data.rejectedTasks}</div>
        </Card>
      </div>
      
      <Card elevated>
        <h3 style={{ marginBottom: '1.5rem' }}>Recent Tasks</h3>
        {data.recentTasks.length === 0 ? (
          <p>No tasks submitted yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.recentTasks.map((t: any) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                <span>Task #{t.id.substring(0,8)}</span>
                <Badge variant={t.status === 'IN_REVIEW' || t.status === 'IN_PROGRESS' ? 'warning' : t.status === 'APPROVED' ? 'success' : 'danger'}>{t.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
