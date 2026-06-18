/* BrainX Note Demo — Mock Data */

export type NoteStatus = "active" | "draft" | "archived";

export interface NoteData {
  id: string;
  title: string;
  folder: string;
  tags: string[];
  aliases: string[];
  status: NoteStatus;
  createdAt: string;
  updatedAt: string;
  content: string;
  backlinks: string[];        // note ids that reference this note
  outgoingLinks: string[];    // note ids this note references
  aiSummary: string;
  aiSuggestions: string[];
}

export const MOCK_NOTES: NoteData[] = [
  {
    id: "brainx-msa",
    title: "BrainX MSA 설계",
    folder: "Architecture",
    tags: ["architecture", "msa", "brainx"],
    aliases: ["BrainX 아키텍처", "마이크로서비스"],
    status: "active",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-06-14T15:30:00Z",
    backlinks: ["tiptap-editor", "rag-chatbot"],
    outgoingLinks: ["obsidian-backlinks", "spring-boot-api"],
    aiSummary:
      "BrainX를 마이크로서비스 아키텍처로 분리하는 설계 문서. API Gateway, 노트 서비스, AI 서비스, 그래프 서비스, 검색 서비스 총 5개 도메인으로 구성.",
    aiSuggestions: [
      "Spring Cloud Gateway 설정",
      "서비스 디스커버리 전략",
      "Kafka 이벤트 버스 설계",
    ],
    content: `# BrainX MSA 설계

## 개요

BrainX는 AI 기반 개인 지식 관리 플랫폼으로, 마이크로서비스 아키텍처를 채택한다.

## 서비스 구성

### 1. API Gateway (Spring Cloud Gateway)
- 인증/인가 처리 (JWT 검증)
- 요청 라우팅
- Rate Limiting
- CORS 처리

### 2. Note Service
- 노트 CRUD
- 버전 관리
- 내보내기/가져오기
- [[Obsidian 백링크 정리]] 와 연동

### 3. AI Service
- RAG 파이프라인
- 임베딩 생성
- 인라인 AI 도우미
- 자동 태그 추천

### 4. Graph Service
- Neo4j 기반 지식 그래프
- 백링크 관리
- 연결 제안

### 5. Search Service
- Qdrant 벡터 검색
- 시맨틱 검색
- 전문 검색 (Elasticsearch)

## 기술 스택

\`\`\`yaml
frontend:
  - Next.js 16 (App Router)
  - React 19
  - TipTap 에디터
  - TailwindCSS

backend:
  - Spring Boot 3.x (Java 21)
  - Spring Security + JWT
  - Spring Cloud Gateway

databases:
  - PostgreSQL (노트, 사용자 데이터)
  - Neo4j (지식 그래프)
  - Qdrant (벡터 검색)
  - Redis (세션, 캐시)

ai:
  - Claude 3.5 Sonnet (Anthropic)
  - text-embedding-3-small (OpenAI)
\`\`\`

## 배포 전략

- Docker + Kubernetes
- Helm Chart로 서비스 관리
- CI/CD: GitHub Actions → ECR → EKS`,
  },
  {
    id: "tiptap-editor",
    title: "TipTap 에디터 실험",
    folder: "Frontend",
    tags: ["editor", "tiptap", "frontend"],
    aliases: ["에디터 실험", "TipTap PoC"],
    status: "active",
    createdAt: "2026-05-10T14:00:00Z",
    updatedAt: "2026-06-15T10:00:00Z",
    backlinks: ["brainx-msa"],
    outgoingLinks: ["brainx-msa"],
    aiSummary:
      "TipTap v3 기반 에디터 기능 검증 내용. CodeBlockLowlight, StarterKit, Placeholder 확장 실험 결과 포함.",
    aiSuggestions: [
      "ProseMirror 스키마 커스터마이징",
      "Y.js 실시간 협업 연동",
      "커스텀 노드 개발 가이드",
    ],
    content: `# TipTap 에디터 실험

## 목표

BrainX 노트 에디터의 최종 기술 스택 결정.

## 검토 라이브러리

- **TipTap v3** — ProseMirror 기반, 헤드리스, 확장 에코시스템
- BlockNote — Notion 스타일, 블록 기반
- Quill — 레거시, 확장 어려움

## TipTap 실험 결과

### 확장 목록 (editor-lab 검증 완료)

| 확장 | 기능 | 상태 |
|------|------|------|
| StarterKit | Bold, Italic, Heading, List | ✅ |
| CodeBlockLowlight | 코드 하이라이팅 40+ 언어 | ✅ |
| Placeholder | 빈 에디터 안내 텍스트 | ✅ |

### 코드 블록 설정

\`\`\`typescript
import { createLowlight, all } from 'lowlight';
import CodeBlockLowlight from '@tiptap/extension-code-block-lowlight';

const lowlight = createLowlight(all);

const editor = useEditor({
  extensions: [
    StarterKit.configure({ codeBlock: false }),
    CodeBlockLowlight.configure({ lowlight }),
    Placeholder.configure({ placeholder: '내용을 입력하세요...' }),
  ],
});
\`\`\`

## Wikilink 구현 계획

\`[[노트 제목]]\` 문법은 ProseMirror 커스텀 마크로 구현 예정.

- 입력 중 자동완성 드롭다운
- 존재하지 않는 노트는 점선 스타일
- 클릭 시 해당 노트 열기

## 결론

**TipTap 채택 결정** — 커스터마이징 자유도와 확장 생태계가 BrainX 요구사항에 최적합.`,
  },
  {
    id: "rag-chatbot",
    title: "RAG 챗봇 구조",
    folder: "AI",
    tags: ["ai", "rag", "chatbot"],
    aliases: ["AI 채팅", "RAG 파이프라인"],
    status: "active",
    createdAt: "2026-05-15T10:00:00Z",
    updatedAt: "2026-06-10T16:00:00Z",
    backlinks: ["brainx-msa"],
    outgoingLinks: ["obsidian-backlinks"],
    aiSummary:
      "BrainX AI 채팅의 RAG(Retrieval-Augmented Generation) 아키텍처. 사용자 노트를 벡터 DB에 저장하고 질문 시 관련 노트를 검색해 LLM에 컨텍스트로 제공.",
    aiSuggestions: [
      "청킹 전략 비교 (고정 크기 vs 의미 단위)",
      "하이브리드 검색 구성",
      "재순위화(Reranking) 기법",
    ],
    content: `# RAG 챗봇 구조

## 아키텍처 개요

\`\`\`
사용자 질문
    ↓
임베딩 변환 (text-embedding-3-small)
    ↓
Qdrant 벡터 검색 (Top-5 노트)
    ↓
컨텍스트 구성 (검색된 노트 + 질문)
    ↓
Claude 3.5 Sonnet 호출
    ↓
스트리밍 응답 → 출처 노트 표시
\`\`\`

## 핵심 컴포넌트

### 1. 문서 임베딩 파이프라인

노트 저장/수정 시 자동으로 임베딩 생성:

\`\`\`java
@EventListener
public void onNoteSaved(NoteSavedEvent event) {
    String content = event.getNote().getContent();
    List<Chunk> chunks = chunker.chunk(content, 512, 64);

    for (Chunk chunk : chunks) {
        float[] embedding = embeddingService.embed(chunk.text());
        qdrantService.upsert(event.getNoteId(), chunk, embedding);
    }
}
\`\`\`

### 2. RAG 검색 쿼리

\`\`\`java
public RagResult search(String userId, String question) {
    float[] queryVector = embeddingService.embed(question);

    List<ScoredPoint> results = qdrantService.search(
        userId, queryVector, 5  // Top-5
    );

    return buildContext(question, results);
}
\`\`\`

### 3. 프롬프트 템플릿

\`\`\`
당신은 사용자의 개인 지식 베이스를 활용하는 AI 어시스턴트입니다.
아래 노트 내용을 참고하여 질문에 답변하세요.

[참고 노트]
{context}

[질문]
{question}

답변 시 참고한 노트를 출처로 명시하세요.
\`\`\`

## 성능 최적화

- **청킹**: 512 토큰, 64 오버랩
- **캐싱**: 자주 검색되는 쿼리는 Redis 캐시
- **병렬화**: 임베딩 생성과 DB 저장 비동기 처리`,
  },
  {
    id: "obsidian-backlinks",
    title: "Obsidian 백링크 정리",
    folder: "Research",
    tags: ["obsidian", "backlink", "knowledge-graph"],
    aliases: ["백링크", "양방향 링크"],
    status: "active",
    createdAt: "2026-05-20T11:00:00Z",
    updatedAt: "2026-06-12T09:00:00Z",
    backlinks: ["brainx-msa", "rag-chatbot"],
    outgoingLinks: ["tiptap-editor", "notion-import"],
    aiSummary:
      "Obsidian의 핵심 기능인 양방향 링크(Backlink) 구조 분석. [[이중 대괄호]] 문법과 BrainX 구현 방향.",
    aiSuggestions: [
      "ProseMirror 커스텀 마크로 WikiLink 구현",
      "Neo4j Graph로 백링크 저장",
      "실시간 백링크 업데이트 WebSocket",
    ],
    content: `# Obsidian 백링크 정리

## 백링크란?

다른 노트에서 현재 노트를 **참조(링크)** 한 역방향 연결이다.

A 노트에서 \`[[B 노트]]\`를 작성하면:
- A → B : 아웃고잉 링크 (A가 B를 참조)
- B ← A : 백링크 (B의 백링크 목록에 A가 표시)

## Obsidian 링크 문법

| 문법 | 설명 |
|------|------|
| \`[[노트 제목]]\` | 기본 링크 |
| \`[[노트 제목\|표시 이름]]\` | 별칭 링크 |
| \`[[노트 제목#섹션]]\` | 헤딩 앵커 |
| \`[[노트 제목^블록ID]]\` | 블록 참조 |

## BrainX 구현 전략

### 1. ProseMirror 마크

\`[[노트 제목]]\` 패턴을 감지해 커스텀 마크로 변환:

\`\`\`typescript
const WikiLinkMark = Mark.create({
  name: 'wikilink',
  parseHTML() {
    return [{ tag: 'a[data-wikilink]' }];
  },
  renderHTML({ HTMLAttributes }) {
    return ['a', { ...HTMLAttributes, 'data-wikilink': true }];
  },
});
\`\`\`

### 2. Neo4j 그래프 저장

\`\`\`cypher
// 노트 링크 생성
MATCH (a:Note {id: $sourceId}), (b:Note {id: $targetId})
CREATE (a)-[:LINKS_TO {createdAt: $now}]->(b)

// 백링크 조회
MATCH (a:Note)-[:LINKS_TO]->(b:Note {id: $noteId})
RETURN a.id, a.title, a.excerpt
\`\`\`

## 미연결 언급 (Unlinked Mentions)

\`[[링크]]\` 없이 노트 제목을 일반 텍스트로 언급한 경우.
AI가 자동으로 감지하여 링크 추가 제안.

## BrainX 지식 그래프와의 연계

백링크 데이터가 누적되면 그래프 시각화에서:
- 연결이 많은 노트 = 큰 노드
- 클러스터 = 주제 영역
- 고립 노드 = 발전시킬 아이디어`,
  },
  {
    id: "notion-import",
    title: "Notion Import 전략",
    folder: "Research",
    tags: ["notion", "import", "migration"],
    aliases: ["노션 가져오기", "Notion 마이그레이션"],
    status: "draft",
    createdAt: "2026-06-01T08:00:00Z",
    updatedAt: "2026-06-13T14:00:00Z",
    backlinks: ["obsidian-backlinks"],
    outgoingLinks: ["spring-boot-api"],
    aiSummary:
      "Notion Export(.zip) 파일을 BrainX로 가져오는 파이프라인 설계. HTML → Markdown 변환, 이미지 처리, 관계 데이터베이스 변환 전략 포함.",
    aiSuggestions: [
      "Pandoc HTML→Markdown 변환 활용",
      "이미지 CDN 업로드 전략",
      "Notion 관계형 DB → BrainX 태그 매핑",
    ],
    content: `# Notion Import 전략

## Notion Export 구조

Notion에서 내보내면 다음 구조의 ZIP 파일이 생성된다:

\`\`\`
notion-export.zip
├── 워크스페이스/
│   ├── 페이지명.html (또는 .md)
│   ├── 하위페이지/
│   │   └── 하위페이지명.html
│   └── 미디어/
│       └── image.png
\`\`\`

## 변환 파이프라인

\`\`\`
1. ZIP 업로드 → S3 임시 저장
2. 압축 해제
3. HTML → Markdown 변환 (Pandoc 또는 커스텀)
4. 이미지 → CDN 업로드 (URL 치환)
5. 내부 링크 → BrainX 노트 ID 매핑
6. 태그/속성 → BrainX 메타데이터
7. BrainX 노트 생성
\`\`\`

## API 설계

\`\`\`http
POST /api/v1/imports/notion/jobs
Content-Type: multipart/form-data

{
  "file": <notion-export.zip>,
  "options": {
    "importImages": true,
    "convertRelationalDB": true,
    "preserveFolderStructure": true
  }
}

Response:
{
  "jobId": "import-abc123",
  "status": "queued",
  "estimatedTime": "30s"
}
\`\`\`

## 처리 현황 조회 (SSE)

\`\`\`
GET /api/v1/imports/notion/jobs/{jobId}/stream

data: {"progress": 10, "message": "ZIP 파일 압축 해제 중..."}
data: {"progress": 30, "message": "HTML 파싱 중..."}
data: {"progress": 60, "message": "이미지 업로드 중..."}
data: {"progress": 90, "message": "노트 생성 중..."}
data: {"progress": 100, "status": "completed", "noteCount": 47}
\`\`\`

## Obsidian Import와의 차이

| 항목 | Notion | Obsidian |
|------|--------|----------|
| 형식 | HTML/ZIP | Markdown/ZIP |
| 이미지 | 폴더 내 파일 | 폴더 내 파일 |
| 링크 | HTML href | [[WikiLink]] |
| DB | 관계형 표 | Dataview |`,
  },
  {
    id: "spring-boot-api",
    title: "Spring Boot API 계약",
    folder: "Backend",
    tags: ["spring", "api", "backend", "rest"],
    aliases: ["API 계약", "REST API"],
    status: "active",
    createdAt: "2026-05-25T13:00:00Z",
    updatedAt: "2026-06-14T11:00:00Z",
    backlinks: ["brainx-msa", "notion-import"],
    outgoingLinks: ["brainx-msa"],
    aiSummary:
      "BrainX Spring Boot 백엔드 REST API 명세. 노트 CRUD, 검색, AI, 파일 업로드, 가져오기/내보내기 엔드포인트 정리.",
    aiSuggestions: [
      "OpenAPI 3.0 Swagger 문서 자동화",
      "API 버전 관리 전략",
      "Rate Limiting 정책",
    ],
    content: `# Spring Boot API 계약

## Base URL

\`\`\`
https://api.brainx.app/api/v1
\`\`\`

## 인증

모든 API는 Bearer JWT 토큰 필요:

\`\`\`http
Authorization: Bearer <access_token>
\`\`\`

## 노트 API

### 노트 조회

\`\`\`http
GET /notes/{noteId}

Response 200:
{
  "id": "note-abc",
  "title": "BrainX MSA 설계",
  "content": "...",
  "tags": ["architecture", "msa"],
  "createdAt": "2026-05-01T09:00:00Z",
  "updatedAt": "2026-06-14T15:30:00Z"
}
\`\`\`

### 노트 내용 수정

\`\`\`http
PUT /notes/{noteId}/content
Content-Type: application/json

{
  "content": "# 새로운 내용...",
  "contentFormat": "tiptap-json"
}
\`\`\`

### 메타데이터 수정

\`\`\`http
PATCH /notes/{noteId}/metadata
Content-Type: application/json

{
  "title": "새 제목",
  "tags": ["tag1", "tag2"],
  "status": "active"
}
\`\`\`

## 검색 API

### 시맨틱 검색

\`\`\`http
POST /intelligence/semantic-search
Content-Type: application/json

{
  "query": "RAG 파이프라인 구성 방법",
  "limit": 10,
  "filters": {
    "tags": ["ai"],
    "status": "active"
  }
}
\`\`\`

## AI API

### 인라인 AI 도움

\`\`\`http
POST /ai/inline-assists
Content-Type: application/json

{
  "noteId": "note-abc",
  "selectedText": "...",
  "action": "summarize" | "translate" | "rewrite" | "shorter" | "longer"
}
\`\`\`

## 내보내기 API

\`\`\`http
POST /exports
Content-Type: application/json

{
  "noteIds": ["note-abc", "note-def"],
  "format": "markdown" | "pdf" | "html" | "obsidian-zip"
}
\`\`\``,
  },
];

export function getNoteById(id: string): NoteData | undefined {
  return MOCK_NOTES.find((n) => n.id === id);
}

export function getNoteByTitle(title: string): NoteData | undefined {
  return MOCK_NOTES.find(
    (n) => n.title === title || n.aliases.includes(title)
  );
}

/* Folder tree structure */
export const MOCK_FOLDERS = [
  { id: "arch", label: "Architecture", noteCount: 1 },
  { id: "frontend", label: "Frontend", noteCount: 1 },
  { id: "ai", label: "AI", noteCount: 1 },
  { id: "research", label: "Research", noteCount: 2 },
  { id: "backend", label: "Backend", noteCount: 1 },
];

/* Daily notes mock */
export const DAILY_NOTE_DATES = [
  "2026-06-15",
  "2026-06-14",
  "2026-06-13",
  "2026-06-12",
  "2026-06-11",
];
