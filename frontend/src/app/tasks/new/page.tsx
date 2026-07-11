'use client';
import { useState } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

export default function NewTaskPage() {
  const [form, setForm] = useState({ taskId: '', taskName: '', startedAt: '' });
  const [error, setError] = useState('');
  const router = useRouter();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await api.post('/tasks', {
        ...form,
        startedAt: new Date(form.startedAt).toISOString(),
      });
      router.push(`/tasks/${res.task.id}`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div style={{ color: '#111' }}>
      <h1>Start Task</h1>
      <p style={{ color: '#6b7280', marginBottom: '1rem' }}>Enter the task details below.</p>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <input placeholder="Task ID (e.g. SN-1234)" required value={form.taskId} onChange={e => setForm({...form, taskId: e.target.value})} style={{ padding: '0.5rem' }} />
        <input placeholder="Task Name" required value={form.taskName} onChange={e => setForm({...form, taskName: e.target.value})} style={{ padding: '0.5rem' }} />
        
        <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
          Start Date & Time
          <input type="datetime-local" required value={form.startedAt} onChange={e => setForm({...form, startedAt: e.target.value})} style={{ padding: '0.5rem' }} />
        </label>
        
        <button type="submit" style={{ padding: '0.5rem 1rem', background: '#f97316', color: 'white', border: 'none', borderRadius: '4px', marginTop: '1rem' }}>Start Task</button>
      </form>
    </div>
  );
}
