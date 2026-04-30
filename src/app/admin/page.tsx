'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import styles from './admin.module.css';

export default function AdminDashboard() {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(true);

  // Data states
  const [bikes, setBikes] = useState<any[]>([]);
  const [rules, setRules] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [generations, setGenerations] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>({});
  const [selectedUser, setSelectedUser] = useState<any>(null);

  useEffect(() => {
    // Check auth
    fetch('/api/admin/auth/me').then(res => {
      if (!res.ok) router.push('/admin/login');
      else {
        setLoading(false);
        fetchData();
      }
    });
  }, [router]);

  const fetchData = async () => {
    Promise.all([
      fetch('/api/admin/bikes').then(r => r.json()),
      fetch('/api/admin/rules').then(r => r.json()),
      fetch('/api/admin/prompts').then(r => r.json()),
      fetch('/api/admin/users').then(r => r.json()),
      fetch('/api/admin/generations').then(r => r.json()),
      fetch('/api/admin/settings').then(r => r.json())
    ]).then(([b, r, p, u, g, s]) => {
      if (b.bikes) setBikes(b.bikes);
      if (r.rules) setRules(r.rules);
      if (p.prompts) setPrompts(p.prompts);
      if (u.users) setUsers(u.users);
      if (g.generations) setGenerations(g.generations);
      if (s.settings) setSettings(s.settings);
    });
  };

  // --- Settings Handler ---
  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/settings', { method: 'PUT', body: JSON.stringify(settings) });
    alert('Settings saved successfully!');
    fetchData();
  };

  // --- CRUD Handlers ---
  const [newBike, setNewBike] = useState({ model_name: '', type: '' });
  const handleAddBike = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/bikes', { method: 'POST', body: JSON.stringify(newBike) });
    setNewBike({ model_name: '', type: '' });
    fetchData();
  };
  const handleDeleteBike = async (id: string) => {
    if (confirm('Are you sure? This will delete all rules and generations associated with this bike.')) {
      await fetch(`/api/admin/bikes?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  const [newRule, setNewRule] = useState({ trait_combination: '', assigned_bike_id: '' });
  const handleAddRule = async (e: React.FormEvent) => {
    e.preventDefault();
    await fetch('/api/admin/rules', { method: 'POST', body: JSON.stringify(newRule) });
    setNewRule({ trait_combination: '', assigned_bike_id: '' });
    fetchData();
  };
  const handleDeleteRule = async (id: string) => {
    if (confirm('Delete this rule?')) {
      await fetch(`/api/admin/rules?id=${id}`, { method: 'DELETE' });
      fetchData();
    }
  };

  // --- Export Handler ---
  const handleExportCSV = (data: any[], filename: string) => {
    if (data.length === 0) return;
    const keys = Object.keys(data[0]);
    const csvContent = "data:text/csv;charset=utf-8,"
      + keys.join(",") + "\n"
      + data.map(row => keys.map(k => `"${String(row[k] || '').replace(/"/g, '""')}"`).join(",")).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `${filename}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading) return <div style={{ padding: '40px' }}>Loading...</div>;

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <div className={styles.brand}>Yamaha AI Admin</div>
        <button className={`${styles.navItem} ${activeTab === 'overview' ? styles.active : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`${styles.navItem} ${activeTab === 'users' ? styles.active : ''}`} onClick={() => setActiveTab('users')}>Users</button>
        <button className={`${styles.navItem} ${activeTab === 'generations' ? styles.active : ''}`} onClick={() => setActiveTab('generations')}>Generations</button>
        <button className={`${styles.navItem} ${activeTab === 'bikes' ? styles.active : ''}`} onClick={() => setActiveTab('bikes')}>Bikes</button>
        <button className={`${styles.navItem} ${activeTab === 'rules' ? styles.active : ''}`} onClick={() => setActiveTab('rules')}>Rules</button>
        <button className={`${styles.navItem} ${activeTab === 'prompts' ? styles.active : ''}`} onClick={() => setActiveTab('prompts')}>Prompts</button>
        <button className={`${styles.navItem} ${activeTab === 'settings' ? styles.active : ''}`} onClick={() => setActiveTab('settings')}>Settings</button>
      </div>

      <div className={styles.content}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '24px' }}>
          <h1 className={styles.header} style={{ marginBottom: 0 }}>Dashboard: {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h1>
          {['users', 'generations', 'bikes', 'rules'].includes(activeTab) && (
            <button
              className={styles.secondaryBtn}
              style={{ background: 'var(--accent)', color: 'white', padding: '8px 16px', borderRadius: '4px', border: 'none', cursor: 'pointer' }}
              onClick={() => handleExportCSV(
                activeTab === 'users' ? users :
                  activeTab === 'generations' ? generations :
                    activeTab === 'bikes' ? bikes : rules,
                `${activeTab}_export`
              )}
            >
              Export CSV
            </button>
          )}
        </div>

        {activeTab === 'overview' && (
          <div className={styles.statGrid}>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{users.length}</div>
              <div className={styles.statLabel}>Total Users</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{generations.length}</div>
              <div className={styles.statLabel}>Images Generated</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{bikes.length}</div>
              <div className={styles.statLabel}>Configured Bikes</div>
            </div>
            <div className={styles.statCard}>
              <div className={styles.statValue}>{rules.length}</div>
              <div className={styles.statLabel}>Active Rules</div>
            </div>
          </div>
        )}

        {activeTab === 'settings' && (
          <div>
            <form onSubmit={handleSaveSettings} style={{ display: 'flex', flexDirection: 'column', gap: '20px', maxWidth: '400px', background: 'var(--bg-surface)', padding: '24px', borderRadius: '12px' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Daily Limit (per user)</label>
                <input
                  type="number"
                  value={settings.max_daily_generations || ''}
                  onChange={e => setSettings({ ...settings, max_daily_generations: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-dark)', color: 'white' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Weekly Limit (per user)</label>
                <input
                  type="number"
                  value={settings.max_weekly_generations || ''}
                  onChange={e => setSettings({ ...settings, max_weekly_generations: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-dark)', color: 'white' }}
                  required
                />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '8px', color: 'var(--text-secondary)' }}>Monthly Limit (per user)</label>
                <input
                  type="number"
                  value={settings.max_monthly_generations || ''}
                  onChange={e => setSettings({ ...settings, max_monthly_generations: e.target.value })}
                  style={{ width: '100%', padding: '12px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', background: 'var(--bg-dark)', color: 'white' }}
                  required
                />
              </div>
              <button type="submit" className="primary-button" style={{ marginTop: '16px' }}>Save Limits</button>
            </form>
          </div>
        )}

        {activeTab === 'users' && (
          <div>
            <table className={styles.table}>
              <thead><tr><th>ID</th><th>Name</th><th>Phone</th><th>Images Generated</th><th>Joined</th><th>Actions</th></tr></thead>
              <tbody>
                {users.map(u => (
                  <tr key={u.id}>
                    <td>{u.id}</td><td>{u.name}</td><td>{u.phone}</td>
                    <td>{u.total_generations}</td>
                    <td>{new Date(u.created_at).toLocaleDateString()}</td>
                    <td>
                      <button
                        onClick={() => setSelectedUser(u)}
                        style={{ background: 'var(--accent)', color: 'white', border: 'none', padding: '4px 12px', borderRadius: '4px', cursor: 'pointer' }}
                      >
                        View Info
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* User Details Modal */}
        {selectedUser && (
          <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100 }}>
            <div style={{ background: 'var(--bg-surface)', padding: '32px', borderRadius: '12px', width: '90%', maxWidth: '800px', maxHeight: '90vh', overflowY: 'auto' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                <div>
                  <h2 style={{ fontSize: '24px', marginBottom: '8px' }}>User Details: {selectedUser.name}</h2>
                  <p style={{ color: 'var(--text-secondary)' }}>Phone: {selectedUser.phone} | Joined: {new Date(selectedUser.created_at).toLocaleDateString()}</p>
                </div>
                <button onClick={() => setSelectedUser(null)} style={{ background: 'transparent', border: 'none', color: 'white', fontSize: '24px', cursor: 'pointer' }}>&times;</button>
              </div>

              <h3 style={{ fontSize: '18px', marginBottom: '16px', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '8px' }}>Generations ({selectedUser.total_generations})</h3>

              {generations.filter(g => g.user_id === selectedUser.id).length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No images generated yet.</p>
              ) : (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '16px' }}>
                  {generations.filter(g => g.user_id === selectedUser.id).map(g => (
                    <div key={g.id} style={{ background: 'rgba(0,0,0,0.3)', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ position: 'relative', width: '100%', height: '200px', background: 'var(--bg-dark)', display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center', padding: '10px' }}>
                        <span style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>Image deleted by s3 bucket</span>
                        <img
                          src={g.generated_image_url}
                          alt="Generated Persona"
                          style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%', objectFit: 'cover' }}
                          onError={(e) => { e.currentTarget.style.display = 'none'; }}
                        />
                      </div>
                      <div style={{ padding: '12px' }}>
                        <p style={{ fontSize: '12px', color: 'var(--accent)', marginBottom: '4px' }}>{g.bike_model}</p>
                        <p style={{ fontSize: '11px', color: 'var(--text-secondary)' }}>{new Date(g.created_at).toLocaleString()}</p>
                        <a href={`/result/${g.hash_id}`} target="_blank" style={{ fontSize: '12px', color: 'white', textDecoration: 'underline', marginTop: '8px', display: 'inline-block' }}>View Result Page</a>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'generations' && (
          <div>
            <table className={styles.table}>
              <thead><tr><th>Hash ID</th><th>User</th><th>Phone</th><th>Assigned Bike</th><th>Date</th><th>Image</th></tr></thead>
              <tbody>
                {generations.map(g => (
                  <tr key={g.id}>
                    <td><a href={`/result/${g.hash_id}`} target="_blank" style={{ color: 'var(--accent)' }}>{g.hash_id.substring(0, 8)}...</a></td>
                    <td>{g.user_name}</td>
                    <td>{g.user_phone}</td>
                    <td>{g.bike_model}</td>
                    <td>{new Date(g.created_at).toLocaleString()}</td>
                    <td><a href={g.generated_image_url} target="_blank" style={{ color: '#aaa' }}>View</a></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'bikes' && (
          <div>
            <form onSubmit={handleAddBike} className={styles.formGrid}>
              <input placeholder="Model Name" value={newBike.model_name} onChange={e => setNewBike({ ...newBike, model_name: e.target.value })} required />
              <input placeholder="Type (e.g. Sport, Scooter)" value={newBike.type} onChange={e => setNewBike({ ...newBike, type: e.target.value })} required />
              <button type="submit" className="primary-button" style={{ gridColumn: 'span 2' }}>Add Bike</button>
            </form>

            <table className={styles.table}>
              <thead><tr><th>ID</th><th>Model</th><th>Type</th><th>Actions</th></tr></thead>
              <tbody>
                {bikes.map(b => (
                  <tr key={b.id}>
                    <td>{b.id}</td><td>{b.model_name}</td><td>{b.type}</td>
                    <td>
                      <button onClick={() => handleDeleteBike(b.id)} style={{ background: '#440000', color: '#ffaaaa', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'rules' && (
          <div>
            <form onSubmit={handleAddRule} className={styles.formGrid}>
              <input placeholder="Traits (comma separated)" value={newRule.trait_combination} onChange={e => setNewRule({ ...newRule, trait_combination: e.target.value })} required />
              <select value={newRule.assigned_bike_id} onChange={e => setNewRule({ ...newRule, assigned_bike_id: e.target.value })} required>
                <option value="">Select Bike...</option>
                {bikes.map(b => <option key={b.id} value={b.id}>{b.model_name}</option>)}
              </select>
              <button type="submit" className="primary-button" style={{ gridColumn: 'span 2' }}>Add Rule</button>
            </form>

            <table className={styles.table}>
              <thead><tr><th>ID</th><th>Trait Combination</th><th>Assigned Bike</th><th>Actions</th></tr></thead>
              <tbody>
                {rules.map(r => (
                  <tr key={r.id}>
                    <td>{r.id}</td><td>{r.trait_combination}</td><td>{r.model_name}</td>
                    <td>
                      <button onClick={() => handleDeleteRule(r.id)} style={{ background: '#440000', color: '#ffaaaa', border: 'none', padding: '4px 8px', borderRadius: '4px', cursor: 'pointer' }}>Delete</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'prompts' && (
          <div>
            <table className={styles.table}>
              <thead><tr><th>ID</th><th>Template</th><th>Active</th></tr></thead>
              <tbody>
                {prompts.map(p => <tr key={p.id}><td>{p.id}</td><td>{p.prompt_template.substring(0, 50)}...</td><td>{p.is_active ? 'Yes' : 'No'}</td></tr>)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
