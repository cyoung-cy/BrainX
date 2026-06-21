# SPLIT_DEMO_WORKFLOW.md

## 목적

split-demo 관련 작업의 일관성을 유지한다.

---

# 작업 절차

## Step 1

현재 프로젝트 구조 분석

확인 대상:

- split-demo 관련 페이지
- 컴포넌트
- 상태 관리
- mock 데이터

---

## Step 2

요구사항 분석

기존 기능 제거 금지

기존 기능을 확장 형태로 구현

---

## Step 3

구현

원칙:

- 재사용 가능한 구조
- TypeScript 유지
- any 최소화
- API 사용 금지
- Mock Data 사용

---

## Step 4

검증

반드시 확인

- npm run dev 정상 실행
- Type Error 없음
- Console Error 없음
- Console Warning 없음

---

## Step 5

문서 업데이트

작업 완료 후 반드시 아래 문서를 업데이트한다.

### FEATURES

구현된 기능 체크

### TODO

완료 항목 제거 또는 상태 변경

### CHANGELOG

이번 작업 내용 기록

---

# CHANGELOG 작성 규칙

최신 작업을 최상단에 작성한다.

기존 내용 삭제 금지.

---

## 기록 형식

### YYYY-MM-DD

#### HH:mm

작업 번호: #001

추가

- 기능

수정

- 기능

변경 파일

- path/file.tsx

비고

설명

---

### 예시

## 2026-06-17

### 15:30

작업 번호: #003

추가

- Bubble Toolbar
- Highlight

수정

- TipTap Extensions 구조 개선

변경 파일

- components/editor/BubbleToolbar.tsx
- lib/editor/extensions.ts

비고

중복 Extension 경고 제거

---

### 13:20

작업 번호: #002

추가

- 중첩 폴더

변경 파일

- components/explorer/FolderTree.tsx

---

### 10:15

작업 번호: #001

추가

- 새 노트 버튼

변경 파일

- components/explorer/NewNoteButton.tsx

---

# 작업 번호 규칙

하루에 여러 번 작업할 수 있다.

형식:

#001
#002
#003

날짜가 바뀌어도 번호는 계속 증가한다.

예시:

2026-06-17 #001
2026-06-17 #002
2026-06-18 #003
2026-06-18 #004

---

# Claude 보고 규칙

작업 완료 후 보고서 출력

1. 구현 기능
2. 수정 파일
3. 신규 파일
4. 설치 패키지
5. 문서 업데이트 여부
6. 다음 추천 작업
