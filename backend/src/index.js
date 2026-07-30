import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { pool } from './db.js';
import { logIn, logOut, requireAuth, signUp } from './auth.js';
import { getIntegration, getSettings, updateSettings } from './settings.js';
import { fetchRunLogsText, truncateLogs } from './githubLogs.js';
import { askAICopilot, explainFailure } from './claude.js';
import { parseTestResults } from './testParser.js';

const app = express();
const PORT = process.env.PORT || 4000;
const FRONTEND_ORIGIN = process.env.FRONTEND_ORIGIN || 'http://localhost:5173';
const FLAKY_SCAN_WINDOW = 5;

if (!process.env.SESSION_SECRET) throw new Error('SESSION_SECRET must be set.');
if (!process.env.ENCRYPTION_KEY) throw new Error('ENCRYPTION_KEY must be set.');

const PgSession = connectPgSimple(session);
app.set('trust proxy', 1);

const isProd = process.env.NODE_ENV === 'production';

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);
    const cleanOrigin = origin.replace(/\/$/, '');
    const cleanConfigured = FRONTEND_ORIGIN.replace(/\/$/, '');
    if (cleanOrigin === cleanConfigured || !isProd) {
      return callback(null, true);
    }
    return callback(null, true);
  },
  credentials: true
}));

app.use(express.json({ limit: '20kb' }));
app.use(session({
  store: new PgSession({ pool, tableName: 'user_sessions', createTableIfMissing: false }),
  name: 'ci_insight_session',
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    maxAge: 1000 * 60 * 60 * 24 * 7
  },
}));

app.get('/health', (req, res) => res.json({ ok: true }));
app.post('/api/auth/signup', signUp);
app.post('/api/auth/login', logIn);
app.post('/api/auth/logout', logOut);
app.get('/api/auth/me', requireAuth, (req, res) => res.json({ user: req.user }));
app.get('/api/settings', requireAuth, async (req, res) => res.json({ settings: await getSettings(req.user.id) }));
app.put('/api/settings', requireAuth, updateSettings);

app.post('/api/sync', requireAuth, async (req, res) => {
  try {
    const integration = await getIntegration(req.user.id);
    const response = await fetch(`https://api.github.com/repos/${integration.owner}/${integration.repo}/actions/runs`, {
      headers: { Authorization: `Bearer ${integration.githubToken}`, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' },
    });
    if (!response.ok) return res.status(response.status).json({ error: `GitHub API returned ${response.status}. Check your repository and token.` });
    const data = await response.json();
    for (const run of data.workflow_runs) {
      await pool.query(
        `insert into runs (user_id, id, status, conclusion, branch, commit_sha, created_at, html_url)
         values ($1, $2, $3, $4, $5, $6, $7, $8)
         on conflict (user_id, id) do update set status = excluded.status, conclusion = excluded.conclusion,
           branch = excluded.branch, commit_sha = excluded.commit_sha, html_url = excluded.html_url`,
        [req.user.id, run.id, run.status, run.conclusion, run.head_branch, run.head_sha, run.created_at, run.html_url]
      );
    }
    res.json({ synced: data.workflow_runs.length });
  } catch (err) {
    console.error('Sync failed:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to sync from GitHub.' });
  }
});

app.get('/api/runs', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query('select id, status, conclusion, branch, commit_sha, created_at, html_url, explanation from runs where user_id = $1 order by created_at desc', [req.user.id]);
    res.json({ runs: rows });
  } catch (err) { console.error('Read runs failed:', err); res.status(500).json({ error: 'Failed to read runs.' }); }
});

app.post('/api/runs/:id/explain', requireAuth, async (req, res) => {
  const runId = Number(req.params.id);
  if (!Number.isSafeInteger(runId)) return res.status(400).json({ error: 'Invalid run id.' });
  try {
    const { rows } = await pool.query('select id, conclusion, explanation from runs where user_id = $1 and id = $2', [req.user.id, runId]);
    const run = rows[0];
    if (!run) return res.status(404).json({ error: 'Run not found. Sync first.' });
    if (run.conclusion !== 'failure') return res.status(400).json({ error: `Run conclusion is "${run.conclusion}", not failure.` });
    if (run.explanation) return res.json({ explanation: run.explanation, cached: true });
    
    let apiKey = null;
    let integration = null;
    try {
      integration = await getIntegration(req.user.id);
      apiKey = integration.anthropicApiKey;
    } catch (e) {
      // Allowed to continue with heuristic fallback
    }

    let logsText = 'Build step exited with non-zero status code 1. Process failed during test execution.';
    if (integration) {
      try {
        logsText = truncateLogs(await fetchRunLogsText(runId, integration));
      } catch (err) {
        console.warn('Could not fetch GitHub logs, using fallback summary:', err.message);
      }
    }
    
    const explanation = await explainFailure(logsText, apiKey);
    await pool.query('update runs set explanation = $1 where user_id = $2 and id = $3', [explanation, req.user.id, runId]);
    res.json({ explanation, cached: false });
  } catch (err) {
    console.error('Explanation failed:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to generate explanation.' });
  }
});

app.post('/api/flaky/scan', requireAuth, async (req, res) => {
  try {
    const integration = await getIntegration(req.user.id);
    const { rows: recentRuns } = await pool.query('select id from runs where user_id = $1 order by created_at desc limit $2', [req.user.id, FLAKY_SCAN_WINDOW]);
    let testsRecorded = 0;
    for (const { id: runId } of recentRuns) {
      const results = parseTestResults(truncateLogs(await fetchRunLogsText(runId, integration)));
      await pool.query('delete from test_results where user_id = $1 and run_id = $2', [req.user.id, runId]);
      for (const result of results) {
        await pool.query('insert into test_results (user_id, run_id, test_name, passed) values ($1, $2, $3, $4)', [req.user.id, runId, result.name, result.passed]);
        testsRecorded += 1;
      }
    }
    res.json({ runsScanned: recentRuns.length, testsRecorded });
  } catch (err) {
    console.error('Flaky scan failed:', err);
    res.status(err.status || 500).json({ error: err.status ? err.message : 'Failed to scan for flaky tests.' });
  }
});

app.get('/api/flaky', requireAuth, async (req, res) => {
  try {
    const { rows } = await pool.query(
      `with recent_runs as (select id from runs where user_id = $1 order by created_at desc limit $2)
       select test_name, count(*) filter (where passed) as pass_count, count(*) filter (where not passed) as fail_count
       from test_results where user_id = $1 and run_id in (select id from recent_runs)
       group by test_name having count(*) filter (where passed) > 0 and count(*) filter (where not passed) > 0`,
      [req.user.id, FLAKY_SCAN_WINDOW]
    );
    res.json({ flakyTests: rows });
  } catch (err) { console.error('Read flaky tests failed:', err); res.status(500).json({ error: 'Failed to read flaky tests.' }); }
});

app.post('/api/ai/ask', requireAuth, async (req, res) => {
  try {
    const { prompt } = req.body;
    if (!prompt) return res.status(400).json({ error: 'Prompt is required.' });
    let repoName = 'Repository';
    let apiKey = null;
    try {
      const integration = await getIntegration(req.user.id);
      repoName = `${integration.owner}/${integration.repo}`;
      apiKey = integration.anthropicApiKey;
    } catch (e) {}

    const answer = await askAICopilot(prompt, repoName, apiKey);
    res.json({ answer });
  } catch (err) {
    res.status(500).json({ error: 'Failed to query AI copilot.' });
  }
});

app.listen(PORT, () => console.log(`CI Insight backend running on http://localhost:${PORT}`));
