'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

export default function PromptsPage() {
  const [prompts, setPrompts] = useState<any[]>([]);
  const [newPrompt, setNewPrompt] = useState({ prompt_template: '' });

  useEffect(() => {
    fetchPrompts();
  }, []);

  const fetchPrompts = async () => {
    const res = await fetch('/api/admin/prompts');
    const data = await res.json();
    if (data.prompts) setPrompts(data.prompts);
  };

  const handleAddPrompt = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/prompts', { 
      method: 'POST', 
      body: JSON.stringify(newPrompt) 
    });
    setNewPrompt({ prompt_template: '' });
    fetchPrompts();
  };

  const handleToggleActive = async (id: number) => {
    await fetch(`/api/admin/prompts?id=${id}`, { method: 'PUT' });
    fetchPrompts();
  };

  const Icons = {
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
  };

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>AI Prompt Templates</h1>
      </div>

      <div className={styles.card}>
        <h2 style={{ marginBottom: '20px' }}>Add New Template</h2>
        <form onSubmit={handleAddPrompt} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          <textarea 
            placeholder="Enter full AI prompt template with {{bike_model}}, {{destination}}, and {{persona}} placeholders..." 
            value={newPrompt.prompt_template} 
            onChange={e => setNewPrompt({ ...newPrompt, prompt_template: e.target.value })} 
            className={styles.textarea} 
            style={{ minHeight: '150px' }}
            required 
          />
          <button type="submit" className={styles.primaryBtn} style={{ alignSelf: 'flex-start' }}>
            <Icons.Plus /> Save Template
          </button>
        </form>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead><tr><th>Prompt Template Snippet</th><th>Status</th><th>Actions</th></tr></thead>
          <tbody>
            {prompts.map(p => (
              <tr key={p.id}>
                <td style={{ fontSize: '13px', color: 'rgba(255,255,255,0.6)', maxWidth: '500px' }}>
                  {p.prompt_template.substring(0, 150)}...
                </td>
                <td>
                  <span className={styles.badge} style={{ 
                    background: p.is_active ? 'rgba(0, 255, 122, 0.1)' : 'rgba(255, 255, 255, 0.05)', 
                    color: p.is_active ? '#00ff7a' : '#888' 
                  }}>
                    {p.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {!p.is_active && (
                    <button onClick={() => handleToggleActive(p.id)} className={styles.editBtn}>Activate</button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
