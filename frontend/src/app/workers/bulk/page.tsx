'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { ArrowLeft, Upload, FileText, CheckCircle2, AlertCircle } from 'lucide-react';
import Link from 'next/link';
import { Badge } from '@/components/ui/Badge';
import { Table } from '@/components/ui/Table';

export default function BulkAddWorkersPage() {
  const router = useRouter();
  const [profile, setProfile] = useState<any>(null);
  const [vendors, setVendors] = useState<any[]>([]);
  const [selectedVendor, setSelectedVendor] = useState('');
  
  const [inputText, setInputText] = useState('');
  const [parsedWorkers, setParsedWorkers] = useState<any[]>([]);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [results, setResults] = useState<any>(null);

  useEffect(() => {
    api.get('/auth/me')
      .then(res => {
        setProfile(res.user);
        if (res.user.role === 'MANAGEMENT') {
          api.get('/vendors').then(vRes => setVendors(vRes.vendors)).catch(console.error);
        } else if (res.user.role === 'VENDOR') {
          setSelectedVendor(res.user.vendorId);
        }
      })
      .catch(console.error);
  }, []);

  const handleParse = () => {
    if (!inputText.trim()) return;

    // Parse CSV: First Name, Last Name, Email
    const lines = inputText.split('\n');
    const workers = [];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      // Skip header if present
      if (line.toLowerCase().includes('first name') || line.toLowerCase().includes('firstname')) continue;
      
      const parts = line.split(',').map(p => p.trim());
      if (parts.length >= 3) {
        workers.push({
          firstName: parts[0],
          lastName: parts[1],
          email: parts[2]
        });
      }
    }
    
    setParsedWorkers(workers);
    setResults(null);
  };

  const handleSubmit = async () => {
    if (parsedWorkers.length === 0) return;
    if (profile?.role === 'MANAGEMENT' && !selectedVendor) {
      alert("Please select a Vendor first");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        workers: parsedWorkers.map(w => ({ ...w, vendorId: selectedVendor }))
      };
      const res = await api.post('/workers/bulk', payload);
      setResults(res);
      setParsedWorkers([]);
      setInputText('');
    } catch (err: any) {
      alert(err.message || 'Failed to process bulk upload');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div style={{ maxWidth: '900px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        <Link href="/workers">
          <Button variant="ghost" size="sm" style={{ padding: '0.5rem' }}>
            <ArrowLeft size={20} />
          </Button>
        </Link>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700 }}>Bulk Add Developers</h1>
          <p style={{ color: 'var(--text-secondary)' }}>Upload multiple developers at once using CSV format.</p>
        </div>
      </div>

      {results && (
        <Card padding="md" style={{ borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem', color: 'var(--color-success)' }}>
            <CheckCircle2 size={24} />
            <h2 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Upload Complete</h2>
          </div>
          <p>{results.message}</p>
          
          {results.errors && results.errors.length > 0 && (
            <div style={{ marginTop: '1rem', padding: '1rem', background: '#FEF2F2', borderRadius: '4px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#DC2626', fontWeight: 600, marginBottom: '0.5rem' }}>
                <AlertCircle size={18} />
                Failed Entries
              </div>
              <ul style={{ paddingLeft: '1.5rem', color: '#991B1B', fontSize: '0.875rem' }}>
                {results.errors.map((e: any, i: number) => (
                  <li key={i}>{e.email}: {e.message}</li>
                ))}
              </ul>
            </div>
          )}
          
          <div style={{ marginTop: '1.5rem', display: 'flex', gap: '1rem' }}>
            <Button onClick={() => {
              const csvRows = ['First Name,Last Name,Email,Temporary Password'];
              for (const res of results.results || []) {
                csvRows.push(`${res.worker.firstName},${res.worker.lastName},${res.worker.email},${res.tempPassword}`);
              }
              const blob = new Blob([csvRows.join('\n')], { type: 'text/csv' });
              const url = window.URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.setAttribute('href', url);
              a.setAttribute('download', 'developers_passwords.csv');
              a.click();
            }}>
              Download Passwords (CSV)
            </Button>
            <Link href="/workers">
              <Button variant="outline">Back to Developers</Button>
            </Link>
          </div>
        </Card>
      )}

      {!results && (
        <>
          <Card padding="lg">
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Step 1: Upload CSV Data</h3>
            <p style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
              Format: <code>First Name, Last Name, Email</code>
              <br />
              Upload a .csv file or paste the content below.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <input 
                type="file" 
                accept=".csv" 
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                      if (ev.target?.result) {
                        setInputText(ev.target.result as string);
                      }
                    };
                    reader.readAsText(file);
                  }
                }}
                style={{ 
                  display: 'block', width: '100%', padding: '1rem',
                  border: '2px dashed var(--border-medium)', borderRadius: 'var(--radius-md)',
                  background: 'var(--bg-secondary)', cursor: 'pointer'
                }}
              />
            </div>
            
            <textarea 
              value={inputText}
              onChange={e => setInputText(e.target.value)}
              placeholder="John, Doe, john.doe@dev.vlyntech.com&#10;Jane, Smith, jane.smith@dev.vlyntech.com"
              style={{ 
                width: '100%', height: '150px', padding: '1rem', fontFamily: 'monospace',
                border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', resize: 'vertical'
              }}
            />
            
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '1rem' }}>
              <Button onClick={handleParse} disabled={!inputText.trim()}>
                <FileText size={16} style={{ marginRight: '0.5rem' }} /> Parse Data
              </Button>
            </div>
          </Card>

          {parsedWorkers.length > 0 && (
            <Card padding="lg">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h3 style={{ fontSize: '1.125rem', fontWeight: 600 }}>Step 2: Review and Submit</h3>
                <Badge variant="primary">{parsedWorkers.length} Valid Entries</Badge>
              </div>
              
              {profile?.role === 'MANAGEMENT' && (
                <div style={{ marginBottom: '1.5rem' }}>
                  <label style={{ display: 'block', fontSize: '0.875rem', fontWeight: 500, marginBottom: '0.5rem' }}>
                    Assign to Vendor
                  </label>
                  <select 
                    value={selectedVendor} 
                    onChange={e => setSelectedVendor(e.target.value)}
                    style={{ width: '100%', padding: '0.5rem', borderRadius: '4px', border: '1px solid var(--border-medium)' }}
                  >
                    <option value="">Select a vendor...</option>
                    {vendors.map(v => (
                      <option key={v.id} value={v.id}>{v.name} ({v.code})</option>
                    ))}
                  </select>
                </div>
              )}

              <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '1.5rem', border: '1px solid var(--border-light)' }}>
                <Table 
                  columns={[
                    { key: 'firstName', header: 'First Name' },
                    { key: 'lastName', header: 'Last Name' },
                    { key: 'email', header: 'Email' }
                  ]}
                  data={parsedWorkers}
                  keyExtractor={(row) => String(row.email || Math.random())}
                />
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                <Button variant="outline" onClick={() => setParsedWorkers([])}>Cancel</Button>
                <Button onClick={handleSubmit} disabled={isSubmitting || (profile?.role === 'MANAGEMENT' && !selectedVendor)}>
                  {isSubmitting ? 'Processing...' : (
                    <>
                      <Upload size={16} style={{ marginRight: '0.5rem' }} /> Upload {parsedWorkers.length} Developers
                    </>
                  )}
                </Button>
              </div>
            </Card>
          )}
        </>
      )}
    </div>
  );
}
