'use client';
import { useEffect, useState } from 'react';
import { api, BASE_URL } from '@/lib/api';

export default function BackupsPage() {
  const [backups, setBackups] = useState<any[]>([]);

  const load = () => api.get('/system/backups').then(setBackups);
  useEffect(() => { load(); }, []);

  const createBackup = async () => {
    try {
      await api.post('/system/backups', {});
      alert('Backup process started successfully.');
      setTimeout(load, 2000);
    } catch (e) {
      alert('Failed to start backup.');
    }
  };

  const deleteBackup = async (id: string) => {
    if (!confirm('Are you sure?')) return;
    try {
      await api.delete(`/system/backups/${id}`);
      load();
    } catch (e) {
      alert('Failed to delete backup.');
    }
  };

  const restoreBackup = async (id: string) => {
    if (!confirm('WARNING: This will drop the current database state and restore it. Are you absolutely sure?')) return;
    try {
      await api.post(`/system/backups/${id}/restore`, {});
      alert('Restore complete!');
      load();
    } catch (e) {
      alert('Failed to restore.');
    }
  };

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h3>Database Backups</h3>
        <button onClick={createBackup} style={{ background: '#2563eb', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Create Backup</button>
      </div>

      <table style={{ width: '100%', marginTop: '2rem', borderCollapse: 'collapse', background: 'white' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', textAlign: 'left' }}>
            <th style={{ padding: '1rem' }}>Filename</th>
            <th style={{ padding: '1rem' }}>Size (bytes)</th>
            <th style={{ padding: '1rem' }}>Hash</th>
            <th style={{ padding: '1rem' }}>Status</th>
            <th style={{ padding: '1rem' }}>Created At</th>
            <th style={{ padding: '1rem' }}>Actions</th>
          </tr>
        </thead>
        <tbody>
          {backups.map(b => (
            <tr key={b.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
              <td style={{ padding: '1rem' }}>{b.filename}</td>
              <td style={{ padding: '1rem' }}>{b.size}</td>
              <td style={{ padding: '1rem' }}><small style={{color: '#6b7280'}}>{b.hash?.substring(0, 16)}...</small></td>
              <td style={{ padding: '1rem' }}>{b.status}</td>
              <td style={{ padding: '1rem' }}>{new Date(b.createdAt).toLocaleString()}</td>
              <td style={{ padding: '1rem', display: 'flex', gap: '0.5rem' }}>
                <a href={`${BASE_URL}/system/backups/${b.id}/download`} target="_blank" style={{ color: '#10b981', textDecoration: 'none' }}>Download</a>
                <button onClick={() => restoreBackup(b.id)} style={{ color: '#d97706', background: 'none', border: 'none', cursor: 'pointer' }}>Restore</button>
                <button onClick={() => deleteBackup(b.id)} style={{ color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer' }}>Delete</button>
              </td>
            </tr>
          ))}
          {backups.length === 0 && <tr><td colSpan={7} style={{ padding: '1rem', textAlign: 'center' }}>No backups found.</td></tr>}
        </tbody>
      </table>
    </div>
  );
}
