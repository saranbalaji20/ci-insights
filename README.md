# ⚡ CI Insight - AI-Powered GitHub Actions & Workflow Diagnostics

CI Insight is a modern, full-stack, LLM-integrated dashboard for GitHub Actions. It automatically syncs workflow execution history, uses Claude AI to generate plain-English failure root-cause explanations with line-by-line code fix suggestions, proactive CI pipeline optimization tips, and detects flaky tests across build suites.

![CI Insight Dashboard](https://img.shields.io/badge/UI-Cyber%20Dark%20Glassmorphism-indigo)
![LLM-Integrated](https://img.shields.io/badge/AI-Claude%20Sonnet-purple)
![Vercel Ready](https://img.shields.io/badge/Deploy-Vercel%20Ready-black)

---

## 🌟 Key Features

- 🤖 **LLM AI Engine Integration**: Deep failure analysis powered by Anthropic Claude AI with fallback heuristic analysis.
- 🪄 **Proactive AI Insights & Tips Hub**: Recommends build speed optimizations (caching, parallel matrix builds), security pinning, and cost reductions.
- 💬 **Interactive Ask Claude CI Copilot**: Type natural language questions about your CI/CD pipeline or workflow YAML files and receive instant solutions.
- ⚠️ **Flaky Test Detector**: Automatically scans workflow test run artifacts across execution windows to pinpoint non-deterministic tests.
- ⚡ **Modern Cyber-Dark Glassmorphic UI**: Translucent glass cards, glowing KPI metrics, live build charts, and smooth micro-animations.
- 🚀 **Dual-Mode Global Usability (Vercel Ready)**: Works seamlessly either connected to the backend Postgres database or in Standalone/Demo mode on Vercel.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, Custom Vanilla CSS Design System (Glassmorphism), Google Fonts (`Outfit`, `Inter`, `JetBrains Mono`).
- **Backend**: Node.js, Express, Embedded PGlite (Zero-config local Postgres) / Remote PostgreSQL (Supabase / Render).
- **AI & Integrations**: Anthropic `@anthropic-ai/sdk`, GitHub Actions REST API.

---

## 🚀 Quick Start (Local Development)

### 1. Install Dependencies
```bash
npm run install:all
```
*(Or `npm install` inside both `frontend` and `backend` directories)*

### 2. Configure Environment Variables
Copy `.env.example` in `backend` to `.env`:
```env
PORT=4000
FRONTEND_ORIGIN=http://localhost:5173
SESSION_SECRET=super_secret_key_min_32_chars_long
ENCRYPTION_KEY=64_hex_character_encryption_key_string
```

### 3. Launch Development Servers
- **Backend**: `npm --prefix backend run dev` (Runs on `http://localhost:4000`)
- **Frontend**: `npm --prefix frontend run dev` (Runs on `http://localhost:5173`)

---

## 📦 Deploying to Vercel (Frontend)

CI Insight includes a `vercel.json` configuration for instant single-click or CLI deployment on Vercel:

1. Push your repository to GitHub (see commands below).
2. Import your GitHub repository into [Vercel](https://vercel.com).
3. Set the Environment Variable (Optional, for backend mode):
   ```env
   VITE_API_BASE_URL=https://your-backend-url.onrender.com
   ```
4. Deploy! If no backend URL is set, the app runs in **Interactive Global Standalone Mode**, allowing any user to test AI insights instantly.

---

## 🐙 Push to GitHub as a New Repository

Run the following commands in your terminal to create and push this repository:

```bash
# 1. Stage all files
git add .

# 2. Create initial commit
git commit -m "feat: modern CI Insight UI with AI Insights Hub & Vercel deployment setup"

# 3. Rename branch to main
git branch -M main

# 4. Add your new GitHub repository remote URL
git remote add origin https://github.com/YOUR_GITHUB_USERNAME/ci-insight.git

# 5. Push code to GitHub
git push -u origin main
```

---

## 📄 License

MIT License © 2026 CI Insight Team
