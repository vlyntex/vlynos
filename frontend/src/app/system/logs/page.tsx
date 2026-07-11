'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function LogsPage() {
  const [logs, setLogs] = useState<string[]>([]);
  const [type, setType] = useState('app');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);

  const load = () => {
    api.get(`/system/logs?type=${encodeURIComponent(type)}&date=${encodeURIComponent(date)}`).then(res => setLogs(res.logs));
  };
  useEffect(() => { load(); }, [type, date]);

  return (
    <div>
      <h3>Application Logs</h3>
      <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem', marginBottom: '1rem' }}>
        <select value={type} onChange={e => setType(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}>
          <option value="app">App Logs</option>
          <option value="error">Error Logs</option>
          <option value="security">Security Logs</option>
          <option value="audit">Audit Logs</option>
        </select>
        <input type="date" value={date} onChange={e => setDate(e.target.value)} style={{ padding: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }} />
        <button onClick={load} style={{ background: '#2563eb', color: 'white', padding: '0.5rem 1rem', border: 'none', borderRadius: '4px', cursor: 'pointer' }}>Refresh</button>
      </div>

      <div style={{ background: '#111827', color: '#10b981', padding: '1rem', borderRadius: '4px', height: '600px', overflowY: 'auto', fontFamily: 'monospace', whiteSpace: 'pre-wrap' }}>
        {logs.length > 0 ? logs.join('\n') : 'No logs found for this date/type.'}
      </div>
    </div>
  );
}
