# SPLIT_DEMO_CHANGELOG.md

## 2026-06-17

### 18:26

작업 번호: #005

추가

- `/notes` 노트 첫 화면(Obsidian 스타일 시작 탭) 구현 — "새 파일 생성하기(Ctrl+N)", "파일로 이동하기(Ctrl+O)", "닫기" 3개 행, 좌측 탐색기는 항상 유지
- `EmptyNoteStartPage`, `QuickSwitcher`(파일로 이동하기 검색 팝오버) 신규 컴포넌트
- 탭 타입을 `{kind:"note"}` / `{kind:"start"}` union으로 확장 — 탭 바 "+" 버튼은 이제 새 노트를 바로 만들지 않고 빈 "새 탭"을 추가(Obsidian Ctrl+T와 동일), 노트 생성은 시작 화면의 "새 파일 생성하기"로 분리
- `/notes` 워크스페이스 세션(분할 트리·탭·노트·폴더) localStorage 영속화 (`brainx_notes_workspace_v1`) — 새로고침 후에도 작업 상태 유지
- Ctrl/Cmd+N, Ctrl/Cmd+O 키보드 단축키 (클릭 동작과 동일 핸들러 재사용)

변경 파일 (split-demo → notes 공통화)

- `components/editor/split-demo/*` → `components/notes/*`로 이전 + 재구성:
  - `SplitDemoClient.tsx` → `NotesWorkspace.tsx` (persistKey/initialTab/onActiveNoteChange prop으로 일반화 — split-demo와 /notes가 동일 컴포넌트 공유)
  - `PaneLeafView.tsx` → `EditorPanel.tsx`(탭 바·제목·DnD 셸) + `NoteEditor.tsx`(TipTap 에디터 코어, forwardRef로 `focusStart` 노출)
  - `NoteSidebar.tsx` → `NotesExplorer.tsx`, `ContextPanel.tsx` → `RightSidebar.tsx`(activeNote가 null이어도 동작하도록 변경)
  - `FolderTree.tsx`, `TabBar.tsx`, `PaneTreeRenderer.tsx`, `ColorPalette.tsx`, `CodeBlockView.tsx`, `headingFold.ts`, `theme.ts`, `SplitThemeContext.tsx`는 그대로 이전
- `components/editor/split-demo/{types.ts,paneUtils.ts,folderDnd.ts,mockData.ts}` → `lib/notes/{noteTypes.ts,paneUtils.ts,folderDnd.ts,mockNotes.ts}`
- `app/editor-lab/split-demo/page.tsx` — 공통 `NotesWorkspace` import로 변경 (동작 동일, `persistKey` 미지정으로 기존처럼 새로고침마다 초기화)
- `app/(app)/notes/page.tsx`, `app/(app)/notes/[id]/page.tsx` — 빈 컴포넌트로 단순화, 실제 워크스페이스는 신규 `app/(app)/notes/layout.tsx`에서 1회만 마운트
- `components/workspace-shell.tsx` — 좌측 네비게이션/모바일 네비게이션의 "노트" 경로를 `/notes/n1` → `/notes`로 수정

삭제

- `components/editor/split-demo/` 디렉토리 전체 (components/notes로 이전 완료, 중복 제거)
- `components/note-editor-screen.tsx` (textarea 기반 구) — `/notes/[id]`가 더 이상 참조하지 않는 죽은 코드

버그 수정 (이번 작업 중 발견)

- **워크스페이스 리마운트로 인한 데이터 손실**: `/notes`(시작화면)와 `/notes/[id]`를 각자 다른 page.tsx에서 `NotesWorkspace`를 마운트하도록 했더니, 새 노트 생성 → `onActiveNoteChange` → `router.replace("/notes/{id}")`가 다른 라우트로 전환되며 워크스페이스 전체가 리마운트되어 방금 만든 노트가 사라짐. `app/(app)/notes/layout.tsx`에서 단 한 번만 마운트하도록 수정해 해결.
- **새 노트가 영구히 읽기 모드로 고정되는 문제**: `NoteEditor`의 모드 초기화 effect가 `[note.id]`에만 의존해, `immediatelyRender:false`로 인해 마운트 첫 렌더에 `editor`가 아직 `null`인 경우(시작 탭 → 새 노트로 전환 시) effect가 조기 종료된 뒤 다시 실행되지 않던 문제. 의존 배열에 `editor`를 추가해 해결.

비고

- split-demo는 삭제하지 않고 `/notes`와 완전히 동일한 `NotesWorkspace` 컴포넌트를 공유하도록 정리함 (코드 중복 없음)
- `/notes`는 split-demo의 독립 mock 데이터(`MockNote`/`MockFolder`, HTML 콘텐츠)를 그대로 사용— 홈/그래프/챗 화면이 쓰는 기존 `BrainXProvider`/`BrainXNote`(마크다운, 고정 클러스터)는 건드리지 않음. 이로 인해 홈 화면 "최근 노트"·그래프뷰에서 넘어오는 노트 id는 `/notes`의 새 데이터셋에 존재하지 않을 수 있어, 그 경우 깨진 화면 대신 시작 화면으로 폴백하도록 처리함 (`app/(app)/notes/layout.tsx`)
- 발견했지만 고치지 않은 엣지케이스: 문서 전체를 Ctrl+A로 선택해 Bold를 적용한 직후 곧바로 문서 끝에서 코드블록(```js + Enter)을 만들면 본문이 코드블록만 남고 사라지는 경우가 재현됨. 에디터 코어 로직은 split-demo에서 그대로 옮긴 것이라 이번 작업의 회귀는 아니나, 별도 조사가 필요함

### 15:02

작업 번호: #004

추가

- 노트 탐색기 드래그앤드랍 (`@dnd-kit/core`) — 노트/폴더를 다른 폴더 또는 루트로 이동, 같은 레벨에서 순서 변경(before/after), 폴더 안에 폴더 중첩 가능
  - 각 행에 별도 그립 핸들(`GripVertical`)을 추가해 기존 "노트 → 패널 분할" 네이티브 HTML5 드래그와 충돌하지 않도록 분리
  - 자기 자신/자기 하위 폴더로의 이동은 `canFolderMoveUnder`로 차단, 드래그 중 빨간 테두리로 시각 피드백
  - 드래그 중인 행은 opacity 처리, 드롭 대상은 위/아래(삽입선) 또는 전체(강조 배경)로 before/after/into 구분 표시
  - "루트로 이동" 드롭존을 패널 하단에 추가, `DragOverlay`로 드래그 중인 항목(폴더/노트명) 미리보기 표시
- 버블 툴바 빠른 색상 swatch — 텍스트 선택 즉시 글자색 8종/형광펜 6종이 툴바에 바로 노출되어 메뉴를 열지 않고 클릭 한 번으로 적용. 기본 목록에 없는 색은 "더보기"에서 네이티브 컬러피커 + 최근 사용 색상으로 선택

수정

- 노트 제목 입력 후 Enter 시 본문 에디터로 포커스가 이동하지 않던 문제 수정 — 제목 커밋 후 `editor.chain().focus("start")` 호출, 빈 노트/기존 노트 모두 본문 시작 위치로 이동. IME(한글 등) 조합 중 Enter는 `e.nativeEvent.isComposing` 가드로 무시
- 새 탭/새 패널에서 생성한 새 노트가 제목만 써지고 본문 작성으로 이어지지 않던 문제 — 위 Enter→포커스 수정과 결합해 "새 노트 생성 → 제목 → Enter → 본문 작성" 흐름이 끊김 없이 이어지도록 함

변경 파일

- components/editor/split-demo/folderDnd.ts (신규) — 폴더/노트 이동·재정렬 순수 로직, 자기 하위 폴더 이동 차단, 드롭 위치(before/after/into) 판정
- components/editor/split-demo/FolderTree.tsx — dnd-kit `DndContext`/`useDraggable`/`useDroppable`/`DragOverlay` 통합, 그립 핸들, 드롭 인디케이터, 루트 드롭존
- components/editor/split-demo/PaneLeafView.tsx — 제목 Enter→본문 포커스, 버블 툴바 빠른 swatch 레이아웃 교체
- components/editor/split-demo/ColorPalette.tsx — `QuickSwatchRow`(인라인 즉시 적용), `MoreColorPopover`(커스텀 색상 + 최근 사용)로 구조 변경
- components/editor/split-demo/NoteSidebar.tsx — 이동/재정렬 핸들러 prop 전달
- components/editor/split-demo/SplitDemoClient.tsx — `handleMoveNoteToFolder`/`handleReorderNote`/`handleMoveFolderToParent`/`handleReorderFolder` 추가
- package.json / package-lock.json — `@dnd-kit/core` 추가

설치 패키지

- `@dnd-kit/core` — 사용자가 제안한 `@dnd-kit/sortable`은 설치하지 않음. 폴더/노트는 평면 리스트가 아닌 재귀 트리 구조라 `SortableContext`/`useSortable`의 "flat list" 전제가 잘 맞지 않아, `core`의 `useDraggable`/`useDroppable`만으로 직접 reparent/reorder 로직(`folderDnd.ts`)을 구현함

비고

- 디버깅 중 발견한 dnd-kit 이슈 2건과 해결 방법을 기록해 둔다 (재발 방지용):
  1. "루트로 이동" 드롭존처럼 드래그 시작 "이후"에 새로 마운트되는 `useDroppable`은, 그 호출이 `<DndContext>`를 반환하는 컴포넌트 자신의 body가 아니라 `<DndContext>`의 자식 컴포넌트 안에서 이뤄져야 정상적으로 등록된다. (`FolderTree`가 아닌 별도 `RootDropZone` 컴포넌트로 분리해서 해결)
  2. 사이드바처럼 스크롤 가능한 좁은 영역에서 드래그가 뷰포트 가장자리 근처로 가면 dnd-kit의 기본 `autoScroll`이 충돌 판정과 간섭해 드롭이 누락되는 경우가 있어, 이 트리에서는 `autoScroll={false}`로 비활성화함
- 15개 시나리오(새 노트 생성→제목→Enter→본문 포커스→작성→mock 반영→텍스트 드래그→빠른 색상 적용→더보기 색상→노트 이동→폴더 이동→루트 이동→잘못된 드롭 차단→split 탭 유지→기존/새 노트 모두 작성 가능) 모두 Playwright로 검증, console error/warning 없음
- 같은 부모 폴더 안에서 "폴더와 노트 사이의 순서"는 다루지 않음 — 기존 렌더링이 항상 하위 폴더를 노트보다 먼저 보여주는 고정 그룹 구조라, 순서 변경은 같은 타입(폴더↔폴더, 노트↔노트) 사이에서만 지원함

---

### 12:04

작업 번호: #003

추가

- 글자 색상 팔레트 팝오버 (`ColorPalette.tsx`) — 검정/기본을 1번에 배치, "기본값으로 되돌리기" 버튼, 최근 사용 색상, 형광펜과 시각적으로 분리된 별도 팔레트
- 폴더 색상 설정 + 즐겨찾기 기능 — 폴더 hover 시 `...` 더보기 메뉴(하위 폴더 생성/새 노트 생성/이름 변경/색상 변경/즐겨찾기/삭제), 즐겨찾기 폴더는 사이드바 상단 즐겨찾기 섹션에도 노출
- 코드블록 파일명 복사 버튼 — 파일명 영역 hover 시 복사 아이콘 노출, 클릭 시 파일명만 클립보드에 복사(기존 코드 복사 버튼과 분리), 복사 완료 시 체크 아이콘 피드백

수정

- 글자 색상 적용 후 Bold(또는 Bold 적용 후 색상)를 누르면 색상이 사라지던 문제 수정 — 원인은 TipTap mark 충돌이 아니라 `app/globals.css`의 `.tiptap-note-content .ProseMirror strong` 규칙이 `color`를 직접 지정해, Color/TextStyle mark의 인라인 색상을 덮어쓰던 것. `strong`/`b` 규칙에서 `color` 선언을 제거(`font-weight`만 유지)하여 Bold와 글자색이 항상 함께 유지되도록 수정
- 새 노트 생성 후 본문 작성이 안 되던 문제 수정 — (1) 새로 생성된 빈 노트는 자동으로 편집 모드로 열리도록 변경, (2) TipTap `onUpdate`를 디바운스(400ms)로 mock `notes` state에 동기화하는 로직이 전혀 없어 탭 전환 시 본문이 사라지던 구조적 문제를 해결 (`onContentChange` 콜백 체인 추가), (3) 제목/본문 변경 시 `updatedAt`이 갱신되도록 수정

변경 파일

- app/globals.css
- components/editor/split-demo/PaneLeafView.tsx
- components/editor/split-demo/PaneTreeRenderer.tsx
- components/editor/split-demo/SplitDemoClient.tsx
- components/editor/split-demo/NoteSidebar.tsx
- components/editor/split-demo/FolderTree.tsx
- components/editor/split-demo/CodeBlockView.tsx
- components/editor/split-demo/types.ts
- components/editor/split-demo/mockData.ts
- components/editor/split-demo/ColorPalette.tsx (신규)
- docs/split-demo/SPLIT_DEMO_TODO.md
- docs/split-demo/SPLIT_DEMO_CHANGELOG.md

비고

- 모든 항목은 Playwright로 실제 브라우저에서 동작을 검증함 (Bold+색상 동시 적용 양방향, 색상 팔레트 검정 1번/기본값 되돌리기, 새 노트 생성 즉시 편집 가능 + 탭 전환 후 본문/제목 유지 + 사이드바 제목 반영, 폴더 색상 변경/즐겨찾기/이름변경, 코드블록 파일명 복사와 클립보드 내용 일치). 검증 중 console error/warning 없음을 확인.
- API 연동 없이 Mock 데이터(`notes`, `folders` React state)만으로 create/update/delete에 준하는 흐름을 구현함 — 실제 서비스 이관 시 해당 state 갱신 지점을 API 호출로 교체하면 됨.
- 폴더 삭제는 하위 폴더/노트를 삭제된 폴더의 부모로 승격시켜 데이터 손실을 방지함(확인 다이얼로그는 없음 — 다음 작업 후보 참고).

---

### 10:40 (역산 — 동일 세션 내 이전 작업)

작업 번호: #002

수정

- TipTap "Duplicate extension names found: ['link', 'underline']" 경고 제거 — `@tiptap/starter-kit` v3가 `link`/`underline`을 내장하는데, 별도로 `@tiptap/extension-link`/`@tiptap/extension-underline`을 추가 등록해 중복되던 것이 원인. `StarterKit.configure({ link: {...} })`로 통합하고 개별 import 제거, 미사용 패키지 삭제
- 모든 `PaneLeafView` 인스턴스가 동일한 extensions 배열(`NOTE_EDITOR_EXTENSIONS`)을 공유하도록 모듈 스코프로 분리 — 패널마다 새로 생성되며 중복이 재발할 여지를 차단

변경 파일

- components/editor/split-demo/PaneLeafView.tsx
- package.json / package-lock.json

비고

- 본 항목 이후 CHANGELOG 운영이 시작되어 정확한 작업 시각은 추정치임.

---

### 09:10 (역산 — 동일 세션 내 최초 작업)

작업 번호: #001

추가

- 노트 탐색기 폴더 트리를 카테고리 기반 평면 목록에서 `parentFolderId` 기반 무한 중첩 폴더 트리로 전환 (`FolderTree.tsx`, 재귀 렌더링, 펼치기/접기, 인라인 폴더 생성)
- 사이드바 상단 `+ 새 노트` 버튼 — 선택된 폴더(또는 루트)에 노트 생성, 활성 패널의 새 탭으로 즉시 오픈
- Obsidian 스타일 다중 탭 (`TabBar.tsx`) — 패널별 독립 탭 목록, 탭 닫기/전환/추가, 가로 스크롤
- Notion 스타일 버블 툴바 — 텍스트 선택 시 노출, Bold/Italic/Underline/Strike/Inline Code/Link/Highlight/글자색/AI 요약·다시쓰기(mock)
- TipTap 확장 추가: Highlight, TextStyle, Color (Underline/Link는 StarterKit 내장분 사용)
- 우측 컨텍스트 패널이 활성 패널의 활성 탭 노트를 기준으로 목차/백링크/AI 제안/인라인 AI를 갱신하도록 연동
- Split View(좌우/상하 분할, 크기 조절, 패널 닫기)는 기존 구조 유지하면서 패널별 독립 탭과 결합

변경 파일

- components/editor/split-demo/types.ts
- components/editor/split-demo/mockData.ts
- components/editor/split-demo/TabBar.tsx (신규)
- components/editor/split-demo/FolderTree.tsx (신규)
- components/editor/split-demo/NoteSidebar.tsx
- components/editor/split-demo/PaneLeafView.tsx
- components/editor/split-demo/PaneTreeRenderer.tsx
- components/editor/split-demo/ContextPanel.tsx
- components/editor/split-demo/SplitDemoClient.tsx
- package.json

비고

- 본 항목 이후 CHANGELOG 운영이 시작되어 정확한 작업 시각은 추정치임. 기존 Split View/탭/사이드바 기능은 제거하지 않고 확장 형태로 구현함.
