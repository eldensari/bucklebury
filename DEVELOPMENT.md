# Bucklebury — Development Setup

## Prerequisites
- Node.js
- npm
- Windows 11 (WSL for Entire CLI)

## Quick Start
```bash
npm install
npm run electron:dev        # 개발 모드
npm run electron:build:win  # Windows 설치파일 빌드
```

## Build Notes
- Windows 빌드 시 **개발자 모드** 필요 (Settings → 시스템 → 개발자용 → 켜기)
- 코드 서명 없이 빌드: `CSC_IDENTITY_AUTO_DISCOVERY=false` (빌드 스크립트에 포함됨)

## Project Structure
```
bucklebury/
├── src/App.jsx           ← UI (React, 단일 파일 — 추후 분리 예정)
├── electron/main.js      ← Electron 메인 프로세스 (파일 I/O, LLM API, IPC)
├── electron/preload.js   ← IPC 브릿지
├── assets/               ← 앱 아이콘 원본 + 생성된 아이콘
├── public/               ← Vite 정적 파일
└── dist/                 ← 빌드 결과물
```

## 아이콘 재생성
```bash
npx electron-icon-builder --input=assets/icon.png --output=assets/icons
cp assets/icons/icons/png/64x64.png src/raft-icon.png
```

---

## 개발환경 셋업 (미완료)

### 1. Git 초기화
- [ ] `git init` + 첫 커밋
- [ ] `.gitignore` 설정 (node_modules, dist, build 등)

### 2. Linear 연동
- [ ] Linear 프로젝트 생성 (BUCK)
- [ ] Linear API 키 발급
- [ ] Claude Code에서 Linear MCP 또는 API 연동
- [ ] 워크플로우: 대화에서 이슈 발견 → 자동 이슈 생성 → 브랜치 → 작업 → 커밋

### 3. Entire CLI
- [ ] WSL 설치 (Entire가 Windows 직접 미지원)
- [ ] Go 설치 (WSL 내)
- [ ] `go install github.com/entireio/cli/cmd/entire@latest`
- [ ] `entire enable --agent claude-code`
- [ ] 워크플로우: Claude Code 세션 자동 기록, 체크포인트, 되돌리기
