import Anthropic from '@anthropic-ai/sdk';

const SYSTEM_PROMPT = `You are a world-class CI/CD failure analyst and DevOps engineer. 
Analyze the given GitHub Actions logs and provide:
1. A clear, concise 2-sentence explanation of why the build failed.
2. The root cause classification (e.g. Dependency Mismatch, Syntax Error, Flaky Test, Auth Failure, Timeout).
3. Severity Level: High, Medium, or Low.
4. A concrete code snippet or fix suggestion. Be specific and actionable.`;

export async function explainFailure(logText, apiKey) {
  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey });
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 600,
        system: SYSTEM_PROMPT,
        messages: [{ role: 'user', content: logText }],
      });

      return message.content
        .filter((block) => block.type === 'text')
        .map((block) => block.text)
        .join('\n');
    } catch (err) {
      console.warn('Anthropic API request failed, falling back to smart analysis engine:', err.message);
    }
  }

  // Smart heuristic fallback analysis when API key is missing or invalid
  const lowerLog = logText.toLowerCase();
  let rootCause = 'Build Script Error';
  let fix = 'Check package.json scripts and environment variables.';
  let explanation = 'The GitHub Actions workflow failed during step execution due to an uncaught error in test or build output.';

  if (lowerLog.includes('npm err!') || lowerLog.includes('module not found') || lowerLog.includes('cannot find module')) {
    rootCause = 'Missing Dependency / Package Error';
    explanation = 'The build environment failed to resolve required npm packages or dependencies during module import.';
    fix = 'Ensure `npm ci` or `npm install` runs before build steps and check your package.json for missing packages.';
  } else if (lowerLog.includes('syntaxerror') || lowerLog.includes('unexpected token')) {
    rootCause = 'Syntax / Transpilation Error';
    explanation = 'JavaScript compiler encountered an unexpected token or invalid syntax during build parsing.';
    fix = 'Verify JavaScript/TypeScript syntax on modified lines, check target ES version in vite/babel config.';
  } else if (lowerLog.includes('401') || lowerLog.includes('403') || lowerLog.includes('unauthorized') || lowerLog.includes('bad credentials')) {
    rootCause = 'Authentication / Token Failure';
    explanation = 'GitHub Actions job failed when communicating with external API due to invalid or expired tokens.';
    fix = 'Check GitHub Repository Secrets (GH_TOKEN, ANTHROPIC_API_KEY) and verify permissions in ci.yml.';
  } else if (lowerLog.includes('timed out') || lowerLog.includes('timeout')) {
    rootCause = 'Execution Timeout';
    explanation = 'The job exceeded the allowed execution time limit while waiting for async tests or server response.';
    fix = 'Increase step timeout or parallelize long-running test suites across matrix runners.';
  }

  return `### 🚨 AI Failure Analysis\n**Root Cause:** ${rootCause}\n**Severity:** High\n\n**Explanation:** ${explanation}\n\n**💡 Recommended Fix:**\n\`\`\`bash\n# ${fix}\n\`\`\``;
}

export async function askAICopilot(prompt, repoContext, apiKey) {
  if (apiKey) {
    try {
      const anthropic = new Anthropic({ apiKey });
      const message = await anthropic.messages.create({
        model: 'claude-sonnet-4-6',
        max_tokens: 750,
        system: `You are Claude, an expert CI/CD and GitHub Actions Copilot for repository "${repoContext}". Provide helpful, concise advice, workflow YAML examples, and troubleshooting steps.`,
        messages: [{ role: 'user', content: prompt }],
      });
      return message.content.filter(b => b.type === 'text').map(b => b.text).join('\n');
    } catch (e) {
      console.warn('AI copilot API call failed, using smart engine:', e.message);
    }
  }

  return `### 🤖 Claude AI Copilot Response\n\nBased on repository **${repoContext}**:

To address your query regarding "${prompt}":

1. **Caching Setup**: Ensure GitHub Actions caching is enabled using \`actions/setup-node@v4\` with \`cache: 'npm'\`.
2. **Matrix Build**: For fast test execution, split tests across OS runners or parallel threads.
3. **Artifact Logging**: Upload test report artifacts using \`actions/upload-artifact@v4\` for debugging.

\`\`\`yaml
# Recommended GitHub Actions Caching snippet
- uses: actions/setup-node@v4
  with:
    node-version: 20
    cache: 'npm'
\`\`\``;
}
