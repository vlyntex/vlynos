'use client';
import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useRouter } from 'next/navigation';

import { use } from 'react';

export default function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const unwrappedParams = use(params);
  const [task, setTask] = useState<any>(null);
  const [role, setRole] = useState('');
  const [error, setError] = useState('');
  
  // Edit State
  const [taskId, setTaskId] = useState('');
  const [taskName, setTaskName] = useState('');
  
  // Eval State
  const [rejectionReason, setRejectionReason] = useState('');
  const [managementComment, setManagementComment] = useState('');
  
  // Timer State
  const [timeLeft, setTimeLeft] = useState(0);
  const [endedAt, setEndedAt] = useState('');

  const router = useRouter();

  useEffect(() => {
    api.get('/auth/me').then(d => setRole(d.user.role)).catch(console.error);
    fetchTask();
  }, []);

  const fetchTask = async () => {
    try {
      const data = await api.get(`/tasks/${unwrappedParams.id}`);
      setTask(data.task);
      setTaskId(data.task.taskId);
      setTaskName(data.task.taskName);
    } catch (err: any) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (!task) return;
    const interval = setInterval(() => {
      const now = new Date().getTime();
      const locked = new Date(task.lockedAt).getTime();
      const diff = Math.floor((locked - now) / 1000);
      setTimeLeft(diff > 0 ? diff : 0);
    }, 1000);
    return () => clearInterval(interval);
  }, [task]);

  const handleEdit = async () => {
    try {
      await api.patch(`/tasks/${unwrappedParams.id}`, { taskId, taskName });
      fetchTask();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDelete = async () => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      await api.delete(`/tasks/${unwrappedParams.id}`);
      router.push('/tasks');
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleEval = async (action: 'approve' | 'reject') => {
    try {
      if (action === 'reject' && !rejectionReason) {
        setError('Rejection reason is required');
        return;
      }
      const endpoint = action === 'approve' ? 'accept' : 'reject';
      await api.patch(`/tasks/${unwrappedParams.id}/${endpoint}`, { rejectionReason, managementComment });
      fetchTask();
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSubmit = async () => {
    try {
      await api.patch(`/tasks/${unwrappedParams.id}/submit`, { 
        endedAt: endedAt ? new Date(endedAt).toISOString() : new Date().toISOString()
      });
      fetchTask();
    } catch (err: any) {
      setError(err.message);
    }
  };

  if (!task) return <div style={{ color: '#111' }}>Loading...</div>;

  const isEditable = !task.isLocked && timeLeft > 0;

  return (
    <div style={{ color: '#111' }}>
      <h1>Task Details: {task.taskId}</h1>
      {error && <p style={{ color: 'red', background: '#fee2e2', padding: '1rem' }}>{error}</p>}
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginTop: '1rem' }}>
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Task Info</h3>
          <p><strong>Name:</strong> {task.taskName}</p>
          <p><strong>Status:</strong> {task.status}</p>
          {task.startedAt && <p><strong>Started At:</strong> {new Date(task.startedAt).toLocaleString()}</p>}
          {task.expectedEndDate && <p><strong>Expected End:</strong> {new Date(task.expectedEndDate).toLocaleString()}</p>}
          {task.endedAt && <p><strong>Ended At:</strong> {new Date(task.endedAt).toLocaleString()}</p>}
          {task.timeSpentMinutes !== null && <p><strong>Time Spent:</strong> {task.timeSpentMinutes} mins</p>}
          <p><strong>Locked At:</strong> {new Date(task.lockedAt).toLocaleString()}</p>
          <p><strong>Locked State:</strong> {task.isLocked ? 'Locked' : 'Editable'}</p>
          {task.rejectionReason && <p><strong>Rejection Reason:</strong> {task.rejectionReason}</p>}
          {task.managementComment && <p><strong>Management Comment:</strong> {task.managementComment}</p>}
        </div>

        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px' }}>
          <h3>Developer Info</h3>
          <p><strong>Developer Name:</strong> {task.worker.firstName} {task.worker.lastName}</p>
          <p><strong>Vendor:</strong> {task.vendor.name}</p>
        </div>
      </div>

      {role === 'WORKER' && task.status === 'IN_PROGRESS' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
          <h3>Submit Task</h3>
          <p style={{ color: '#4b5563', marginBottom: '1rem' }}>Enter the actual end date and time before submitting.</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
            <label style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', fontSize: '0.875rem' }}>
              Ended At
              <input type="datetime-local" value={endedAt} onChange={e => setEndedAt(e.target.value)} style={{ padding: '0.5rem' }} />
            </label>
            <button onClick={handleSubmit} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>Submit Task</button>
          </div>
        </div>
      )}

      {role === 'WORKER' && (task.status === 'IN_PROGRESS' || task.status === 'PENDING') && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
          <h3>Edit Details</h3>
          {isEditable ? (
            <div>
              <p style={{ color: 'red', fontWeight: 'bold' }}>Time remaining to edit: {Math.floor(timeLeft / 60)}:{String(timeLeft % 60).padStart(2, '0')}</p>
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                <input value={taskId} onChange={e => setTaskId(e.target.value)} style={{ padding: '0.5rem' }} />
                <input value={taskName} onChange={e => setTaskName(e.target.value)} style={{ padding: '0.5rem' }} />
                <button onClick={handleEdit} style={{ padding: '0.5rem 1rem', background: '#2563eb', color: 'white', border: 'none', borderRadius: '4px' }}>Save Edit</button>
                <button onClick={handleDelete} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px' }}>Delete</button>
              </div>
            </div>
          ) : (
            <p style={{ color: '#4b5563' }}>Task is locked and can no longer be edited or deleted.</p>
          )}
        </div>
      )}

      {role === 'MANAGEMENT' && (
        <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
          <h3>Management Evaluation</h3>
          {timeLeft > 0 && !task.isLocked ? (
            <p style={{ color: '#ca8a04' }}>Task is within the 5-minute edit window. Evaluation is disabled until it locks.</p>
          ) : task.status !== 'IN_REVIEW' ? (
            <p style={{ color: '#16a34a' }}>Task has been {task.status}.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
              <input placeholder="Management Comment (Optional)" value={managementComment} onChange={e => setManagementComment(e.target.value)} style={{ padding: '0.5rem' }} />
              <input placeholder="Rejection Reason (Required if Rejecting)" value={rejectionReason} onChange={e => setRejectionReason(e.target.value)} style={{ padding: '0.5rem' }} />
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button onClick={() => handleEval('approve')} style={{ padding: '0.5rem 1rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '4px' }}>Approve Task</button>
                <button onClick={() => handleEval('reject')} style={{ padding: '0.5rem 1rem', background: '#dc2626', color: 'white', border: 'none', borderRadius: '4px' }}>Reject Task</button>
              </div>
            </div>
          )}
        </div>
      )}

      <div style={{ background: 'white', padding: '1.5rem', borderRadius: '8px', marginTop: '1rem' }}>
        <h3>History</h3>
        <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '1rem' }}>
          <thead>
            <tr style={{ background: '#f3f4f6', textAlign: 'left' }}>
              <th style={{ padding: '0.5rem' }}>Action</th>
              <th style={{ padding: '0.5rem' }}>Time</th>
              <th style={{ padding: '0.5rem' }}>User</th>
            </tr>
          </thead>
          <tbody>
            {task.history?.map((h: any) => (
              <tr key={h.id}>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{h.action}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{new Date(h.timestamp).toLocaleString()}</td>
                <td style={{ padding: '0.5rem', borderBottom: '1px solid #eee' }}>{h.performedBy.firstName} {h.performedBy.lastName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
