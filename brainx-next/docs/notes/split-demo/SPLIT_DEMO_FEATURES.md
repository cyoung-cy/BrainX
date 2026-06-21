# SPLIT_DEMO_FEATURES.md

## 개요

`/editor-lab/split-demo`

BrainX 실제 노트 작성 페이지(`/notes/:id`) 프로토타입

---

# 현재 구현 기능

## 레이아웃

- [ ] 좌측 노트 탐색기
- [ ] 중앙 에디터
- [ ] 우측 사이드바
- [ ] 상태바

---

## Split View

- [ ] 좌우 분할
- [ ] 상하 분할
- [ ] 패널 크기 조절
- [ ] 패널 닫기
- [ ] 패널 최대화

---

## 탭 시스템

- [ ] 다중 탭
- [ ] 탭 닫기
- [ ] 활성 탭 변경
- [ ] 패널별 독립 탭

---

## 노트 탐색기

- [ ] 노트 목록
- [ ] 노트 검색
- [ ] 새 노트 생성
- [ ] 노트 이동

---

## 폴더

- [ ] 폴더 생성
- [ ] 폴더 삭제
- [ ] 폴더 이름 변경
- [ ] 중첩 폴더
- [ ] 폴더 펼치기
- [ ] 폴더 접기

---

## 에디터

- [ ] TipTap
- [ ] Markdown
- [ ] 자동 저장
- [ ] 단어 수 표시

---

## 버블 툴바

- [ ] Bold
- [ ] Italic
- [ ] Underline
- [ ] Strike
- [ ] Link
- [ ] Text Color
- [ ] Highlight

---

## 코드 블록

- [ ] Lowlight
- [ ] 언어 선택
- [ ] 복사 버튼
- [ ] 파일명 표시

---

## 우측 사이드바

- [ ] 목차
- [ ] 백링크
- [ ] 연결 노트
- [ ] AI 연결 제안
- [ ] 인라인 AI

---

## Mock Data

### Folder

- id
- name
- parentFolderId

### Note

- id
- title
- folderId
- content
- tags
- links
- backlinks

---

# 실제 노트 페이지 이관 대상

최종 목표:

/notes/:id

이 페이지로 이동 가능한 수준의 구조 유지
