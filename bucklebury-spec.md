# Bucklebury — Product Spec & Roadmap

*Named after Bucklebury Ferry from The Lord of the Rings. When thoughts get tangled and the Nazgûl of complexity is chasing you — branch, don't go the long way around.*

## What it is
A thinking tool that manages LLM conversations with Git. Every exchange is a commit. Branch to explore different directions. Merge to combine insights. See the shape of your reasoning as a graph.

## Core features (v0.1)

### Conversation as Git
- **Commit** = user prompt + AI response pair
- **Graph** shows two visual nodes per commit (prompt = white circle, response = filled circle)
- Every conversation = a Git-like DAG

### Edit (branching)
- User prompt 아래에 "edit" 버튼 (채팅 view)
- 그래프에서 우클릭 → "edit" (graph view)
- 클릭하면 기존 질문이 입력창에 채워지고, 수정해서 보내면 같은 부모에서 새 branch
- AI response 아래에는 아무 버튼도 없음 (깔끔)

### Merge
- 그래프 상단 "Merge" 버튼 → commit 선택 모드
- 아무 노드나 클릭해서 선택/해제
- 입력창에 merge instruction 입력 → active branch에 merge commit
- LLM이 현재 thread + 선택된 commit들의 thread를 context로 받아서 통합 응답

### New (fork to new conversation)
- 우클릭 → "new" → 해당 commit의 thread를 context로 들고 새 conversation 생성
- Parent chat의 graph에 child 유령 노드 (회색 점선, "↘ [child title]")
- Child chat의 graph에 parent 유령 노드 (회색 점선, "↗ go to parent chat")
- 클릭으로 양방향 이동 — 대화 간 하이퍼링크
- LLM context에 parent thread 포함 — LLM이 알아서 참조 여부 판단

### New — 범위 선택 추출 (개선)
기본 동작은 위와 동일. 추가로 범위를 좁힐 수 있음:
- 우클릭 → new 클릭 → 해당 commit까지의 전체 thread가 **default 선택** (모든 노드 활성화)
- 여기서 바로 Send하면 기존과 동일 — 전체 thread로 fork
- 이 상태에서 **다른 노드를 클릭하면 범위가 좁혀짐:**
  - 우클릭한 노드 = **시작점 (anchor)**
  - 추가 클릭한 노드 = **끝점 (endpoint)**
  - 두 노드 사이의 모든 commit = **자동 포함 (연속 범위)**

**왜 연속 범위인가:** Git의 `git log start..end`와 같은 원리. 대화는 코드의 cherry-pick과 다르게 앞뒤 문맥의 연속성이 있음. 중간 commit을 빼면 LLM이 맥락을 이해할 수 없음.

**UX 흐름 예시:**

Graph 상태:
```
○ commit 1: Claude in Chrome 설치 방법
● commit 2: 설치 가이드 답변
○ commit 3: MCP 도구 뭐 있어?
● commit 4: 19개 도구 분석
○ commit 5: Neptune 스펙 수정해줘
● commit 6: 스펙 수정 완료
○ commit 7: Connector 설명해줘
● commit 8: Connector 설명
```

Case A — 전체 fork (기존과 동일):
```
commit 8 우클릭 → new → 전부 선택된 상태 → 바로 Send
→ commit 1~8 전체가 context로 새 conversation 생성
```

Case B — 범위 추출 (새 기능):
```
commit 8 우클릭 → new → 전부 선택된 상태
→ commit 3 클릭 → commit 3~8만 활성화, 1~2 비활성화
→ Send
→ commit 3~8 (MCP 분석 ~ Connector)만 context로 새 conversation 생성
```

**설계 원칙:**
- 기본값은 전체 선택 (안전하고 빠름)
- 추가 클릭 한 번으로 범위 축소 (필요할 때만)
- 추가 모드나 버튼 없음 — 같은 흐름 안에서 자연스럽게 분기
- merge의 선택 UI와 시각적 일관성 유지 (활성/비활성 노드 구분)

### Delete
- 우클릭 → "delete" → 확인 popup → commit + 모든 자식 삭제
- 삭제 후 head는 부모로 이동, 부모 없으면 남은 commit 중 최근 것

### Graph ↔ Chat 양방향 연결
- 그래프 노드 클릭 → 채팅에서 해당 commit으로 스크롤 (prompt가 화면 맨 위)
- 채팅 메시지 hover → 그래프에서 해당 노드 자동 highlight (glow + bold)

### UI Layout — 두 화면 구조

**홈 화면 (앱의 첫 화면):**
```
┌─────────────────────────────────────┐
│            🚢 Bucklebury            │
│                                     │
│  [+ Create a ferry]                 │
│                                     │
│  🚢 Research    🚢 Work    🚢 Personal │
│                                     │
│  RECENT                             │
│  💬 사과 연구          Research     │
│  💬 전략 분석          Work         │
│  💬 코딩 질문          Research     │
└─────────────────────────────────────┘
```
- **홈 화면은 앱을 열면 가장 먼저 보이는 화면.** API 키 입력이 아님.
- Ferry = Project. 하나의 ferry 안에 여러 chat.
- "Create a ferry" — Bucklebury만의 언어.
- Ferry 이름은 사용자가 자유롭게 설정.
- **Ferry 아이콘:** 생성 시 이모지 풀에서 랜덤 배정, ferry 데이터에 저장. 한 번 정해지면 안 바뀜.
  - 풀: 🚢 ⛵ 🛶 🚀 🌊 🏔️ 🌲 🔭 💡 📚 🎯 🧭 ⚡ 🔬 🎨
  - 홈 화면 카드, 사이드바 헤더, recent chats에서 ferry 구분용으로 표시.
- Recent chats에서는 삭제 불가 (보존이 기본, 삭제가 선택).
- Recent chat 클릭 → 해당 ferry로 자동 진입 + chat 열림 (바로가기).
- **Recent chat 카드 텍스트:** 한 줄을 카드 너비만큼 꽉 채움. 두 줄로 넘어가지 않음. 넘치면 `...`으로 말줄임 (`text-overflow: ellipsis`). 업계 표준 패턴.

**Ferry 생성 흐름:**
```
[+ Create a ferry] 클릭
  → ferry 이름 입력 + API 키 입력 + 저장 경로 (기본값 자동 채움)
  → ferry 생성
  → ferry 안으로 진입
  → 대화 시작
```
- API 키는 ferry를 만들 때 입력. 앱 진입 시점이 아님.
- 사용자가 "이런 앱이구나"를 먼저 이해한 후에 키를 요구. 동기 부여 후 요구.
- ferry마다 다른 API 키 가능 (Research는 Claude, Work는 GPT 등 확장 가능).
- 기존 ferry 클릭 시 키 이미 저장되어 있으므로 바로 진입.

### 저장 경로

**설치 시:**
- 기본 저장 경로 `~/Documents/Bucklebury/` 보여주고, 바꾸고 싶으면 변경 가능.
- 대부분의 installer가 하는 표준 패턴.

**Ferry별 저장 경로:**
- ferry 생성 시 기본값: `[설치경로]/[ferry이름]/` 자동 채움.
- 바꾸고 싶으면 폴더 선택 가능.
- Settings에서 나중에 변경 가능.
- 예시:
  - Research ferry → `~/Documents/Bucklebury/Research/` (기본)
  - Work ferry → `~/Obsidian-Vault/Work/` (Obsidian 연동)
  - Open Source ferry → `~/github/my-thoughts/` (GitHub 연동)
- **lock-in의 정반대.** 사용자가 자기 워크플로우에 맞게 각 ferry를 다른 도구와 연결.

**Ferry 안 (기존 프로토타입 레이아웃):**
```
┌────────────┬──────────────────┬─────────┐
│ 🚢Research │                  │ Graph   │
│            │                  │         │
│ [+ New][🔍]│    채팅 영역     │  ○──○   │
│ PINNED     │                  │  │      │
│ RECENT     │                  │  ○──○   │
│ TAGS       │                  │         │
│            │                  │         │
│            │                  │         │
├────────────┤                  │         │
│ 👤 Profile │                  │         │
└────────────┴──────────────────┴─────────┘
```
- 왼쪽: 사이드바 (chat 목록 + tags + 검색)
- 가운데: 채팅 (일반 LLM 채팅과 동일)
- 오른쪽: Graph (토글, 드래그 리사이즈 200~600px)
- Graph 노드 텍스트는 패널 너비에 따라 동적 조절

**👤 Profile 메뉴 (왼쪽 하단 클릭 시):**
```
┌────────────┐
│ ← Home     │
│ ⚙ Settings │
├────────────┤
│ 👤 Profile │
└────────────┘
```
- ← Home: ferry 선택 화면으로 돌아감
- ⚙ Settings: 현재 ferry 설정 편집

### ⚙ Settings 화면
- Create ferry와 같은 형태. 현재 ferry 이름 + API 키가 이미 채워져 있음.
- "Create" 대신 "Save" 버튼.
- 나중에 Emerge default template 편집도 여기에 추가.

### Multi-Provider 지원 (API 키 자동 감지)
사용자가 API 키만 붙여넣으면 Bucklebury가 provider를 자동 감지:
```
sk-ant-xxxxx   → Anthropic → api.anthropic.com
sk-xxxxx       → OpenAI    → api.openai.com
AIzaxxxxx      → Gemini    → generativelanguage.googleapis.com
```
- 사용자가 "이건 Anthropic 키야"라고 선택할 필요 없음.
- Ferry마다 다른 provider 사용 가능 (Research = Claude, Work = GPT).
- 각 provider의 API 형식 차이는 내부 어댑터가 처리. 앱 나머지 코드는 provider를 몰라도 됨.
- 감지 실패 시 사용자에게 provider 선택 요청.

### API 키 검증 흐름
```
사용자가 API 키 입력
  → 1. 형식 검사 (실시간, 입력 즉시)
  →    성공: "✓ Anthropic" 초록색 표시
  →    실패: "✗ 알 수 없는 키 형식" 빨간색. Create 버튼 비활성화.

  → 2. 실제 API 호출 검증 (Create 클릭 시)
  →    가벼운 테스트 요청 전송 ("hello")
  →    성공: ferry 생성 + 진입
  →    실패 (401): "API 키가 유효하지 않습니다" 에러. ferry 생성 안 됨.
  →    실패 (네트워크): "네트워크 연결을 확인해주세요" 에러.
```
- 엉뚱한 키로 ferry가 만들어지는 일이 없도록 2단계 검증.
- 형식 검사는 즉시 피드백 (UX), 실제 검증은 Create 시 (확실한 검증).

### Chat 관련
- Chat 제목 = 첫 번째 prompt 기준, rename으로 변경 가능
- 사이드바에서 chat hover → `···` 메뉴 (rename, delete)

### Context menu (우클릭)
```
edit
new
────
delete
```

### Other
- Undo 제거 (delete로 충분)
- AI response 아래 별도 버튼 없음 (edit으로 통일)
- User prompt 보내면 AI 응답 전에 즉시 표시
- 새 conversation은 prompt 보내는 즉시 왼쪽 목록에 등장

---

## Search, Tags & History (미구현)

### 사이드바 구조
```
[+ New] [🔍]
PINNED
  📌 대화 1
  📌 대화 2
RECENT
  대화 A
  대화 B
  대화 C
TAGS
  #work (3)
  #research (5)
  #hobby (2)
```
- 3개 섹션 + 버튼 2개. 깔끔하게 유지.
- Pinned: 사용자가 중요한 대화를 고정
- Recent: 최근 대화 목록
- Tags: 사용자가 conversation에 수동으로 태그 부여

### 🔍 검색 모드
돋보기 클릭하면 가운데 채팅 영역이 검색/관리 모드로 전환:
```
┌─────────────────────────────────────┐
│ 🔍 [Search conversations...      ] │
│                                     │
│ #work  #research  #hobby  +3 more   │  ← 태그 전부 표시, 클릭으로 토글
│  ✓                  ✓               │  ← 활성=색상, 비활성=회색
│                                     │
│ [List ▾]                            │  ← List / Calendar 뷰 토글
│                                     │
│ TODAY                               │
│   💬 전략 분석             #work    │
│   💬 논문 정리             #research│
│                                     │
│ THIS WEEK                           │
│   💬 코딩 질문             #work    │
│                                     │
│ OLDER                               │
│   💬 독서 노트             #hobby   │
│                                     │
│ ☐ Select all  |  🗑 Delete selected │
└─────────────────────────────────────┘
```

### 태그 overflow 처리 (Wrap + Show more)
- 태그 6개 이하: 전부 보임, 한 줄에 나열
- 태그 6개 초과: 2줄까지 보이고 "+N more" 버튼
- "+N more" 클릭하면 전체 펼침 + "Show less"
- 활성화된 태그는 색상으로 즉시 구분
- 업계 표준: Todoist/Notion 패턴

### Calendar 뷰
- [List ▾] 드롭다운에서 Calendar 선택
- 월간 달력에 각 날짜별 대화 개수 dot 표시
- 날짜 클릭하면 그 날의 대화 리스트

### 대량 삭제
- 날짜 그룹 헤더에 "Select all" 체크박스
- 선택 후 하단 Delete selected 버튼
- 확인 popup 후 삭제

### 설계 원칙
- 🔍 하나의 버튼에 "찾기 + 정리 + 삭제" 전부
- "대화 관리하고 싶으면 돋보기" — 배울 게 하나
- 태그는 수동 (사용자가 의미 부여), 날짜 그룹핑은 자동
- Linear + Todoist 하이브리드 패턴

---

## Emerge (창발) — killer feature, 미구현

### 개념
사용자의 복잡한 thought graph (예: 5 branches, 90 commits)를 LLM이 분석해서, 사용자의 intent를 벗어나지 않는 선에서 새로운 thought graph + chat 내역을 자동 생성.

**스파게티 생각 → 정리된 구조.** 코드 리팩토링처럼, 생각 리팩토링.

### 설계 철학: 산일 구조 (Dissipative Structure)
일리야 프리고진의 산일 구조 이론에 기반. 사용자의 원본 대화는 높은 엔트로피 상태 — 탐색, 모순, 중복, 막다른 길이 섞여있음. Emerge는 이 비평형 상태에서 **자발적 질서를 발견**하는 것.

- **낮은 엔트로피:** 최소한의 prompt로 핵심 정보를 전달
- **동적 비평형:** 정적 문서(평형)가 아니라, 계속 탐색 가능한 살아있는 graph(비평형)
- 불필요한 에너지 소모(중복, 막다른 branch)를 제거하되, 탐색 가능성은 보존

프리고진 이론은 설계 철학으로, 실제 LLM prompt는 구체적 조작으로 분해:
- 중복 질문 제거
- 핵심 질문 분리
- 논리적 의존성에 따라 branch 구성
- 모순은 대비 branch로 보존
- 막다른 길은 제거

### 핵심 원리 — "LLM에게 chat 구조를 만들게 한다"

LLM에게 "static website 만들어줘"라고 하면 HTML/CSS/JS를 한 번에 출력한다. Emerge도 동일하다. "이 대화를 구조화된 chat으로 만들어줘"라고 하면 **chat 구조 JSON을 한 번에 출력**한다.

이게 작동하는 이유: Emerge는 본질적으로 "긴 텍스트를 읽고 주제별로 구조화해서 정리해줘"인데, 이건 LLM이 가장 잘하는 일 중 하나. 사람들이 이미 매일 하는 요청 — "이 문서 요약해줘", "이 회의록에서 주제별로 정리해줘" — 과 같은 능력을 Bucklebury의 데이터 구조에 연결하는 것뿐. LLM한테 새로운 능력을 요구하는 게 아니다.

**Emerge = LLM이 잘하는 것 (분석, 요약, 구조화) + Bucklebury만 할 수 있는 것 (graph로 표현)**

구현의 핵심 난이도는 LLM이 잘 분석하게 만드는 게 아니라, LLM의 출력을 Bucklebury의 commit/branch/merge 구조로 변환하는 파이프라인.

### 구현 모델 — 5 Phase

**비유: 편집자와 시공자.** LLM은 편집자 — 작가의 초고(원본 대화)를 읽고 최종본(구조화된 chat)의 설계도를 만든다. Bucklebury는 시공자 — 설계도(JSON)를 받아서 기계적으로 건물(conversation)을 짓는다.

**Phase 1 — 전체 읽기 + 주제 발견**
LLM이 전체 대화를 처음부터 끝까지 읽고, 주제를 분류.

예시 (실제 대화 기반):
```
"이 대화에는 크게 5개 주제가 있구나"
  - Claude in Chrome 설치/사용법 (commit 1~2)
  - MCP 도구 분석 (commit 3~5)
  - Neptune 아키텍처 재설계 (commit 6~8)
  - Connector 이해 (commit 9~11)
  - Bucklebury 기능 설계 — new, emerge (commit 12~20)
```

**Phase 2 — 구조 설계**
주제를 Bucklebury의 기능(branch, merge, commit)으로 표현할 구조를 결정.
```
"5개 주제니까 main + 4개 branch로 구성하자"
"설치/사용법은 기본이니까 main에"
"MCP 분석과 아키텍처는 연속적이니까 branch에서 이어지게"
"Connector는 독립 주제니까 별도 branch"
"마지막에 merge로 전체 결론"
```

**Phase 3 — commit 내용 작성**
각 commit의 user_prompt와 ai_response를 LLM이 직접 작성. 새 API 호출 없이 텍스트를 직접 써넣는다.

원본의 intent를 보존하되, 더 compact하게 다듬는다:
```
원본: "하나 인상적이였던 부분은 계획을 제안해면 내가 approve하면
      실행을 마우스를 움직이지도 않고 했다는 것이야..."
→
다듬은 결과: "Claude in Chrome의 계획→승인→실행 패턴을 Neptune에서 어떻게 구현하나?"
```

commit의 두 가지 유형:
- **재배치:** 원본 prompt + response를 다듬어서 직접 써넣음
- **합성:** 여러 commit의 내용을 합쳐서 새 prompt + response를 직접 써넣음
- 두 유형 모두 추가 API 호출 없음. LLM이 한 번의 응답 안에서 전부 작성.

**Phase 4 — JSON으로 출력**
Phase 1~3의 결과를 chat 구조 JSON으로 한 번에 출력:

```json
{
  "title": "Chrome에서 Claude 사용하기 — 정리본",
  "branches": [
    {
      "name": "main",
      "commits": [
        { "user_prompt": "...", "ai_response": "..." }
      ]
    },
    {
      "name": "branch-mcp",
      "from": "main:1",
      "commits": [
        { "user_prompt": "...", "ai_response": "..." }
      ]
    }
  ],
  "merge": {
    "sources": ["branch-mcp", "branch-arch"],
    "user_prompt": "전체 핵심 결론",
    "ai_response": "..."
  }
}
```

**Phase 5 — Bucklebury가 기계적으로 실행**
JSON을 파싱해서 기존 Bucklebury 기능을 호출:
- JSON.parse(llmOutput) → JavaScript 객체
- branches 순회 → createBranch()
- commits 순회 → createCommit(prompt, response)
- merge → merge()
- 새 conversation 생성, parent↔child 링크 연결

**정리:**
- LLM이 하는 일: Phase 1~4 (한 번의 API 호출)
- Bucklebury가 하는 일: Phase 5 (JSON 파싱 → 기존 기능 호출)
- 전체 API 호출 횟수: **1회.** 모든 commit에 대해 개별 호출하지 않음.

### 안전장치
- JSON 스키마를 prompt에 명확히 정의 (branch 이름, commit 구조, merge 형식)
- 파싱 실패 시 재시도 또는 에러 표시
- 원본 graph는 항상 보존. Emerge 결과는 별도 conversation으로 생성.
- LLM이 충분히 강력해야 의미 있는 결과. 약한 모델이면 결과가 아쉬울 수 있음 — 사용자가 스스로 판단.

### Emerge Template (CLAUDE.md 패턴)
Emerge의 동작을 정의하는 template. Settings에서 편집 가능.

**Default template** (우리가 설계):
```
처음부터 끝까지 모든 대화를 읽는다 (user prompt + AI response).
최소한의 prompt로 최대한의 exploration을 달성하는 
branch, merge, new/delete 전략을 설계한다.

원칙:
- 중복 질문은 하나로 합친다
- 핵심 질문은 독립 branch로 분리한다
- 논리적으로 의존하는 질문은 같은 thread에 둔다
- 모순되는 결론은 대비 branch로 보존한다
- 막다른 길은 제거한다
- 각 prompt는 사용자의 원래 intent를 보존하되 compact하게 다듬는다
```

**사용자 커스텀 예시:**
- 연구자: "모순은 버리지 말고 대비시켜라. 반증 가능성을 보존해라."
- 의사결정자: "최종 결론에 도달하는 경로만 남겨라. 나머지는 제거."
- 작가: "서사적 흐름으로 재구성해라. 시간순으로."

같은 대화 데이터 + 다른 template = 완전히 다른 emerge 결과.

### 예시
원본: "사과는 맛있는가?" → 여러 branch로 탐색 → 90 commits
Emerge 후: "북아메리카 사람들은 어떤 사과를 맛있게 느끼는가?" — 사용자의 모든 대화를 분석해서 만든 compact prompt + 깔끔한 graph 구조

### UI
- Emerge 버튼은 채팅 헤더에 항상 보임 (모델 판단 안 함, 그냥 열어둠)
- 결과는 새 conversation으로 생성 (parent↔child 링크)

### UI 흐름
```
[Emerge 클릭]
  → 입력창에 default emerge prompt가 미리 채워짐
  → 상단에 "Emerge: 전체 대화" 표시
  → 사용자가 prompt를 그대로 보내도 되고, 수정해도 됨
  → (선택사항) graph에서 특정 commit 클릭하여 범위 좁힘
  → "Emerge: 3 commits selected" 로 변경
  → Send → LLM이 대화 분석 → 새 conversation 생성
```

- **기본값:** 전체 대화. 버튼 한 번이면 끝.
- **옵션:** merge mode처럼 graph에서 commit/branch 선택. 선택하면 그 부분만 emerge.
- **간단한 케이스는 빠르고, 복잡한 케이스도 가능.**

### Emerge prompt (이메일 서명 패턴)
- Settings에 default prompt 저장
- Emerge 버튼 클릭 시 입력창에 미리 채워짐
- 사용자가 매번 수정 가능 (일회성)
- Settings에서 default 자체를 변경 가능 (영구적)

---

## new와 emerge의 관계

**같은 문제, 다른 해결 방식.** 긴 대화는 여러 주제가 하나의 흐름에 섞인다. 시간이 지나면 "그 내용이 어디 있었지?"를 찾기 어렵다.

| | new | emerge |
|---|---|---|
| 방식 | 수동 | 자동 |
| 사용자 판단 | 범위를 직접 선택 | LLM이 구조를 발견 |
| 결과물 | 원본 commit들의 **복사본** | 원본을 소재로 한 **새 저작물** |
| 비유 | 책에서 페이지를 복사 | 편집자가 초고를 새 목차로 재구성 |
| 적합한 상황 | "MCP 분석 부분만 따로 보관하고 싶다" | "이 스파게티를 어떻게 정리해야 할지 모르겠다" |

**둘 다 필요함 — 상호 보완.** 코드 리팩토링에서 수동 extract function과 IDE의 자동 리팩토링이 공존하는 것과 같은 원리. new로 수동 추출할 수 있고, emerge로 자동 구조화할 수 있다.

---

## Business Model

### Phase 1: $0 (검증 단계)
- BYOK (Bring Your Own Key) only
- 모든 기능 무료 (emerge 포함)
- 사용자가 자기 API 키로 모든 비용 부담
- 우리 인프라 비용: $0 (static site, Vercel free tier)
- 운영 비용: ~$12/year (도메인만)
- 목표: 개발자/파워유저가 제품 가치 검증

### Phase 2: Freemium
- BYOK 모드 유지 (기존 사용자 그대로)
- **우리가 LLM 제공하는 모드 추가**
  - 무료: 기본 대화 (가벼운 모델)
  - Pro 플랜 (월 구독): emerge 가능한 강력한 모델 포함
- API 키 없는 일반 사용자 유입
- Emerge가 Pro의 킬러 feature

### 전환 경로
무료 사용 → graph 복잡해짐 → emerge 시도 → 약한 모델이면 결과 아쉬움 → "Pro에서는 더 강력한 모델로 emerge" → 구독

---

## Form Factor

### Phase 1: Electron Desktop App (핵심)
- Claude Desktop 스타일 layout
- BYOK, 로컬 .md 저장
- 오프라인 사용 가능
- 사용자 경험: 앱 설치 → 저장 폴더 선택 → 대화 시작 → 끝.
- **이것만으로 사용자가 "이건 꼭 써야 해"라고 느끼는 것이 목표.**

### Electron 빌드 계획
**기술 스택:** Vite + React + Electron + electron-builder

**프로젝트 구조:**
```
bucklebury/
├── src/
│   └── App.jsx              ← bucklebury.jsx 이식
├── electron/
│   └── main.js              ← Electron 메인 프로세스
├── package.json
├── vite.config.js
└── dist/                    ← 빌드 결과 (.dmg, .exe)
```

**주요 변경점:**
- `window.storage` → `fs.writeFile` / `fs.readFile` (로컬 .md 파일 저장)
- import 구조 정리 (단일 JSX → 모듈 분리)
- electron/main.js: BrowserWindow 생성, 앱 라이프사이클 관리

**빌드 결과:**
- macOS: `.dmg` installer
- Windows: `.exe` installer
- Linux: `.AppImage`

**완료됨**

### 가능한 확장 (사용자가 요청할 때만)
- **Git 버전 관리:** isomorphic-git으로 자동 commit, 변경 이력, 되돌리기. 사용자가 "이전 버전으로 돌아가고 싶다"고 요청하면.
- **GitHub 연동:** push/pull, 대화 공유, 원격 백업. 사용자가 "다른 기기에서도 보고 싶다"고 요청하면.
- 미리 만들지 않는다. 없는 문제를 만들어서 해결하지 않는다.

### 고려했다가 보류한 것
- VS Code extension — 코드 에디터에서 생각 정리하는 건 맥락이 안 맞음. 독립 앱이 맞음.
- 하나의 대화 = 하나의 Git repo — 대화 100개면 repo 100개. 비현실적.
- orphan branch 방식 — branch가 폭발적으로 많아짐. 비현실적.

---

## 데이터 저장 (대안 C: .md 파일 = 대화의 전부)

### 구조
```
~/Documents/Bucklebury/      ← 사용자가 선택한 저장 폴더
├── chats/
│   ├── 사과-연구.md         ← 하나의 파일 = 하나의 대화 전부
│   ├── 전략-분석.md
│   └── 코딩-질문.md
└── settings.json            ← emerge template, 앱 설정
```

### .md 파일 구조
```markdown
---
id: gft:1710732000000
title: 사과 연구
tags: [research, food]
created: 2026-03-18T10:00:00Z
parent: null
children: [gft:1710732500000]
graph:
  commits: [...]
  branches: [main, branch-1]
  headId: c5_abc
---

## main

**User:** 사과는 맛있는가?

**AI:** 사과의 맛은 품종에 따라...

## branch-1 (from commit c3)

**User:** 아시아에서는 어떤 사과가...

**AI:** 일본의 후지 사과가...
```

### 설계 원칙
- **하나의 파일 = 하나의 대화의 모든 것.** 복사, 이동, 공유할 때 파일 하나만 주면 됨.
- **Obsidian 호환.** frontmatter로 검색/분류 가능. Bucklebury 없이도 내용 확인 가능.
- **대화 간 관계.** frontmatter의 parent/children 필드로 parent↔child 링크.
- **별도 graph.json 불필요.** graph 정보가 frontmatter에 내장.
- **lock-in 없음.** 사용자 데이터가 표준 .md 파일. 언제든 다른 도구로 이동 가능.

### 저장 방식
- `fs.writeFile`로 로컬 .md 저장. 현재 프로토타입의 `window.storage`를 교체.
- Git, GitHub는 사용자가 필요를 느낄 때 추가.

### Git과의 관계 (정리)
- **Git의 철학 (Bucklebury가 구현):** branch, merge, checkout, commit — 사고를 구조화하는 개념. 앱 내부에서 graph.json으로 관리.
- **Git의 실체 (Phase 2에서 활용):** 파일 버전 관리, 변경 이력, 되돌리기. isomorphic-git으로 백그라운드 자동 실행. 사용자는 Git을 몰라도 됨.
- **Bucklebury의 thought branch ≠ Git branch.** 대화 안의 사고 분기는 .md 파일 안의 데이터. Git branch는 repo 전체의 개발 분기. 다른 레벨.

---

## Oracle (원래 아이디어, Bucklebury의 use case)
사람에 대한 정보를 입력하면 AI가 분석해서 life timeline, personality profile, digital twin을 만들어주는 도구.
- Bucklebury의 하나의 template/workflow로 재배치
- 프로토타입 v2.9까지 완성 (별도 파일)
- 핵심 차별화: 분석 결과의 근거를 소스까지 역추적 가능

---

## 릴리스 현황
- **Oracle**: v2.9 (oracle-app.jsx) — 19 iterations
- **Bucklebury**: v0.9+ (bucklebury.jsx) — 10+ iterations
- **총 29+ iterations over 2 days**

### Day 3 주요 변경사항
- 첫 commit edit → 새 conversation (parent 없음, branch 아닌 새 chat)
- Thinking 애니메이션 ("Thinking." → "Thinking.." → "Thinking...")
- Markdown 렌더링 확장 (## 헤딩, 리스트, 코드 블록, bold, italic, inline code)
- 사이드바 `···` hover 메뉴 (rename, delete)
- Rename 기능 (인라인 편집, Enter 확정, Escape 취소)
- Emerge 설계 철학 추가 (프리고진 산일 구조 이론)
- Emerge template 시스템 (CLAUDE.md 패턴, Settings에서 편집 가능)
- 데이터 저장 설계 (대안 C: .md 파일 = 대화의 전부, frontmatter에 graph 내장)
- Form Factor 로드맵 정리 (Phase 1: Electron + 로컬 .md, Phase 2: isomorphic-git, Phase 3: GitHub)
- 제품명 확정: Bucklebury
- 홈 화면 + Ferry 시스템 + Profile 메뉴
- Multi-Provider 자동 감지 + API 키 검증
- Ferry별 아이콘, 저장 경로
- Settings 화면

### Day 4 주요 변경사항 (Electron 전환)

**Electron Desktop App 구현 완료:**
- Vite + React + Electron + electron-builder 구조
- 프로젝트 구조: `electron/main.js` (메인 프로세스), `electron/preload.js` (IPC 브릿지), `src/App.jsx` (UI)
- `window.storage` → IPC + `fs.writeFile/readFile` (로컬 .md 파일 저장)
- electron-builder로 `.exe` (Windows), `.dmg` (macOS), `.AppImage` (Linux) 빌드

**LLM API 호출 — Main Process로 이동:**
- Renderer(브라우저)에서 직접 fetch → CORS 문제 (400 에러)
- Main process(Node.js)에서 fetch → CORS 없음. 올바른 Electron 패턴.
- `anthropic-dangerous-direct-browser-access` 헤더 불필요 (제거)
- API 에러 메시지 사용자 친화적으로 파싱 (크레딧 부족, 잘못된 키, 네트워크 오류)

**저장 경로 체계:**
- 기본 경로: `app.getPath("documents")` 사용 (OS별 Documents 폴더 자동 감지)
- 폴더 구조: `~/Documents/Bucklebury/ferries/[ferry이름]/chats/`
- Ferry 생성 시 Storage path 필드 + Browse 버튼 (폴더 선택 다이얼로그)
- 이름 입력 시 경로 자동 채움, 수동 선택 시 자동 연동 해제
- Settings에서 경로 읽기 전용 표시 (변경은 마이그레이션과 함께 추후 구현)

**Ferry 삭제:**
- 홈 화면: ferry 카드 hover → `···` → delete → 확인 팝업
- Settings 화면: 하단 "Delete this ferry" 빨간 버튼 → 인라인 확인
- 삭제 시 데이터 폴더는 OS 휴지통으로 이동 (`shell.trashItem`) — 복구 가능

**Ferry 삭제 버그 수정:**
- `shell.trashItem` 실패 시 `fs.rmSync` fallback 추가
- 경로 혼합 문제 해결: `path.normalize()`로 Windows 경로 정규화
- Ferry 삭제 시 `allRecent` state도 함께 클리어 (메모리에 남던 문제)
- `allRecent` useEffect에서 keys가 0개일 때 빈 배열로 초기화 (이전엔 이전 데이터 유지)

**UI/UX 개선:**
- Electron 메뉴바 숨김 (`Menu.setApplicationMenu(null)`)
- macOS `titleBarStyle: "hiddenInset"` — macOS에서만 적용 (Windows는 네이티브 타이틀바)
- 그래프 노드 크기 증가 (nR 4 → 6) — 클릭 타겟 개선 (Fitts's Law)
- Edit 모드 UX 수정: 새 prompt 입력 시 즉시 parent로 head 이동 → pending이 올바른 위치에 표시

**빌드:**
- Windows 개발자 모드 필요 (symlink 권한 — electron-builder의 winCodeSign 압축 해제용)
- `CSC_IDENTITY_AUTO_DISCOVERY=false`로 코드 서명 건너뛰기 (인증서 없는 개발 단계)
- 첫 `.exe` installer 빌드 성공: `dist/Bucklebury Setup 1.0.0.exe`
- 앱 아이콘: 뗏목 (Bucklebury Ferry 모티브, 따뜻한 나무색 갈색 + 물 파란색). 다른 앱과 겹치지 않는 고유한 형태. 작은 사이즈에서도 나무판 틈새 선 + 물결로 인식 가능.
- 앱 아이콘 적용: `electron-icon-builder`로 `.ico`(Windows)/`.icns`(macOS)/`.png`(Linux) 생성. BrowserWindow icon 설정, 홈/Create ferry 화면에 뗏목 아이콘 이미지 적용 (🚢 이모지 교체)
- 프로덕션 빌드 이미지 경로 수정: `public/` 절대 경로 → Vite `import` 방식 (dev/production 모두 동작)
- `DEVELOPMENT.md` 생성: 개발환경 셋업 가이드 + Git/Linear/Entire 연동 계획 체크리스트

### v0.2 후보
- Graph 노드 텍스트에서 markdown strip (bold/italic/heading 마크업 제거, 순수 텍스트만 표시)
- Emerge 구현
- Search & Tags (사이드바 검색 모드, 태그 필터링, Calendar 뷰)
- GitHub repo 공개
- 웹사이트 (랜딩 페이지 + 다운로드)
- 블로그 첫 글 ("왜 LLM 대화에 Git이 필요한가")

---

## 오픈소스 & 배포

### GitHub Repo (`github.com/[you]/bucklebury`)
- **코드 전체 공개** + spec 공개 (대안 C)
- 코드는 복제 가능하지만, 설계 판단은 복제 불가 — 그게 moat.
- 구조:
  ```
  github.com/[you]/bucklebury
  ├── README.md             → 설치 + 스크린샷 + 링크
  ├── bucklebury-spec.md    → 전체 스펙 + 설계 철학
  ├── src/                  → 소스 코드
  └── releases/             → .dmg / .exe 배포
  ```

### 웹사이트 (`bucklebury.app` 또는 `bucklebury.dev`)
GitHub Pages로 무료 호스팅.
```
bucklebury.app
├── /            → 랜딩: 뭔지 + 다운로드 + Graph 데모 GIF
├── /philosophy  → 설계 철학 (프리고진, UX 판단 과정)
├── /blog        → UX 판단 글 (edit과 branch를 왜 합쳤는가 등)
├── /changelog   → 버전별 변경사항
└── /download    → .dmg / .exe 직접 다운로드
```

### 핵심 마케팅 자산
- **Graph 데모 GIF:** 90개 commit 스파게티 → emerge → 깔끔한 graph. 설명 없이 보여주기.
- **블로그 첫 글:** "왜 LLM 대화에 Git이 필요한가." Hacker News 타겟.
- **철학 페이지:** 프리고진 산일 구조 + UX 판단 과정. 채용 담당자 타겟.

### 방문자별 경로
- **일반 사용자:** `/` → "오 이거 좋은데" → 다운로드
- **개발자:** `/` → GitHub repo → 코드 → star
- **채용 담당자:** `/philosophy` → "이 사람 사고 방식이 좋은데" → 연락
- **블로그 독자:** `/blog` → 글 공유 → 유입

### OpenClaw에서 배운 점
- 사회적 증거 (사용자 후기)가 강력하지만, Bucklebury는 **시각적 데모**가 더 핵심.
- Graph가 움직이는 GIF 한 장이 후기 100개보다 강력.
- 설치 명령어 한 줄이 바로 보여야 함.
- 코드가 오픈소스이면 개발자 커뮤니티에서 star + 기여가 옴.

---

## Future Vision (기록만, 미구현)

### Auto Ferry — Neptune 이후의 자동화
- Neptune이 검증된 후, AI가 반복 작업을 자동으로 수행
- AI가 스스로 질문하고 답변하는 구조 (AI prompt → AI response)
- 자동화 중에도 채팅에 기록, graph에 남음, 브라우저에서 실시간 확인 가능
- 사이드바에 "자동화 진행 중" 표시
- 사용자가 언제든 멈추고 개입 가능
- Emerge로 반복 작업의 최적 루틴 발견
- 비용 제어 필요: budget cap, rate limit 설계
- 우선순위: Neptune 검증 → 사용자 요청 시 구현
