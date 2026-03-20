# CLAUDE.md

## Project
OpenBranch (formerly Bucklebury) — a nonlinear chat app for LLM conversations. Think early ChatGPT, but with Git-like structure. Every exchange is a commit. Branch to explore different directions. Merge to combine insights. See the shape of your reasoning as a graph.

Domain: openbranch.app

## Core Principle
**OpenBranch = 초기 ChatGPT + thought graph.** 새 기능을 넣을까 고민되면 "초기 ChatGPT에 이거 있었어?"를 물어봐라. 없었으면 안 넣어도 된다. Neptune은 graph 검증 후에 착수. 파일 첨부 등 부가 기능보다 nonlinear 경험의 완성도가 우선.

## Spec Documents
- `bucklebury-spec.md` — full product spec, UX decisions, architecture, roadmap
- `neptune-spec.md` — secret feature: browser automation with human-in-the-loop

**Always read the relevant spec before making code changes.** Do not implement features that contradict the spec. If a change requires a spec update, flag it.

## Tech Stack
- Vite + React + Tailwind CSS
- Vercel (hosting + serverless functions)
- localStorage (client-side storage)
- BYOK (Bring Your Own Key) — multi-provider LLM support (Anthropic, OpenAI, Gemini)
- Vercel serverless function for free-tier API calls (rate limited)

## File Structure

```
openbranch/
├── src/
│   ├── App.jsx              ← 메인 UI (React, single-file)
│   ├── main.jsx             ← React entry point
│   └── raft-icon.png        ← 앱 아이콘 (import용)
├── electron/
│   ├── main.js              ← Electron main process (IPC, LLM API, file I/O)
│   └── preload.js           ← IPC bridge (renderer ↔ main)
├── assets/
│   ├── icon.png             ← 원본 아이콘
│   └── icons/icons/         ← electron-icon-builder 출력
│       ├── win/icon.ico
│       ├── mac/icon.icns
│       └── png/             ← 16~1024px 사이즈별
├── public/
│   └── icons/icon-64.png    ← 홈 화면용 아이콘
├── screenshots/             ← README용 스크린샷
├── bucklebury-spec.md       ← 제품 스펙 (레거시 이름)
├── openbranch-spec.md       ← OpenBranch 스펙
├── neptune-spec.md          ← Neptune (브라우저 자동화) 스펙
├── bucklebury.jsx           ← 원본 웹 프로토타입 (참고용)
├── CLAUDE.md                ← 이 파일
├── DEVELOPMENT.md           ← 개발환경 셋업 가이드
├── index.html               ← Vite entry HTML
├── vite.config.js           ← Vite 설정
└── package.json             ← 의존성 + 빌드 스크립트
```

## Key Files
- `src/App.jsx` — main UI (React, single-file)
- `electron/main.js` — Electron main process, LLM API calls, file system
- `electron/preload.js` — IPC bridge between renderer and main process
- `package.json` — dependencies and build scripts

## Build Commands
```bash
npm run electron:dev          # development mode
npm run electron:build:win    # Windows .exe
npm run electron:build:mac    # macOS .dmg
npm run electron:build:linux  # Linux .AppImage
```

## Git Conventions
- Use conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `style:`
- Commit after each logical unit of work
- Keep commits small and focused
- Do not push unless asked

## Design Principles
- UX first, code second
- Keep source code minimal — do not add unnecessary complexity
- One-click install — no additional runtime dependencies
- No lock-in — user data is standard .md files
- BYOK — user's own API keys, $0 infrastructure cost

## Do NOT
- Add Python or any non-Node.js dependencies
- Add unnecessary npm packages without asking
- Implement features not in the spec
- Break the single-file UI architecture without discussing first
- Remove or modify the frontmatter structure in saved .md files
