import AdmZip from 'adm-zip';

// GitHub's logs endpoint returns a redirect to a zip file containing
// one .txt file per job/step. We download it, unzip in memory, and
// concatenate everything into one big string of log text.
export async function fetchRunLogsText(runId, { owner, repo, githubToken }) {
  const url = `https://api.github.com/repos/${owner}/${repo}/actions/runs/${runId}/logs`;

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${githubToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
    },
  });

  if (!response.ok) {
    throw new Error(`GitHub logs request failed: ${response.status}`);
  }

  const arrayBuffer = await response.arrayBuffer();
  const zip = new AdmZip(Buffer.from(arrayBuffer));
  const entries = zip.getEntries();

  const combined = entries
    .filter((entry) => !entry.isDirectory)
    .map((entry) => entry.getData().toString('utf-8'))
    .join('\n');

  return combined;
}

// Rough truncation: ~4 characters per token is a safe approximation for
// English/log text, so ~8000 tokens ≈ 32000 characters. We keep the END
// of the logs, since failures are almost always reported in the last
// lines (stack traces, assertion failures), not the setup/install output.
export function truncateLogs(text, maxChars = 32000) {
  if (text.length <= maxChars) return text;
  return text.slice(text.length - maxChars);
}
