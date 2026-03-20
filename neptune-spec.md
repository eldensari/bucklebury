# Neptune — Bucklebury의 Secret Feature

*"생각을 구조화하고, 실행한다."*

## What it is

Bucklebury의 두 번째 축. 첫 번째 축(Graph)이 생각의 구조화라면, Neptune은 생각의 실행. Claude in Chrome의 검증된 브라우저 자동화 엔진을 활용하여, AI의 실행을 사용자가 실시간으로 보면서 필요하면 직접 개입할 수 있는 human-in-the-loop 브라우저 자동화.

## 왜 Neptune인가

Graph가 사고의 지도라면, Neptune은 그 지도를 따라 항해하는 것. 바다의 신 Neptune처럼 — 브라우저라는 바다를 AI가 항해하고, 사용자는 선장.

## 핵심 결정: "엔진은 빌리고, 기록은 직접 만든다"

Claude in Chrome은 이미 검증된 브라우저 자동화 엔진이다. 계획 제안 → 승인 → 자율 실행의 흐름이 잘 작동한다. 하지만 실행의 구조화된 기록이 없다 — 사이드 패널 대화에만 남고, 나중에 되돌아보기 어렵다. Neptune은 이 실행 엔진을 그대로 활용하되, Bucklebury의 Graph 시스템으로 실행의 모든 것을 기록하고 구조화한다.

- **빌리는 것:** 브라우저 제어 (navigate, click, type, read_page...) — Claude in Chrome MCP
- **만드는 것:** 실행 기록의 구조화 (commit), 실시간 화면 표시, human-in-the-loop UX

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

- **Graph** 클릭 → 오른쪽에 thought graph (기존과 동일)
- **Browser** 클릭 → 같은 자리에 브라우저 실시간 화면
- 둘 다 동시에는 안 보임. 같은 공간을 번갈아 사용.
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
   → Neptune이 실행 계획 생성 → 채팅에 표시
   → 사용자: "좋아, 실행해" (approve)
   → Browser 탭 자동 전환
   → Claude in Chrome MCP로 실행 시작

3. 실시간 관찰 + 개입
   → 사용자: AI가 폼 채우는 걸 실시간으로 봄 (screenshot 폴링)
   → 채팅에서 지시: "아 거기 말고 이 칸에 이걸 넣어"
   → AI가 지시 반영하여 계속 진행

4. 기록
   → AI의 브라우저 작업이 채팅에 commit으로 기록
   → "Indeed.com 접속" → "이름 필드 채움" → "이력서 업로드"
   → Graph에도 남음. 나중에 되돌아보기 가능.
```

### Agent 행동 보고 — 채팅에 실시간 기록

AI가 브라우저에서 행동할 때마다 채팅에 보고. 각 보고가 commit으로 graph에 기록.

```
사용자: "Indeed.com에서 지원해줘"

AI: [실행 계획]
    1. Indeed.com 접속
    2. "Software Engineer" 검색
    3. 첫 번째 결과의 지원서 폼 작성
    4. 이력서 업로드
    실행할까요?

사용자: 실행해

AI: Indeed.com에 접속했습니다.                    ← navigate 호출 결과
AI: "Software Engineer" 검색 완료. 15개 결과.     ← find + form_input + computer 결과
AI: 첫 번째 결과 클릭. 지원서 폼이 보입니다.     ← computer(left_click) 결과
AI: 이름, 이메일 채웠습니다. 이력서가 필요합니다. ← form_input 결과
사용자: [이력서.pdf 드래그 앤 드롭]
AI: 이력서 업로드 완료. 제출할까요?               ← file_upload 결과
사용자: 제출해
AI: 지원 완료했습니다.                            ← computer(left_click) 결과
```

- 모든 행동이 채팅의 일부. 별도 로그 창이 아니라 대화의 흐름.
- 모든 행동이 commit. Graph에 남음. 나중에 되돌아보기 가능.
- Browser 탭을 안 보고 있어도 채팅에서 AI가 뭘 하는지 알 수 있음.
- 사용자 메시지와 AI 행동 보고가 자연스럽게 섞임.
- **Claude in Chrome과의 차이:** 채팅이 사라지지 않는다. 사이드 패널이 아니라 Bucklebury의 영구 대화에 기록.

### Graph에서의 표현 — 연속 보고를 하나의 commit으로 묶기

채팅에서는 AI가 한 줄씩 실시간 보고. 하지만 Graph에서는 사용자의 다음 입력이 올 때까지를 하나의 response로 묶어서 기록. 기존 commit 구조(prompt + response 쌍)를 유지.

```
채팅 (실시간):                    Graph:

사용자: "Indeed에서 지원해줘"      ○ Indeed에서 지원해줘
AI: [계획 제시]                   ● 계획: 접속 → 검색 → 폼 작성 → 업로드
                                  │
사용자: "실행해"                  ○ 실행해
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
- Bucklebury의 commit = prompt + response 쌍. Neptune도 이 원칙을 지킴.

### Human-in-the-Loop

- AI가 막히면 사용자에게 물어봄: "CAPTCHA가 있습니다. Browser 탭에서 해결해주세요."
- 사용자가 채팅으로 추가 지시 가능: "이메일은 다른 걸로 써줘"
- 실행 전 계획 승인 단계 — Claude in Chrome의 "Ask before acting" 패턴
- **완전 자동이 아니라 협업.** 이게 차별화.

---

## 아키텍처

### 설계 원칙

- **실행 엔진은 빌린다.** Claude in Chrome MCP가 브라우저를 제어. 우리가 직접 Playwright를 돌리지 않는다.
- **오케스트레이션은 직접 만든다.** MCP 도구 호출 → 결과 수신 → 채팅 기록 → Graph commit.
- **원클릭 설치 유지.** Bucklebury의 핵심 원칙 위반 없음. 단, Claude in Chrome 확장 프로그램이 사전 설치되어 있어야 함.
- **BYOK + Claude 구독.** Claude in Chrome 사용을 위해 Claude 유료 플랜 필요. BYOK는 일반 대화에서 계속 활용.

### 이전 아키텍처 vs 새 아키텍처

**이전 (직접 구현):**
```
Bucklebury (Electron) → Playwright (Node.js) → 브라우저
  - Playwright 설치 필요
  - CDP screencast 직접 구현
  - Accessibility tree 분석 직접 구현
  - LLM ↔ 브라우저 루프 직접 구현
```

**새 아키텍처 (Claude in Chrome 활용):**
```
Bucklebury (Electron) → Claude in Chrome MCP → 사용자의 Chrome 브라우저
  - Playwright 불필요
  - 화면 표시: screenshot 폴링 (computer tool의 screenshot action)
  - 웹 분석: read_page, find (Claude in Chrome이 처리)
  - 실행: navigate, computer, form_input (Claude in Chrome이 처리)
  - Neptune 역할: 오케스트레이션 + 기록 + UI
```

### 기술 스택

```
┌───────────────────────────────────────────────────┐
│ Bucklebury (Electron)                             │
│                                                   │
│  ┌──────────────┐  ┌──────────────────────────┐  │
│  │ Chat + Graph │  │ Neptune Orchestrator      │  │
│  │ (React)      │  │                          │  │
│  │              │  │  계획 생성 (LLM)         │  │
│  │              │  │  MCP 도구 호출           │  │
│  │              │  │  실행 기록 → commit      │  │
│  │              │  │  화면 스트리밍 (폴링)     │  │
│  └──────────────┘  └──────────┬───────────────┘  │
│                               │ MCP Protocol     │
└───────────────────────────────┼───────────────────┘
                                │
                    ┌───────────▼───────────┐
                    │ Claude in Chrome      │
                    │ (Chrome Extension)    │
                    │                       │
                    │  19 MCP Tools:        │
                    │  navigate, computer,  │
                    │  read_page, find,     │
                    │  form_input, ...      │
                    └───────────┬───────────┘
                                │
                    ┌───────────▼───────────┐
                    │ Chrome Browser        │
                    │ (사용자의 실제 브라우저)│
                    └───────────────────────┘
```

### Claude in Chrome MCP 도구 — Neptune에서의 역할

**브라우저 제어 (8개) — 실행 엔진 핵심:**

| MCP 도구 | Neptune에서의 역할 | 기록 방식 |
|---|---|---|
| navigate | URL 이동 | "Indeed.com에 접속했습니다" |
| computer | 클릭, 타이핑, 스크롤, 스크린샷 | "검색 버튼을 클릭했습니다" |
| form_input | 폼 필드 값 설정 | "이름 필드에 '홍길동' 입력" |
| find | 자연어로 요소 검색 | (내부용, 사용자에게 직접 보고 안 함) |
| read_page | 접근성 트리로 페이지 분석 | (내부용, LLM 추론에 사용) |
| get_page_text | 페이지 텍스트 추출 | (내부용, 컨텍스트 수집) |
| javascript_tool | JS 실행 | "페이지에서 데이터를 추출했습니다" |
| file_upload | 파일 업로드 | "이력서.pdf를 업로드했습니다" |

**탭 관리 (4개) — 세션 관리:**

| MCP 도구 | Neptune에서의 역할 |
|---|---|
| tabs_context_mcp | 현재 탭 그룹 확인. 실행 시작 시 호출 |
| tabs_create_mcp | 새 탭 생성. Ferry별 세션 분리 가능 |
| tabs_close_mcp | 완료된 탭 정리 |
| switch_browser | 다른 Chrome 브라우저로 전환 |

**디버깅 (3개) — 고급 사용:**

| MCP 도구 | Neptune에서의 역할 |
|---|---|
| read_console_messages | 개발자 모드: 콘솔 에러 확인 |
| read_network_requests | 개발자 모드: API 호출 모니터링 |
| resize_window | 반응형 테스트 |

**워크플로우 자동화 (4개) — 반복 작업:**

| MCP 도구 | Neptune에서의 역할 |
|---|---|
| shortcuts_list | 저장된 워크플로우 목록 조회 |
| shortcuts_execute | 워크플로우 실행 |
| gif_creator | 실행 과정을 GIF로 녹화 → Graph에 첨부 가능 |
| upload_image | 스크린샷/이미지를 웹사이트에 업로드 |

### Neptune이 직접 구현하는 것 (3가지)

**1. 오케스트레이션 레이어**

```
사용자 명령
  → LLM API 호출 (BYOK) → 실행 계획 생성
  → 사용자 승인 (approve)
  → MCP 도구 순차 호출:
      tabs_context_mcp → navigate → read_page → find → computer/form_input → ...
  → 각 단계 결과를 채팅에 실시간 보고
  → 사용자의 다음 입력이 올 때까지를 하나의 commit으로 묶어 Graph에 저장
```

핵심 루프:
```
while (작업 진행 중) {
  1. read_page 또는 computer(screenshot)로 현재 상태 파악
  2. LLM에게 상태 + 목표 전달 → 다음 행동 결정
  3. 해당 MCP 도구 호출 (navigate, computer, form_input 등)
  4. 결과를 채팅에 한 줄 보고
  5. 막히면 → 사용자에게 질문 (human-in-the-loop)
  6. 완료 또는 사용자 개입 시 → commit으로 묶기
}
```

**2. 브라우저 화면 표시 (Browser 탭)**

```
Browser 탭 활성화 시:
  → computer(screenshot) 주기적 호출 (폴링, ~1-2초 간격)
  → 반환된 이미지를 오른쪽 패널의 <img>에 표시
  → 사용자가 이미지 위 클릭 → 좌표 계산 → computer(left_click, coordinate) 호출

Browser 탭 비활성화 시:
  → 폴링 중단 (리소스 절약)
  → 채팅의 텍스트 보고로만 진행 상황 확인
```

이전 스펙의 CDP screencast 대비 장단점:
- **장점:** Playwright 설치 불필요, CDP 직접 다루지 않아도 됨, 구현 단순
- **단점:** 폴링 기반이라 진짜 실시간은 아님 (~1-2초 지연), 스크린샷 전송 비용
- **허용 가능한 트레이드오프.** Neptune의 핵심 가치는 실시간성이 아니라 기록과 구조화.

**3. 실행 기록의 구조화**

```
MCP 도구 호출 결과를 가로채서:
  → 채팅 메시지로 변환 (사용자가 읽을 수 있는 자연어)
  → Graph commit으로 저장 (기존 commit 구조: prompt + response 쌍)
  → .md 파일에 기록 (Bucklebury 저장 포맷 유지)
```

이것이 Claude in Chrome에 없는, Neptune의 핵심 차별화:
- **실행 기록이 영구적** — .md 파일로 로컬 저장
- **실행 기록이 구조화** — Graph의 commit으로 시각화
- **실행 기록이 탐색 가능** — branch, merge, emerge 전부 적용
- **실행 기록이 재현 가능** — 나중에 Graph에서 되돌아보기

### 동작 흐름 (기술적)

```
1. 사용자: "Indeed.com에서 지원해줘"

2. Neptune Orchestrator → LLM API 호출 (BYOK)
   - 현재 대화 context + 명령 전달
   - LLM이 실행 계획 반환
   - 채팅에 계획 표시, 사용자 승인 대기

3. 사용자: "실행해" (approve)

4. Neptune → Claude in Chrome MCP 순차 호출:
   a. tabs_context_mcp() → 탭 그룹 확인
   b. tabs_create_mcp() → 새 탭 생성
   c. navigate(url: "indeed.com") → 접속
      → 채팅: "Indeed.com에 접속했습니다"
   d. read_page(filter: "interactive") → 페이지 분석
   e. find(query: "search bar") → 검색창 찾기
   f. form_input(ref: "ref_3", value: "Software Engineer") → 검색어 입력
      → 채팅: "'Software Engineer' 검색 입력"
   g. computer(action: "left_click", ref: "ref_5") → 검색 버튼 클릭
      → 채팅: "검색 실행. 15개 결과 표시"
   h. ... (반복)

5. 각 MCP 호출 사이:
   - computer(action: "screenshot") → Browser 패널 갱신
   - LLM에게 현재 상태 전달 → 다음 행동 결정

6. 막히면 → 채팅에서 사용자에게 질문:
   - "CAPTCHA가 감지되었습니다. Browser 탭에서 직접 해결해주세요."
   - 사용자가 Browser 탭에서 클릭 → computer(left_click) 전달
   - 해결 후 AI가 이어서 진행

7. 완료 시 → 전체 실행 기록을 commit으로 Graph에 저장
```

### 파일 처리

- 채팅에 파일 드래그 앤 드롭 (이력서 등)
- Electron이 로컬 임시 폴더에 저장
- file_upload MCP 도구로 해당 파일을 웹사이트에 자동 업로드

### 보안

- 사용자의 실제 Chrome 세션 사용 — 이전 스펙의 격리된 Browser Context와 다름
- Claude in Chrome은 사용자의 로그인 상태를 그대로 활용 (장점이자 주의점)
- AI가 접근하는 사이트/행동은 채팅에 투명하게 기록
- 민감한 정보 입력 시 사용자 확인 요청
- 실행 전 계획 승인 단계가 기본 (approve 패턴)
- Claude in Chrome의 권한 관리 시스템 활용 (사이트별 허용/차단)

---

## 전제 조건

Neptune을 사용하려면:

1. **Claude 유료 플랜** (Pro, Max, Team, Enterprise) — Claude in Chrome 사용 조건
2. **Claude in Chrome 확장 프로그램 설치** — Chrome Web Store에서
3. **Chrome 브라우저** — 다른 브라우저 미지원
4. **Bucklebury 앱 설치**

---

## Bucklebury 기존 기능과의 통합

| 기존 기능 | Neptune에서의 역할 |
|---|---|
| Ferry | 프로젝트별 탭 그룹 분리 (tabs_create_mcp) |
| BYOK | 계획 생성 시 LLM 호출. 실행은 Claude in Chrome |
| Electron | 오케스트레이션 + Browser 패널 UI |
| .md 저장 | 브라우저 작업 로그도 대화에 기록, .md에 저장 |
| Graph | 브라우저 실행 기록이 commit으로 graph에 남음 |
| Emerge | 실행 기록 포함 전체 대화를 emerge 가능 |

### BYOK와 Claude 구독의 이중 구조

- **일반 대화** (Graph, branch, merge): BYOK API 키 사용 (기존과 동일, 어떤 provider든 가능)
- **브라우저 실행** (Neptune): Claude in Chrome 사용 (Claude 유료 구독 필요)
- 사용자가 Neptune 없이 Graph만 쓸 수도 있음. Neptune은 선택적 확장.

---

## 다른 도구와의 차별화

| 도구 | 방식 | Bucklebury + Neptune |
|---|---|---|
| Claude in Chrome (단독) | 사이드 패널에서 실행. 기록이 세션에만 남음. | 실행을 Graph에 영구 기록. branch/merge/emerge 가능. |
| OpenClaw | 채팅으로만 결과 수신. 뭘 했는지 안 보임. | 실시간으로 보여줌. 개입 가능. 기록 남음. |
| Manus | 클라우드 VM에서 실행. GPU 비용. | 로컬 Chrome 사용. 별도 인프라 불필요. |
| 일반 RPA | 스크립트 기반. 유연하지 않음. | LLM 기반. 자연어 명령. 실행 기록이 구조화됨. |

### Claude in Chrome과의 관계 — 경쟁이 아닌 확장

Neptune은 Claude in Chrome을 대체하는 것이 아니라 그 위에 구축하는 것.

- **Claude in Chrome** = 실행 엔진 (잘 작동함)
- **Neptune** = 실행의 기록 + 구조화 + 탐색 (Claude in Chrome에 없는 것)
- **비유:** Claude in Chrome이 자동차 엔진이라면, Neptune은 블랙박스 + 내비게이션 + 운행 일지

---

## 구현 우선순위

이건 v0.1이 아님. Bucklebury v0.1(thought graph)이 사용자 검증을 받은 후에 진행.

1. **MCP 연결 프로토타입** — Electron에서 Claude in Chrome MCP 도구 호출이 되는지 검증
2. **오케스트레이션 루프** — LLM 계획 → 승인 → MCP 순차 호출 → 결과 보고
3. **Browser 패널** — screenshot 폴링으로 오른쪽 패널에 화면 표시
4. **실행 기록 commit** — MCP 결과를 Graph commit으로 저장
5. **Human-in-the-loop** — Browser 패널 클릭 → computer(left_click) 전달, 사용자 개입 처리

### 기술적 리스크

- Electron에서 Claude in Chrome MCP를 어떻게 연결하는가? (Chrome Extension ↔ Electron 통신)
- 가능한 접근: Native Messaging, WebSocket, 또는 Claude Desktop의 Connector 패턴 참고
- **이 연결 방식이 가장 먼저 검증해야 할 핵심 리스크**

---

## 기대 효과

- **Seamless 경험:** 하나의 앱에서 생각 → 구조화 → 실행 → 기록
- **검증된 엔진:** Claude in Chrome의 브라우저 자동화를 그대로 활용. 직접 만들 필요 없음.
- **영구 기록:** 실행의 모든 것이 Graph에 남음. 나중에 되돌아보고, branch하고, emerge 가능.
- **투명성:** AI가 뭘 하는지 실시간으로 보이고, graph에 기록됨
- **선택적:** Neptune 없이 Graph만 쓸 수도 있음. Claude 구독이 없어도 Bucklebury의 핵심 기능은 BYOK로 동작.

---

## 아키텍처 변경 이력

### v1 (초기 설계)

```
Electron → WebSocket → FastAPI (Python) → browser-use → Playwright (Python)
```

문제: 런타임 2개, 서버 2개, 설치 복잡

### v2 (Node.js 통합)

```
Electron → Playwright (Node.js) → 브라우저
```

개선: 런타임 1개. 하지만 Playwright 설치 필요, CDP 직접 구현 필요, LLM↔브라우저 루프 직접 구현 필요.

### v3 (현재 — Claude in Chrome MCP 활용)

```
Bucklebury (Electron) → Claude in Chrome MCP → Chrome 브라우저
```

핵심 전환: 실행 엔진을 직접 만들지 않는다. 검증된 엔진(Claude in Chrome)을 활용하고, Neptune은 기록과 구조화에 집중한다.

**장점:**
- Playwright 설치 불필요
- 브라우저 제어 코드 작성 불필요
- Accessibility tree 분석 불필요 (Claude in Chrome이 함)
- 사용자의 실제 로그인 세션 활용 가능

**단점:**
- Claude 유료 구독 필요 (BYOK만으로는 Neptune 불가)
- Chrome 브라우저 종속
- Electron ↔ Chrome Extension 통신 방식 검증 필요

---

*Neptune은 Bucklebury의 생각의 구조화 위에, 생각의 실행을 얹는 것. 엔진은 빌리고, 기록은 직접 만든다. 열린 시스템에서 에너지가 흐르면 구조가 생기듯, 대화에서 행동이 흐르면 결과가 생긴다.*
