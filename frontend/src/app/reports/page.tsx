'use client';
import { useState, useEffect } from 'react';
import { api, BASE_URL } from '@/lib/api';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Table } from '@/components/ui/Table';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Download, Search, Filter } from 'lucide-react';
import { cn } from '@/lib/utils';

export default function ReportsPage() {
  const [tab, setTab] = useState('TASKS');
  const [filters, setFilters] = useState<any>({});
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const [profile, setProfile] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(data => setProfile(data.user))
      .catch(console.error);
  }, []);

  const fetchReport = async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams(filters).toString();
      const endpoint = `/reports/${tab.toLowerCase()}?${query}`;
      const data = await api.get(endpoint);
      setReport(data);
    } catch (err) {
      console.error(err);
      alert('Failed to load report');
    } finally {
      setLoading(false);
    }
  };

  const downloadCSV = async () => {
    try {
      const query = new URLSearchParams({ ...filters, format: 'csv' }).toString();
      const endpoint = `/reports/${tab.toLowerCase()}?${query}`;
      const data = await api.get(endpoint);
      
      const pollDownload = async (attempts = 0) => {
        if (attempts > 10) {
          alert('Report generation is taking longer than expected. Please check your notifications later.');
          return;
        }

        try {
          const res = await fetch(`${BASE_URL}/reports/downloads/${data.jobId}`, { credentials: 'include' });
          if (!res.ok) {
            // Not ready yet, retry in 2 seconds
            setTimeout(() => pollDownload(attempts + 1), 2000);
            return;
          }
          
          const blob = await res.blob();
          const url = window.URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = `report_${data.jobId}.csv`;
          document.body.appendChild(a);
          a.click();
          a.remove();
          window.URL.revokeObjectURL(url);
          setDownloadSuccess(true);
          setTimeout(() => setDownloadSuccess(false), 8000);
        } catch (e) {
          setTimeout(() => pollDownload(attempts + 1), 2000);
        }
      };

      // Start polling
      setTimeout(() => pollDownload(0), 1000);

    } catch (err) {
      console.error(err);
      alert('Failed to trigger CSV export');
    }
  };

  const updateFilter = (key: string, value: string) => {
    setFilters((prev: any) => ({ ...prev, [key]: value }));
  };

  const handleTabChange = (newTab: string) => {
    setTab(newTab);
    setFilters({});
    setReport(null);
  };

  const getColumns = () => {
    if (!report || !report.data || report.data.length === 0) return [];
    
    return Object.keys(report.data[0]).map(k => ({
      key: k,
      header: k.replace(/([A-Z])/g, ' $1').trim().replace(/^./, str => str.toUpperCase()),
      render: (row: any) => {
        const val = row[k];
        if (k.toLowerCase().includes('status')) {
          return <Badge variant={val === 'ACTIVE' || val === 'APPROVED' ? 'success' : (val === 'PENDING' || val === 'IN_REVIEW' || val === 'IN_PROGRESS') ? 'warning' : 'danger'}>{val}</Badge>;
        }
        if (val === null || val === undefined) return '-';
        return String(val);
      }
    }));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div>
        <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Reports & Analytics</h1>
        <p style={{ color: 'var(--text-secondary)' }}>Generate detailed reports for your organization.</p>
      </div>

      <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '1px solid var(--border-light)' }}>
        {(profile?.role === 'MANAGEMENT' ? ['TASKS', 'WORKERS', 'VENDORS'] : ['TASKS', 'WORKERS']).map(t => (
          <button
            key={t}
            onClick={() => handleTabChange(t)}
            style={{
              padding: '0.75rem 1.5rem',
              background: 'transparent',
              border: 'none',
              borderBottom: tab === t ? '2px solid var(--color-primary-500)' : '2px solid transparent',
              color: tab === t ? 'var(--color-primary-600)' : 'var(--text-secondary)',
              fontWeight: tab === t ? 600 : 400,
              cursor: 'pointer',
              transition: 'all var(--transition-fast)'
            }}
          >
            {t === 'WORKERS' ? 'Developers' : t === 'VENDORS' ? 'Partners' : 'Tasks'} Report
          </button>
        ))}
      </div>

      <Card padding="md">
        <h3 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
          <Filter size={18} /> Filters
        </h3>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1.5rem' }}>
          {tab === 'TASKS' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: '0.25rem' }}>Start Date</label>
                <input type="date" value={filters.startDate || ''} onChange={e => updateFilter('startDate', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: '0.25rem' }}>End Date</label>
                <input type="date" value={filters.endDate || ''} onChange={e => updateFilter('endDate', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }} />
              </div>
              <Input label="Task ID" value={filters.taskId || ''} onChange={e => updateFilter('taskId', e.target.value)} />
              <Input label="Developer Name" value={filters.workerName || ''} onChange={e => updateFilter('workerName', e.target.value)} />
              {profile?.role === 'MANAGEMENT' && <Input label="Partner Name" value={filters.vendorName || ''} onChange={e => updateFilter('vendorName', e.target.value)} />}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: '0.25rem' }}>Status</label>
                <select value={filters.status || ''} onChange={e => updateFilter('status', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}>
                  <option value="">All</option>
                  <option value="IN_PROGRESS">IN_PROGRESS</option>
                  <option value="IN_REVIEW">IN_REVIEW</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>
            </>
          )}
          
          {tab === 'WORKERS' && (
            <>
              {profile?.role === 'MANAGEMENT' && <Input label="Partner Name" value={filters.vendorName || ''} onChange={e => updateFilter('vendorName', e.target.value)} />}
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: '0.25rem' }}>Status</label>
                <select value={filters.status || ''} onChange={e => updateFilter('status', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}>
                  <option value="">All</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </>
          )}

          {tab === 'VENDORS' && (
            <>
              <div>
                <label style={{ display: 'block', fontSize: 'var(--text-sm)', marginBottom: '0.25rem' }}>Status</label>
                <select value={filters.status || ''} onChange={e => updateFilter('status', e.target.value)} style={{ width: '100%', padding: '0.5rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)' }}>
                  <option value="">All</option>
                  <option value="ACTIVE">ACTIVE</option>
                  <option value="INACTIVE">INACTIVE</option>
                  <option value="SUSPENDED">SUSPENDED</option>
                </select>
              </div>
            </>
          )}
        </div>
        
        <div style={{ display: 'flex', gap: '1rem' }}>
          <Button onClick={fetchReport} disabled={loading}>
            <Search size={16} style={{ marginRight: '0.5rem' }} /> Generate Report
          </Button>
          <Button onClick={downloadCSV} variant="outline">
            <Download size={16} style={{ marginRight: '0.5rem' }} /> Export to CSV
          </Button>
        </div>
      </Card>

      {downloadSuccess && (
        <div style={{ padding: '1rem', background: '#ecfdf5', color: '#065f46', borderRadius: '4px', border: '1px solid #10b981', marginBottom: '1rem' }}>
          <strong>Download Started!</strong> The CSV report file is downloading.
        </div>
      )}

      {report && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
            {Object.keys(report.summary).map(key => (
              <Card key={key} elevated style={{ textAlign: 'center' }}>
                <div style={{ fontSize: '2.5rem', fontWeight: 700, color: 'var(--color-primary-600)', marginBottom: '0.5rem' }}>
                  {report.summary[key]}
                </div>
                <div style={{ color: 'var(--text-secondary)', textTransform: 'capitalize', fontWeight: 500 }}>
                  {key.replace(/([A-Z])/g, ' $1').trim()}
                </div>
              </Card>
            ))}
          </div>

          <Card padding="none">
            <Table 
              columns={getColumns()} 
              data={report.data || []} 
              keyExtractor={(r: any) => String(r.id || r.employeeId || r.code || Math.random())}
              loading={loading}
              emptyMessage="No data found for the selected filters."
            />
          </Card>
        </div>
      )}
    </div>
  );
}
