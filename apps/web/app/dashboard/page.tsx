'use client'
import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '../../lib/api'

type User = { email: string; profile: { name?: string | null } | null }
type Repo = { id: string; fullName: string; url: string; stars: number }
type Summary = { latestScore: any; repositories: Repo[] }

export default function DashboardPage() {
  const router = useRouter();
  const [user, setUser] = useState<User | null>(null);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [importing, setImporting] = useState(false);
  
  useEffect(() => {
    api<User>('/auth/me').then(setUser).catch(() => router.replace('/auth/login'));
    api<{data: Summary}>('/dashboard/summary').then(res => setSummary(res.data)).catch(console.error);
  }, [router]);

  async function logout() {
    await api('/auth/logout', { method: 'POST' });
    router.replace('/auth/login');
  }

  async function importRepo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setImporting(true);
    const fd = new FormData(e.currentTarget);
    const owner = fd.get('owner') as string;
    const name = fd.get('name') as string;
    try {
      await api('/github/import', { method: 'POST', body: JSON.stringify({ owner, name }) });
      // Refresh summary
      const res = await api<{data: Summary}>('/dashboard/summary');
      setSummary(res.data);
    } catch (err) {
      alert('Failed to import repository. Make sure it exists and you have access.');
    } finally {
      setImporting(false);
    }
  }

  if (!user) return <main className="health"><p className="eyebrow">NEXUS / WORKSPACE</p><h1>Loading your workspace…</h1></main>;

  return (
    <main className="dashboard">
      <aside>
        <span className="mark">NEXUS</span>
        <p className="eyebrow">INTELLIGENCE OS</p>
        <nav>
          <a className="active" href="/dashboard">Overview</a>
          <a href="#profile">Profile</a>
          <a href="#evidence">Evidence</a>
          <a href="#roadmap">Roadmap</a>
        </nav>
        <button onClick={logout}>Log out</button>
      </aside>
      
      <section className="dash-content">
        <header>
          <div>
            <p className="eyebrow">OVERVIEW / TODAY</p>
            <h1>Good to have you, {user.profile?.name ?? 'builder'}.</h1>
          </div>
          <span className="identity">{user.email}</span>
        </header>

        {(!summary?.repositories || summary.repositories.length === 0) && (
          <div className="empty-banner">
            <span className="signal">01</span>
            <div>
              <h2>Your intelligence profile starts here.</h2>
              <p>Connect evidence to unlock explainable scores. NEXUS will never turn an unsupported claim into a fact.</p>
            </div>
            <a href="http://localhost:4000/github/oauth/login" className="button-link" style={{ marginLeft: 'auto' }}>Connect GitHub</a>
          </div>
        )}

        <div className="dash-grid">
          <article className="dash-card">
            <small>01</small>
            <h2>Developer score</h2>
            {summary?.latestScore ? (
              <div>
                <p style={{fontSize: '2rem', color: 'var(--accent)', fontWeight: 'bold'}}>{summary.latestScore.overall}</p>
                <p>Based on {summary.repositories?.length || 0} signals</p>
              </div>
            ) : (
              <><p>Waiting for your first verified signal.</p><span className="empty-label">EMPTY STATE</span></>
            )}
          </article>
          <article className="dash-card">
            <small>02</small>
            <h2>Repositories</h2>
            {summary?.repositories?.length ? (
              <div style={{marginTop: '1rem'}}>
                <ul style={{paddingLeft: '1.2rem', margin: 0, color: 'var(--muted)'}}>
                  {summary.repositories.map(r => (
                    <li key={r.id}><a href={r.url} target="_blank" rel="noreferrer" style={{color: 'var(--accent)'}}>{r.fullName}</a> ⭐ {r.stars}</li>
                  ))}
                </ul>
              </div>
            ) : (
              <><p>No repositories analyzed yet.</p><span className="empty-label">EMPTY STATE</span></>
            )}
          </article>
          <article className="dash-card" style={{gridColumn: 'span 2'}}>
            <small>03</small>
            <h2>Import Repository</h2>
            <p>Analyze a specific repository (public, or private if GitHub is connected).</p>
            <form onSubmit={importRepo} style={{display: 'flex', gap: '10px', marginTop: '1rem'}}>
              <input name="owner" placeholder="Owner (e.g. facebook)" required style={{background: '#0b0d10', border: '1px solid #303840', color: 'var(--text)', padding: '10px', borderRadius: '4px', flex: 1}} />
              <input name="name" placeholder="Repo (e.g. react)" required style={{background: '#0b0d10', border: '1px solid #303840', color: 'var(--text)', padding: '10px', borderRadius: '4px', flex: 1}} />
              <button disabled={importing} style={{background: 'var(--accent)', color: '#0b0d10', border: 0, padding: '10px 20px', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer'}}>{importing ? 'Importing...' : 'Import'}</button>
            </form>
          </article>
        </div>
      </section>
    </main>
  )
}
