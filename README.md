# 🚀 RepoRefine

🔗 **Live Demo:** https://repo-refine.vercel.app/

**RepoRefine** is a rule-based GitHub profile audit tool that analyzes repositories, activity patterns, and profile quality to detect weaknesses and generate actionable improvements — making your GitHub recruiter-ready.

Unlike AI-powered tools, RepoRefine uses deterministic logic and GitHub GraphQL analysis to provide transparent scoring and structured feedback.

---

## ✨ Features

### 🔍 Profile Audit
- Profile completeness analysis
- Bio strength check
- Pinned repo validation
- Branding score
- Recruiter impression score

### 📂 Repository Health Analysis
- README quality check
- License detection
- Maintenance activity check
- Open issue aging detection
- CI/CD presence detection
- Test folder detection
- Documentation scoring

### 📊 Commit & Activity Analysis
- Commit consistency detection
- Inactivity gap detection
- Commit message hygiene scoring
- Commit chronotype analysis

### 📈 Scoring System
- Profile Health Score (0–100)
- Repository Health Score
- Documentation Score
- Consistency Score
- Recruiter Readiness Index

### 📊 Visual Dashboard
- Radar skill graph
- Health score meter
- Repository audit cards
- Red/Yellow/Green indicators
- Commit heatmap visualization

---

## 🛠 Tech Stack

- **Frontend:** Next.js (App Router)
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **API:** GitHub GraphQL API and OpenAI API
- **Auth:** GitHub Personal Access Token

---

## 🚀 Getting Started

### 1️⃣ Clone the repository

```bash
git clone https://github.com/Sushma-1706/RepoRefine.git
cd RepoRefine
```
### 2️⃣ Install dependencies
```bash
npm install
```
### 3️⃣ Add Environment Variables
Create a .env.local file:
``` bash
GITHUB_TOKEN=your_github_pat_token
OPENAI_API_KEY=your_openai_api_key
```
### 4️⃣ Run locally
```bash
npm run dev
```
App runs at:
```bash
http://localhost:3000
```
---

### 🧠 How It Works
RepoRefine uses GitHub GraphQL queries to fetch:
- Profile metadata
- Repository data
- Commit history
- Issues & pull requests
- Then applies rule-based audit logic to:
- Detect weaknesses
- Calculate scores
- Generate structured improvement suggestions
No external AI APIs are used.

### 📦 Future Enhancements
- PDF export mode
- Before vs After improvement comparison
- Recruiter bulk candidate mode
- Open-source scoring benchmark
 ---
### 📜 License
MIT License
