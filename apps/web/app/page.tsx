const signals = [
  { tag: '01', title: 'GitHub Intelligence', desc: 'Import repositories, analyze code quality, and build an evidence-based engineering profile from real work.' },
  { tag: '02', title: 'Evidence-Based Skill Graph', desc: 'Every score has traceable evidence. No unsupported claims — only verified signals from your actual engineering output.' },
  { tag: '03', title: 'AI Career Engineering', desc: 'Adaptive interviews, resume intelligence, job matching, personalized roadmaps, and an AI copilot that knows your profile.' }
]

export default function Home() {
  return (
    <main className="shell">
      <nav className="topbar">
        <span className="mark">NEXUS</span>
        <span className="status">AI DEVELOPER INTELLIGENCE</span>
      </nav>
      <section className="hero">
        <p className="eyebrow">Developer Intelligence Platform</p>
        <h1>Turn your engineering work into your next opportunity.</h1>
        <p className="lede">NEXUS connects code, career goals, and learning into one evidence-based intelligence layer. Every insight is backed by real data from your repositories, projects, and assessments.</p>
        <div className="actions">
          <a className="button-link" href="/auth/register">Get started →</a>
          <a href="/auth/login" style={{ color: 'var(--text-secondary)' }}>Sign in</a>
        </div>
      </section>
      <section className="signals">
        {signals.map(s => (
          <article key={s.tag}>
            <small>{s.tag}</small>
            <h2>{s.title}</h2>
            <p>{s.desc}</p>
          </article>
        ))}
      </section>
    </main>
  )
}
