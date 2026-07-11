'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { AlertCircle, CheckCircle, Server, HardDrive, Cpu, Activity, Clock } from 'lucide-react';
import { Skeleton } from '@/components/ui/Skeleton';

export default function SystemHealthPage() {
  const [health, setHealth] = useState<any>(null);

  useEffect(() => {
    api.get('/system/health').then(setHealth).catch(console.error);
  }, []);

  if (!health) return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
      <Skeleton style={{ height: '100px' }} />
      <Skeleton style={{ height: '100px' }} />
      <Skeleton style={{ height: '100px' }} />
      <Skeleton style={{ height: '100px' }} />
    </div>
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {health.alerts && health.alerts.length > 0 && (
        <Card style={{ borderColor: 'var(--color-danger)', backgroundColor: 'var(--color-danger-light)' }}>
          <h4 style={{ color: 'var(--color-danger)', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 600 }}>
            <AlertCircle size={20} /> Active System Alerts
          </h4>
          <ul style={{ color: '#991b1b', margin: 0, paddingLeft: '1.5rem', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {health.alerts.map((a: any) => (
              <li key={a.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <strong>{a.type}</strong>: {a.message}
                </div>
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => api.post(`/system/security/alerts/${a.id}/resolve`, {}).then(() => window.location.reload())}
                  style={{ borderColor: 'var(--color-danger)', color: 'var(--color-danger)' }}
                >
                  Resolve
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>API Status</span>
            <Activity size={20} color="var(--color-success)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            <Badge variant="success">Online</Badge>
          </div>
        </Card>

        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Server Uptime</span>
            <Clock size={20} color="var(--color-primary-500)" />
          </div>
          <div style={{ fontSize: '1.25rem', fontWeight: 700 }}>
            {health.serverUptime || 'N/A'}
          </div>
        </Card>

        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Memory Usage</span>
            <Server size={20} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {health.memoryUsage || 'N/A'}
          </div>
        </Card>

        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>CPU Usage</span>
            <Cpu size={20} color="var(--text-tertiary)" />
          </div>
          <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>
            {health.cpuUsage || 'N/A'}
          </div>
        </Card>
      </div>

      <Card padding="md">
        <h4 style={{ marginBottom: '1rem', fontWeight: 600 }}>Raw Health Data</h4>
        <pre style={{ 
          background: 'var(--bg-main)', 
          padding: '1rem', 
          borderRadius: 'var(--radius-md)',
          fontSize: 'var(--text-xs)',
          overflowX: 'auto',
          border: '1px solid var(--border-light)'
        }}>
          {JSON.stringify(health, null, 2)}
        </pre>
      </Card>
    </div>
  );
}
