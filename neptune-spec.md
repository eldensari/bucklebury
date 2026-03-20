# Neptune — Bucklebury의 Secret Feature

> **⚠️ 우선순위: Graph 검증 후 착수.**
> Bucklebury v0.1(thought graph)이 사용자 검증을 받은 후에 진행한다.
> Core인 thought graph + 완전한 chat 경험(파일 첨부 등)이 먼저.
> Claude computer use 등 경쟁 제품의 품질이 아직 낮으므로 기회는 열려있다.

*"생각을 구조화하고, 실행한다."*

## What it is
Bucklebury의 두 번째 축. 첫 번째 축(Graph)이 **생각의 구조화**라면, Neptune은 **생각의 실행**. AI가 브라우저를 직접 조작하는 것을 사용자가 실시간으로 보면서, 필요하면 직접 개입할 수 있는 human-in-the-loop 브라우저 자동화.

## 왜 Neptune인가
Graph가 사고의 지도라면, Neptune은 그 지도를 따라 항해하는 것. 바다의 신 Neptune처럼 — 브라우저라는 바다를 AI가 항해하고, 사용자는 선장.

---

## UX

### 화면 구조 — Graph와 Browser가 같은 패널 공유
```
┌────────────┬──────────────────┬──────────────────┐
│ 🚢Research │                  │ [Graph][Browser]  │ ← 탭 토글
│            │                  │                   │
│ Chat list  │    채팅 영역     │  Graph 모드:      │
│            │                  │   ○──○ thought    │
│            │                  │   │   graph       │
│            │                  │                   │
│            │                  │  Browser 모드:    │
│            │                  │   AI가 브라우저   │
│            │                  │   조작하는 화면   │
├────────────┤                  │                   │
│ 👤 Profile │                  │                   │
└────────────┴──────────────────┴──────────────────┘
```

- **Graph 클릭** → 오른쪽에 thought graph (기존과 동일)
- **Browser 클릭** → 같은 자리에 브라우저 실시간 화면
- **둘 다 동시에는 안 보임.** 같은 공간을 번갈아 사용.
- 생각을 구조화할 때는 Graph, AI가 실행할 때는 Browser. 모드가 다름.
- 기존 레이아웃 변경 없음. "Graph" 옆에 "Browser" 버튼 하나 추가.

### 사용자 흐름
```
1. 채팅에서 대화 (기존 Bucklebury)
   "회사 지원서를 쓰고 싶어"
   → AI 답변 → branch → merge → 전략 확정
   → Graph 탭으로 사고 구조 확인

2. 실행 명령
   "이 전략대로 Indeed.com에서 지원해줘"
   → Browser 탭 자동 전환
   → AI가 브라우저에서 실행 시작

3. 실시간 관찰 + 개입
   → 사용자: AI가 폼 채우는 걸 실시간으로 봄
   → 사용자: 오른쪽 브라우저를 직접 클릭해서 수정 가능
   → "아 거기 말고 이 칸에 이걸 넣어"

4. 기록
   → AI의 브라우저 작업이 채팅에 commit으로 기록
   → "Indeed.com 접속" → "이름 필드 채움" → "이력서 업로드"
   → Graph에도 남음. 나중에 되돌아보기 가능.
```

### Agent 행동 보고 — 채팅에 실시간 기록
AI가 브라우저에서 행동할 때마다 채팅에 보고. 각 보고가 commit으로 graph에 기록.

```
사용자: "Indeed.com에서 지원해줘"

AI: Indeed.com에 접속했습니다.
AI: "Software Engineer" 검색 완료. 15개 결과.
AI: 첫 번째 결과 클릭. 지원서 폼이 보입니다.
AI: 이름, 이메일 채웠습니다. 이력서가 필요합니다.
사용자: [이력서.pdf 드래그 앤 드롭]
AI: 이력서 업로드 완료. 제출할까요?
사용자: 제출해
AI: 지원 완료했습니다.
```

- **모든 행동이 채팅의 일부.** 별도 로그 창이 아니라 대화의 흐름.
- **모든 행동이 commit.** Graph에 남음. 나중에 되돌아보기 가능.
- **Browser 탭을 안 보고 있어도** 채팅에서 AI가 뭘 하는지 알 수 있음.
- 사용자 메시지와 AI 행동 보고가 자연스럽게 섞임.

### Graph에서의 표현 — 연속 보고를 하나의 commit으로 묶기
채팅에서는 AI가 한 줄씩 실시간 보고. 하지만 Graph에서는 사용자의 다음 입력이 올 때까지를 하나의 response로 묶어서 기록. 기존 commit 구조(prompt + response 쌍)를 유지.

```
채팅 (실시간):                    Graph:
                                  
사용자: "Indeed에서 지원해줘"      ○ Indeed에서 지원해줘
AI: Indeed.com 접속               ● 접속 → 검색 → 클릭 → 폼 채움 → 이력서 필요
AI: 검색 완료. 15개 결과.          │
AI: 첫 번째 결과 클릭.             │
AI: 폼 채움. 이력서 필요.          │
                                  │
사용자: [이력서.pdf]              ○ 이력서.pdf
AI: 업로드 완료. 제출할까요?       ● 업로드 완료. 제출할까요?
                                  │
사용자: 제출해                    ○ 제출해
AI: 지원 완료.                    ● 지원 완료.
```

- **채팅:** AI가 행동할 때마다 한 줄씩 실시간 표시 (사용자가 진행 상황을 봄)
- **Graph:** 사용자 입력 기준으로 묶어서 commit (기존 구조 유지, 깔끔)
- **Bucklebury의 commit = prompt + response 쌍.** Neptune도 이 원칙을 지킴.

### Human-in-the-Loop
- 사용자가 오른쪽 브라우저를 **직접 클릭**하여 AI의 작업을 돕거나 수정
- AI가 막히면 사용자에게 물어봄: "CAPTCHA가 있습니다. 해결해주세요."
- 사용자가 해결하면 AI가 이어서 진행
- **완전 자동이 아니라 협업.** 이게 차별화.

---

## 아키텍처

### 설계 원칙
- **Node.js 단일 런타임.** Python 없음. FastAPI 없음. WebSocket 중계 없음.
- **원클릭 설치 유지.** Bucklebury의 핵심 원칙 위반 없음.
- **BYOK.** 기존 multi-provider 지원 그대로 활용.

### 기술 스택
```
┌─────────────────────────────────┐
│ Bucklebury (Electron)           │
│                                 │
│  ┌─────────┐  ┌──────────────┐ │
│  │ Chat +  │  │ Playwright   │ │
│  │ Graph   │  │ (Node.js)    │ │
│  │ (React) │  │ 브라우저 제어 │ │
│  └─────────┘  └──────────────┘ │
│        │              │        │
│        └──── LLM ─────┘        │
│         (BYOK API 호출)         │
└─────────────────────────────────┘
```

| 구성 요소 | 기술 | 역할 |
|-----------|------|------|
| Frontend | React + Electron | UI, 채팅, Graph/Browser 패널 |
| Browser Engine | Playwright (Node.js) | 브라우저 인스턴스 관리 + 조작 |
| 화면 표시 | CDP screencastFrame | 브라우저 화면을 canvas로 실시간 스트리밍 |
| 사용자 입력 | CDP Input.dispatch* | 클릭/타이핑 좌표를 브라우저로 전달 |
| AI 추론 | LLM API (BYOK) | 웹 요소 분석 → 행동 계획 → 실행 명령 |
| 웹 분석 | Playwright MCP / Accessibility Tree | 페이지 구조를 LLM이 이해할 수 있는 형태로 변환 |
| 보안 | Playwright Browser Context | 별도 브라우저 프로필로 사용자 세션과 격리 |

### 원래 아키텍처 vs 개선된 아키텍처

**원래 (복잡):**
```
Electron (Node.js) → WebSocket → FastAPI (Python) → browser-use (Python) → Playwright (Python)
런타임 2개, 서버 2개, 통신 레이어 1개
```

**개선 (단순):**
```
Electron (Node.js) → Playwright (Node.js) → 브라우저
런타임 1개
```

### 왜 개선된 아키텍처가 나은가
- Playwright는 Node.js가 원본. Microsoft가 만듦. Electron과 같은 런타임.
- Playwright MCP가 이미 존재 — AI가 accessibility tree로 웹 요소 분석. browser-use가 하는 걸 이미 함.
- Python 의존성 제거 → 설치 단순화.
- FastAPI 서버 불필요 → 프로세스 관리 단순화.
- WebSocket 통신 불필요 → 지연 감소.

### 브라우저 화면 표시 방식 — CDP Screencast (대안 B 선택)

**검토한 대안들:**

| 대안 | 방식 | 장점 | 단점 |
|------|------|------|------|
| A. BrowserView | Electron BrowserView로 임베드 | 가장 자연스러운 느낌 | Playwright 동기화 까다로움 |
| **B. CDP Screencast** | **headless + screencastFrame → canvas** | **안정적, 검증됨, 리소스 효율적** | **구현 약간 복잡** |
| C. 별도 창 | 별도 Electron 윈도우 | 구현 쉬움 | split-view UX 깨짐 |

**선택: 대안 B — CDP Screencast**

이유:
- Playwright가 브라우저를 완전히 제어하면서, 화면만 스트리밍
- 사용자 클릭을 좌표 변환으로 브라우저에 전달 가능
- headless로 돌리다가 Browser 탭 클릭 시에만 스트리밍 → 리소스 효율
- 많은 브라우저 자동화 도구가 사용하는 검증된 방식

### 동작 흐름 (기술적)
```
1. 사용자: "Indeed.com에서 지원해줘"
2. Electron main process → LLM API 호출
   - 현재 대화 context + 명령 전달
   - LLM이 실행 계획 반환: ["navigate indeed.com", "click search", "type job title", ...]
3. Playwright (Node.js) → 브라우저 실행
   - headful 브라우저 인스턴스 생성 (별도 context, 격리됨)
   - 계획의 각 단계를 순차 실행
4. CDP screencastFrame → React canvas
   - 브라우저 화면을 실시간으로 오른쪽 패널에 렌더링
   - 사용자가 canvas 클릭 → 좌표 계산 → CDP Input.dispatchMouseEvent로 전달
5. 각 단계 완료 시 → 채팅에 commit으로 기록
   - "Indeed.com 접속 완료" (commit)
   - "검색 필드에 'Software Engineer' 입력" (commit)
   - Graph에 실행 기록이 남음
6. AI가 막히면 → 채팅에서 사용자에게 질문
   - "CAPTCHA가 감지되었습니다. Browser 탭에서 해결해주세요."
   - 사용자가 직접 해결 → AI가 이어서 진행
```

### 파일 처리
- 채팅에 파일 드래그 앤 드롭 (이력서 등)
- Electron이 로컬 임시 폴더에 저장
- Playwright가 해당 경로를 인식하여 웹사이트에 자동 업로드

### 보안
- Playwright Browser Context 격리 — 사용자의 실제 로그인 세션과 분리
- 별도 브라우저 프로필 사용
- AI가 접근하는 사이트/행동은 채팅에 투명하게 기록
- 민감한 정보 입력 시 사용자 확인 요청

---

## Bucklebury 기존 기능과의 통합

| 기존 기능 | Neptune에서의 역할 |
|-----------|-------------------|
| Ferry | 프로젝트별 브라우저 세션도 분리 |
| BYOK | 이미 multi-provider 지원. 그대로 활용 |
| Electron | 이미 데스크톱 앱. 브라우저 패널 추가만 |
| .md 저장 | 브라우저 작업 로그도 대화에 기록, .md에 저장 |
| Graph | 브라우저 실행 기록이 commit으로 graph에 남음 |
| Emerge | 실행 기록 포함 전체 대화를 emerge 가능 |

---

## 다른 도구와의 차별화

| 도구 | 방식 | Bucklebury + Neptune |
|------|------|---------------------|
| OpenClaw | 채팅으로만 결과 수신. 뭘 했는지 안 보임. | 실시간으로 보여줌. 개입 가능. |
| Manus | 클라우드 VM에서 실행. GPU 비용. | 로컬 실행. GPU 불필요. BYOK. |
| Claude Computer Use | 스크린샷 기반. 느림. | Accessibility tree 기반. 빠름. 93% 적은 토큰. |
| 일반 RPA | 스크립트 기반. 유연하지 않음. | LLM 기반. 자연어 명령. |

---

## 구현 우선순위

**이건 v0.1이 아님.** Bucklebury v0.1(thought graph)이 사용자 검증을 받은 후에 진행.

1. Playwright Node.js로 브라우저 조작 프로토타입
2. CDP screencast로 오른쪽 패널에 렌더링
3. 사용자 클릭 → CDP 좌표 전달
4. LLM → Playwright 실행 계획 파이프라인
5. 채팅에 실행 기록 commit

---

## 기대 효과
- **Seamless 경험:** 하나의 앱에서 생각 → 구조화 → 실행 → 기록
- **비용 절감:** GPU 서버 대신 BYOK API 비용만
- **하드웨어 독립:** 일반 CPU에서 구동 (Mac, Windows, Linux)
- **투명성:** AI가 뭘 하는지 실시간으로 보이고, graph에 기록됨
- **민주적:** 비싼 infrastructure 없이 누구나 사용 가능

---

*Neptune은 Bucklebury의 생각의 구조화 위에, 생각의 실행을 얹는 것. 열린 시스템에서 에너지가 흐르면 구조가 생기듯, 대화에서 행동이 흐르면 결과가 생긴다.*
