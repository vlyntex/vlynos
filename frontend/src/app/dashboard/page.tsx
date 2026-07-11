'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { ManagementDashboard } from '@/components/dashboards/ManagementDashboard';
import { VendorDashboard } from '@/components/dashboards/VendorDashboard';
import { WorkerDashboard } from '@/components/dashboards/WorkerDashboard';
import { Skeleton } from '@/components/ui/Skeleton';

export default function DashboardPage() {
  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me').then(data => setProfile(data.user)).catch((err: any) => {
      console.error(err);
      if (err.status === 401 || err.status === 403) {
        window.location.href = '/login?clear=true';
      }
    });
  }, []);

  if (!profile) return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <Skeleton style={{ height: '40px', width: '200px' }} />
      <Skeleton style={{ height: '300px' }} />
    </div>
  );

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Welcome back, {profile.firstName}!</h1>
          <p style={{ color: 'var(--text-secondary)', marginTop: '0.25rem' }}>Here is what's happening today.</p>
        </div>
      </div>
      
      {profile.role === 'MANAGEMENT' && <ManagementDashboard />}
      {profile.role === 'VENDOR' && <VendorDashboard profile={profile} />}
      {profile.role === 'WORKER' && <WorkerDashboard profile={profile} />}
    </div>
  );
}
