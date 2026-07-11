'use client';

import React, { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
import { Input } from '@/components/ui/Input';
import { Plus, BookOpen, Trash2, Edit } from 'lucide-react';
import styles from './Handbook.module.css'; // We'll just use inline styles for now

export default function HandbookPage() {
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Modals
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [selectedDoc, setSelectedDoc] = useState<any>(null);
  
  // Form State
  const [formData, setFormData] = useState({ id: '', title: '', content: '', file: null as File | null });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const userRes = await api.get('/auth/me');
      setCurrentUser(userRes.user);
      
      const docRes = await api.get('/handbook');
      setDocuments(docRes.documents || []);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('content', formData.content);
      if (formData.file) {
        data.append('file', formData.file);
      }

      if (formData.id) {
        await api.put(`/handbook/${formData.id}`, data);
      } else {
        await api.post('/handbook', data);
      }
      setShowCreateModal(false);
      fetchData();
    } catch (err) {
      console.error('Failed to save document', err);
    }
  };

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (!confirm('Are you sure you want to delete this document?')) return;
    try {
      await api.delete(`/handbook/${id}`);
      fetchData();
    } catch (err) {
      console.error('Failed to delete document', err);
    }
  };

  const openCreateModal = () => {
    setFormData({ id: '', title: '', content: '', file: null });
    setShowCreateModal(true);
  };

  const openEditModal = (doc: any, e: React.MouseEvent) => {
    e.stopPropagation();
    setFormData({ id: doc.id, title: doc.title, content: doc.content, file: null });
    setShowCreateModal(true);
  };

  const openViewModal = (doc: any) => {
    setSelectedDoc(doc);
    setShowViewModal(true);
  };

  if (isLoading) return <div style={{ padding: '2rem' }}>Loading handbook...</div>;

  const isAdmin = currentUser?.role === 'MANAGEMENT';

  return (
    <div style={{ padding: '2rem' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h1 style={{ fontSize: '1.875rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <BookOpen size={28} />
            Handbook
          </h1>
          <p style={{ color: 'var(--text-secondary)' }}>SOPs, Client Guidelines, and Feedback</p>
        </div>
        {isAdmin && (
          <Button onClick={openCreateModal} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Plus size={18} />
            Add Document
          </Button>
        )}
      </div>

      {documents.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem', background: 'var(--bg-card)', borderRadius: 'var(--radius-lg)' }}>
          <BookOpen size={48} style={{ margin: '0 auto 1rem', color: 'var(--text-tertiary)' }} />
          <h3>No Documents Yet</h3>
          <p style={{ color: 'var(--text-secondary)' }}>Check back later for SOPs and guidelines.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
          {documents.map(doc => (
            <div 
              key={doc.id} 
              onClick={() => openViewModal(doc)}
              style={{ 
                background: 'var(--bg-card)', 
                padding: '1.5rem', 
                borderRadius: 'var(--radius-lg)', 
                border: '1px solid var(--border-medium)',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between'
              }}
              onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={(e) => e.currentTarget.style.transform = 'none'}
            >
              <div>
                <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '0.5rem' }}>{doc.title}</h3>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.875rem', display: '-webkit-box', WebkitLineClamp: 3, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
                  {doc.content}
                </p>
              </div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <span style={{ fontSize: '0.75rem', color: 'var(--text-tertiary)' }}>
                  {new Date(doc.createdAt).toLocaleDateString()}
                </span>
                
                {isAdmin && (
                  <div style={{ display: 'flex', gap: '0.5rem' }}>
                    <Button variant="ghost" size="sm" onClick={(e) => openEditModal(doc, e)}>
                      <Edit size={16} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={(e) => handleDelete(doc.id, e)} style={{ color: 'var(--danger)' }}>
                      <Trash2 size={16} />
                    </Button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal 
        isOpen={showCreateModal} 
        onClose={() => setShowCreateModal(false)}
        title={formData.id ? "Edit Document" : "Create Document"}
        footer={
          <>
            <Button variant="outline" onClick={() => setShowCreateModal(false)}>Cancel</Button>
            <Button onClick={handleSave} disabled={!formData.title || !formData.content}>Save</Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <Input 
            label="Document Title" 
            value={formData.title} 
            onChange={(e) => setFormData({...formData, title: e.target.value})} 
            placeholder="e.g. Annotation Guidelines v2" 
          />
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '0.5rem' }}>Content</label>
            <textarea 
              value={formData.content}
              onChange={(e) => setFormData({...formData, content: e.target.value})}
              placeholder="Enter document content here..."
              style={{ width: '100%', minHeight: '200px', padding: '0.75rem', border: '1px solid var(--border-medium)', borderRadius: 'var(--radius-md)', fontFamily: 'inherit', resize: 'vertical' }}
            />
          </div>
          <div>
            <label style={{ display: 'block', fontSize: 'var(--text-sm)', fontWeight: 500, marginBottom: '0.5rem' }}>Attachment (Optional)</label>
            <input 
              type="file" 
              onChange={(e) => setFormData({...formData, file: e.target.files ? e.target.files[0] : null})}
              style={{ display: 'block', width: '100%', padding: '0.5rem', border: '1px dashed var(--border-medium)', borderRadius: 'var(--radius-md)' }}
            />
          </div>
        </div>
      </Modal>

      <Modal 
        isOpen={showViewModal} 
        onClose={() => setShowViewModal(false)}
        title={selectedDoc?.title || "Document"}
      >
        {selectedDoc && (
          <div>
            <div style={{ marginBottom: '1rem', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
              Posted on {new Date(selectedDoc.createdAt).toLocaleDateString()} 
              {selectedDoc.author && ` by ${selectedDoc.author.firstName} ${selectedDoc.author.lastName}`}
            </div>
            <div style={{ whiteSpace: 'pre-wrap', lineHeight: 1.6, fontSize: '1rem', color: 'var(--text-primary)' }}>
              {selectedDoc.content}
            </div>
            {selectedDoc.fileUrl && (
              <div style={{ marginTop: '2rem', paddingTop: '1rem', borderTop: '1px solid var(--border-light)' }}>
                <a 
                  href={selectedDoc.fileUrl} 
                  target="_blank" 
                  rel="noreferrer"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.5rem', color: 'var(--color-primary-500)', fontWeight: 500, textDecoration: 'none' }}
                >
                  <BookOpen size={16} />
                  Download Attachment ({selectedDoc.fileName || 'File'})
                </a>
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  );
}
