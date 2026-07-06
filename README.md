# Computer Skills Academy v2.0 — Project Overview

## What It Is
An AI-powered learning platform that teaches absolute beginners everything about computers, programming, and AI — from zero knowledge to B.Tech level — taught entirely in Hinglish (Hindi + English mix).

## Who It’s For
Two specific students (Class 12 pass, still deciding on college, complete beginners with PCs/laptops/Windows). The entire curriculum assumes zero prior computer knowledge — every term is explained before it is used.

## Tech Stack
- **Framework**: Next.js 15 (App Router) + TypeScript
- **Styling**: Tailwind CSS v4 + inline CSS variables (dark/light mode)
- **AI**: NVIDIA NIM (multiple models via OpenAI-compatible API)
  - Lessons: `deepseek-ai/deepseek-v4-flash`
  - Quizzes: `deepseek-ai/deepseek-v4-flash` (JSON mode)
  - Answer evaluation: `nvidia/nemotron-3-ultra-550b-a55b`
  - Chat / mentor: `openai/gpt-oss-120b`
- **Search**: DuckDuckGo (`duck-duck-scrape`) + Wikipedia REST API
- **YouTube**: YouTube Data API v3 + `yt-search` fallback + transcript fetching via Cloudflare Worker proxy
- **Storage**: Currently browser `localStorage` (passwords, progress, quiz scores, streaks, weak topics, chat history)
- **Auth**: Simple password-per-student with device fingerprinting

## Curriculum Structure
**200 days, 22 phases** — split into two parts:

### Core Syllabus (Days 1-146)
Builds from absolute zero upward:
1. Computer & Windows Fundamentals (10 days) — Windows Updates, PC/laptop care, troubleshooting
2. Productivity & Office Suite (9 days) — Word, Excel, PowerPoint, Google Workspace
3. Hardware, PC Building & Repair (10 days) — CPU/GPU/RAM/motherboard, PC building, desktop/laptop repair basics
4. OS, CMD, Terminal & Networking (13 days) — CMD/PowerShell/Linux with explicit named commands, networking basics, OS theory awareness
5. Programming Logic & Git (7 days) — DSA taught only as awareness (what/why/where/how), Git/GitHub
6. Python Programming (14 days)
7. C Programming (5 days)
8. C++ Programming (8 days) — templates, smart pointers, exception handling
9. Java Programming (12 days) — includes Gradle/Maven build tools
10. Web Development Foundations (7 days)
11. Advanced Web & Frameworks (12 days) — React/Next.js/Node.js
12. Databases & Backend (7 days) — includes DBMS theory awareness (ER diagrams, normalization)
13. Mobile & Cross-Platform (10 days) — React Native, Flutter, PWA
14. AI & Machine Learning Basics (7 days) — awareness + practical chatbot project
15. Data Science Basics (4 days) — awareness only
16. Cloud & DevOps Basics (6 days) — awareness + one deploy project
17. Cybersecurity Basics (5 days) — awareness only

### Mastery Track (Days 147-200)
Deep-dive specializations that students can pursue after the core syllabus:
18. Data Structures & Algorithms (12 days) — trees, graphs, DP, greedy, hashing, interview patterns
19. Cybersecurity & Ethical Hacking (8 days)
20. Data Science & Advanced AI (12 days) — TensorFlow, NLP, LLMs, fine-tuning, RAG
21. DevOps, Cloud & System Design (10 days) — Docker, Kubernetes, AWS/GCP/Azure, microservices
22. Career Prep & Grand Capstone (12 days) — resume, interviews, freelancing, startup basics, final project

## Key Features
- **Streaming AI lessons**: Content streams word-by-word in real time, with web search and Wikipedia results injected automatically
- **100% quiz-gated progression**: Must score 100% on a day’s quiz to unlock the next day
- **Spaced repetition**: Weak topics are tracked and re-injected into future quizzes
- **Dual student tracking**: Independent progress for both students, persisted per device
- **In-app video player**: Watch YouTube videos inside the app with transcript view and "Ask AI about this video" chat
- **AI mentor chat**: Students can ask questions, request career advice, get practice problems, or hear tech news
- **Progress backup**: Export/import progress as JSON
- **Dark/Light mode**: Full theme support
- **Admin mode**: Switch between students to monitor progress

## How It Works (User Flow)
1. Student picks a profile (Student 1 or Student 2) and enters a 4-digit password
2. First time: takes a placement test (Day 0) — AI generates personalized weak-topic list
3. Each day: streaming AI lesson → resources (YouTube videos + web articles) → quiz → must score 100% to unlock next day
4. Progress, streaks, XP, and weak topics tracked automatically
5. Chat tab: ask anything, get help, hear tech news, get career advice
6. Roadmap tab: see all 200 days, current phase, completion status

## Project Structure
```
app/
  page.tsx              — Main UI (2000+ lines: login, dashboard, lesson, quiz, chat, roadmap, admin)
  layout.tsx            — Root layout
  globals.css           — Tailwind + CSS variables for theming
  api/tutor/route.ts    — AI API (lesson/quiz/eval/chat/summarize/transcript)
components/
  VideoPlayerModal.tsx  — In-app YouTube player with transcript + Ask AI tabs
lib/
  curriculum.ts         — 200-day curriculum (PHASES + CURRICULUM arrays)
  ai-client.ts          — NVIDIA NIM client (streaming + non-streaming)
  search.ts             — DuckDuckGo + Wikipedia search
  youtube.ts            — YouTube search + transcript summarization
  auth.ts               — Password + device fingerprinting logic
  data-export.ts        — JSON export/import for progress
constants/
  models.ts             — Model IDs and task assignments
types/
  index.ts              — All TypeScript types (Student, LessonMeta, Phase, Quiz, etc.)
```

## Current State
- Fully functional: lessons stream, quizzes generate, AI chat works, YouTube videos play in-app
- Curriculum is complete (200 days, 22 phases, all day metadata populated)
- Currently single-page app (`/`) — no separate routes
- Storage is browser-only (localStorage) — progress is lost on new devices
- No backend database or cloud sync yet
- UI is functional but unpolished (no design system, mixed styling approaches, not mobile-optimized)

## Next Planned Improvements
1. Cloud database + auth (Supabase) for cross-device sync
2. Split the single giant page into proper routes (`/lesson`, `/roadmap`, `/watch`, etc.)
3. Extract reusable UI components and add a design system
4. Mobile-responsive layout
5. Add more polished loading states and animations

## How to Run
```bash
npm install
npm run dev   # Runs on port 3000
```

## Environment Variables
| Key | Purpose |
|-----|---------|
| `NVIDIA_API_KEY` | NVIDIA NIM API key for all AI models |
| `YOUTUBE_API_KEY` | YouTube Data API v3 for video search |
