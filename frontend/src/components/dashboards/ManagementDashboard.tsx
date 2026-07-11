import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Button } from '../ui/Button';
import { Skeleton } from '../ui/Skeleton';
import { Loader } from '../ui/Loader';
import Link from 'next/link';
import { AlertCircle, CheckCircle, Clock, Users, Activity as ActivityIcon } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts';
import { motion } from 'framer-motion';

export function ManagementDashboard() {
  const [data, setData] = useState<any>(null);

  useEffect(() => {
    async function loadData() {
      try {
        const [tasksRes, activityRes, healthRes, workersRes] = await Promise.all([
          api.get('/tasks'),
          api.get('/activity?limit=5'),
          api.get('/system/health').catch(() => ({ alerts: [] })),
          api.get('/workers')
        ]);
        
        const tasks = tasksRes.tasks || [];
        const pendingTasks = tasks.filter((t: any) => t.status === 'IN_REVIEW').length;
        const approvedTasks = tasks.filter((t: any) => t.status === 'APPROVED').length;
        
        setData({
          pendingTasks,
          approvedTasks,
          totalWorkers: (workersRes.workers || []).length,
          activities: activityRes.activities || [],
          alerts: healthRes.alerts || [],
          chartData: [
            { name: 'Mon', tasks: Math.floor(Math.random() * 20) },
            { name: 'Tue', tasks: Math.floor(Math.random() * 20) },
            { name: 'Wed', tasks: Math.floor(Math.random() * 20) },
            { name: 'Thu', tasks: Math.floor(Math.random() * 20) },
            { name: 'Fri', tasks: Math.floor(Math.random() * 20) },
          ]
        });
      } catch (err) {
        console.error(err);
      }
    }
    loadData();
  }, []);

  if (!data) {
    return <Loader text="Loading Management Dashboard..." />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      
      {/* Alerts */}
      {data.alerts.length > 0 && (
        <Card style={{ borderColor: 'var(--color-danger)', backgroundColor: 'var(--color-danger-light)' }}>
          <h3 style={{ color: '#991b1b', display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
            <AlertCircle size={20} /> Action Required
          </h3>
          <ul style={{ color: '#991b1b', paddingLeft: '1.5rem' }}>
            {data.alerts.map((a: any) => <li key={a.id}>{a.message}</li>)}
          </ul>
        </Card>
      )}

      {/* KPI Cards */}
      <motion.div 
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: {
            opacity: 1,
            transition: { staggerChildren: 0.1 }
          }
        }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}
      >
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <Card style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.6)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Tasks In Review</span>
              <Clock size={20} color="var(--color-warning)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.pendingTasks}</div>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <Card style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.6)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total Developers</span>
              <Users size={20} color="var(--color-primary-500)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.totalWorkers}</div>
          </Card>
        </motion.div>
        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <Card style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.6)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Approved Tasks</span>
              <CheckCircle size={20} color="var(--color-success)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.approvedTasks}</div>
          </Card>
        </motion.div>

        <motion.div variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}>
          <Card style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.6)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Total Partners</span>
              <Users size={20} color="var(--color-primary-500)" />
            </div>
            <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.totalVendors}</div>
          </Card>
        </motion.div>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4, duration: 0.5 }}
        style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '2rem' }}
      >
        <Card style={{ backgroundColor: 'rgba(255, 255, 255, 0.4)', backdropFilter: 'blur(16px)', WebkitBackdropFilter: 'blur(16px)', border: '1px solid rgba(255, 255, 255, 0.6)', boxShadow: '0 8px 32px rgba(0, 0, 0, 0.05)' }}>
          <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ActivityIcon size={20} /> Recent Activity
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.activities.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No recent activity.</p>
            ) : (
              data.activities.map((act: any) => (
                <div key={act.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '1rem', borderBottom: '1px solid var(--border-light)' }}>
                  <div>
                    <span style={{ fontWeight: 600 }}>{act.actorUserId.substring(0,8)}</span> {act.action} <Badge size="sm">{act.entityType}</Badge>
                  </div>
                  <span style={{ color: 'var(--text-tertiary)', fontSize: 'var(--text-sm)' }}>
                    {new Date(act.createdAt).toLocaleString()}
                  </span>
                </div>
              ))
            )}
          </div>
          <div style={{ marginTop: '1.5rem', textAlign: 'center' }}>
            <Link href="/activity">
              <Button variant="ghost">View All Activity</Button>
            </Link>
          </div>
        </Card>
      </motion.div>
    </div>
  );
}
