# BrainX Notes 개발 컨텍스트

## 프로젝트 개요

BrainX는 AI 기반 개인 지식 관리 플랫폼이다.

목표:

- Obsidian + Notion + AI RAG
    
- Second Brain
    
- AI 자동 연결
    
- Semantic Search
    
- Knowledge Graph
    
- AI Writing Assistant
    

---

# 현재 기술 스택

## Frontend

- Next.js
    
- React 19
    
- TypeScript
    
- TipTap v3
    
- Lowlight
    
- highlight.js
    

### 중요

코드 하이라이팅은 반드시 다음 구조를 사용한다.

```text
TipTap
→ CodeBlockLowlight
→ lowlight
→ highlight.js
```

Shiki 사용 금지.

BlockNote 사용 금지.

---

# 현재 개발 정책

## 구현 우선순위

BrainX는 현재 MVP 개발 단계이다.

따라서:

1. 먼저 동작해야 한다.
    
2. Obsidian UX를 최대한 참고한다.
    
3. 이후 리팩토링한다.
    

절대로 구현된 기능을 삭제하거나 축소하지 않는다.

---

# Notes 페이지 정책

실제 개발 페이지:

```text
/notes
```

테스트 페이지:

```text
/editor-lab/*
```

현재까지 구현된 테스트 페이지 기능은 모두 `/notes` 로 이관하는 것이 목표이다.

---

# Notes UI 방향

기본 방향:

- Obsidian 스타일
    
- Notion의 편의성
    
- TipTap 기반
    

---

## 레이아웃

```text
┌────────────┬─────────────────────┬────────────┐
│ 탐색기     │ 노트 작성 영역      │ 컨텍스트   │
│            │                     │ 패널       │
└────────────┴─────────────────────┴────────────┘
```

---

## 좌측

노트 탐색기

기능:

- 폴더
    
- 노트
    
- 즐겨찾기
    
- 최근 활동
    
- 태그
    
- Drag & Drop
    

---

## 중앙

노트 작성

기능:

- 제목
    
- TipTap Editor
    
- Bubble Toolbar
    
- Slash Command
    
- 코드블록
    
- Wiki Link
    
- Folding
    
- Split View
    

---

## 우측

컨텍스트 패널

기능:

- 목차
    
- 연결
    
- 백링크
    
- AI 연결 제안
    
- 인라인 AI
    
- 이 노트에 질문
    

접기/펼치기 가능해야 함.

---

# 현재 구현 방향

## Split View

Obsidian 방식

지원:

- 좌우 분할
    
- 상하 분할
    
- 다중 분할
    
- 탭
    

정책:

- 노트 Drag & Drop 으로 분할
    
- 별도 분할 버튼 제거
    
- 패널 닫기 버튼 유지
    

---

# Bubble Toolbar 정책

텍스트를 선택하면 자동 표시.

포함 기능:

- Bold
    
- Italic
    
- Underline
    
- Strike
    
- Link
    
- Text Color
    
- Highlight
    
- AI Action
    

중요:

Bubble Toolbar 표시 여부는

```text
hover 상태
focus 상태
mouse 위치
```

가 아니라

```text
TipTap Selection 상태
```

기준으로 판단해야 한다.

역방향 드래그에서도 정상 동작해야 한다.

---

# 색상 기능 정책

텍스트 선택 즉시

기본 색상 팔레트가 노출되어야 한다.

예:

```text
검정
회색
빨강
주황
노랑
초록
파랑
보라
```

추가 색상은 더보기에서 제공.

---

# 제목 정책

제목 입력 후 Enter

↓

본문 첫 줄로 포커스 이동

새 노트도 동일

---

# 헤딩 정책

```text
#
##
###
```

실시간 변환

클릭 시 다시 편집 가능

---

# Folding 정책

Obsidian 스타일

지원:

- Heading Folding
    
- 향후 List Folding
    

Hover 시 화살표 표시

```text
▶
▼
```

형태 사용

---

# Wiki Link 정책

지원 형식

```text
[[노트]]
[[노트|별칭]]
[[노트#헤딩]]
```

---

# 코드블록 정책

생성 방식

````text
``` + Enter
````

또는

````text
```java + Enter
````

---

## 코드블록 UI

```text
┌──────────────────────────────┐
│ 파일명      Java ▼      📋 │
└──────────────────────────────┘
```

지원:

- 언어 선택
    
- 언어 검색
    
- 복사
    
- 파일명
    

---

## 파일명 정책

입력 위치:

헤더 내부

지원:

```text
Main.java
App.ts
```

자동 확장자 제공

헤더 높이는 늘어나면 안 됨.

---

# Mermaid 정책

구현 검토 및 가능 시 구현

지원 대상

````text
```mermaid
graph TD
A --> B
```
````

필수:

- 언어 선택에서 mermaid 검색 가능
    
- Mermaid 코드블록 생성 가능
    

가능하면:

- 렌더링
    
- 편집/미리보기 전환
    

---

# 그래프 정책

Mermaid 기반 우선

기본 정렬:

```text
가운데 정렬
```

---

# 이미지 정책

삽입 방식

- 업로드
    
- Drag & Drop
    
- Paste
    
- URL
    

기본 정렬:

```text
가운데 정렬
```

---

# 대형 콘텐츠 정책

대상:

- Mermaid
    
- Diagram
    
- Chart
    
- Image
    

Obsidian처럼

```text
가로 스크롤
```

지원

추가 검토:

```text
본문 폭 맞춤
75%
50%
사용자 지정 비율
```

---

# 작업 원칙

작업 전:

1. 현재 코드 분석
    
2. 관련 컴포넌트 분석
    
3. 영향 범위 분석
    

작업 후:

1. 채팅 보고
    
2. Changelog 기록
    

둘 다 필수

---

# Changelog 정책

경로

```text
docs/notes/CHANGELOG.md
```

기록 내용

- 날짜
    
- 시간
    
- 구현 기능
    
- 수정 기능
    
- 테스트 결과
    
- 남은 이슈
    

---

# 채팅 보고 정책

작업 완료 후 반드시 아래 내용 포함

## 작업 보고

### 검토 결과

### 구현 완료

### 구현 실패 또는 보류

### 변경 파일

### 테스트 결과

### Changelog 기록 여부

### 남은 이슈

Changelog만 작성하고 끝내면 안 된다.

반드시 채팅 보고도 수행한다.