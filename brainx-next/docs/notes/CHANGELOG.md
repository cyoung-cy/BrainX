# Notes Changelog

## 2026-06-22 07:40

### Fixed

- **Mermaid 코드 편집 진입 직후 포커스아웃해도 다이어그램 보기로 전환되지 않는 문제**(`NoteEditor.tsx`): `mermaidAutoPreview` 플러그인(appendTransaction)과 `onBlur` 핸들러가 둘 다 "트랜잭션 전/후 selection의 조상 노드"를 기준으로 편집 중인 mermaid 블록을 찾고 있었다. `</>` 버튼 클릭은 `onMouseDown`에 `preventDefault`가 걸려 있어 클릭해도 selection이 그 블록으로 전혀 옮겨가지 않고, 다이어그램 더블클릭도 텍스트 위치로 깔끔하게 매핑되지 않을 수 있다 — 두 경우 모두 "selection이 그 블록을 거쳐갔다"는 전제 자체가 거짓이 되어, 타이핑 없이 바로 다른 곳을 클릭하면 그 전제에 의존하던 두 훅이 모두 못 잡았다. **수정**: 두 곳 모두 selection 경로에 의존하지 않고 문서 전체(`doc.descendants`)에서 `preview:false`인 mermaid 코드블록을 직접 찾아, 그 범위 밖으로 selection이 벗어났는지(또는 에디터 전체가 blur됐는지) 직접 판정하도록 변경 — 어떤 방식(타이핑/`</>`버튼/더블클릭)으로 편집에 들어갔는지와 무관하게 항상 정확히 동작한다.
- **위 수정이 적용된 직후 다른 노트로 바로 전환하면 되돌린 내용이 저장되지 않는 문제**(`NoteEditor.tsx`): 본문 변경은 400ms 디바운스로 `onContentChange`에 동기화되는데, 노트를 전환하면(`[note.id, editor]` effect) 그 디바운스 타이머를 flush 없이 그냥 `clearTimeout`만 했다 — onBlur가 되돌린 `preview:true`가 디바운스가 끌리기 전에 노트 전환이 일어나면 저장되지 못한 채 사라져, 그 노트를 다시 열면 코드 편집 상태로 보였다. onBlur가 mermaid 블록을 되돌릴 때는 디바운스를 기다리지 않고 그 자리에서 즉시 `onContentChange`를 호출하도록 수정(다른 입력의 일반 디바운스 동작은 그대로 유지, 이 보정 케이스에만 한정).

### Checked (Playwright 실측)

- `</>` 클릭으로 편집 진입 → 타이핑 없이 곧바로 제목 클릭 → 다이어그램 자동 전환 확인(수정 전엔 실패하던 정확한 재현 케이스).
- 더블클릭으로 편집 진입 → 타이핑 없이 곧바로 제목 클릭 → 다이어그램 자동 전환 확인.
- 더블클릭으로 편집 진입(타이핑 없음) → 곧바로 다른 노트로 전환 → 원래 노트로 복귀 시 다이어그램 상태로 정상 저장되어 있음을 확인(즉시 flush 수정 검증).
- 코드 작성 후 Esc → 다이어그램 전환(기존 동작 회귀 없음).
- Mermaid 문법 오류 상태에서 포커스아웃 시에도 보기 전환 + 오류 UI 텍스트 유지 확인.
- 일반(비-mermaid) 코드블록은 포커스아웃해도 내용/상태 그대로 유지(영향 없음) 확인.
- Bubble Toolbar(굵게 적용), Split View(분할 후 에디터 인스턴스 2개) 정상 동작 확인.
- `npx tsc --noEmit`, `npm run build` — 전부 통과.

---

## 2026-06-22 05:10

### Added

- **문서 전체 타이포그래피 설정**(`TypographyPopover.tsx`, `lib/notes/typography.ts` 신규): 노트 제목 옆 "서식" 버튼 → 패널에서 (1) "기본 글꼴 크기" 배율(80~150%)을 바꾸면 본문/H1/H2/H3가 고정 비율(1.8/1.35/1.1, 기존 CSS의 em 비율과 동일)로 함께 커지고 작아짐, (2) 같은 패널에서 본문/H1/H2/H3 각각 px 단위 개별 오버라이드(설정한 레벨은 전역 배율과 무관하게 그 값 유지), (3) 노트 전체 기본 글꼴(폰트 패밀리) — Bubble Toolbar의 기존 "Aa"(선택한 텍스트에만 적용)와 안내 문구로 명확히 구분("이 노트 전체에 적용됩니다" vs "텍스트를 선택한 뒤 사용"). `app/globals.css`의 `.tiptap-note-content .ProseMirror`/`h1`/`h2`/`h3` font-size를 `var(--note-fs-*, 기존값)`으로 바꿔, 설정하지 않은 노트는 기존 모양과 100% 동일하게 유지하면서 설정한 노트만 인라인 스타일로 덮어쓴다. `MockNote.typography` 필드 추가, `NotesWorkspace`→`PaneTreeRenderer`→`EditorPanel` 경로로 `onTypographyChange` 콜백 추가.
- **내부 노트 링크**(`NoteEditor.tsx`의 `LinkPopover` 신규, 기존 Link 버튼 교체): 기존 "링크" 버튼이 `window.prompt`로 외부 URL만 받던 것을 팝오버 UI로 교체하면서 "외부 URL"/"노트 연결" 두 탭을 추가했다. "노트 연결"은 선택한 임의 텍스트(앵커)를 그대로 두고 다른 노트로 가는 링크만 붙인다(`brainx-note://<id>` href, 노트 검색 가능). 위키링크 `[[제목]]`은 항상 제목 자체가 보이는 텍스트가 되므로, "앵커 텍스트 ≠ 노트 제목"인 경우(예: "RabbitMQ 정리 글 참고"라는 문장에 링크만 거는 경우)를 보완하는 별도 기능이며 위키링크를 대체하지 않는다. 읽기 모드는 클릭으로 이동, 편집 모드는 Ctrl/Cmd+클릭으로만 이동(일반 클릭은 편집을 위해 그대로 둠). `@tiptap/extension-link`의 기본 `protocols` 허용목록에 커스텀 스킴(`brainx-note`)을 추가해야 해당 링크가 실제로 적용됨(StarterKit `link` 옵션).

### Fixed

- **Mermaid 코드 편집 상태의 상시 "보기" 버튼 제거**(`CodeBlockView.tsx`): 요청에 따라 제거. Esc 키맵과 신규 포커스 아웃 자동 전환만으로 다이어그램 보기로 돌아가며, 크기 비율 툴바(맞춤/원본/50~150%/사용자 지정)는 그대로 유지.
- **Mermaid 포커스 아웃 시 자동 다이어그램 전환**(`NoteEditor.tsx`): 코드블록 안에서 다른 블록을 클릭하는 경우는 `mermaidAutoPreview`라는 `appendTransaction` 기반 ProseMirror 플러그인(선택이 코드블록 밖으로 이동하면 `preview:true`로 전환)으로 잡고, 제목 클릭·다른 노트 클릭처럼 에디터 DOM 밖으로 포커스가 완전히 나가는 경우(이 경우는 에디터 내부 selection 자체가 안 바뀌어 위 플러그인이 못 잡음)는 `onBlur` 핸들러에서 한 번 더 직접 확인해 전환한다.
- **컨텍스트 패널 첫 드래그가 듯하게 동작하지 않는 문제(두 번째 드래그부터 정상)**(`NotesWorkspace.tsx`): `react-resizable-panels`의 `Separator`가 내부 드래그 거리 계산을 트러스트된(`isTrusted:true`) 첫 포인터 제스처 기준으로만 올바르게 초기화하는 라이브러리 자체의 동작 — `groupRef.setLayout()`/`window.dispatchEvent(resize)`/강제 리플로우/synthetic PointerEvent 등 5가지 우회를 시도했지만 전부 실패(Playwright로 직접 검증). 해결: 공식 `Separator`를 네이티브 `mousedown`/`mousemove`/`mouseup` 리스너로 직접 퍼센트를 계산해 `groupRef.current.setLayout()`을 호출하는 커스텀 `<div role="separator">`로 교체 — 라이브러리의 내부(버그가 있는) 드래그 추적 경로를 완전히 우회한다. 키보드 ArrowLeft/Right 너지, `localStorage` 저장/복원, min/max 클램프(16~42%)는 모두 유지.
- **노트 hover 카드의 "마지막 수정"이 7일 이상 지난 노트에서 날짜만 표시되고 시간이 빠지는 문제**(`lib/notes/formatDate.ts`): `formatRelativeTime()`의 7일 초과 폴백 분기가 `formatAbsoluteDate`(시간 없음)를 호출하고 있었다 — "생성일"은 항상 `formatAbsoluteDateTime`(시간 포함)을 직접 쓰는 것과 표시 형식이 갈리던 원인. mock 데이터(`updatedAt`/`createdAt`)는 정상이라 mock 문제가 아니라 실제 구현 버그였음 — 폴백 호출을 `formatAbsoluteDateTime`으로 교체.

### Reviewed (구현하되 보고만 남긴 항목)

- **Mermaid hover `</>` 버튼이 "여러 번 hover해야 보인다"는 제보**: z-index/포인터이벤트/마운트 타이밍 점검, Playwright로 즉시 hover·반복 hover 모두 100ms 이내 정상 표시 확인 — 추가 버그 재현 실패. 직전 작업(`</>` 버튼을 `BlockSizeToolbar`와 같은 portal로 합친 수정)이 같은 증상을 이미 해소한 것으로 결론, 별도 수정 없음.

### Checked (Playwright 실측)

- Typography: "기본 글꼴 크기" 100%→120% 변경 시 본문 13px→15.6px, H1 23.4px→28.1px, H2 17.55px→21.1px, H3 14.3px→17.2px로 동일 비율 확대 확인. H1만 50px로 개별 오버라이드 시 H2는 영향 없이 21.1px 유지 확인. "기본값으로 되돌리기" 후 변경 전 값과 완전히 동일 확인. 문서 기본 글꼴 "Serif" 적용 시 `font-family: Georgia, "Times New Roman", serif` 확인.
- 내부 노트 링크: 문단 텍스트 선택("Spring은 Java...") → "노트 연결" → "RabbitMQ" 검색 → 선택 시 앵커 텍스트 그대로 유지된 채 `href="brainx-note://rabbitmq"` 적용 확인. 편집 모드 일반 클릭은 이동 안 함(제목 동일 유지), Ctrl+클릭은 "RabbitMQ 정리"로 이동 확인. 읽기 모드 일반 클릭도 이동 확인. 외부 URL(`https://example.com`) 적용도 별도로 확인.
- Mermaid 회귀: "보기" 버튼 0개 확인, Esc 후 다이어그램(svg) 표시 확인, hover 시 `</>` 버튼 + 크기 툴바 동시 표시 확인(스크린샷으로 시각 확인), 제목 클릭 시 자동 보기 전환 확인. 정상(비-mermaid) 코드블록은 영향 없음.
- `npx tsc --noEmit`, `npm run build` — 전부 통과(30개 라우트 생성 성공).

---

## 2026-06-22 02:24

### Added

- **글자 크기/글꼴 기능**(`fontExtensions.ts` 신규): 새 패키지(`@tiptap/extension-font-size`/`-font-family`) 추가 없이, 기존 설치된 `@tiptap/extension-text-style`의 `textStyle` mark에 `fontSize`/`fontFamily` 속성을 추가하는 방식으로 구현(Color가 이미 같은 패턴 사용 중 — `mergeAttributes`가 `style` 속성을 자동으로 합쳐서 색상·크기·글꼴이 동시에 적용돼도 충돌하지 않음). Bubble Toolbar에 "Aa" 토글 버튼 → 작은 팝오버(글자 크기 프리셋 12/14/16/18/24px + 사용자 지정, 글꼴 기본/Pretendard/Noto Sans KR/Serif/Monospace) 추가. 상단 고정 툴바·슬래시 커맨드가 이 프로젝트에 아직 없어 기존 색상 더보기 팝오버와 동일한 패턴으로 Bubble Toolbar에 넣었다.
- **Wiki Link 기능**(`WikiLinkNode.tsx`/`WikiLinkContext.tsx`/`WikiLinkSuggestion.ts`/`WikiLinkAutocomplete.tsx` 신규): `[[노트]]`/`[[노트|별칭]]`/`[[노트#헤딩]]` 입력 형태를 inline atom 노드로 변환(`]]`까지 입력하는 순간 `nodeInputRule`이 매치). 존재하는 노트는 파란 밑줄(클릭 시 활성 패널에서 이동), 존재하지 않는 노트는 주황 점선 밑줄 + 생성 아이콘(클릭 시 그 제목으로 즉시 노트 생성 후 이동). 제목 해석은 정확히 일치 → 부분 일치(유일할 때만)로 단순 텍스트 치환이 아니라 실제 노트 목록(`NotesWorkspace`의 `notes` state)을 본다. `[[` 입력 시 자동완성 드롭다운(노트 목록 필터링 + "새 노트 만들기" 옵션, ArrowUp/Down/Enter/Escape 키보드 네비게이션) — 트리거 감지(`WikiLinkSuggestion`, 여러 에디터 인스턴스가 공유하는 정적 플러그인)와 후보 필터링/삽입(`WikiLinkAutocomplete`, 인스턴스별 React 컴포넌트)을 분리해서 구현. `lib/notes/mockNotes.ts`에 "JPA 정리" 노트 추가(요청된 mock 데이터 중 유일하게 없던 것).
- **노트 탐색기 hover 정보 카드**(`HoverInfoCard.tsx`, `lib/notes/formatDate.ts` 신규): 폴더에 450ms 이상 마우스를 올리면 하위 폴더/노트 개수, 노트는 마지막 수정·생성일(상대시간 + 절대 날짜)을 보여주는 카드가 document.body portal로 뜬다. 빠르게 여러 행을 훑을 때 깜빡이지 않도록 지연 후 표시, 벗어나면 즉시 숨김. `FolderTree.tsx`의 트리 행과 `NotesExplorer.tsx`의 즐겨찾기 섹션 행(별도 렌더링 경로라 따로 추가) 둘 다 적용.
- **컨텍스트 패널 리사이즈**: 고정 270px였던 우측 컨텍스트 패널을 Split View(`PaneTreeRenderer.tsx`)와 동일한 `react-resizable-panels`(`Group`/`Panel`/`Separator`)로 감싸 드래그로 폭 조절 가능(최소 16%, 최대 42%). 마지막 폭은 `localStorage`(`brainx_notes_context_panel_size_v1`)에 저장해 새로고침 후에도 유지.
- **접기/펼치기 아이콘 공유 컴포넌트화**(`CollapseChevron.tsx` 신규): `NotesExplorer`/`FolderTree`/`RightSidebar`가 각자 따로 구현했던 "ChevronRight(▶)=접힘, ChevronDown(▼)=펼침" 패턴(이미 전부 동일한 아이콘 선택을 쓰고 있었음, 코드만 흩어져 있었음)을 한 컴포넌트로 통일.

### Fixed

- **Mermaid hover 시 `</>` 버튼이 크기 툴바에 가려지는 문제**: 크기 툴바(`BlockSizeToolbar`)가 `document.body` portal(z-index 2000)로 뜨면서, 같은 다이어그램 우상단 좌표에 독립적으로 떠 있던 `</>` 오버레이(로컬 z-index 10)를 위치 계산이 분리돼 있어 가렸다. `</>` 버튼을 `BlockSizeToolbar`의 `extra` prop으로 합쳐 항상 같은 portal·같은 위치에 뜨게 해 구조적으로 가려질 수 없게 했다.
- **표 툴바가 우측 컨텍스트 패널 영역까지 넘어가 오른쪽 끝 버튼이 가려지는 문제**: 기존엔 `window.innerWidth` 기준으로만 클램프해서 컨텍스트 패널이 차지하는 폭을 고려하지 않았다. `editor.view.dom`(`.ProseMirror`, 노트 작성 영역 자체)의 bounding rect를 안전 영역으로 써서 클램프하도록 변경. 추가로 이번에 Bold/Italic/색상까지 합쳐지며 툴바가 더 넓어졌는데도 좌표 계산은 옛 470px 가정을 그대로 쓰고 있어 안전 영역 계산(`maxWidth`)과 모순되던 부분도 같이 고쳤다(`toolbarRef.scrollWidth`로 실측한 폭을 기준으로 좌표 계산).

### Reviewed (구현하되 보고만 남긴 항목 없음 — 전부 구현 또는 명확한 보류 사유 기록)

- **Mermaid 더블클릭 편집 진입**: 검토 후 구현. Obsidian류 임베드 UX와 일치하고, 다이어그램 SVG 자체에 클릭 가능한 네이티브 인터랙션이 없어 오동작 위험이 낮다고 판단(기존 `</>` 버튼은 그대로 유지, 더블클릭은 추가 진입 경로).
- **셀 단위 테두리**: 이전 작업에서 이미 보류 결정(구조 변경 필요, `border-collapse` → `separate` 전환 필요) — 이번에도 변경 없음.

### Checked (Playwright 실측)

- Mermaid: Esc → 보기 전환(기존 기능, 회귀 없음 재확인), hover 시 `</>` 버튼이 더 이상 가려지지 않음(elementFromPoint로 직접 확인, 클릭 정상 동작), 더블클릭으로 코드 편집 진입 성공, 보기 상태 hover 전/후 다이어그램 box 완전 동일(레이아웃 시프트 없음).
- 표 툴바: 150% 폭 표에서 우측 끝(표 삭제 버튼)이 컨텍스트 패널에 가려지지 않고 항상 보임(좌표 비교로 안전 영역 안에 들어옴을 확인).
- 폰트: Bubble Toolbar에서 24px/Serif 적용 성공(`style="font-size: 24px"`/`style="font-family: ..."` 직접 확인).
- Wiki Link: `[[Spring 정리]]` 입력 → 파란 링크 생성 → 클릭 시 실제로 "Spring 정리" 노트로 이동 성공. `[[완전히 새로운 토픽]]`(존재하지 않음) → 주황 점선 생성 후보 → 클릭 시 그 제목으로 노트 생성 후 이동 성공. `[[jpa` 입력 → 자동완성에 "JPA 정리" + "새 노트 만들기" 노출, Enter로 기본 선택(JPA 정리) 삽입 성공, ArrowDown으로 두 번째 항목 이동 후 Enter로 새 노트 생성도 성공.
- 컨텍스트 패널 리사이즈: 구분선 드래그로 폭 변경 확인(202px → 217px), `localStorage`에 비율 저장 확인.
- Hover 카드: 폴더(즐겨찾기 섹션 + 일반 트리) hover 450ms 후 "N개의 폴더/N개의 노트" 카드 노출, 벗어나면 즉시 사라짐. 노트도 동일(마지막 수정/생성일 표시).
- 회귀: 일반 Bubble Toolbar(표 밖), 코드블록 하이라이팅, Split View(패널 2개 생성 + 우측 패널 선택 시 버블 툴바가 그 패널 위치에만 뜸) — 전부 정상.
- `npx tsc --noEmit`, `npm run build` — 전부 통과(30개 라우트 생성 성공).

---

## 2026-06-19 19:40

### Fixed

- **이미지 파일 삽입 버튼이 사실상 발견 불가능했던 버그**: 직전 버전(17:30)에서 추가한 "이미지 파일 삽입"/"이미지 URL로 삽입" 버튼이 `NoteEditor.tsx`의 `.split-pane-editor`(노트 본문 전체 높이만큼 늘어나는 `position:relative` div) 기준 `absolute bottom-1.5 right-1.5`로 배치돼 있었다. 노트가 한 화면을 넘기는 길이면 버튼이 노트 맨 끝(스크롤을 끝까지 내려야 보이는 위치)에 가 있어 사실상 못 찾는 상태였음 — 사용자가 클립보드 붙여넣기는 되는데 "로컬 파일 삽입"을 못 찾겠다고 보고해 발견. **수정**: 버튼을 `EditorPanel.tsx`의 패널 최상위 root(`relative flex h-full flex-col overflow-hidden`, 패널의 뷰포트 높이에 고정 — 기존 드래그앤드롭 오버레이와 동일 기준)로 옮겨, 스크롤 위치와 무관하게 항상 같은 화면 위치(패널 우하단)에 고정되게 했다. `NoteEditor.tsx`는 `NoteEditorHandle`에 `insertImageFile`/`insertImageUrl`/`insertTable` 메서드를 노출하고, `EditorPanel.tsx`가 ref로 호출하는 방식으로 책임을 분리(기존 `focusStart`/`flushPendingSave` 패턴과 동일).

### Added

- **표(Table) 기능 신규 구현**: `@tiptap/extension-table@3.27.0`(다른 tiptap 패키지와 동일하게 고정 버전) 추가. 단일 패키지가 `Table`/`TableRow`/`TableHeader`/`TableCell`을 모두 export하므로 별도 `-row`/`-cell`/`-header` 패키지 불필요(npm pack으로 실제 패키지 내용 확인 후 결정).
- **행/열 지정 삽입**: 새 컴포넌트 `TableInsertPopover.tsx`("표 삽입" 버튼, 행/열 숫자 입력 + 빠른 선택 2×2/3×3/4×4 + "삽입") — `editor.commands.insertTable({ rows, cols, withHeaderRow: true })` 호출. `ColorPalette.tsx`의 `MoreColorPopover`와 동일한 토글+outside-click-to-close 패턴, 숫자 입력은 `BlockControls.tsx`의 `CustomPercentInput`과 동일한 "blur/Enter 커밋" 패턴(매 keystroke마다 부모 state를 바꾸지 않음 — 이전 라운드에서 이 패턴 위반으로 입력이 깨지는 버그를 겪은 적이 있어 처음부터 안전한 패턴으로 작성).
- **삽입 후 행/열 추가·삭제**: 새 컴포넌트 `TableToolbar.tsx` — 표 안에 커서가 있으면 자동으로 떠서 위/아래 행 추가, 행 삭제, 좌/우 열 추가, 열 삭제, 표 삭제 버튼을 제공(`addRowBefore`/`addRowAfter`/`deleteRow`/`addColumnBefore`/`addColumnAfter`/`deleteColumn`/`deleteTable` — 전부 `@tiptap/extension-table`이 기본 제공하는 커맨드). `Table`/`TableCell`이 자체 NodeView(`TableView`, 순수 JS)를 쓰기 때문에 Mermaid/이미지처럼 React NodeView 안에 hover 툴바를 끼워넣을 수 없어, `CustomBubbleMenu`와 동일한 아키텍처(selection 구독 → `editor.isActive("table")`로 판정 → 표 DOM 좌표 계산 → `createPortal`)로 별도 구현. 다만 "표 안에 있는지"는 PM 모델의 조상 노드 체인을 보는 구조적 판정이라, 버블 툴바를 여러 번 고쳐야 했던 "native selection이 드래그 중 일시적으로 collapse되는" 문제에 영향받지 않아 settling 같은 방어 로직 없이 단순하게 구현함.
- **표 스타일**(`app/globals.css`): 테두리/패딩/헤더 행 배경/선택된 셀 강조/컬럼 리사이즈 핸들/리사이즈 커서. `.tableWrapper`/`.column-resize-handle`/`.selectedCell`/`.resize-cursor`는 확장이 자동으로 붙이는 고정 클래스명(설정 불가)이라 CSS가 반드시 필요했음.
- 셀 안 텍스트 Tab/Shift+Tab 이동, 셀 안 텍스트 드래그 선택 시 기존 버블 툴바(Bold 등) 정상 동작 — 둘 다 확장의 기본 동작이라 추가 코드 없이 정상 작동 확인.

### Known limitation (구현했지만 일부 동작 안 함)

- **컬럼 드래그 리사이즈는 동작하지 않음**: `Table.configure({ resizable: true })`로 설정했지만, `@tiptap/extension-table`의 내부 구현이 `addProseMirrorPlugins()` 시점에 `this.options.resizable && this.editor.isEditable`을 **한 번만** 평가해서 리사이즈 플러그인을 넣을지 결정한다(소스 직접 확인: `dist/table/index.js`). 그런데 이 프로젝트의 `NoteEditor.tsx`는 `useEditor({ editable: false, ... })`로 항상 비편집 상태로 에디터를 먼저 생성하고, 이후 `useEffect`에서 `editor.setEditable(mode==="edit")`로 늦게 전환하는 패턴을 쓴다 — 즉 확장이 `isEditable`을 확인하는 그 순간엔 항상 `false`라서, `resizable:true`로 설정해도 리사이즈 플러그인이 절대 추가되지 않는다.
  - **고치지 않은 이유**: 가장 확실한 수정은 `useEditor`의 초기 `editable`을 `true`로 바꾸는 것인데, 이러면 "읽기 모드로 저장된 탭"을 열 때 `setEditable(false)`가 적용되는 effect 실행 전까지 한 프레임 정도 편집 가능한 것처럼 보일 위험이 있다(탭별 읽기/편집 모드는 이 프로젝트의 핵심 정책 중 하나라 가벼이 건드리지 않기로 함). 표 자체 렌더링/타이핑/행렬 추가삭제/Tab 이동은 이 버그와 무관하게 전부 정상 동작(직접 확인) — 영향 범위는 "컬럼 폭을 마우스 드래그로 조절하는 기능" 하나로 한정됨.
  - 행/열 추가·삭제로 셀 개수를 바꾸는 방식으로 우회 가능. 추후 `editable` 초기화 패턴을 손볼 일이 생기면 같이 해결 권장.

### Checked (Playwright 실측)

- 이미지 버튼: 긴 노트(Spring 정리)를 열고 본문 끝까지 스크롤해도 버튼이 화면상 같은 위치에 고정됨(좌표 비교로 확인) — 핵심 회귀 테스트 통과.
- 표 삽입(5행×2열 등 임의 크기), 헤더 행 스타일, 셀 입력 + Tab 이동, 행 추가/삭제, 열 추가/삭제, 표 밖으로 나가면 툴바 사라짐 — 전부 성공.
- 셀 범위 선택 시 `.selectedCell` 강조 — 성공.
- 표 안에서 텍스트 드래그 선택 → 버블 툴바 표시 → Bold 적용 — 성공(테이블 셀 안 selection은 이번에 처음 테스트된 케이스).
- 탭 전환 후 표 콘텐츠 보존(저장 라운드트립) — 성공.
- 회귀: 버블 툴바(드래그선택/클릭해제/Bold), 기존 코드블록(언어선택), Mermaid 렌더링, 이미지 URL 삽입, Split View — 전부 정상. 콘솔에 경고/에러 0건(Duplicate extension 경고 없음 확인).
- 컬럼 리사이즈 핸들: 위 "Known limitation" 참고 — 동작하지 않음을 직접 확인(소스 분석으로 원인까지 특정).

---

## 2026-06-19 17:07

### Reviewed / classification

- **A. 바로 구현 가능**: 하단 삽입 아이콘 제거, 본문/표 우클릭 메뉴, Mermaid 문구·`</>` 편집 버튼, Mermaid·이미지 크기 프리셋 확장, 표 전체 크기·색상·테두리, TipTap 행/열/표 삭제 및 병합/해제 커맨드, 표 가장자리 행/열 추가 버튼, 라이트/다크 표 스타일.
- **B. 구조 변경 필요**: TipTap Table 리사이즈 플러그인은 에디터 생성 시 `isEditable`을 한 번만 평가하므로, 에디터를 `editable:true`로 생성한 뒤 `useLayoutEffect`에서 실제 탭 모드를 첫 paint 전에 적용하는 구조로 변경. 리사이즈용 `TableView`가 갱신 시 커스텀 표 속성을 DOM에 반영하지 않아 `BrainXTableView`에서 클래스/크기/색상/테두리 속성을 동기화하도록 보강.
- **C. 외부 라이브러리 필요**: 없음. 기존 `@tiptap/extension-table`, ProseMirror table commands, React portal만 사용.
- **D. 브라우저 제약**: 커스텀 메뉴의 범용 붙여넣기는 Clipboard API 권한/secure context/브라우저 정책에 따라 실패할 수 있어 실행 기능을 넣지 않고 비활성 안내(`Ctrl+V`)로 제공. 기존 키보드 붙여넣기와 이미지 클립보드 삽입은 유지.

### Changed

- 패널 우하단 `EditorInsertButtons`를 제거하고 `EditorContextMenu.tsx`를 추가. 본문 우클릭에서 이미지 파일, 이미지 URL, 행/열 지정 표 삽입을 제공하며 표 안에서는 행/열 추가·삭제, 표 삭제, 셀 병합/해제, 표 색상, 테두리 굵기를 제공.
- Mermaid/이미지 공통 크기 옵션을 맞춤/원본/50/75/100/125/150/사용자 지정(10~200%)으로 확장. 100% 초과 및 원본 콘텐츠는 바깥 프레임을 패널 폭에 고정하고 안쪽 콘텐츠만 확대해 블록 내부에만 가로 스크롤이 생기도록 분리.
- Mermaid의 "미리보기"를 "다이어그램 보기"로 변경하고 렌더 상태 편집 버튼을 `</>`로 교체. `title`/`aria-label`을 추가하고 기존 문법 오류 UI 유지.
- 표 툴바에 전체 크기 선택/사용자 지정 비율을 추가하고, 오른쪽/아래쪽 가장자리 `+` 버튼을 추가. 툴바 내부 select/input으로 포커스가 이동할 때 툴바가 닫히지 않도록 blur 처리 보강.
- 표 테두리 대비, 헤더 구분, 행/열/셀 hover, 선택 셀, 색상 프리셋, 1/2/3px 테두리 스타일을 추가. 색상/테두리는 안전하게 표 전체 단위로 저장.

### Fixed

- `editable:false` 초기화 때문에 등록되지 않던 TipTap `columnResizing` 플러그인을 정상 등록해 열 너비 드래그 조절을 복구.
- 리사이즈 활성화 시 TipTap이 `HTMLAttributes.class`를 `TableView`에 전달하지 않아 `note-table` 스타일이 사라지는 문제를 `BrainXTableView`에서 보정.
- Mermaid에서 "원본 → 다른 비율" 순서로 바꾸면 SVG 원본 `max-width`가 되살아나던 문제를 매 렌더 직후 스타일 보정하도록 수정.

### Checked (Playwright/Chrome 실측)

- 본문 우클릭 메뉴 4개 항목 표시, 하단 이미지/URL/표 버튼 0개, 이미지 URL 삽입, 파일 입력 트리거 및 파일 `change` 삽입, 3×4 표 삽입 성공.
- 이미지 맞춤/원본/50/75/100/125/150: 1200px 원본과 150% 모두 블록 내부 스크롤, 문서 전체 overflow 없음.
- Mermaid 맞춤/원본/50/75/100/125/150, `</>` → 코드 편집, "다이어그램 보기" → SVG 렌더, 고의 문법 오류 표시 성공.
- 표 150% 및 사용자 지정 180% 내부 스크롤, 열 드래그 폭 `25px → 307px`, 행/열 추가·삭제, 가장자리 `+`, 표 삭제, 색상/테두리, 2셀 병합/해제 성공.
- Split View 2개 패널(각 본문 281px)에서 150% 표가 `clientWidth 281 / scrollWidth 422`, 페이지는 `clientWidth 1440 / scrollWidth 1440`으로 레이아웃 유지.
- Split View에서 텍스트 선택 후 Bubble Toolbar 표시, 새 페이지 런타임 콘솔 경고/오류 0건.
- `next build`: 번들 컴파일 성공. 전체 TypeScript 단계는 기존 `components/graph-screen.tsx:466`의 `boolean | undefined` 오류로 실패(이번 변경 파일 오류 없음).

### Not implemented / limitation

- 커스텀 컨텍스트 메뉴 "붙여넣기" 실행은 브라우저 보안 제약 때문에 비활성 안내로만 제공.
- 표 색상/테두리는 선택 셀 범위가 아닌 표 전체 단위. 셀 병합은 TipTap의 다중 `CellSelection`일 때만 활성화.

---

## 2026-06-19 17:30

### Added

- **Mermaid 코드블록 인식 + 언어 드롭다운**: 코드블록 언어 목록(`CodeBlockView.tsx`의 `ALL_LANGS`)에 "Mermaid" 추가. 언어 검색에서 "mermaid"로 찾아 선택 가능.
- **```mermaid / ```Mermaid / ```MERMAID 대소문자 모두 인식**: 기존 fence 생성 경로 2곳(`MarkdownCodeFenceEnter`의 Enter 단축키, `CodeBlockLowlight`의 space-트리거 `textblockTypeInputRule`) 모두 `[a-zA-Z]+`로 바꾸고 `getAttributes`에서 소문자로 정규화하도록 수정. 이전엔 Enter 경로만 대소문자를 허용했고 space 경로는 소문자(`[a-z]+`)만 허용해 불일치가 있었음.
- **Mermaid 렌더링**: `mermaid`(v11) 패키지를 동적 `import()`로 로드해 SVG로 렌더링(`MermaidPreview.tsx`). flowchart/sequence/class/state/pie/gantt/mindmap 등 mermaid가 지원하는 모든 다이어그램 타입을 별도 코드 추가 없이 동일하게 지원(전부 같은 `mermaid.render()` 호출 하나로 처리됨). 다크/라이트 테마에 맞춰 매 렌더 시 `mermaid.initialize({theme})`를 다시 호출.
- **편집/미리보기 전환**: 코드블록에 `preview`(boolean) 속성 추가. "미리보기" 버튼(편집→렌더링) / "코드 편집" 버튼(렌더링→편집, hover 시 노출되는 정렬·크기 툴바 옆)으로 전환. 새로 fence를 입력해 만든 블록은 항상 `preview:false`(편집 모드)로 시작 — 이유는 "수정한 부분" 항목 참고.
- **렌더링 오류 표시**: mermaid 문법 오류 시 코드블록 내부에 에러 메시지를 표시하고 예외를 던지지 않음(에디터 전체에 영향 없음). Playwright로 의도적으로 깨진 문법을 입력해 실제 확인.
- **정렬/크기 조절 공통 컴포넌트**(`BlockControls.tsx`): 좌/중/우 정렬 + 폭 맞춤/원본/75%/50%/사용자 지정(%) 프리셋. Mermaid·이미지 블록이 공유. 기본값은 가운데 정렬 + 폭 맞춤(요청하신 정책대로). hover 시에만 노출, 비노출 상태에서는 `pointer-events: none`으로 처리해 안 보이는 컨트롤이 클릭을 가로채지 않게 함(아래 "수정한 부분" 참고).
- **이미지 블록**(`ImageBlockNode.tsx`, 신규 커스텀 TipTap 노드 — `@tiptap/extension-image` 패키지 추가 없이 `@tiptap/core`의 `Node`/`nodeInputRule`만으로 구현): 정렬/폭 조절은 Mermaid와 동일한 `BlockControls` 공유. 로드 실패 시 깨진 이미지 아이콘 + 안내 문구 표시.
- **이미지 삽입 4가지 경로 전부 구현 및 확인**:
  - 파일 선택: 본문 우하단의 작은 아이콘 버튼(hover 시에만 또렷하게) → 숨김 `<input type=file>` 트리거.
  - 드래그 앤 드롭: `editorProps.handleDrop`에서 `event.dataTransfer.files` 중 이미지 파일만 가로챔(사이드바 노트 드래그용 기존 오버레이는 `dragPayload` 기반의 별도 메커니즘이라 충돌 없음).
  - 클립보드 붙여넣기: `editorProps.handlePaste`에서 `event.clipboardData.files` 확인.
  - URL: 같은 버튼 옆 "URL로 삽입" 버튼(`window.prompt`, 기존 링크 버튼과 동일 패턴) + 마크다운 `![alt](url)` 타이핑 시 자동 변환(`nodeInputRule`).
  - 저장 방식: 파일 업로드/드롭/붙여넣기는 base64 data URL로 노트 HTML에 직접 저장(백엔드 업로드 API 없음). **TODO: 운영 환경에서는 S3/MinIO에 업로드 후 반환된 asset URL을 src로 저장해야 함** — 코드 내 주석으로도 표시.

### Fixed

- **(회귀 가능성 있던 버그, 출시 전에 잡음) 빈 Mermaid 블록에 타이핑하면 첫 글자만 입력되고 나머지가 사라짐**: `preview` 속성이 `true`(기본값)인 상태에서 텍스트가 비어있지 않게 되는 즉시 편집 영역을 `display:none`으로 숨기도록 만들었던 1차 구현이 원인 — 그 순간 포커스가 있던 `<pre>`가 숨겨지며 브라우저가 강제로 blur시켜 이후 키 입력이 전부 날아감(Playwright로 실제 재현·확인: "graph TD..." 입력 시 "g" 한 글자만 들어감). 새로 만든 블록은 항상 `preview:false`로 시작하고, 이후 전환은 명시적 버튼 클릭으로만 일어나도록 변경해 해결.
- **사용자 지정 비율(%) 입력이 타이핑 중 NodeView 재렌더와 충돌해 포커스가 깨지는 문제**: 매 keystroke마다 `updateAttributes`를 호출하던 1차 구현 대신, 로컬 draft state에만 반영하다가 blur/Enter 시점에 한 번만 커밋하는 방식으로 변경(기존 `CodeBlockView` 파일명 입력의 `commitFile` 패턴과 동일).
- **숨겨진(opacity:0) hover 툴바가 안 보이는 상태에서도 클릭을 가로채던 문제**: Mermaid/이미지 블록이 문서 맨 앞에 있을 때 그 블록 자신의 hover 툴바와 본문 우하단의 전역 "이미지 삽입" 버튼이 같은 영역에 겹쳐, 안 보이는 입력창이 버튼 클릭을 막는 현상을 Playwright로 발견(`subtree intercepts pointer events` 오류). hover 가능 영역 전체에 `pointer-events-none` 기본값 + `group-hover:pointer-events-auto`를 적용해 해결. 전역 이미지 삽입 버튼은 충돌 가능성을 더 줄이기 위해 위치를 우상단→우하단으로 이동.
- **파일 선택 버튼이 일부 환경에서 네이티브 파일 다이얼로그를 못 여는 문제**: 숨김 `<input type=file>`을 Tailwind `hidden`(`display:none`)으로 처리했더니 `.click()` 호출 시 다이얼로그가 안 열리는 경우가 있었음(Playwright로 실측) — `display:none` 대신 `position:absolute; width:1px; height:1px; opacity:0`로 레이아웃에는 존재하되 안 보이게 바꿔 해결.

### Checked (Notes 라우트/Mock Data)

- **검토 결과: 이미 올바르게 구현돼 있어 변경하지 않음.** `/notes/[id]` 동적 라우트가 이미 존재(`app/(app)/notes/[id]/page.tsx`)하고, `lib/notes/mockNotes.ts`의 `getNoteById(id)`가 `MockNote.id` 필드로만 조회한다. `id`는 `title`과 완전히 분리된 별도 필드라 제목을 바꿔도(`EditorPanel.tsx`의 `commitTitle` → `onTitleChange(note.id, t)`) URL/조회 키는 그대로다. 새 노트도 `id: "note-" + uid()`(랜덤)로 생성되어 제목과 무관하게 결정됨. `rag-flow`/`embedding`처럼 보이는 기존 id들은 "slug처럼 보이는 고정 문자열"일 뿐 title에서 파생되지 않으므로 이미 명세가 요구하는 "id 기반 라우팅"과 동일하게 동작 중. `id`→`noteId` 필드명 변경은 수십 개 파일에 걸친 기계적 리네이밍이라 동작 변화 없이 리스크만 추가되므로 보류(기존 구현에 문제 없을 때는 유지하라는 지침에 따름).

### Checked (Mermaid/그래프/이미지, Playwright 실측)

- ```mermaid + Enter / ```Mermaid + Enter / ```MERMAID + Enter 모두 코드블록 생성 — 성공
- 언어 드롭다운 검색 "mermaid" → Mermaid 선택, 기존 코드블록의 언어를 Mermaid로 변경 — 성공
- 정상 문법 입력 → "미리보기" 클릭 → SVG 렌더링 — 성공
- 잘못된 문법 입력 → 에러 메시지 표시(에디터 전체 영향 없음) — 성공
- 편집↔미리보기 전환 후에도 원본 코드 보존 — 성공
- 가운데 정렬 기본값, 좌/우 정렬 전환, 폭 맞춤/원본/75%/50%/사용자지정 전환 — 성공
- 이미지 4가지 삽입 경로(파일 선택/드래그앤드롭/붙여넣기/URL) + 마크다운 `![]()` 자동변환 — 전부 성공
- 이미지 정렬/폭 조절 — 성공
- **회귀 테스트**: 버블 툴바(드래그 선택→표시, 클릭→해제, Bold 적용), 기존 코드블록(언어 선택/복사/파일명), Split View(분할) — 전부 정상. Slash Command는 코드베이스에 애초에 구현돼 있지 않아(grep 확인) 회귀 대상에서 제외.

### Not implemented / 보류

- **Slash Command**: 정책 문서에 계획으로만 언급돼 있고 현재 코드베이스에 구현체가 전혀 없음(grep 0건). 이번 요청 범위(코드블록/Mermaid/그래프/이미지)에는 명시적으로 포함되지 않아 별도로 만들지 않았음 — 추후 이미지/Mermaid 삽입을 슬래시 메뉴에 노출하는 진입점으로 쓰면 좋을 것으로 보임.
- **드래그 리사이즈 핸들(코너 드래그로 크기 조절)**: 프리셋 버튼(맞춤/원본/75%/50%) + 숫자 입력(%)으로 대체. 더 안전하고 테스트하기 쉬워 우선 선택, 핸들 기반 UI는 후속 과제로 보류.
- **Mermaid 커서 위치 기반 자동 편집/미리보기 전환**(Obsidian Live Preview처럼 커서가 블록 안에 들어가면 자동으로 원본을 보여주는 방식): 명시적 버튼 토글로 대체. 자동 전환을 시도했다가 "타이핑 중 포커스 소실" 버그(위 Fixed 항목)가 발생해 안전한 방식으로 변경.
- **실제 이미지 업로드(S3/MinIO)**: 백엔드 연동이 없는 프론트 데모 단계라 base64 data URL로 대체. 코드 내 TODO 주석 표시.

---

## 2026-06-19 15:10

### Changed

- TipTap 8개 패키지(`@tiptap/pm`, `@tiptap/react`, `@tiptap/starter-kit`, `@tiptap/extension-code-block-lowlight`, `@tiptap/extension-color`, `@tiptap/extension-highlight`, `@tiptap/extension-placeholder`, `@tiptap/extension-text-style`)를 `3.26.x` → `3.27.0`으로 업그레이드, 원격 main의 고정(pin) 버전 표기와 동일하게 맞춤(caret 제거).
- 업그레이드 전 영향도 분석: `@tiptap/pm`이 의존하는 `prosemirror-view` 버전 범위(`^1.41.8`)가 3.26.1/3.27.0 모두 동일하고, 실제로도 동일한 `1.41.9`가 그대로 유지됨을 확인 — 버블 툴바 수정이 의존하는 ProseMirror 내부 동작(domObserver 등록 순서 등)에 영향 없음. `@tiptap/core`의 실질 변경분(ordered list type 속성, `marksEqual` 버그 픽스)은 본 프로젝트가 사용하지 않는 영역.
- `package-lock.json`도 함께 갱신(`npm install`) — diff는 위 8개 TipTap 패키지 버전과, devDependency `@playwright/test`의 부수적인 패치 버전(1.60.0→1.61.0, 기존 caret 범위 내) 갱신뿐.

### Checked (Playwright, 업그레이드 후 각 3회 반복)

- 선택 유지 6케이스(정/역방향 드래그, 제목/사이드바/우측패널/Split다른패널) — 전부 깜빡임 없음.
- 클릭 즉시 선택 해제 — 정상.
- Bold/Italic/Text Color/Link — 정상 적용.
- 코드블록 생성(\`\`\`js + Enter) + lowlight 문법 강조(`hljs-keyword`/`hljs-number` 클래스) — 정상.
- `npx tsc --noEmit` — `components/notes/` 관련 에러 없음(기존부터 있던 `graph-screen.tsx`의 `@xyflow/react` 무관 에러만 남아있음, 이번 작업과 무관).

---

## 2026-06-19 13:40

### Fixed (후속 수정 2 — 클릭-해제 회귀 + 잔여 깜빡임 제거)

- 11:20 수정(아래)의 `settling` 보호가 **단순 클릭에도 걸려서**, 텍스트 드래그 선택 후 같은 패널의 다른 곳을 한 번 클릭해도 선택이 해제되지 않는 회귀가 생겼다. 이번 수정으로 해결했다.
- 추가로, native DOM selection이 실제로 collapse→restore되며 선택 하이라이트가 깜빡이는 현상도 더 줄였다.

### 원인

1. **클릭 해제 안 됨**: 이전 구현은 mousedown마다 `settling`을 무조건 켜고, mouseup 시점에 직전 드래그의 `lastNonEmpty`(마지막 비어있지 않은 selection)로 무조건 복원을 시도했다. 드래그 종료 직후(150ms 이내) 사용자가 다른 곳을 클릭하면, 이 클릭의 mouseup도 "보호 대상"으로 취급되어 클릭이 만든 collapse(정상적인 선택 해제)를 직전 드래그의 범위로 다시 덮어써버렸다 — "복원"이 실제로는 "방금 일어난 정상적인 선택 해제를 취소"하는 부작용을 낳았다.
2. **잔여 깜빡임**: `restoreIfCollapsed`가 `view.state.selection.empty`(PM 모델)를 기준으로 "이미 복원했으니 더 안 해도 됨"이라고 판단했는데, 브라우저가 네이티브 DOM selection을 모델과 무관하게 다시 collapse시키는 경우가 있어 모델만 보면 그 재발생을 놓쳤다.
3. 그 외에 settling을 mouseup 시점에만 켜다 보니, **드래그가 끝나기 전(mousedown~mouseup 사이)** 마우스가 두 블록(문단→헤딩 등)을 대각선으로 가로지를 때 일시적으로 발생하는 collapse는 보호받지 못해 토글이 그 사이에 깜빡이는 경우도 있었다.

### 수정 방식

- **클릭 vs 드래그 구분**: `MarkdownLivePreview` plugin state에 `sawNonEmpty`(이번 mousedown~mouseup 세션 동안 PM이 한 번이라도 non-empty selection을 관찰했는지)와 포인터 이동 거리 추적(`movedEnough`, 4px 임계값, window `mousemove`로 추적)을 추가했다. mouseup 시점에 `sawNonEmpty || movedEnough`가 **모두 거짓**이어야만 "단순 클릭"으로 판정해 보호 로직을 전혀 걸지 않고 즉시 선택 해제를 허용한다. 둘 중 하나라도 참이면 "실제 드래그"로 인정해 기존 settle 보호를 적용한다. 두 신호를 OR로 묶은 이유: PM 신호(`sawNonEmpty`)만으로는 드래그가 에디터 DOM 바깥으로 빠르게 빠져나가는 경로에서 PM이 selection 변화를 한 번도 못 잡아챌 수 있어(같은 경로를 반복 실행해도 결과가 들쑥날쑥함, Playwright로 확인) 신뢰할 수 없었고, 포인터 이동 거리는 PM 상태와 무관하게 항상 정확하다.
- **mousedown마다 세션 리셋**: 새 mousedown마다 `sawNonEmpty`/`movedEnough`를 처음부터 다시 관찰하도록 리셋(`resetSession` meta) — 그래야 "방금 끝난 드래그"와 "그 다음의 새 클릭"이 서로 다른 세션으로 명확히 분리된다.
- **네이티브 DOM 기준으로 재확인**: `restoreIfCollapsed`의 판단 기준을 `view.state.selection.empty`(PM 모델)에서 `window.getSelection()?.isCollapsed`(네이티브 DOM)로 바꿔, 모델이 이미 복원된 후에도 브라우저가 다시 collapse시키는 경우를 매 프레임 다시 잡아낼 수 있게 했다.
- **보호 구간 확장**: 버블 툴바의 hide 억제 조건을 `settling`(드래그 종료 후 150ms)에서 `dragging || settling`(드래그 진행 중 전체 + 종료 후 150ms)으로 넓혔다. 클릭은 `dragging`이 매우 짧게(mousedown~mouseup) true였다가 mouseup에서 즉시 꺼지므로 이 확장이 클릭 해제를 막지 않는다.

### 변경 파일

- `components/notes/NoteEditor.tsx`: `MarkdownLivePreview` plugin state에 `sawNonEmpty` 필드 추가, mousemove 기반 `movedEnough` 추적 추가, `onMouseUp`의 클릭/드래그 분기 로직 추가, `restoreIfCollapsed`를 네이티브 DOM 기준으로 변경, `CustomBubbleMenu`의 hide 억제 조건을 `dragging || settling`으로 확장.

### 테스트 (Playwright, 각 3~5회 반복)

- 선택 유지(깜빡임 없음): 정/역방향 드래그, 제목 영역, 노트 탐색기, 우측 컨텍스트 패널, Split View 다른 패널 — **6개 케이스 전부 hide→show 전이 0회**.
- 선택 해제: 드래그 직후(설정 구간 내) 같은 에디터 클릭 → **즉시 해제**(이전엔 회귀로 실패). 설정 구간 종료 후 클릭 → 정상 해제.
- 서식 회귀: Bold/Italic/Text Color/Highlight/Link 전부 정상 적용 확인(`<strong>`/`<em>`/색상 `span`/`<mark>`/`<a>` 생성 확인).

### 남은 이슈

- native 하이라이트 자체의 수~수십 ms 단위 깜빡임은 이론상 100% 보장은 어렵다(브라우저의 비동기 재-collapse 타이밍에 의존) — 다만 toolbar 표시는 100% 안정화됐고, 실측상 selection 모델 복원은 거의 즉시(같은/다음 프레임) 이루어진다.
- overlay fallback(최후 수단으로 제안됨)은 구현하지 않음 — 위 수정으로 핵심 증상(툴바 깜빡임, 클릭 해제 불가)이 해결되어 불필요하다고 판단.

---

## 2026-06-19 11:20

### Fixed (후속 수정 — 깜빡임 제거)

- 09:50 수정(아래)이 "selection collapse → setTimeout(0) 복원" 방식이라, 실제로는 버블 툴바가 **사라졌다가 다시 나타나는 깜빡임**이 남아있었다. 이번 수정으로 툴바가 단 한 번도 사라지지 않도록 근본적으로 재설계했다.
- 원인: ProseMirror의 `EditorView`는 생성 시점에 내부 `domObserver`가 이미 `document`의 `selectionchange`를 듣고 있다. 드래그 종료 후 브라우저가 비동기로 selection을 collapse시키면, 이 `domObserver`가 **다른 어떤 리스너보다도 먼저** 그 collapse를 동기적으로 `editor.state.selection`에 반영하고 `selectionUpdate` 이벤트를 쏜다 — 즉 "복원 코드가 더 빨리 끼어들어 collapse를 가로채는" 방식은 prosemirror-view 내부를 패치하지 않는 한 불가능함을 Playwright(requestAnimationFrame 단위 추적)로 직접 확인했다.
- 해결: collapse 자체를 막는 대신, `CustomBubbleMenu`가 "드래그 종료 후 150ms(`SETTLE_MS`) 동안은 native selection이 collapse로 보여도 툴바를 숨기지 않고 마지막 위치를 유지"하도록 변경(`settling` 플러그인 상태). 같은 기간에 실제 editor selection도 드래그 중 마지막으로 관찰된 비어있지 않은 범위로 복원하지만, 이건 Bold 등 후속 동작의 정합성을 위한 것일 뿐 — 툴바가 안 사라지는 이유는 이 복원이 아니라 "collapse를 신호로 받아들이지 않는" `settling` 가드 자체다.

### Changed files (추가)

- `components/notes/NoteEditor.tsx`
  - `MarkdownLivePreview` plugin state에 `settling: boolean` 추가(mousedown~mouseup+150ms 동안 true).
  - `CustomBubbleMenu`의 `updateAnchor`에서 `settling`이 true인 동안은 `sel.isCollapsed`/`!belongsHere`/`from===to`로 인한 hide를 모두 보류(마지막 anchor 유지)하도록 가드 추가.

### Checked (Playwright, requestAnimationFrame 단위로 visible/collapsed 전이를 직접 추적, 각 3회 반복)

- 역방향 드래그, 제목 영역 드래그, 노트 탐색기 침범, 우측 컨텍스트 패널 침범 — **4개 케이스 전부 `visible: true → false` 전이가 단 한 번도 발생하지 않음**(raw selection은 일시적으로 collapse:true를 보였지만 toolbar visible은 항상 true로 유지됨).
- Bold/Italic 적용 — 정상(`<strong>`/`<em>` 생성 확인).

---

## 2026-06-19 09:50

### Fixed

- 텍스트 역방향 드래그 시 버블 툴바가 사라지는 문제 수정
- 드래그 중 마우스가 제목 영역, 다른 노트 패널, 노트 탐색기, 우측 컨텍스트 패널을 침범하면 버블 툴바가 사라지는 문제 수정
- 버블 툴바 표시 여부를 단순 hover/focus 상태가 아니라 TipTap/ProseMirror selection 상태 기준으로 판단하도록 개선(기존 로직도 이미 selection 기준이었음을 재확인 — 진짜 원인은 selection 표시 로직이 아니라 selection 자체가 드래그 중 깨지는 것이었음)

### Root cause (진짜 원인)

- `mouseleave`/`mouseenter`/`blur`/`pointerleave` 이벤트로 버블 툴바를 숨기는 코드는 존재하지 않았다(grep으로 확인) — 증상은 "툴바가 사라진다"였지만 실제로는 **브라우저의 selection 자체가 드래그 중에 collapse**되고 있었다.
- 원인 1: `NoteEditor.tsx`의 `MarkdownLivePreview` 확장(Obsidian 스타일 heading `#`/blockquote `>`/인라인 코드 backtick 라이브 프리뷰)이 selection이 바뀔 때마다 위젯 데코레이션을 추가·제거해 헤딩 등의 DOM을 다시 그렸다. 드래그가 헤딩 경계를 넘는 순간(정방향/역방향 모두) 이 DOM 변경이 진행 중이던 브라우저 네이티브 drag-to-select 제스처를 깨뜨려 selection이 collapse됐다.
- 원인 2: 드래그가 제목 영역/다른 패널/사이드바/우측 패널처럼 본문 ProseMirror 영역 밖에서 끝나면, 브라우저가 mouseup 처리 도중에 비동기로 한 번 더 selection을 collapse시키는 경우가 있었다. 위 라이브 프리뷰 DOM 변경이 멈춘 뒤에도 이 경계 케이스는 별도로 남아 있었다.

### Changed files

- `components/notes/NoteEditor.tsx`
  - `MarkdownLivePreview`의 `decorations(state)` 계산을 plugin state(`init`/`apply`) 기반으로 재구성하고, 마우스 `mousedown`~`mouseup` 동안은 데코레이션을 동결(이전 DecorationSet을 위치만 매핑)해 드래그 중 DOM이 변경되지 않게 했다.
  - 같은 plugin state에 드래그 중 마지막으로 관찰된 비어있지 않은 selection(`lastNonEmpty`)을 추적하고, `mouseup`(window 레벨, 패널 바깥에서 끝나도 잡음) 시점에 selection이 collapse돼 있으면 다음 macrotask에서 그래도 collapse 상태일 때만 `lastNonEmpty`로 복원한다.

### Checked (Playwright로 실제 Chromium에서 검증, 각 5회 반복하여 안정적으로 통과)

- 정방향 드래그 선택(헤딩→문단 경계 통과) — 통과
- 역방향 드래그 선택(문단→헤딩 경계 통과) — 통과
- 제목 영역까지 드래그 — 통과
- 다른 노트 패널 침범(화면분할 2패널, A→B 드래그) — 통과
- 노트 탐색기 영역 침범 — 통과
- 우측 컨텍스트 패널 침범 — 통과
- 선택 해제(단순 클릭) 시 툴바가 정상적으로 사라지는지 — 통과
- Bold 적용(버블 메뉴 "굵게" 클릭 → `<strong>` 생성 확인) — 통과
- Italic 적용 — 통과

### Notes

- 머지 과정에서 재발했을 가능성을 git log로 직접 확인했으나, 최근 머지 커밋(`45364e0f`, `d85bbc8b`)은 `components/notes/NoteEditor.tsx`를 건드리지 않았다(백엔드/`BrainX-Design` 쪽 파일만 충돌 해결됨) — 즉 이번 버그는 머지 충돌 재발이 아니라, 기존 라이브 프리뷰 데코레이션 로직에 원래 있던 동시성 버그였다.
- focus/blur 이벤트 핸들러 자체는 문제가 없었다(버블 메뉴 코드에 mouseleave/pointerleave 류 핸들러가 전혀 없었음) — "selection 기준으로 판단" 정책은 이미 적용돼 있었고, 이번 수정은 그 판단의 입력값인 selection 자체가 드래그 중 깨지지 않도록 만든 것이다.
