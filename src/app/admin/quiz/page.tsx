'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

export default function QuizManagerPage() {
  const [bikes, setBikes] = useState<any[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<any[]>([]);
  const [selectedQuestion, setSelectedQuestion] = useState<any>(null);
  const [quizOptions, setQuizOptions] = useState<any[]>([]);
  const [editingOption, setEditingOption] = useState<any>(null);
  const [newQuestion, setNewQuestion] = useState({ question_text: '', question_type: 'behavior', order_index: 0 });
  const [newOption, setNewOption] = useState<any>({ option_text: '', option_desc: '', icon_name: '', metadata: {}, bike_ids: [] });

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    const [bRes, qRes] = await Promise.all([
      fetch('/api/admin/bikes'),
      fetch('/api/admin/quiz/questions')
    ]);
    const b = await bRes.json();
    const q = await qRes.json();
    if (b.bikes) setBikes(b.bikes);
    if (q.questions) setQuizQuestions(q.questions);
  };

  useEffect(() => {
    if (selectedQuestion) {
      fetch(`/api/admin/quiz/options?questionId=${selectedQuestion.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.options) setQuizOptions(data.options);
        });
    }
  }, [selectedQuestion]);

  const handleAddQuestion = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/quiz/questions', { method: 'POST', body: JSON.stringify(newQuestion) });
    setNewQuestion({ question_text: '', question_type: 'behavior', order_index: 0 });
    fetchData();
  };

  const handleDeleteQuestion = async (id: string) => {
    if (confirm('Delete this question?')) {
      await fetch(`/api/admin/quiz/questions?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const handleAddOption = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/quiz/options', { 
      method: editingOption ? 'PUT' : 'POST', 
      body: JSON.stringify({ ...newOption, id: editingOption?.id, question_id: selectedQuestion.id }) 
    });
    setNewOption({ option_text: '', option_desc: '', icon_name: '', metadata: {}, bike_ids: [] });
    setEditingOption(null);
    const res = await fetch(`/api/admin/quiz/options?questionId=${selectedQuestion.id}`);
    const data = await res.json();
    if (data.options) setQuizOptions(data.options);
  };

  const handleDeleteOption = async (id: string) => {
    if (confirm('Delete this option?')) {
      await fetch(`/api/admin/quiz/options?id=${id}`, { method: 'DELETE' });
      const res = await fetch(`/api/admin/quiz/options?questionId=${selectedQuestion.id}`);
      const data = await res.json();
      if (data.options) setQuizOptions(data.options);
    }
  };

  const Icons = {
    Plus: () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>,
    Back: () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 12 5"></polyline></svg>,
    Check: () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"></polyline></svg>
  };

  return (
    <div className="fade-in">
      {!selectedQuestion ? (
        <>
          <div className={styles.header}><h1>Quiz Manager</h1></div>
          <div className={styles.card}>
            <h2 style={{ marginBottom: '20px' }}>Create Quiz Question</h2>
            <form onSubmit={handleAddQuestion} className={styles.formGrid}>
              <input placeholder="Question Text" value={newQuestion.question_text} onChange={e => setNewQuestion({ ...newQuestion, question_text: e.target.value })} className={styles.input} required />
              <select value={newQuestion.question_type} onChange={e => setNewQuestion({ ...newQuestion, question_type: e.target.value as any })} className={styles.select} required>
                <option value="behavior">Behavior (Bikes)</option>
                <option value="destination">Destination (Background)</option>
                <option value="aspiration">Aspiration (Color)</option>
              </select>
              <input type="number" placeholder="Display Order" value={newQuestion.order_index} onChange={e => setNewQuestion({ ...newQuestion, order_index: parseInt(e.target.value) })} className={styles.input} />
              <button type="submit" className={styles.primaryBtn}><Icons.Plus /> Add Question</button>
            </form>
          </div>
          <div className={styles.card}>
            <table className={styles.table}>
              <thead><tr><th>Order</th><th>Question</th><th>Type</th><th>Actions</th></tr></thead>
              <tbody>
                {quizQuestions.map(q => (
                  <tr key={q.id}>
                    <td style={{ width: '60px', color: '#007aff', fontWeight: 800 }}>{q.order_index}</td>
                    <td style={{ fontWeight: 500 }}>{q.question_text}</td>
                    <td><span className={styles.badge} style={{ background: q.question_type === 'behavior' ? 'rgba(0, 122, 255, 0.2)' : q.question_type === 'destination' ? 'rgba(0, 255, 122, 0.1)' : 'rgba(255, 122, 0, 0.1)', color: q.question_type === 'behavior' ? '#007aff' : q.question_type === 'destination' ? '#00ff7a' : '#ff7a00' }}>{q.question_type}</span></td>
                    <td>
                      <button onClick={() => setSelectedQuestion(q)} className={styles.editBtn}>Manage Options</button>
                      <button onClick={() => handleDeleteQuestion(q.id)} className={styles.dangerBtn}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      ) : (
        <>
          <button onClick={() => { setSelectedQuestion(null); setQuizOptions([]); }} className={styles.backBtn}><Icons.Back /> Back to Questions</button>
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ fontSize: '28px' }}>{selectedQuestion.question_text}</h2>
            <p style={{ color: 'rgba(255,255,255,0.4)', textTransform: 'uppercase', fontSize: '12px', letterSpacing: '1px', fontWeight: 700, marginTop: '4px' }}>Type: {selectedQuestion.question_type}</p>
          </div>
          <div className={styles.card}>
            <h3 style={{ marginBottom: '24px' }}>{editingOption ? 'Edit Option' : 'Create New Option'}</h3>
            <form onSubmit={handleAddOption} className={styles.formGrid}>
              <input placeholder="Option Title" value={newOption.option_text} onChange={e => setNewOption({ ...newOption, option_text: e.target.value })} className={styles.input} required />
              <input placeholder="Short Description" value={newOption.option_desc} onChange={e => setNewOption({ ...newOption, option_desc: e.target.value })} className={styles.input} />
              <input placeholder="Icon Name" value={newOption.icon_name} onChange={e => setNewOption({ ...newOption, icon_name: e.target.value })} className={styles.input} />
              {selectedQuestion.question_type === 'behavior' && (
                <div style={{ gridColumn: 'span 2' }}>
                  <label className={styles.statLabel} style={{ marginBottom: '12px', display: 'block' }}>Map Bikes</label>
                  <div className={styles.bikeGrid}>
                    {bikes.map(b => (
                      <div key={b.id} className={`${styles.bikeItem} ${newOption.bike_ids?.includes(b.id) ? styles.selected : ''}`} onClick={() => {
                        const ids = [...(newOption.bike_ids || [])];
                        if (ids.includes(b.id)) ids.splice(ids.indexOf(b.id), 1);
                        else ids.push(b.id);
                        setNewOption({ ...newOption, bike_ids: ids });
                      }}>
                        <div className={styles.checkbox}><Icons.Check /></div>
                        <span style={{ fontSize: '13px', fontWeight: 500 }}>{b.model_name}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {selectedQuestion.question_type === 'destination' && (
                <>
                  <input placeholder="Personality Signal" value={newOption.metadata?.personality || ''} onChange={e => setNewOption({ ...newOption, metadata: { ...newOption.metadata, personality: e.target.value } })} className={styles.input} />
                  <input placeholder="AI Scene Description" value={newOption.metadata?.scene || ''} onChange={e => setNewOption({ ...newOption, metadata: { ...newOption.metadata, scene: e.target.value } })} className={styles.input} />
                </>
              )}
              {selectedQuestion.question_type === 'aspiration' && (<input placeholder="Target Bike Color" value={newOption.metadata?.color || ''} onChange={e => setNewOption({ ...newOption, metadata: { ...newOption.metadata, color: e.target.value } })} className={styles.input} style={{ gridColumn: 'span 2' }} />)}
              <div style={{ gridColumn: 'span 2', display: 'flex', gap: '16px', marginTop: '12px' }}>
                <button type="submit" className={styles.primaryBtn}>{editingOption ? 'Update Option' : 'Create Option'}</button>
                {editingOption && <button type="button" onClick={() => { setEditingOption(null); setNewOption({ option_text: '', option_desc: '', icon_name: '', metadata: {}, bike_ids: [] }); }} className={styles.secondaryBtn}>Cancel</button>}
              </div>
            </form>
          </div>
          <div className={styles.card}>
            <table className={styles.table}>
              <thead><tr><th>Title</th><th>Metadata / Logic</th><th>Actions</th></tr></thead>
              <tbody>
                {quizOptions.map(o => (
                  <tr key={o.id}>
                    <td style={{ fontWeight: 600 }}>{o.option_text}</td>
                    <td style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)' }}>
                      {selectedQuestion.question_type === 'behavior' ? `Bikes: ${o.bike_mappings?.map((m: any) => m.model_name).join(', ') || 'None'}` :
                       selectedQuestion.question_type === 'destination' ? `Scene: ${JSON.parse(o.metadata || '{}').scene || 'N/A'}` :
                       `Color: ${JSON.parse(o.metadata || '{}').color || 'N/A'}`}
                    </td>
                    <td>
                      <button onClick={() => { setEditingOption(o); setNewOption({ option_text: o.option_text, option_desc: o.option_desc, icon_name: o.icon_name, metadata: JSON.parse(o.metadata || '{}'), bike_ids: o.bike_mappings?.map((m: any) => m.bike_id) || [] }); }} className={styles.editBtn}>Edit</button>
                      <button onClick={() => handleDeleteOption(o.id)} className={styles.dangerBtn}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
