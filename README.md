
# AI Service 가이드

돈글돈글 플랫폼의 AI 서비스입니다.
Node.js + Express + LangChain 기반이며, GPT-4o-mini를 사용합니다.

---

## 1. 아키텍처 개요

```
사용자 질문
    ↓
Spring Boot (백엔드)  →  POST /ai/chat  →  AI Service
                                              ↓
                                      Tool Calling Agent
                                        (GPT-4o-mini)
                                              ↓
                                     질문 분석 후 Tool 선택
                              ┌───────────┼───────────┐
                              ↓           ↓           ↓
                        news_search  term_definition  policy_search  ...
                              ↓           ↓           ↓
                           DB 조회     DB 조회     DB 조회
                              └───────────┼───────────┘
                                          ↓
                                  Tool 결과 기반 답변 생성
                                          ↓
                                    SSE 스트리밍 응답
                                          ↓
                                  Spring Boot → 프론트엔드
```

LangChain Tool Calling Agent가 사용자 질문을 분석하고,
6개 Tool 중 적절한 것을 자동 선택/조합하여 DB를 조회한 뒤 답변을 생성합니다.

---

## 2. API 엔드포인트

### 2-1. 채팅 (Agent)

```
POST /ai/chat
```

Agent가 질문을 분석하고 적절한 Tool을 호출하여 답변을 SSE 스트리밍으로 반환합니다.

**Request Body:**
```json
{
  "user_id": "string",
  "session_id": "string",
  "message": "string"
}
```

**Response (SSE 스트리밍):**
```
data: {"type":"tool","name":"term_definition","status":"start"}
data: {"type":"tool","name":"term_definition","status":"end"}
data: {"type":"token","content":"ETF"}
data: {"type":"token","content":"는"}
data: {"type":"token","content":" 여러 주식을..."}
data: {"type":"done","cited_source_ids":[1,2]}
```

### 2-2. 카드뉴스 생성

```
POST /ai/summarize
```

**Request Body:**
```json
{
  "news_id": "string",
  "title": "string",
  "content": "string",
  "category": "string (optional)",
  "published_at": "string (optional)",
  "source": "string (optional)"
}
```

**Response:**
```json
{
  "news_id": "1",
  "cards": [
    {
      "card_type": "cover | summary | concept | number | comparison | cause | impact | context | terms | closing",
      "title": "카드 제목 (18자 이내)",
      "content": "핵심 문장 (35자 이내)",
      "sub_content": "보조 설명 (45자 이내)"
    }
  ],
  "card_count": 7,
  "model_version": "gpt-4o-mini"
}
```

### 2-3. 퀴즈 생성

```
POST /ai/quiz
```

**Request Body:**
```json
{
  "news_id": "string",
  "content": "string"
}
```

**Response:**
```json
{
  "news_id": "1",
  "quizzes": [
    {
      "question": "질문",
      "options": ["보기1", "보기2", "보기3", "보기4"],
      "answer": 0,
      "explanation": "해설 (25~45자)"
    }
  ],
  "quiz_count": 3,
  "model_version": "gpt-4o-mini"
}
```

### 2-4. NER (금융 용어 추출)

```
POST /ai/ner
```

**Request Body:**
```json
{
  "news_id": "string",
  "content": "string"
}
```

**Response:**
```json
{
  "news_id": "1",
  "terms": [
    {
      "term_name": "기준금리",
      "simple_definition": "한국은행이 정하는 기본 이자율이에요.",
      "position_start": 5,
      "position_end": 9
    }
  ]
}
```

### 2-5. 임베딩 저장

```
POST /ai/embed
```

**Request Body:**
```json
{
  "source_type": "news | policy | term",
  "source_id": "string",
  "text": "string",
  "metadata": { "title": "string", "url": "string" }
}
```

**Response:**
```json
{
  "source_type": "news",
  "source_id": "1",
  "embedding_dim": 1536,
  "stored": true
}
```

---

## 3. Agent의 6개 Tool

Agent가 사용자 질문을 분석하고, 아래 Tool 중 적절한 것을 자동 선택합니다.

| Tool | 트리거 예시 | DB 테이블 | 상태 |
|------|------------|-----------|------|
| `news_search` | "최근 금리 뉴스 알려줘" | `news_articles` | 완성 (뉴스 데이터 필요) |
| `term_definition` | "ETF가 뭐야?" | `financial_terms` | 완성 |
| `policy_search` | "청년 월세 지원 있어?" | `policies` | 완성 |
| `market_data` | "코스피 지금 얼마야?" | Redis 캐시 | stub (샘플 데이터) |
| `spending_analysis` | "내 소비 패턴 분석해줘" | `spending_events` | stub (4회차 연동 예정) |
| `recommendation` | "다음에 뭐 읽을까?" | `news_articles`, `policies`, `financial_terms` | 완성 |

### Tool 동작 흐름

```
"ETF가 뭐야?"
 → Agent 판단: 용어 질문 → term_definition Tool 호출
 → financial_terms 테이블에서 ETF 조회
 → 조회 결과를 GPT에게 전달
 → GPT가 결과를 참고하여 쉬운 답변 생성
 → SSE 스트리밍으로 전송

"안녕!"
 → Agent 판단: 일반 대화 → Tool 미사용
 → GPT가 바로 답변 생성
```

---

## 4. 프론트엔드 연동 가이드

### SSE 이벤트 타입

| type | 설명 | 처리 방법 |
|------|------|-----------|
| `tool` | Agent가 Tool을 호출 중 | `status: "start"` → 로딩 표시, `status: "end"` → 로딩 해제 |
| `token` | 답변 텍스트 조각 | `content`를 이어붙여서 실시간 렌더링 |
| `done` | 스트리밍 종료 | `cited_source_ids`로 출처 표시, 연결 종료 |

### 프론트엔드 처리 예시

```javascript
const eventSource = new EventSource('/api/ai/chat?...');
let fullText = '';

eventSource.onmessage = (event) => {
  const data = JSON.parse(event.data);

  switch (data.type) {
    case 'tool':
      if (data.status === 'start') showLoading(data.name);
      if (data.status === 'end') hideLoading(data.name);
      break;
    case 'token':
      fullText += data.content;
      renderText(fullText);
      break;
    case 'done':
      showSources(data.cited_source_ids);
      eventSource.close();
      break;
  }
};
```

### Tool 이름 → 한글 매핑 (로딩 표시용)

```javascript
const TOOL_LABELS = {
  news_search: '뉴스 검색 중...',
  term_definition: '용어 조회 중...',
  policy_search: '정책 검색 중...',
  market_data: '시세 조회 중...',
  spending_analysis: '소비 분석 중...',
  recommendation: '추천 콘텐츠 검색 중...',
};
```

---

## 5. 백엔드 연동 가이드

### AI 서비스가 읽는 DB 테이블

AI 서비스의 Agent 채팅은 **SELECT(읽기)만** 수행합니다. 데이터 생성/수정은 백엔드에서 담당합니다.

| 테이블 | 사용하는 Tool | 필요 컬럼 |
|--------|-------------|-----------|
| `financial_terms` | `term_definition` | `name`, `simple_definition`, `difficulty_level` |
| `policies` | `policy_search` | `title`, `description`, `organization`, `region_code`, `age_min`, `age_max`, `end_date`, `application_url` |
| `news_articles` | `news_search` | `title`, `content`, `category`, `source_name`, `published_at` |

### 백엔드 → AI 서비스 호출 흐름

뉴스 크롤링 시 백엔드가 호출하는 API:

```
1. 크롤링 완료 → POST /ai/ner       (용어 추출)
2.             → POST /ai/summarize  (카드뉴스 생성)
3.             → POST /ai/quiz      (퀴즈 생성)
4.             → POST /ai/embed     (벡터 저장)
```

### 대화 이력

- Redis에 `chat_history:{session_id}` 키로 저장
- 최근 10턴(20개 메시지) 유지, TTL 1시간
- 같은 `session_id`로 요청하면 이전 대화를 기억

---

## 6. 캐싱 정책

| 대상 | Redis 키 패턴 | TTL |
|------|--------------|-----|
| NER 결과 | `ner:{news_id}` | 24시간 |
| 카드뉴스 | `summary:{news_id}` | 24시간 |
| 퀴즈 | `quiz:{news_id}` | 24시간 |
| 임베딩 | `embed:{type}:{id}` | 7일 |
| 시장 데이터 | `market:{type}` | 5분 |
| 대화 이력 | `chat_history:{session_id}` | 1시간 |

---

## 7. 프로젝트 구조

```
src/
├── config/
│   ├── langchain.js            # LLM(gpt-4o-mini), Embeddings 설정
│   └── openai.js               # OpenAI 클라이언트
├── cache/
│   └── redis.js                # Redis 캐시 (getCache, setCache)
├── db/
│   └── pgvector.js             # PostgreSQL 연결, 쿼리 함수
├── controllers/
│   ├── chat.controller.js      # POST /ai/chat
│   ├── summarize.controller.js # POST /ai/summarize
│   ├── quiz.controller.js      # POST /ai/quiz
│   ├── ner.controller.js       # POST /ai/ner
│   └── embed.controller.js     # POST /ai/embed
├── services/
│   ├── agent.service.js        # Tool Calling Agent (핵심)
│   ├── chat-history.service.js # Redis 대화 이력
│   ├── sse.service.js          # SSE 스트리밍 유틸
│   ├── summarizer.service.js
│   ├── quiz.service.js
│   ├── ner.service.js
│   └── embedder.service.js
├── tools/                       # Agent Tool
│   ├── index.js
│   ├── news-search.tool.js
│   ├── term-definition.tool.js
│   ├── policy-search.tool.js
│   ├── market-data.tool.js
│   ├── spending-analysis.tool.js
│   └── recommendation.tool.js
├── prompts/
│   ├── agent.prompt.js         # Agent 시스템 프롬프트
│   ├── summarize.prompt.js
│   ├── quiz.prompt.js
│   └── ner.prompt.js
├── routes/
├── middleware/
└── index.js                     # Express 서버 진입점
```

---

## 8. 환경 설정

`.env.example`을 복사하여 `.env` 파일을 생성하고 값을 입력하세요.

```bash
cp .env.example .env
```

### 실행

```bash
npm install
npm run dev    # 개발 모드 (nodemon)
npm start      # 프로덕션
```

### 필요 인프라 (Docker)

- PostgreSQL + pgvector (pg16)
- Redis 7

---

## 9. 남은 작업 (4회차)

| 항목 | 설명 |
|------|------|
| `news_search` 벡터 검색 전환 | 현재 ILIKE 키워드 검색 → embeddings 기반 벡터 유사도 검색으로 전환 |
| `spending_analysis` 실데이터 연동 | spending_events 테이블 연동 |
| `market_data` 실시세 API 연동 | 외부 시세 API 연동 (현재 stub) |
| 뉴스 크롤링 데이터 적재 | news_articles 테이블에 크롤링 데이터 필요 |
| 비용 모니터링 | OpenAI API 토큰 사용량 추적 체계 구축 |
