import { pool } from './db.js';
import { decryptSecret, encryptSecret } from './crypto.js';

const REPOSITORY_PATTERN = /^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/;
const fields = 'github_owner, github_repo, github_token_encrypted, anthropic_api_key_encrypted';

function publicSettings(row) {
  return { repository: row.github_owner && row.github_repo ? `${row.github_owner}/${row.github_repo}` : '', hasGitHubToken: Boolean(row.github_token_encrypted), hasAnthropicApiKey: Boolean(row.anthropic_api_key_encrypted), configured: Boolean(row.github_owner && row.github_repo && row.github_token_encrypted && row.anthropic_api_key_encrypted) };
}

export async function getSettings(userId) {
  const { rows } = await pool.query(`select ${fields} from users where id = $1`, [userId]);
  return publicSettings(rows[0] || {});
}

export async function updateSettings(req, res) {
  const repository = typeof req.body?.repository === 'string' ? req.body.repository.trim() : '';
  const githubToken = typeof req.body?.githubToken === 'string' ? req.body.githubToken.trim() : '';
  const anthropicApiKey = typeof req.body?.anthropicApiKey === 'string' ? req.body.anthropicApiKey.trim() : '';
  if (!REPOSITORY_PATTERN.test(repository)) return res.status(400).json({ error: 'Repository must be in owner/name format.' });
  const [githubOwner, githubRepo] = repository.split('/');
  try {
    const { rows: existing } = await pool.query(`select ${fields} from users where id = $1`, [req.user.id]);
    const current = existing[0];
    if (!current) return res.status(404).json({ error: 'User account not found.' });
    if (!githubToken && !current.github_token_encrypted) return res.status(400).json({ error: 'A GitHub personal access token is required.' });
    if (!anthropicApiKey && !current.anthropic_api_key_encrypted) return res.status(400).json({ error: 'An Anthropic API key is required.' });
    const { rows } = await pool.query(
      `update users set github_owner = $1, github_repo = $2, github_token_encrypted = $3, anthropic_api_key_encrypted = $4, updated_at = now() where id = $5 returning ${fields}`,
      [githubOwner, githubRepo, githubToken ? encryptSecret(githubToken) : current.github_token_encrypted, anthropicApiKey ? encryptSecret(anthropicApiKey) : current.anthropic_api_key_encrypted, req.user.id]
    );
    res.json({ settings: publicSettings(rows[0]) });
  } catch (err) {
    console.error('Saving settings failed:', err);
    res.status(500).json({ error: 'Unable to save settings.' });
  }
}

export async function getIntegration(userId) {
  const { rows } = await pool.query(`select ${fields} from users where id = $1`, [userId]);
  const settings = rows[0];
  if (!settings?.github_owner || !settings.github_repo || !settings.github_token_encrypted || !settings.anthropic_api_key_encrypted) {
    const error = new Error('Complete Settings with your repository and API credentials first.'); error.status = 400; throw error;
  }
  return { owner: settings.github_owner, repo: settings.github_repo, githubToken: decryptSecret(settings.github_token_encrypted), anthropicApiKey: decryptSecret(settings.anthropic_api_key_encrypted) };
}
