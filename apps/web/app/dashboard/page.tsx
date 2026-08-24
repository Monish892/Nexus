'use client'
import { useEffect, useState, FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { api } from '../../lib/api'

type User = { email: string; role: string; profile: { name?: string | null; headline?: string | null; targetRole?: string | null } | null }
type Repo = { id: string; fullName: string; url: string; stars: number; primaryLanguage: string | null; description: string | null; analyses: any[] }
type Summary = { latestScore: { overall: number; breakdown: any } | null; repositories: Repo[] }

export default function DashboardPage() {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [summary, setSummary] = useState<Summary | null>(null)
  const [tab, setTab] = useState('overview')
  const [importing, setImporting] = useState(false)
  const [importError, setImportError] = useState('')

  useEffect(() => {
    api<User>('/auth/me').then(setUser).catch(() => router.replace('/auth/login'))
    loadSummary()
  }, [router])

  function loadSummary() {
    api<Summary>('/dashboard/summary').then(setSummary).catch(() => {})
  }

  async function logout() {
    await api('/auth/logout', { method: 'POST' })
    router.replace('/auth/login')
  }

  async function importRepo(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setImporting(true)
    setImportError('')
    const fd = new FormData(e.currentTarget)
    try {
      await api('/github/import', { method: 'POST', body: JSON.stringify({ owner: fd.get('owner'), name: fd.get('name') }) })
      loadSummary()
      ;(e.target as HTMLFormElement).reset()
    } catch (err: any) {
      setImportError(err.message || 'Import failed')
    } finally {
      setImporting(false)
    }
  }

  if (!user) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center'}}><div className="loading-pulse"><p className="eyebrow">NEXUS</p><h1 style={{fontSize:'1.8rem',letterSpacing:'-.04em',marginTop:8}}>Loading workspace…</h1></div></main>

  const score = summary?.latestScore
  const repos = summary?.repositories || []
  const breakdown = score?.breakdown as Record<string,number> | undefined

  return (
    <main className="dashboard">
      <aside>
        <span className="mark">NEXUS</span>
        <p className="eyebrow" style={{marginTop:-8}}>INTELLIGENCE OS</p>
        <nav>
          <a className={tab==='overview'?'active':''} href="#" onClick={e=>{e.preventDefault();setTab('overview')}}>Overview</a>
          <a className={tab==='repos'?'active':''} href="#" onClick={e=>{e.preventDefault();setTab('repos')}}>Repositories</a>
          <a className={tab==='resume'?'active':''} href="#" onClick={e=>{e.preventDefault();setTab('resume')}}>Resume</a>
          <a className={tab==='jobs'?'active':''} href="#" onClick={e=>{e.preventDefault();setTab('jobs')}}>Jobs</a>
          <a className={tab==='interview'?'active':''} href="#" onClick={e=>{e.preventDefault();setTab('interview')}}>Interview</a>
          <a className={tab==='roadmap'?'active':''} href="#" onClick={e=>{e.preventDefault();setTab('roadmap')}}>Roadmap</a>
        </nav>
        <button className="btn-outline" onClick={logout}>Log out</button>
      </aside>

      <section className="dash-content">
        <header>
          <div>
            <p className="eyebrow">{tab.toUpperCase()}</p>
            <h1>{tab === 'overview' ? `Welcome back, ${user.profile?.name || 'builder'}.` : tab.charAt(0).toUpperCase() + tab.slice(1)}</h1>
          </div>
          <span className="identity">{user.email}</span>
        </header>

        {tab === 'overview' && <OverviewTab score={score} repos={repos} breakdown={breakdown} onImport={importRepo} importing={importing} importError={importError} />}
        {tab === 'repos' && <ReposTab repos={repos} onImport={importRepo} importing={importing} importError={importError} />}
        {tab === 'resume' && <ResumeTab />}
        {tab === 'jobs' && <JobsTab />}
        {tab === 'interview' && <InterviewTab />}
        {tab === 'roadmap' && <RoadmapTab />}
      </section>
    </main>
  )
}

function OverviewTab({ score, repos, breakdown, onImport, importing, importError }: any) {
  return <>
    {repos.length === 0 && (
      <div className="empty-banner">
        <span className="signal" style={{fontSize:'1.4rem',fontWeight:800}}>→</span>
        <div>
          <h2>Start by importing a repository</h2>
          <p>Connect your GitHub work to build an evidence-based developer profile.</p>
        </div>
      </div>
    )}
    <div className="dash-grid">
      <article className="dash-card">
        <small>DEVELOPER SCORE</small>
        {score ? <>
          <div className="score-big" style={{marginTop:16}}>{score.overall}</div>
          <div className="score-label">out of 100 · based on {repos.length} repo{repos.length!==1?'s':''}</div>
          <div className="score-bar" style={{marginTop:12}}><div className="score-bar-fill" style={{width:`${score.overall}%`,background:'var(--accent)'}} /></div>
        </> : <>
          <p style={{marginTop:16}}>No score yet</p>
          <span className="empty-label">IMPORT A REPO</span>
        </>}
      </article>

      {breakdown && Object.entries(breakdown).map(([key, val]) => (
        <article className="dash-card" key={key}>
          <small>{key.replace(/([A-Z])/g,' $1').toUpperCase()}</small>
          <div style={{marginTop:16,fontSize:'1.6rem',fontWeight:700,color: (val as number) > 60 ? 'var(--accent)' : 'var(--warning)'}}>{val as number}</div>
          <div className="score-bar"><div className="score-bar-fill" style={{width:`${val}%`, background: (val as number) > 60 ? 'var(--accent)' : 'var(--warning)'}} /></div>
        </article>
      ))}

      <article className="dash-card" style={{gridColumn: repos.length === 0 ? 'span 2' : undefined}}>
        <small>QUICK IMPORT</small>
        <form onSubmit={onImport} className="form-row" style={{marginTop:12,flexWrap:'wrap'}}>
          <input name="owner" placeholder="Owner" required style={{minWidth:80}} />
          <input name="name" placeholder="Repo" required style={{minWidth:80}} />
          <button disabled={importing} className="btn-sm">{importing ? '…' : 'Import'}</button>
        </form>
        {importError && <p className="form-error" style={{marginTop:8}}>{importError}</p>}
      </article>
    </div>

    {repos.length > 0 && <>
      <h2 style={{marginTop:32,fontSize:16,letterSpacing:'-.02em'}}>Recent Repositories</h2>
      <table className="data-table">
        <thead><tr><th>Repository</th><th>Language</th><th>Stars</th></tr></thead>
        <tbody>
          {repos.map((r: any) => (
            <tr key={r.id}>
              <td><a href={r.url} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>{r.fullName}</a></td>
              <td>{r.primaryLanguage || '—'}</td>
              <td>{r.stars}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>}
  </>
}

function ReposTab({ repos, onImport, importing, importError }: any) {
  return <>
    <form onSubmit={onImport} className="form-row" style={{marginBottom:24}}>
      <input name="owner" placeholder="Owner (e.g. facebook)" required />
      <input name="name" placeholder="Repo (e.g. react)" required />
      <button disabled={importing}>{importing ? 'Importing…' : 'Import Repository'}</button>
    </form>
    {importError && <p className="form-error">{importError}</p>}
    {repos.length === 0 ? <p className="muted">No repositories imported yet.</p> :
      <table className="data-table">
        <thead><tr><th>Repository</th><th>Language</th><th>Stars</th><th>Description</th></tr></thead>
        <tbody>
          {repos.map((r: any) => (
            <tr key={r.id}>
              <td><a href={r.url} target="_blank" rel="noreferrer" style={{color:'var(--accent)'}}>{r.fullName}</a></td>
              <td><span className="badge badge-info">{r.primaryLanguage || '?'}</span></td>
              <td>{r.stars}</td>
              <td style={{color:'var(--text-secondary)',maxWidth:300,overflow:'hidden',textOverflow:'ellipsis',whiteSpace:'nowrap'}}>{r.description || '—'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    }
  </>
}

function ResumeTab() {
  const [uploading, setUploading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function upload(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setUploading(true); setError(''); setResult(null)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await fetch('http://localhost:4000/resume/upload', { method: 'POST', body: fd, credentials: 'include' })
      const body = await res.json()
      if (!res.ok) throw new Error(body.error?.message || 'Upload failed')
      setResult(body.data)
    } catch (err: any) { setError(err.message) }
    finally { setUploading(false) }
  }

  return <>
    <form onSubmit={upload} style={{display:'flex',gap:12,alignItems:'center',marginBottom:24}}>
      <input type="file" name="file" accept=".pdf" required style={{color:'var(--text-secondary)'}} />
      <button disabled={uploading}>{uploading ? 'Analyzing…' : 'Upload & Analyze'}</button>
    </form>
    {error && <p className="form-error">{error}</p>}
    {result && (
      <div className="dash-grid">
        <article className="dash-card">
          <small>ATS SCORE</small>
          <div className="score-big" style={{marginTop:12}}>{result.version?.analysis?.atsScore ?? '—'}</div>
          <div className="score-bar"><div className="score-bar-fill" style={{width:`${result.version?.analysis?.atsScore||0}%`,background:'var(--accent)'}} /></div>
        </article>
        <article className="dash-card">
          <small>KEYWORDS FOUND</small>
          <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
            {(result.version?.analysis?.keywords||[]).map((k:string)=><span key={k} className="badge badge-success">{k}</span>)}
          </div>
        </article>
        <article className="dash-card">
          <small>MISSING KEYWORDS</small>
          <div style={{marginTop:12,display:'flex',flexWrap:'wrap',gap:6}}>
            {(result.version?.analysis?.missingKeywords||[]).map((k:string)=><span key={k} className="badge badge-danger">{k}</span>)}
          </div>
        </article>
      </div>
    )}
    {!result && !error && <p className="muted">Upload a PDF resume to get an ATS analysis, keyword extraction, and improvement suggestions.</p>}
  </>
}

function JobsTab() {
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<any>(null)
  const [error, setError] = useState('')

  async function parseJob(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError(''); setResult(null)
    const fd = new FormData(e.currentTarget)
    try {
      const job = await api<any>('/jobs/parse', { method: 'POST', body: JSON.stringify({ title: fd.get('title'), company: fd.get('company'), content: fd.get('content') }) })
      // Now match
      const match = await api<any>(`/jobs/${job.id}/match`, { method: 'POST' })
      setResult({ job, match })
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return <>
    <form onSubmit={parseJob} style={{display:'grid',gap:12,marginBottom:24}}>
      <div className="form-row">
        <input name="title" placeholder="Job Title" required />
        <input name="company" placeholder="Company (optional)" />
      </div>
      <textarea name="content" placeholder="Paste the full job description here…" required style={{background:'var(--bg)',border:'1px solid var(--border-light)',color:'var(--text)',padding:'12px',borderRadius:'var(--radius)',fontFamily:'inherit',fontSize:13,minHeight:140}} />
      <button disabled={loading} style={{justifySelf:'start'}}>{loading ? 'Analyzing…' : 'Parse & Match'}</button>
    </form>
    {error && <p className="form-error">{error}</p>}
    {result && (
      <div className="dash-grid">
        <article className="dash-card">
          <small>MATCH SCORE</small>
          <div className="score-big" style={{marginTop:12}}>{result.match?.overallScore ?? 0}%</div>
          <div className="score-bar"><div className="score-bar-fill" style={{width:`${result.match?.overallScore||0}%`,background:result.match?.overallScore>60?'var(--accent)':'var(--warning)'}} /></div>
        </article>
        <article className="dash-card">
          <small>SKILL GAPS</small>
          <div style={{marginTop:12}}>
            {(result.match?.skillGaps||[]).length === 0 ? <span className="badge badge-success">No gaps!</span> :
              (result.match?.skillGaps||[]).map((g:any)=><div key={g.id} style={{marginBottom:4}}><span className="badge badge-warning">{g.skillName}</span> <span className="muted" style={{fontSize:11}}>{g.importance}</span></div>)
            }
          </div>
        </article>
      </div>
    )}
    {!result && !error && <p className="muted">Paste a job description to parse requirements and match against your developer profile.</p>}
  </>
}

function InterviewTab() {
  const [started, setStarted] = useState(false)
  const [interviewId, setInterviewId] = useState('')
  const [question, setQuestion] = useState<any>(null)
  const [feedback, setFeedback] = useState<any>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  async function start(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError('')
    const fd = new FormData(e.currentTarget)
    try {
      const res = await api<any>('/interviews/start', { method: 'POST', body: JSON.stringify({ type: fd.get('type') }) })
      setInterviewId(res.interview.id)
      setQuestion(res.currentQuestion)
      setStarted(true)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  async function answer(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setFeedback(null)
    const fd = new FormData(e.currentTarget)
    try {
      const res = await api<any>(`/interviews/${interviewId}/answer`, { method: 'POST', body: JSON.stringify({ content: fd.get('answer') }) })
      setFeedback(res.answer)
      if (res.nextQuestion) setQuestion(res.nextQuestion)
      else setQuestion(null)
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  if (!started) return <>
    <form onSubmit={start} className="form-row" style={{marginBottom:24}}>
      <select name="type" required style={{background:'var(--bg)',border:'1px solid var(--border-light)',color:'var(--text)',padding:'10px',borderRadius:'var(--radius)',fontFamily:'inherit'}}>
        <option value="">Select topic…</option>
        <option>JavaScript</option><option>TypeScript</option><option>React</option>
        <option>Node.js</option><option>System Design</option><option>AI Engineering</option>
        <option>Behavioral</option>
      </select>
      <button disabled={loading}>{loading ? 'Starting…' : 'Start Interview'}</button>
    </form>
    {error && <p className="form-error">{error}</p>}
    <p className="muted">Choose a technical topic to begin an adaptive interview session. Questions adapt based on your answers.</p>
  </>

  return <>
    {question && (
      <div className="dash-card" style={{marginBottom:20,borderColor:'var(--accent)',borderWidth:1}}>
        <small>QUESTION {question.order}</small>
        <p style={{marginTop:12,fontSize:15,lineHeight:1.7}}>{question.content}</p>
      </div>
    )}
    {feedback && (
      <div className="dash-card" style={{marginBottom:20,borderColor:'var(--accent-blue)'}}>
        <small>FEEDBACK</small>
        <p style={{marginTop:8}}>Score: <strong style={{color:'var(--accent)'}}>{feedback.score}/10</strong></p>
        <p style={{marginTop:4,color:'var(--text-secondary)'}}>{feedback.feedback}</p>
      </div>
    )}
    {question ? (
      <form onSubmit={answer} style={{display:'grid',gap:12}}>
        <textarea name="answer" placeholder="Type your answer…" required style={{background:'var(--bg)',border:'1px solid var(--border-light)',color:'var(--text)',padding:'12px',borderRadius:'var(--radius)',fontFamily:'inherit',fontSize:13,minHeight:120}} />
        <button disabled={loading} style={{justifySelf:'start'}}>{loading ? 'Evaluating…' : 'Submit Answer'}</button>
      </form>
    ) : (
      <div className="empty-banner">
        <span className="signal" style={{fontSize:'1.2rem'}}>✓</span>
        <div><h2>Interview Complete</h2><p>All questions answered. Check your scores above.</p></div>
      </div>
    )}
  </>
}

function RoadmapTab() {
  const [roadmaps, setRoadmaps] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => { loadRoadmaps() }, [])

  async function loadRoadmaps() {
    try {
      const res = await api<any[]>('/roadmaps')
      setRoadmaps(res || [])
    } catch { }
  }

  async function generate(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setLoading(true); setError('')
    const fd = new FormData(e.currentTarget)
    try {
      await api('/roadmaps/generate', { method: 'POST', body: JSON.stringify({ targetRole: fd.get('targetRole') }) })
      loadRoadmaps()
    } catch (err: any) { setError(err.message) }
    finally { setLoading(false) }
  }

  return <>
    <form onSubmit={generate} className="form-row" style={{marginBottom:24}}>
      <input name="targetRole" placeholder="Target role (e.g. Senior Frontend Engineer)" required />
      <button disabled={loading}>{loading ? 'Generating…' : 'Generate Roadmap'}</button>
    </form>
    {error && <p className="form-error">{error}</p>}
    {roadmaps.length === 0 ? <p className="muted">No roadmaps yet. Enter your target role to generate a personalized learning plan based on your skill gaps.</p> :
      roadmaps.map((rm: any) => (
        <div key={rm.id} style={{marginBottom:24}}>
          <h3 style={{fontSize:15}}>{rm.targetRole}</h3>
          <div className="dash-grid" style={{marginTop:8}}>
            {(rm.items || []).map((item: any) => (
              <article className="dash-card" key={item.id}>
                <small>PRIORITY {item.priority}</small>
                <h2 style={{marginTop:8,fontSize:14}}>{item.title}</h2>
                <p>{item.description}</p>
              </article>
            ))}
          </div>
        </div>
      ))
    }
  </>
}
