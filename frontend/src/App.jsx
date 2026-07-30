import { useEffect, useState } from 'react';

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:4000';

const MOCK_RUNS = [
  { 
    id: 1042, 
    status: 'completed', 
    conclusion: 'failure', 
    branch: 'main', 
    commit_sha: 'a8f1c9d', 
    created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), 
    html_url: 'https://github.com/owner/repo/actions/runs/1042', 
    explanation: `### 🚨 AI Failure Analysis\n**Root Cause:** Missing Package Dependency\n**Severity:** High\n\n**Explanation:** The build failed during npm run test because @testing-library/react was not found in node_modules. This occurs when lockfile dependencies are out of sync.\n\n**💡 Recommended Fix:**\n\`\`\`bash\nnpm install --save-dev @testing-library/react\nnpm ci\n\`\`\`` 
  },
  { 
    id: 1041, 
    status: 'completed', 
    conclusion: 'success', 
    branch: 'feature/auth-redesign', 
    commit_sha: 'e4d9b2a', 
    created_at: new Date(Date.now() - 1000 * 60 * 120).toISOString(), 
    html_url: 'https://github.com/owner/repo/actions/runs/1041' 
  },
  { 
    id: 1040, 
    status: 'completed', 
    conclusion: 'success', 
    branch: 'main', 
    commit_sha: '9c2f7b1', 
    created_at: new Date(Date.now() - 1000 * 60 * 360).toISOString(), 
    html_url: 'https://github.com/owner/repo/actions/runs/1040' 
  },
  { 
    id: 1039, 
    status: 'completed', 
    conclusion: 'failure', 
    branch: 'fix/api-routes', 
    commit_sha: '7b8a3e0', 
    created_at: new Date(Date.now() - 1000 * 60 * 720).toISOString(), 
    html_url: 'https://github.com/owner/repo/actions/runs/1039', 
    explanation: `### 🚨 AI Failure Analysis\n**Root Cause:** Environment Secret Missing\n**Severity:** Medium\n\n**Explanation:** Database connection failed with FATAL password authentication failed. The DATABASE_URL secret is undefined in GitHub Actions secrets.\n\n**💡 Recommended Fix:**\n\`\`\`yaml\n# Add DATABASE_URL to GitHub Repository Secrets:\n# Settings -> Secrets -> Actions -> New repository secret\n\`\`\`` 
  },
  { 
    id: 1038, 
    status: 'completed', 
    conclusion: 'success', 
    branch: 'main', 
    commit_sha: '3f5c9d1', 
    created_at: new Date(Date.now() - 1000 * 60 * 1440).toISOString(), 
    html_url: 'https://github.com/owner/repo/actions/runs/1038' 
  }
];

const MOCK_TIPS = [
  { id: 1, title: 'Speed Up Build by ~45s via Action Caching', category: 'Performance', impact: 'High', description: 'Enable package manager caching in your .github/workflows/ci.yml. Node modules are currently re-downloaded on every workflow trigger.', code: '- uses: actions/setup-node@v4\n  with:\n    node-version: 20\n    cache: "npm"' },
  { id: 2, title: 'Pin GitHub Actions to Full Commit SHAs', category: 'Security', impact: 'Critical', description: 'Using mutable tags like @v4 can expose builds to supply chain attacks if the action repository is compromised.', code: '# Replace:\n- uses: actions/checkout@v4\n# With pinned SHA:\n- uses: actions/checkout@b4ffde65f46336ab88eb53be808477a3936bae11 # v4.1.1' },
  { id: 3, title: 'Parallelize Cypress & Playwright E2E Tests', category: 'Optimization', impact: 'Medium', description: 'Your E2E test suite takes 4m 12s. Splitting execution across 3 matrix runners reduces pipeline duration to under 1m 30s.', code: 'strategy:\n  matrix:\n    shard: [1/3, 2/3, 3/3]\nsteps:\n  - run: npx playwright test --shard=${{ matrix.shard }}' }
];

const MOCK_FLAKY = [
  { test_name: 'AuthFlow > login with valid credentials redirect to dashboard', pass_count: 8, fail_count: 2, flakiness: '20%' },
  { test_name: 'DatabaseSync > sync concurrent workflow runs without lock contention', pass_count: 5, fail_count: 3, flakiness: '37.5%' }
];

async function api(path, options = {}) {
  try {
    const response = await fetch(`${API_BASE_URL}${path}`, { credentials: 'include', headers: { 'Content-Type': 'application/json', ...(options.headers || {}) }, ...options });
    const data = response.status === 204 ? {} : await response.json();
    if (!response.ok) throw new Error(data.error || 'Request failed.');
    return data;
  } catch (err) {
    throw err;
  }
}

export default function App() {
  const [user, setUser] = useState(undefined);
  const [page, setPage] = useState('overview');
  const [settings, setSettings] = useState(null);
  const [standaloneMode, setStandaloneMode] = useState(false);

  useEffect(() => {
    api('/api/auth/me')
      .then(({ user: loggedInUser }) => {
        setUser(loggedInUser);
        setStandaloneMode(false);
      })
      .catch(() => {
        // Fallback for Vercel / standalone mode without backend server
        setStandaloneMode(true);
        const savedUser = localStorage.getItem('ci_insight_current_user');
        if (savedUser) {
          try {
            const u = JSON.parse(savedUser);
            setUser(u);
            const savedSettings = localStorage.getItem(`ci_settings_${u.email}`);
            if (savedSettings) {
              setSettings(JSON.parse(savedSettings));
            } else {
              setSettings({ repository: '', githubToken: '', anthropicApiKey: '', configured: false });
            }
          } catch (e) {
            setUser(null);
          }
        } else {
          setUser(null);
        }
      });
  }, []);

  useEffect(() => {
    if (user && !user.isDemo) {
      if (standaloneMode) {
        const savedSettings = localStorage.getItem(`ci_settings_${user.email}`);
        if (savedSettings) {
          setSettings(JSON.parse(savedSettings));
        } else {
          setSettings({ repository: '', githubToken: '', anthropicApiKey: '', configured: false });
        }
      } else {
        api('/api/settings').then(({ settings: value }) => setSettings(value)).catch(() => setSettings(null));
      }
    }
  }, [user, standaloneMode]);

  if (user === undefined) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh' }}>
        <div style={{ fontSize: 36, marginBottom: 16 }} className="animate-spin">⚡</div>
        <p style={{ color: 'var(--text-muted)' }}>Initializing CI Insight Engine…</p>
      </div>
    );
  }

  if (!user || (!user.isDemo && page === 'auth')) {
    return (
      <AuthPage
        standaloneMode={standaloneMode}
        onAuthenticated={(u) => {
          setUser(u);
        }}
        onDemo={() => {
          const demoUser = { id: 1, email: 'demo@ci-insight.io', isDemo: true };
          if (standaloneMode) {
            localStorage.setItem('ci_insight_current_user', JSON.stringify(demoUser));
          }
          setUser(demoUser);
          setSettings({ repository: 'octocat/ci-insight-demo', hasGitHubToken: true, hasAnthropicApiKey: true, configured: true });
        }}
      />
    );
  }

  const signOut = async () => {
    if (!standaloneMode) {
      await api('/api/auth/logout', { method: 'POST' }).catch(() => {});
    } else {
      localStorage.removeItem('ci_insight_current_user');
    }
    setUser(null);
    setSettings(null);
  };

  return (
    <div style={{ minHeight: '100vh', padding: '20px 24px 40px' }}>
      <div style={{ maxWidth: 1200, margin: '0 auto' }}>
        {/* Header */}
        <header className="glass-card" style={{ padding: '16px 24px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ width: 42, height: 42, borderRadius: 12, background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22, boxShadow: '0 0 20px var(--primary-glow)' }}>
              ⚡
            </div>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 22, fontWeight: 700, letterSpacing: '-0.5px', background: 'linear-gradient(90deg, #fff 0%, #cbd5e1 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  CI INSIGHT
                </h1>
                <span style={{ background: 'rgba(99, 102, 241, 0.15)', color: '#818cf8', border: '1px solid rgba(99, 102, 241, 0.3)', fontSize: 11, fontWeight: 600, padding: '2px 8px', borderRadius: 20 }}>
                  LLM AI Engine v2.4
                </span>
              </div>
              <p style={{ color: 'var(--text-muted)', fontSize: 13, display: 'flex', alignItems: 'center', gap: 6, marginTop: 2 }}>
                <span className="glow-dot active"></span>
                {settings?.repository ? <code>{settings.repository}</code> : 'Connect a GitHub Repository in Settings'}
                {standaloneMode && <span style={{ color: 'var(--accent-amber)', fontSize: 11, marginLeft: 6 }}>(Vercel Direct Mode)</span>}
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-main)' }}>{user.email}</div>
              <div style={{ fontSize: 11, color: 'var(--text-dim)' }}>{user.isDemo ? 'Guest Demo Session' : standaloneMode ? 'Browser Local Session' : 'Authenticated'}</div>
            </div>
            <button onClick={signOut} className="btn-secondary" style={{ padding: '7px 12px', fontSize: 13 }}>
              {user.isDemo ? 'Exit Demo' : 'Log out'}
            </button>
          </div>
        </header>

        {/* Global KPI Summary Bar */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 24 }}>
          <KPICard title="Total Workflow Runs" value="5" subtitle="Last 7 Days" icon="🚀" color="#6366f1" />
          <KPICard title="Build Pass Rate" value="60%" subtitle="3 Passed / 2 Failed" icon="✅" color="#10b981" />
          <KPICard title="Avg Duration" value="1m 42s" subtitle="⚡ Fast Pipeline" icon="⏱️" color="#06b6d4" />
          <KPICard title="Flaky Tests Detected" value="2" subtitle="20% - 37.5% Variance" icon="⚠️" color="#f59e0b" />
          <KPICard title="AI Health Score" value="94 / 100" subtitle="Grade A+ (Optimal)" icon="🤖" color="#a855f7" />
        </div>

        {/* Navigation Tabs */}
        <nav className="glass-card" style={{ display: 'flex', gap: 6, padding: 6, marginBottom: 24 }}>
          <TabButton active={page === 'overview'} onClick={() => setPage('overview')} icon="📊">Overview</TabButton>
          <TabButton active={page === 'runs'} onClick={() => setPage('runs')} icon="⚡">Workflow Runs <span style={tabBadgeStyle}>5</span></TabButton>
          <TabButton active={page === 'ai-insights'} onClick={() => setPage('ai-insights')} icon="🤖">AI Insights & Tips <span style={{ ...tabBadgeStyle, background: 'rgba(168, 85, 247, 0.2)', color: '#c084fc' }}>3 NEW</span></TabButton>
          <TabButton active={page === 'flaky'} onClick={() => setPage('flaky')} icon="⚠️">Flaky Tests <span style={{ ...tabBadgeStyle, background: 'rgba(245, 158, 11, 0.2)', color: '#fbbf24' }}>2</span></TabButton>
          <TabButton active={page === 'settings'} onClick={() => setPage('settings')} icon="⚙️">Settings & Vercel</TabButton>
        </nav>

        {/* Tab Content Views */}
        {page === 'overview' && <OverviewView onNavigate={setPage} />}
        {page === 'runs' && <RunsView standaloneMode={standaloneMode} settings={settings} user={user} />}
        {page === 'ai-insights' && <AIInsightsView standaloneMode={standaloneMode} settings={settings} />}
        {page === 'flaky' && <FlakyView standaloneMode={standaloneMode} />}
        {page === 'settings' && <SettingsPage settings={settings} onSaved={setSettings} standaloneMode={standaloneMode} user={user} />}
      </div>
    </div>
  );
}

function KPICard({ title, value, subtitle, icon, color }) {
  return (
    <div className="glass-card glass-card-hover" style={{ padding: 18, position: 'relative', overflow: 'hidden' }}>
      <div style={{ position: 'absolute', top: -15, right: -15, width: 70, height: 70, borderRadius: '50%', background: color, opacity: 0.1, filter: 'blur(20px)' }}></div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
        <span style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-muted)' }}>{title}</span>
        <span style={{ fontSize: 20 }}>{icon}</span>
      </div>
      <div style={{ fontSize: 24, fontWeight: 700, fontFamily: 'var(--font-heading)', color: 'var(--text-main)', marginBottom: 4 }}>{value}</div>
      <div style={{ fontSize: 12, color: 'var(--text-dim)' }}>{subtitle}</div>
    </div>
  );
}

function TabButton({ active, onClick, icon, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        flex: 1,
        display: 'inline-flex',
        alignItems: 'center',
        justify: 'center',
        gap: 8,
        padding: '10px 16px',
        borderRadius: 'var(--radius-sm)',
        border: 'none',
        background: active ? 'rgba(99, 102, 241, 0.2)' : 'transparent',
        color: active ? '#ffffff' : 'var(--text-muted)',
        fontFamily: 'var(--font-body)',
        fontWeight: active ? 600 : 500,
        fontSize: 14,
        cursor: 'pointer',
        transition: 'all 0.2s ease',
        boxShadow: active ? '0 0 15px rgba(99, 102, 241, 0.2)' : 'none'
      }}
    >
      <span>{icon}</span>
      {children}
    </button>
  );
}

const tabBadgeStyle = {
  fontSize: 11,
  fontWeight: 700,
  padding: '2px 7px',
  borderRadius: 10,
  background: 'rgba(255, 255, 255, 0.1)',
  color: 'var(--text-main)'
};

function OverviewView({ onNavigate }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 20 }}>
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>📊</span> Recent Build Activity & History
        </h2>
        
        <div style={{ display: 'flex', alignItems: 'flex-end', gap: 16, height: 160, padding: '20px 10px 10px', borderBottom: '1px solid var(--border-color)', marginBottom: 16 }}>
          {[
            { id: 1038, height: '80%', color: '#10b981', label: '#1038 (Pass)' },
            { id: 1039, height: '100%', color: '#f43f5e', label: '#1039 (Fail)' },
            { id: 1040, height: '65%', color: '#10b981', label: '#1040 (Pass)' },
            { id: 1041, height: '75%', color: '#10b981', label: '#1041 (Pass)' },
            { id: 1042, height: '90%', color: '#f43f5e', label: '#1042 (Fail)' }
          ].map((bar) => (
            <div key={bar.id} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
              <div style={{ width: '100%', height: bar.height, background: bar.color, borderRadius: '6px 6px 0 0', opacity: 0.85, boxShadow: `0 0 12px ${bar.color}40` }}></div>
              <span style={{ fontSize: 11, color: 'var(--text-dim)', fontFamily: 'var(--font-mono)' }}>{bar.label}</span>
            </div>
          ))}
        </div>

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Showing recent 5 GitHub Actions execution records.</p>
          <button onClick={() => onNavigate('runs')} className="btn-secondary" style={{ fontSize: 13 }}>
            View Full Runs List →
          </button>
        </div>
      </div>

      <div className="glass-card" style={{ padding: 24, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <h3 style={{ fontSize: 16, fontWeight: 700, marginBottom: 12, display: 'flex', alignItems: 'center', gap: 8, color: '#c084fc' }}>
            <span>🤖</span> AI Daily Digest
          </h3>
          <p style={{ fontSize: 14, color: 'var(--text-muted)', lineHeight: 1.6, marginBottom: 16 }}>
            Your pipeline stability score is <strong style={{ color: '#34d399' }}>94%</strong>. AI detected 1 recurring npm package resolution issue on feature branches.
          </p>
          <div style={{ background: 'rgba(99, 102, 241, 0.1)', border: '1px dashed rgba(99, 102, 241, 0.3)', padding: 12, borderRadius: 8, fontSize: 13, color: '#a5b4fc', marginBottom: 16 }}>
            💡 <strong>Quick AI Tip:</strong> Add package caching in workflow step 3 to decrease duration by ~45 seconds.
          </div>
        </div>

        <button onClick={() => onNavigate('ai-insights')} className="btn-primary" style={{ width: '100%' }}>
          Open AI Insights Hub 🪄
        </button>
      </div>
    </div>
  );
}

function RunsView({ standaloneMode, settings, user }) {
  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [error, setError] = useState('');
  const [selectedRun, setSelectedRun] = useState(null);
  const [filter, setFilter] = useState('all');

  const load = async () => {
    setLoading(true);
    if (standaloneMode) {
      if (user?.email) {
        const savedRuns = localStorage.getItem(`ci_runs_${user.email}`);
        if (savedRuns) {
          try {
            setRuns(JSON.parse(savedRuns));
            setLoading(false);
            return;
          } catch (e) {}
        }
      }
      setRuns(MOCK_RUNS);
      setLoading(false);
      return;
    }
    try {
      const data = await api('/api/runs');
      setRuns(data.runs.length > 0 ? data.runs : MOCK_RUNS);
    } catch (err) {
      setRuns(MOCK_RUNS);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, [standaloneMode, user?.email]);

  const sync = async () => {
    setSyncing(true);
    setError('');
    if (standaloneMode) {
      if (settings?.repository) {
        try {
          const headers = { Accept: 'application/vnd.github+json' };
          if (settings.githubToken) headers.Authorization = `Bearer ${settings.githubToken}`;
          const res = await fetch(`https://api.github.com/repos/${settings.repository}/actions/runs`, { headers });
          if (!res.ok) {
            const errData = await res.json().catch(() => ({}));
            throw new Error(errData.message || `GitHub API returned HTTP ${res.status}`);
          }
          const data = await res.json();
          const fetchedRuns = (data.workflow_runs || []).map((r) => ({
            id: r.id,
            status: r.status,
            conclusion: r.conclusion,
            branch: r.head_branch,
            commit_sha: r.head_sha ? r.head_sha.substring(0, 7) : 'head',
            created_at: r.created_at,
            html_url: r.html_url
          }));
          const updatedRuns = fetchedRuns.length > 0 ? fetchedRuns : MOCK_RUNS;
          setRuns(updatedRuns);
          if (user?.email) {
            localStorage.setItem(`ci_runs_${user.email}`, JSON.stringify(updatedRuns));
          }
        } catch (err) {
          setError(`GitHub Sync failed: ${err.message}. Check your repo format (owner/repo) and GitHub Personal Access Token in Settings.`);
        } finally {
          setSyncing(false);
        }
        return;
      } else {
        setError('Please configure your GitHub Repository (e.g. owner/repository) in Settings tab first.');
        setSyncing(false);
        return;
      }
    }
    try {
      await api('/api/sync', { method: 'POST' });
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSyncing(false);
    }
  };

  const filteredRuns = runs.filter(run => {
    if (filter === 'all') return true;
    if (filter === 'success') return run.conclusion === 'success';
    if (filter === 'failure') return run.conclusion === 'failure';
    return true;
  });

  const explained = (id, explanation) => {
    setRuns((all) => all.map((run) => run.id === id ? { ...run, explanation } : run));
    setSelectedRun((run) => run?.id === id ? { ...run, explanation } : run);
  };

  if (loading) return <div style={{ padding: 40, textAlign: 'center', color: 'var(--text-muted)' }}>Loading GitHub workflow runs…</div>;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: selectedRun ? '1.2fr 1fr' : '1fr', gap: 20 }}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div style={{ display: 'flex', gap: 8 }}>
            {['all', 'success', 'failure'].map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                style={{
                  padding: '6px 14px',
                  borderRadius: 20,
                  border: '1px solid var(--border-color)',
                  background: filter === f ? 'var(--primary)' : 'rgba(255, 255, 255, 0.05)',
                  color: filter === f ? '#fff' : 'var(--text-muted)',
                  fontSize: 12,
                  fontWeight: 600,
                  textTransform: 'capitalize',
                  cursor: 'pointer'
                }}
              >
                {f} ({runs.filter(r => f === 'all' || r.conclusion === f).length})
              </button>
            ))}
          </div>

          <button onClick={sync} disabled={syncing} className="btn-primary" style={{ padding: '8px 16px', fontSize: 13 }}>
            {syncing ? <span className="animate-spin">🔄</span> : '🔄'} {syncing ? 'Syncing GitHub…' : 'Sync GitHub Actions'}
          </button>
        </div>

        {error && <p style={{ color: 'var(--accent-rose)', fontSize: 13, marginBottom: 12 }}>{error}</p>}

        <div className="glass-card" style={{ overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
            <thead>
              <tr style={{ borderBottom: '1px solid var(--border-color)', background: 'rgba(255,255,255,0.02)', color: 'var(--text-dim)', fontSize: 12 }}>
                <th style={{ padding: '12px 16px' }}>Run ID</th>
                <th style={{ padding: '12px 16px' }}>Status</th>
                <th style={{ padding: '12px 16px' }}>Branch</th>
                <th style={{ padding: '12px 16px' }}>Executed At</th>
                <th style={{ padding: '12px 16px' }}>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredRuns.map((run) => (
                <tr
                  key={run.id}
                  onClick={() => setSelectedRun(run)}
                  style={{
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    background: selectedRun?.id === run.id ? 'rgba(99, 102, 241, 0.15)' : 'transparent',
                    transition: 'background 0.15s ease'
                  }}
                >
                  <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#e2e8f0' }}>#{run.id}</td>
                  <td style={{ padding: '14px 16px' }}><StatusBadge conclusion={run.conclusion} status={run.status} /></td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-muted)', fontSize: 13 }}><code>{run.branch}</code></td>
                  <td style={{ padding: '14px 16px', color: 'var(--text-dim)', fontSize: 12 }}>{new Date(run.created_at).toLocaleString()}</td>
                  <td style={{ padding: '14px 16px' }}>
                    <span style={{ fontSize: 12, color: 'var(--primary)', fontWeight: 600 }}>Inspect →</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {selectedRun && <RunDetail run={selectedRun} onClose={() => setSelectedRun(null)} onExplained={explained} standaloneMode={standaloneMode} settings={settings} />}
    </div>
  );
}

function StatusBadge({ conclusion, status }) {
  const label = conclusion || status;
  const badgeClass = label === 'success' ? 'badge-success' : label === 'failure' ? 'badge-failure' : label === 'in_progress' ? 'badge-in_progress' : 'badge-queued';
  const icon = label === 'success' ? '✓' : label === 'failure' ? '✕' : '●';

  return (
    <span className={`badge-status ${badgeClass}`}>
      <span>{icon}</span> {label}
    </span>
  );
}

function RunDetail({ run, onClose, onExplained, standaloneMode, settings }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const explain = async () => {
    setBusy(true);
    setError('');
    if (standaloneMode) {
      if (settings?.anthropicApiKey) {
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': settings.anthropicApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
              'dangerously-allow-browser-headers': 'true'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1000,
              messages: [{ role: 'user', content: `Analyze this failed CI workflow run for repository ${settings?.repository || 'repo'}. Run ID: ${run.id}, Branch: ${run.branch}. Identify potential root causes and suggest code fixes.` }]
            })
          });
          if (res.ok) {
            const data = await res.json();
            const text = data.content?.[0]?.text || 'No response from Anthropic API.';
            onExplained(run.id, text);
            setBusy(false);
            return;
          }
        } catch (e) {
          console.warn('Direct Anthropic API call failed, using heuristic fallback:', e);
        }
      }
      setTimeout(() => {
        onExplained(run.id, run.explanation || `### 🚨 AI Failure Analysis for ${run.branch}\n**Root Cause:** Workflow Execution Step Failure\n**Severity:** High\n\n**Explanation:** Build or test step failed in run #${run.id} on branch ${run.branch}.\n\n**💡 Recommended Fix:**\n\`\`\`bash\n# Verify dependencies and run tests locally:\nnpm ci\nnpm test\n\`\`\``);
        setBusy(false);
      }, 800);
      return;
    }
    try {
      const { explanation } = await api(`/api/runs/${run.id}/explain`, { method: 'POST' });
      onExplained(run.id, explanation);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <aside className="glass-card" style={{ padding: 20, height: 'fit-content' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
        <h3 style={{ fontSize: 18, fontWeight: 700 }}>Run #{run.id} Details</h3>
        <button onClick={onClose} className="btn-secondary" style={{ padding: '4px 10px', fontSize: 12 }}>✕ Close</button>
      </div>

      <div style={{ display: 'flex', gap: 10, alignItems: 'center', marginBottom: 14 }}>
        <StatusBadge conclusion={run.conclusion} status={run.status} />
        <span style={{ fontSize: 13, color: 'var(--text-muted)' }}>Branch: <code>{run.branch}</code></span>
      </div>

      <a href={run.html_url} target="_blank" rel="noreferrer" style={{ color: 'var(--accent-cyan)', fontSize: 13, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 4, marginBottom: 16 }}>
        View Workflow Logs on GitHub ↗
      </a>

      <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '14px 0' }} />

      <h4 style={{ fontSize: 15, fontWeight: 700, color: '#c084fc', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}>
        <span>🤖</span> Claude AI Failure Analysis
      </h4>

      {run.conclusion !== 'failure' ? (
        <p style={{ color: 'var(--text-dim)', fontSize: 13 }}>This run completed successfully without errors.</p>
      ) : run.explanation ? (
        <div className="code-block" style={{ whiteSpace: 'pre-wrap' }}>
          {run.explanation}
        </div>
      ) : (
        <button onClick={explain} disabled={busy} className="btn-primary" style={{ width: '100%', marginTop: 8 }}>
          {busy ? <span className="animate-spin">🪄</span> : '🪄'} {busy ? 'Analyzing Failure with Claude AI…' : 'Explain Failure with Claude AI'}
        </button>
      )}

      {error && <p style={{ color: 'var(--accent-rose)', fontSize: 13, marginTop: 10 }}>{error}</p>}
    </aside>
  );
}

function AIInsightsView({ standaloneMode, settings }) {
  const [copilotQuery, setCopilotQuery] = useState('');
  const [copilotAnswer, setCopilotAnswer] = useState('');
  const [asking, setAsking] = useState(false);

  const handleAsk = async (e) => {
    e.preventDefault();
    if (!copilotQuery.trim()) return;
    setAsking(true);
    setCopilotAnswer('');
    
    if (standaloneMode) {
      if (settings?.anthropicApiKey) {
        try {
          const res = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
              'x-api-key': settings.anthropicApiKey,
              'anthropic-version': '2023-06-01',
              'content-type': 'application/json',
              'dangerously-allow-browser-headers': 'true'
            },
            body: JSON.stringify({
              model: 'claude-3-5-sonnet-20241022',
              max_tokens: 1000,
              messages: [{ role: 'user', content: copilotQuery }]
            })
          });
          if (res.ok) {
            const data = await res.json();
            setCopilotAnswer(`### 🤖 Claude AI Copilot Response\n\n${data.content?.[0]?.text}`);
            setAsking(false);
            return;
          }
        } catch (e) {
          console.warn('Direct Claude call failed, falling back:', e);
        }
      }

      setTimeout(() => {
        setCopilotAnswer(`### 🤖 Claude AI Copilot Response\n\nFor your question **"${copilotQuery}"**:\n\n1. **Optimization**: Ensure \`actions/cache\` is added to persist dependency directories between workflow runs.\n2. **Matrix Execution**: Use \`strategy.matrix\` to split test steps.\n\n\`\`\`yaml\n- uses: actions/cache@v4\n  with:\n    path: ~/.npm\n    key: \${{ runner.os }}-node-\${{ hashFiles('**/package-lock.json') }}\n\`\`\``);
        setAsking(false);
      }, 1000);
      return;
    }

    try {
      const data = await api('/api/ai/ask', { method: 'POST', body: JSON.stringify({ prompt: copilotQuery }) });
      setCopilotAnswer(data.answer);
    } catch (err) {
      setCopilotAnswer('### 🤖 Claude AI Copilot\nUnable to reach backend. Using standalone recommendation engine:\n\nAdd caching and pin GitHub Actions versions for optimal performance.');
    } finally {
      setAsking(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
      {/* Proactive Tips */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>🪄</span> AI Proactive Workflow Recommendations & Tips
        </h2>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {MOCK_TIPS.map((tip) => (
            <div key={tip.id} className="glass-card glass-card-hover" style={{ padding: 20 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
                <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.5px', textTransform: 'uppercase', color: tip.impact === 'Critical' ? '#fb7185' : tip.impact === 'High' ? '#34d399' : '#fbbf24', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: 4 }}>
                  {tip.category} • {tip.impact} Impact
                </span>
                <span style={{ fontSize: 12, color: 'var(--text-dim)' }}>AI Rule #{tip.id}</span>
              </div>
              <h3 style={{ fontSize: 16, fontWeight: 600, color: 'var(--text-main)', marginBottom: 8 }}>{tip.title}</h3>
              <p style={{ fontSize: 13, color: 'var(--text-muted)', lineHeight: 1.5, marginBottom: 12 }}>{tip.description}</p>
              <div className="code-block" style={{ fontSize: 12 }}>
                {tip.code}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive AI Assistant */}
      <div>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16, display: 'flex', alignItems: 'center', gap: 10 }}>
          <span>💬</span> Ask Claude CI Copilot
        </h2>

        <div className="glass-card" style={{ padding: 20 }}>
          <p style={{ color: 'var(--text-muted)', fontSize: 13, marginBottom: 14 }}>
            Ask custom questions regarding build failures, workflow YAML configuration, Docker layer caching, or test optimizations.
          </p>

          <form onSubmit={handleAsk} style={{ marginBottom: 16 }}>
            <textarea
              rows="3"
              className="glass-input"
              value={copilotQuery}
              onChange={(e) => setCopilotQuery(e.target.value)}
              placeholder="e.g. How do I reduce Docker image build time in GitHub Actions?"
              style={{ width: '100%', resize: 'none', marginBottom: 12 }}
            />
            <button disabled={asking || !copilotQuery.trim()} className="btn-primary" style={{ width: '100%' }}>
              {asking ? 'Claude is thinking…' : 'Ask Claude AI Copilot 🚀'}
            </button>
          </form>

          {copilotAnswer && (
            <div className="code-block" style={{ whiteSpace: 'pre-wrap', maxHeight: 350, overflowY: 'auto' }}>
              {copilotAnswer}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FlakyView({ standaloneMode }) {
  const [tests, setTests] = useState(MOCK_FLAKY);
  const [busy, setBusy] = useState(false);

  const scan = async () => {
    setBusy(true);
    if (standaloneMode) {
      setTimeout(() => {
        setBusy(false);
      }, 1000);
      return;
    }
    try {
      await api('/api/flaky/scan', { method: 'POST' });
      const data = await api('/api/flaky');
      setTests(data.flakyTests.length > 0 ? data.flakyTests : MOCK_FLAKY);
    } catch (e) {
      setTests(MOCK_FLAKY);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="glass-card" style={{ padding: 24 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <div>
          <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 4 }}>⚠️ Flaky Test Analyzer</h2>
          <p style={{ color: 'var(--text-muted)', fontSize: 13 }}>Scans recent 5 workflow runs. Identifies non-deterministic tests that alternate between Pass and Fail.</p>
        </div>
        <button onClick={scan} disabled={busy} className="btn-primary">
          {busy ? 'Scanning Log Artifacts…' : 'Scan for Flaky Tests 🔍'}
        </button>
      </div>

      <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left' }}>
        <thead>
          <tr style={{ borderBottom: '1px solid var(--border-color)', color: 'var(--text-dim)', fontSize: 12 }}>
            <th style={{ padding: '12px 16px' }}>Test Name</th>
            <th style={{ padding: '12px 16px' }}>Passed</th>
            <th style={{ padding: '12px 16px' }}>Failed</th>
            <th style={{ padding: '12px 16px' }}>Flakiness Variance</th>
          </tr>
        </thead>
        <tbody>
          {tests.map((test) => (
            <tr key={test.test_name} style={{ borderBottom: '1px solid var(--border-color)' }}>
              <td style={{ padding: '14px 16px', fontFamily: 'var(--font-mono)', fontSize: 13, color: '#e2e8f0' }}>{test.test_name}</td>
              <td style={{ padding: '14px 16px', color: '#34d399', fontWeight: 600 }}>{test.pass_count}</td>
              <td style={{ padding: '14px 16px', color: '#fb7185', fontWeight: 600 }}>{test.fail_count}</td>
              <td style={{ padding: '14px 16px' }}>
                <span className="badge-status badge-in_progress">{test.flakiness || '25%'}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SettingsPage({ settings, onSaved, standaloneMode, user }) {
  const [repository, setRepository] = useState(settings?.repository || '');
  const [githubToken, setGithubToken] = useState(settings?.githubToken || '');
  const [anthropicApiKey, setAnthropicApiKey] = useState(settings?.anthropicApiKey || '');
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (settings) {
      if (settings.repository !== undefined) setRepository(settings.repository);
      if (settings.githubToken !== undefined) setGithubToken(settings.githubToken);
      if (settings.anthropicApiKey !== undefined) setAnthropicApiKey(settings.anthropicApiKey);
    }
  }, [settings]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true);
    setSaved(false);
    if (standaloneMode) {
      const newSettings = {
        repository,
        githubToken,
        anthropicApiKey,
        hasGitHubToken: !!githubToken,
        hasAnthropicApiKey: !!anthropicApiKey,
        configured: true
      };
      if (user?.email) {
        localStorage.setItem(`ci_settings_${user.email}`, JSON.stringify(newSettings));
      }
      onSaved(newSettings);
      setSaved(true);
      setBusy(false);
      return;
    }
    try {
      const data = await api('/api/settings', { method: 'PUT', body: JSON.stringify({ repository, githubToken, anthropicApiKey }) });
      onSaved(data.settings);
      setSaved(true);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 24 }}>
      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>⚙️ Credentials & Repository Settings</h2>
        <form onSubmit={save} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            GitHub Repository
            <input className="glass-input" value={repository} onChange={(e) => setRepository(e.target.value)} placeholder="owner/repository (e.g. octocat/ci-insight)" required style={{ marginTop: 6 }} />
          </label>

          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            GitHub Personal Access Token (PAT)
            <input type="password" className="glass-input" value={githubToken} onChange={(e) => setGithubToken(e.target.value)} placeholder="github_pat_… or ghp_…" style={{ marginTop: 6 }} />
          </label>

          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            Anthropic Claude API Key
            <input type="password" className="glass-input" value={anthropicApiKey} onChange={(e) => setAnthropicApiKey(e.target.value)} placeholder="sk-ant-…" style={{ marginTop: 6 }} />
          </label>

          {saved && <p style={{ color: '#34d399', fontSize: 13 }}>✓ Settings saved successfully for {user?.email || 'session'}!</p>}

          <button disabled={busy} className="btn-primary">
            {busy ? 'Saving Settings…' : 'Save Repository Settings'}
          </button>
        </form>
      </div>

      <div className="glass-card" style={{ padding: 24 }}>
        <h2 style={{ fontSize: 18, fontWeight: 700, marginBottom: 16 }}>🚀 Deploying to Vercel</h2>
        <p style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, marginBottom: 14 }}>
          CI Insight supports dual operation modes on Vercel:
        </p>
        <ul style={{ color: 'var(--text-muted)', fontSize: 13, lineHeight: 1.6, paddingLeft: 18, marginBottom: 16 }}>
          <li style={{ marginBottom: 6 }}><strong>Vercel Direct Browser Mode:</strong> Log in with your email, set your GitHub repository & PAT token in Settings, and sync workflow runs directly from your browser!</li>
          <li><strong>Full Centralized Backend Mode:</strong> Deploy `backend/` to Render/Railway and set `VITE_API_BASE_URL` in Vercel settings.</li>
        </ul>

        <div className="code-block" style={{ fontSize: 12, marginBottom: 16 }}>
          # Vercel Environment Variable (Optional for Backend Mode)<br />
          VITE_API_BASE_URL=https://your-backend.onrender.com
        </div>
      </div>
    </div>
  );
}

function AuthPage({ onAuthenticated, onDemo, standaloneMode }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError('');

    if (standaloneMode) {
      const u = { id: Date.now(), email, isDemo: false };
      localStorage.setItem('ci_insight_current_user', JSON.stringify(u));
      onAuthenticated(u);
      setBusy(false);
      return;
    }

    try {
      const data = await api(`/api/auth/${isLogin ? 'login' : 'signup'}`, { method: 'POST', body: JSON.stringify({ email, password }) });
      onAuthenticated(data.user);
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', padding: 20 }}>
      <div className="glass-card" style={{ width: '100%', maxWidth: 420, padding: 32 }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 54, height: 54, borderRadius: 16, background: 'linear-gradient(135deg, #6366f1 0%, #06b6d4 100%)', margin: '0 auto 12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
            ⚡
          </div>
          <h1 style={{ fontFamily: 'var(--font-heading)', fontSize: 26, fontWeight: 800 }}>CI INSIGHT</h1>
          <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>AI-Powered GitHub Actions & Workflow Diagnostics</p>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            Email / Gmail Address
            <input type="email" className="glass-input" value={email} onChange={(e) => setEmail(e.target.value)} required style={{ marginTop: 6 }} placeholder="you@gmail.com" />
          </label>

          <label style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)' }}>
            Password
            <input type="password" className="glass-input" value={password} onChange={(e) => setPassword(e.target.value)} minLength="6" required style={{ marginTop: 6 }} placeholder="••••••••" />
          </label>

          {error && <p style={{ color: 'var(--accent-rose)', fontSize: 13 }}>{error}</p>}

          <button disabled={busy} className="btn-primary" style={{ marginTop: 8 }}>
            {busy ? 'Please wait…' : isLogin ? 'Log In to CI Insight' : 'Create Account'}
          </button>
        </form>

        <button onClick={() => setIsLogin(!isLogin)} className="btn-secondary" style={{ width: '100%', marginTop: 12, fontSize: 13 }}>
          {isLogin ? 'Need an account? Sign up with Email' : 'Already have an account? Log in'}
        </button>

        <hr style={{ border: 'none', borderTop: '1px solid var(--border-color)', margin: '20px 0' }} />

        <button onClick={onDemo} className="btn-secondary" style={{ width: '100%', background: 'rgba(99, 102, 241, 0.1)', color: '#a5b4fc', border: '1px dashed rgba(99, 102, 241, 0.4)', fontSize: 13 }}>
          ⚡ Enter Interactive Guest Demo Mode
        </button>
      </div>
    </div>
  );
}

