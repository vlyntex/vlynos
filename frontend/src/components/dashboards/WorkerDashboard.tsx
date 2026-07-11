import React, { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { Card } from '../ui/Card';
import { Badge } from '../ui/Badge';
import { Skeleton } from '../ui/Skeleton';
import { Loader } from '../ui/Loader';
import { Button } from '../ui/Button';
import { Modal } from '../ui/Modal';
import { Input } from '../ui/Input';
import { CheckSquare, Clock } from 'lucide-react';

export function WorkerDashboard({ profile }: { profile: any }) {
  const [data, setData] = useState<any>(null);

  const [activeTask, setActiveTask] = useState<any>(null);
  const [showStartModal, setShowStartModal] = useState(false);
  const [showSubmitModal, setShowSubmitModal] = useState(false);
  
  const [isStarting, setIsStarting] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [startFormData, setStartFormData] = useState({
    taskId: `TSK-${Math.floor(1000 + Math.random() * 9000)}`,
    taskName: '',
    startedAt: ''
  });
  
  const [submitFormData, setSubmitFormData] = useState({
    endedAt: ''
  });

  const loadData = async () => {
    try {
      const tasksRes = await api.get('/tasks');
      const tasks = tasksRes.tasks || [];
      
      const inProgress = tasks.find((t: any) => t.status === 'IN_PROGRESS');
      setActiveTask(inProgress || null);
      
      setData({
        tasksSubmitted: tasks.filter((t: any) => t.status !== 'IN_PROGRESS').length,
        pendingTasks: tasks.filter((t: any) => t.status === 'IN_REVIEW').length,
        recentTasks: tasks.filter((t: any) => t.status !== 'IN_PROGRESS').slice(0, 5)
      });
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleStartTask = async () => {
    if (isStarting) return;
    setIsStarting(true);
    try {
      await api.post('/tasks', startFormData);
      setShowStartModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to start task', err);
      alert(err.message || 'Failed to start task. Ensure Task ID is unique.');
    } finally {
      setIsStarting(false);
    }
  };

  const handleSubmitTask = async () => {
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      if (!activeTask) return;
      await api.patch(`/tasks/${activeTask.id}/submit`, submitFormData);
      setShowSubmitModal(false);
      await loadData();
    } catch (err: any) {
      console.error('Failed to submit task', err);
      alert(err.message || 'Failed to submit task.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!data) return <Loader text="Loading Developer Dashboard..." />;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 600 }}>Developer Dashboard</h2>
        {!activeTask && (
          <Button onClick={() => {
            setStartFormData({ taskId: `TSK-${Math.floor(1000 + Math.random() * 9000)}`, taskName: '', startedAt: new Date().toISOString().slice(0,16) });
            setShowStartModal(true);
          }} variant="primary">
            Start New Task
          </Button>
        )}
      </div>

      {activeTask && (
        <Card elevated style={{ border: '2px solid var(--color-primary-500)', background: 'rgba(59, 130, 246, 0.05)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--color-primary-600)' }}>
                Active Task: {activeTask.taskName} ({activeTask.taskId})
              </h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
                Started at: {new Date(activeTask.startedAt).toLocaleString()}
              </p>
            </div>
            <Button onClick={() => {
              setSubmitFormData({ endedAt: new Date().toISOString().slice(0,16) });
              setShowSubmitModal(true);
            }} variant="primary">
              End and Submit Task
            </Button>
          </div>
        </Card>
      )}
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem' }}>
        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Tasks Submitted</span>
            <CheckSquare size={20} color="var(--color-primary-500)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.tasksSubmitted}</div>
        </Card>
        
        <Card elevated>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
            <span style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Pending Review</span>
            <Clock size={20} color="var(--color-warning)" />
          </div>
          <div style={{ fontSize: '2rem', fontWeight: 700 }}>{data.pendingTasks}</div>
        </Card>
      </div>

      <Card elevated>
        <h3 style={{ marginBottom: '1.5rem' }}>Your Recent Submissions</h3>
        {data.recentTasks.length === 0 ? (
          <p>You haven't submitted any tasks yet.</p>
        ) : (
          <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {data.recentTasks.map((t: any) => (
              <li key={t.id} style={{ display: 'flex', justifyContent: 'space-between', paddingBottom: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
                <div>
                  <strong>{t.taskName || t.taskData?.title || 'Task'} ({t.taskId})</strong>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>
                    Time spent: {t.timeSpentMinutes ? `${Math.floor(t.timeSpentMinutes / 60)}h ${t.timeSpentMinutes % 60}m` : 'N/A'}
                  </div>
                  <div style={{ fontSize: 'var(--text-sm)', color: 'var(--text-secondary)' }}>Submitted {new Date(t.submittedAt || t.createdAt).toLocaleString()}</div>
                </div>
                <Badge variant={t.status === 'IN_REVIEW' || t.status === 'IN_PROGRESS' ? 'warning' : t.status === 'APPROVED' ? 'success' : 'danger'}>{t.status}</Badge>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Modal isOpen={showStartModal} onClose={() => setShowStartModal(false)} title="Start New Task" footer={
        <>
          <Button variant="outline" onClick={() => setShowStartModal(false)}>Cancel</Button>
          <Button onClick={handleStartTask} disabled={isStarting || !startFormData.taskId || !startFormData.taskName || !startFormData.startedAt}>{isStarting ? 'Starting...' : 'Start Task'}</Button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input label="Task ID / Project ID" value={startFormData.taskId} onChange={(e) => setStartFormData({...startFormData, taskId: e.target.value})} placeholder="e.g. TSK-123" />
          <Input label="Task Name" value={startFormData.taskName} onChange={(e) => setStartFormData({...startFormData, taskName: e.target.value})} placeholder="e.g. Data Annotation Batch 1" />
          <Input label="Start Date & Time" type="datetime-local" value={startFormData.startedAt} onChange={(e) => setStartFormData({...startFormData, startedAt: e.target.value})} />
        </div>
      </Modal>

      <Modal isOpen={showSubmitModal} onClose={() => setShowSubmitModal(false)} title="End and Submit Task" footer={
        <>
          <Button variant="outline" onClick={() => setShowSubmitModal(false)}>Cancel</Button>
          <Button onClick={handleSubmitTask} variant="primary" disabled={isSubmitting}>{isSubmitting ? 'Submitting...' : 'Submit'}</Button>
        </>
      }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <p>Please confirm the actual time you finished this task.</p>
          <Input label="End Date & Time" type="datetime-local" value={submitFormData.endedAt} onChange={(e) => setSubmitFormData({...submitFormData, endedAt: e.target.value})} />
        </div>
      </Modal>
    </div>
  );
}
