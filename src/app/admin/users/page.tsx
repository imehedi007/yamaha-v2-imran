'use client';

import { useState, useEffect } from 'react';
import styles from '../admin.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [loading, setLoading] = useState(true);
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [selectedUser, setSelectedUser] = useState<any>(null);
  const [userGenerations, setUserGenerations] = useState<any[]>([]);

  useEffect(() => {
    fetchUsers();
  }, [page, limit]);

  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch(`/api/admin/users?page=${page}&limit=${limit}`);
    const data = await res.json();
    if (data.users) {
      setUsers(data.users);
      setTotal(data.total);
    }
    setLoading(false);
  };

  useEffect(() => {
    if (selectedUser) {
      fetch(`/api/admin/generations/user?userId=${selectedUser.id}`)
        .then(r => r.json())
        .then(data => {
          if (data.generations) setUserGenerations(data.generations);
        });
    } else {
      setUserGenerations([]);
    }
  }, [selectedUser]);

  const toggleSelect = (id: number) => {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === users.length) setSelectedIds([]);
    else setSelectedIds(users.map(u => u.id));
  };

  const handleExport = () => {
    const dataToExport = selectedIds.length > 0 
      ? users.filter(u => selectedIds.includes(u.id))
      : users;
    
    if (dataToExport.length === 0) return;

    const keys = ['id', 'name', 'phone', 'dob', 'created_at', 'total_generations'];
    const csvContent = "data:text/csv;charset=utf-8,"
      + keys.join(",") + "\n"
      + dataToExport.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `yamaha_users_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDeleteGen = async (id: number) => {
    if (confirm('Delete this generation?')) {
      await fetch(`/api/admin/generations?id=${id}`, { method: 'DELETE' });
      // Refresh user generations
      const res = await fetch(`/api/admin/generations/user?userId=${selectedUser.id}`);
      const data = await res.json();
      if (data.generations) setUserGenerations(data.generations);
    }
  };

  const totalPages = Math.ceil(total / limit);

  return (
    <div className="fade-in">
      <div className={styles.header}>
        <h1>Users Management</h1>
        <div style={{ display: 'flex', gap: '12px' }}>
          <select value={limit} onChange={e => { setLimit(parseInt(e.target.value)); setPage(1); }} className={styles.select} style={{ width: 'auto' }}>
            <option value="20">20 per page</option>
            <option value="40">40 per page</option>
            <option value="60">60 per page</option>
          </select>
          <button className={styles.secondaryBtn} onClick={handleExport}>
            Export {selectedIds.length > 0 ? `Selected (${selectedIds.length})` : 'All'} CSV
          </button>
        </div>
      </div>

      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th style={{ width: '40px' }}>
                <input type="checkbox" checked={selectedIds.length === users.length && users.length > 0} onChange={toggleSelectAll} />
              </th>
              <th>ID</th>
              <th>Name</th>
              <th>Phone</th>
              <th>Age Range</th>
              <th>Gens</th>
              <th>Joined</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr><td colSpan={8} style={{ textAlign: 'center', padding: '40px' }}>Loading...</td></tr>
            ) : (
              users.map(u => (
                <tr key={u.id} className={selectedIds.includes(u.id) ? styles.rowSelected : ''}>
                  <td>
                    <input type="checkbox" checked={selectedIds.includes(u.id)} onChange={() => toggleSelect(u.id)} />
                  </td>
                  <td>{u.id}</td>
                  <td style={{ fontWeight: 600 }}>{u.name}</td>
                  <td>{u.phone}</td>
                  <td>{u.dob || 'N/A'}</td>
                  <td>{u.total_generations}</td>
                  <td>{new Date(u.created_at).toLocaleDateString()}</td>
                  <td>
                    <button onClick={() => setSelectedUser(u)} className={styles.editBtn}>View Details</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>

        <div className={styles.pagination}>
          <button disabled={page === 1} onClick={() => setPage(p => p - 1)} className={styles.secondaryBtn}>Previous</button>
          <span>Page {page} of {totalPages || 1} ({total} total)</span>
          <button disabled={page === totalPages} onClick={() => setPage(p => p + 1)} className={styles.secondaryBtn}>Next</button>
        </div>
      </div>

      {selectedUser && (
        <div className={styles.modalOverlay}>
          <div className={styles.modalContent} style={{ maxWidth: '700px', padding: '32px' }}>
            <button className={styles.closeBtn} onClick={() => setSelectedUser(null)}>✕</button>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
              <div>
                <h2 style={{ fontSize: '24px', fontWeight: 700 }}>{selectedUser.name}</h2>
                <p style={{ color: 'rgba(255,255,255,0.4)', fontSize: '13px' }}>Member since {new Date(selectedUser.created_at).toLocaleDateString()}</p>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontSize: '18px', fontWeight: 600, color: '#007aff' }}>{selectedUser.phone}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.3)' }}>{selectedUser.dob || 'Age Range N/A'}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.05)', paddingTop: '24px' }}>
              <h3 style={{ fontSize: '16px', marginBottom: '16px' }}>History ({userGenerations.length} images)</h3>
              <div className={styles.genGrid} style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: '16px' }}>
                {userGenerations.map(gen => (
                  <div key={gen.id} className={styles.genCard} style={{ position: 'relative' }}>
                    <a href={`/result/${gen.hash_id}`} target="_blank" rel="noopener noreferrer">
                      <img 
                        src={gen.generated_image_url} 
                        alt="Gen" 
                        className={styles.genImage} 
                        onError={(e) => {
                          (e.target as any).src = "https://via.placeholder.com/400x533?text=Image+Deleted";
                        }}
                      />
                    </a>
                    <div style={{ padding: '8px', fontSize: '10px' }}>
                      <div style={{ fontWeight: 600, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{gen.bike_model}</div>
                      <div style={{ color: 'rgba(255,255,255,0.4)' }}>{new Date(gen.created_at).toLocaleDateString()}</div>
                    </div>
                    <button 
                      onClick={(e) => { e.preventDefault(); handleDeleteGen(gen.id); }} 
                      className={styles.dangerBtn}
                      style={{ position: 'absolute', top: '6px', right: '6px', padding: '2px 5px', fontSize: '8px', background: 'rgba(255,0,0,0.8)' }}
                    >
                      ✕
                    </button>
                  </div>
                ))}
                {userGenerations.length === 0 && !loading && (
                  <div style={{ color: 'rgba(255,255,255,0.1)', textAlign: 'center', width: '100%', padding: '20px' }}>No activity yet.</div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
