# 노트 에디터 기능명세 구현 현황

> 기준 문서: `docs/notes/spec/note-editor-final-spec.md`, `docs/notes/spec/note-editor-page-spec.md`
> 평가 대상: `components/notes/**`, `app/(app)/notes/**` (실제 서비스 라우트)
> 평가 제외: `editor-lab/**`, 테스트/실험용 페이지 — 해당 디렉터리에만 구현된 기능은 "구현 완료"로 판정하지 않음
> 작성일: 2026-06-22

## 판정 기준

- **구현 완료**: 명세 그대로 동작
- **변형 구현**: 명세와 100% 동일하지 않지만 같은 목적을 다른 방식으로 달성
- **일부 구현**: 핵심 동작 중 일부만 동작(나머지는 빠짐)
- **미구현**: 코드 어디에도 없음
- **보류**: 의도적으로 제외(우선순위 낮음/별도 페이지 영역)

---

## 0. 우선순위별 구현 현황 (MVP 우선순위 표 기준)

> 두 명세 문서의 "21/25. MVP 우선순위 표"(★★★/★★☆/★☆☆ 3단계)를 기준으로 재분류. 주차(1/2/3주차)가
> 아니라 **별표(★) 우선순위**로 묶었다 — 예를 들어 슬래시 커맨드는 "2주차"이지만 ★★★(P0)다.
> 아래 P0/P1/P2 각각의 상태는 위 1~18절의 판정을 그대로 인용한 것이고, 새 평가를 추가한 것이 아니다.

### P0 (★★★ — 반드시 완성)

| 상태 | 기능 |
|---|---|
| 완료 | StarterKit(Bold/Italic/Heading/List), Underline/Strike/Inline Code, 글씨 색상, 형광펜, 폰트 크기 프리셋, 코드블록+하이라이팅, 자동저장, 플레이스홀더, 마크다운 단축키 자동변환, 노트 제목+메타정보 영역, 버블 툴바, 테이블, 이미지 업로드 |
| 일부 구현 | 링크 삽입(버튼+팝오버로 외부 URL·**내부 노트 링크** 모두 가능해졌지만 Ctrl+K 단축키는 없음 — 항목 6 참고) |
| 미구현 | 체크박스 목록(Task List), 들여쓰기 가이드라인(CSS), 슬래시 커맨드(`/`) |

**P0 요약: 완료 13 / 일부 1 / 미구현 3**

### P1 (★★☆ — 핵심 UX / Obsidian+AI)

| 상태 | 기능 |
|---|---|
| 완료 | 목차(TOC) 자동 생성 |
| 변형 구현 | 화면 분할(편집+미리보기, 수동 구성만 가능), 위키링크 `[[ ]]`, 백링크 패널(Mock), 헤딩 접기/펼치기, AI 연결 제안(Mock), 인라인 AI 채팅(Mock) |
| 미구현 | 콜아웃 박스, 노트 내 검색(Ctrl+F), 버전 히스토리, AI 슬래시 커맨드 |
| 보류(평가 범위 밖) | 지식 그래프 — `/graph` 라우트는 이 문서의 평가 대상(`components/notes/**`)이 아님 |

**P1 요약: 완료 1 / 변형 6 / 미구현 4 / 보류 1**

### P2 (★☆☆ — 낮은 우선순위)

| 상태 | 기능 |
|---|---|
| 완료 | Mermaid 다이어그램 — 우선순위는 가장 낮게 책정되었지만 실제로는 보기/편집 전환·크기 조절·문법오류 표시까지 가장 충실히 구현된 항목 |
| 미구현 | YAML Frontmatter 폼, 수식(KaTeX) |

**P2 요약: 완료 1 / 미구현 2**

---

## 1. 텍스트 서식

| 기능 | 상태 | 근거 |
|---|---|---|
| Bold / Italic / Strike / Inline Code | 구현 완료 | StarterKit 기본 포함, `NoteEditor.tsx` BubbleToolbar(674-688) |
| Underline | 구현 완료 | TipTap v3 StarterKit이 내부적으로 `@tiptap/extension-underline`을 번들(직접 의존성에는 없지만 StarterKit이 끌고 옴) |
| Superscript / Subscript | 미구현 | 코드 어디에도 없음 |
| 텍스트 정렬(좌/중/우/양쪽) | 미구현 | 일반 문단 대상 TextAlign 확장 없음. *표 셀 정렬은 구현됨(별도 항목 9 참고)* |

## 2. 폰트 & 타이포그래피

| 기능 | 상태 | 근거 |
|---|---|---|
| 폰트 크기 프리셋/드롭다운(선택 텍스트) | 변형 구현 (2026-06-22 추가) | 별도 패키지 없이 `fontExtensions.ts`(`textStyle` mark 속성 확장)로 구현, Bubble Toolbar의 "Aa" 팝오버에서 12/14/16/18/24px 프리셋 + 사용자 지정. **선택한 텍스트에만 적용** |
| 폰트 패밀리 선택(선택 텍스트) | 변형 구현 (2026-06-22 추가) | 같은 팝오버에서 기본/Pretendard/Noto Sans KR/Serif/Monospace 선택. **선택한 텍스트에만 적용** |
| **문서 전체 타이포그래피 Scale**(신규) | 변형 구현 (2026-06-22 추가) | `TypographyPopover.tsx` + `lib/notes/typography.ts` — 노트 제목 옆 "서식" 버튼. "기본 글꼴 크기" 배율(80~150%)을 바꾸면 본문/H1/H2/H3가 **같은 비율로 함께** 커지거나 작아짐(고정 배수 1.8/1.35/1.1 기준). CSS 변수(`--note-fs-*`)로 적용되며 설정하지 않은 노트는 기존 모양과 100% 동일 |
| **레벨별 개별 크기 설정**(신규) | 구현 완료 (2026-06-22 추가) | 같은 패널에서 본문/H1/H2/H3 각각 px 단위로 개별 오버라이드 가능 — 설정한 레벨은 전역 배율 변경과 무관하게 그 값을 유지 |
| **문서 기본 글꼴**(신규, 선택 텍스트와 구분) | 변형 구현 (2026-06-22 추가) | 같은 패널의 "문서 기본 글꼴" — 노트 전체 기본값이며, Bubble Toolbar의 "Aa"(선택 텍스트 전용)와는 안내문구로 구분("이 노트 전체에 적용됩니다" vs 텍스트 선택 후 사용) |
| 줄간격 설정 | 미구현 | 코드 어디에도 없음 |
| Typography(스마트 따옴표 등) | 미구현 | `@tiptap/extension-typography` 미사용 |
| CharacterCount | 미구현 | 미사용. 단어수/글자수 표시 자체가 없음(항목 17 참고) |

## 3. 색상 — 글씨 색상 & 형광펜

| 기능 | 상태 | 근거 |
|---|---|---|
| 글씨 색상(Color) | 구현 완료 | `@tiptap/extension-color`+`text-style`, BubbleToolbar 빠른 스와치+더보기(`ColorPalette.tsx`) |
| 형광펜(Highlight multicolor) | 구현 완료 | `Highlight.configure({ multicolor: true })`, BubbleToolbar |
| 최근 사용 색상 | 구현 완료 | `pushRecent` 로직(세션 메모리, 최근 4개) |
| 다크모드 채도 자동 조정 | 미구현 | 별도 보정 로직 없음(고정 hex 팔레트) |

## 4. 제목 & 문단 구조

| 기능 | 상태 | 근거 |
|---|---|---|
| 헤딩 H1~H6 | 구현 완료 | StarterKit |
| 헤딩 앵커 링크(🔗) | 미구현 | 코드 어디에도 없음 |
| 인용구(Blockquote) | 구현 완료 | StarterKit + globals.css 스타일 |
| 중첩 인용(최대 3단계), 출처 표시 | 미구현 | 깊이 제한/출처 UI 없음 |
| 콜아웃 박스 | 미구현 | 코드 어디에도 없음 |
| 구분선(HorizontalRule) | 구현 완료 | StarterKit |

## 5. 목록

| 기능 | 상태 | 근거 |
|---|---|---|
| 불릿/순서 목록 | 구현 완료 | StarterKit |
| 체크박스 목록(TaskList) | 미구현 | `@tiptap/extension-task-list`/`task-item` 미설치 |
| 목록 들여쓰기(Tab/Shift+Tab) | 구현 완료 | StarterKit 기본 키맵 |
| **헤딩 폴딩(접기/펼치기)** | 변형 구현 | `components/notes/headingFold.ts` — chevron 클릭으로 하위 블록 display:none 토글, position-mapping으로 편집 중에도 유지됨. **단축키(Ctrl+Shift+[/]/,/.) 없음, 새로고침 후 상태 복원(localStorage) 없음** |
| 목록 폴딩 | 미구현 | 코드 어디에도 없음 |
| 들여쓰기 가이드라인(Indent Guide) | 미구현 | globals.css에 `ul ul`/`ol ol` 관련 border-left 규칙 없음 |

## 6. 링크 & 참조

| 기능 | 상태 | 근거 |
|---|---|---|
| 하이퍼링크 삽입 | 변형 구현 (2026-06-22 팝오버 UI로 교체) | BubbleToolbar "링크" 버튼 → `LinkPopover`(`NoteEditor.tsx`)에서 "외부 URL" 입력. 기존 `window.prompt`를 팝오버 UI로 교체. **Ctrl+K 단축키는 여전히 없음** |
| **내부 노트 링크**(신규) | 구현 완료 (2026-06-22 추가) | 같은 `LinkPopover`의 "노트 연결" 탭 — 선택한 임의 텍스트(앵커)를 그대로 두고 다른 노트로 가는 링크만 붙임(`brainx-note://<id>` href). 읽기 모드는 클릭으로, 편집 모드는 Ctrl/Cmd+클릭으로 이동(평소 클릭은 편집을 위해 보존). 위키링크 `[[ ]]`와 달리 **앵커 텍스트≠노트 제목**인 경우를 보완 — 둘의 역할이 달라 위키링크를 대체/축소하지 않음(자세한 평가는 작업 보고 참고) |
| 링크 hover 미리보기 툴팁 | 미구현 | 코드 어디에도 없음 |
| 위키링크 `[[ ]]` | 변형 구현 (2026-06-22 추가) | `WikiLinkNode.tsx` — `[[노트]]`/`[[노트\|별칭]]`/`[[노트#헤딩]]` 입력 시 inline atom 노드로 변환, 클릭 시 이동/생성, `[[` 입력 시 자동완성 드롭다운. 제목 해석은 정확히 일치→부분 일치(유일할 때만)로 실제 노트 목록을 참조(단순 텍스트 치환 아님). `[[노트#헤딩]]`의 헤딩 부분은 속성으로만 저장되고 실제 스크롤 이동은 아직 없음(향후 과제) |
| 멘션(@) | 미구현 | `@tiptap/extension-mention` 미사용 |
| 각주(Footnote) | 미구현 | 코드 어디에도 없음 |
| 태그 인라인(#태그) | 미구현 | 본문 내 `#` 자동완성 없음(노트 메타 태그 "표시"는 구현, 항목 17 참고) |

## 7. 코드 블록 & 하이라이팅

| 기능 | 상태 | 근거 |
|---|---|---|
| 코드 블록 + 하이라이팅 | 구현 완료 | `CodeBlockLowlight` + `lowlightSetup.ts`(핵심 9언어 즉시 등록 + 나머지 지연 로딩) |
| 언어 배지/드롭다운 | 구현 완료 | `CodeBlockView.tsx` 언어 선택 드롭다운(검색 가능) |
| 복사 버튼 | 구현 완료 | "복사됨!" 피드백 포함 |
| 줄 번호 표시/숨김 | 미구현 | 코드 어디에도 없음 |
| 특정 줄 하이라이트 | 미구현 | 코드 어디에도 없음 |
| 탭 크기 설정(2/4칸) | 미구현 | 코드 어디에도 없음 |
| 인라인 코드 | 구현 완료 | StarterKit |
| 수식(KaTeX) | 미구현 | 코드 어디에도 없음 |

## 8. Mermaid 다이어그램

| 기능 | 상태 | 근거 |
|---|---|---|
| Mermaid 코드 → 다이어그램 시각화 | 구현 완료 | `MermaidPreview.tsx`, `mermaid` 패키지 동적 import |
| 보기/편집 전환 | 구현 완료 (2026-06-22 갱신) | `CodeBlockView.tsx` — 코드 모드의 상시 "보기" 버튼은 **제거됨**(요청사항). 대신 Esc/포커스 아웃으로 보기 전환, 보기 모드에서는 hover 시에만 "`</>`" 오버레이(Obsidian 스타일), 더블클릭으로 코드 편집 복귀 |
| Esc로 보기 전환 | 구현 완료 | `NoteEditor.tsx` Escape 키맵 |
| **포커스 아웃 시 자동 보기 전환**(신규) | 구현 완료 (2026-06-22 추가) | 코드블록 안에서 다른 블록/제목/다른 노트를 클릭해 포커스가 빠져나가면 자동으로 보기 모드로 전환 — `NoteEditor.tsx`의 `mermaidAutoPreview` ProseMirror 플러그인(같은 에디터 내 선택 이동) + `onBlur` 핸들러(에디터 밖으로 완전히 포커스 이탈하는 경우) 두 경로로 처리 |
| 문법 오류 표시 | 구현 완료 | `MermaidPreview.tsx` error 상태 UI |
| Flowchart/Sequence/Gantt/ER/Class/State/Pie 지원 | 구현 완료 | mermaid 라이브러리 자체 지원(특별 제약 없음) |
| 크기/정렬 조절(원본 기준 비율) | 구현 완료 | `BlockControls.tsx` — 50/75/125/150%, 맞춤, 원본, 사용자 지정 |

## 9. 테이블

| 기능 | 상태 | 근거 |
|---|---|---|
| 표 삽입(행/열 수 선택 UI) | 구현 완료 | `EditorContextMenu.tsx` 표 삽입 피커(최대 20×20) |
| 슬래시 커맨드로 삽입(`/table`) | 미구현 | 슬래시 커맨드 자체가 없음(항목 13 참고) — 우클릭 메뉴로만 가능 |
| 행/열 추가·삭제 | 구현 완료 | `TableToolbar.tsx`(이번 작업에서 텍스트 서식까지 통합), `EditorContextMenu.tsx` |
| 셀 병합/분리 | 구현 완료 | `EditorContextMenu.tsx` "셀 병합"/"셀 병합 해제"(`mergeCells`/`splitCell`) |
| 헤더 행 토글 | 일부 구현 | 표 생성 시 `withHeaderRow: true`로 항상 헤더 포함. **생성 후 토글 UI는 없음** |
| 열 너비 드래그 조절 | 구현 완료 | `@tiptap/extension-table`의 컬럼 리사이즈(`resizable: true`) |
| 표 전체 크기 비율(원본 기준) | 구현 완료 | `BrainXTableView`(원본 폭 측정 후 50~150%/맞춤/원본/사용자지정) |
| 셀 내 서식(Bold/Italic/링크/코드) | 구현 완료 | 일반 마크/확장이 표 셀 안에서도 동일하게 동작 |
| 셀 내 이미지 삽입 | 미구현 | ImageBlock이 atom 블록 노드라 표 셀(인라인 콘텐츠) 안에는 들어가지 않음 |
| 열 정렬(좌/중/우) | 변형 구현 | "열" 단위가 아니라 **셀 단위** 정렬로 구현(`tableUtils.ts` cellAlign) — 다중 셀 드래그 선택 시 한 번에 적용 가능해 실사용상 열 정렬과 유사하게 쓸 수 있음 |
| 셀 배경색 | 구현 완료 | 4색 팔레트(노랑/초록/파랑/회색), `TableToolbar.tsx` |
| 표 색상(전체) | 구현 완료 | `EditorContextMenu.tsx` 5색 프리셋(`tableColor`) |
| **표 안 통합 툴바**(서식+정렬+삭제) | 구현 완료 | 이번 작업에서 `TableToolbar`에 Bold/Italic/Strike/텍스트색상/셀배경/정렬/행열삭제/표삭제를 통합, 기존에 따로 떴던 표 전용 Bubble Toolbar는 제거하여 충돌 해소 |
| 행/열/표 삭제 아이콘 구분 | 구현 완료 | 행=Rows3, 열=Columns3, 표=Trash2(모두 danger 빨강), 이번 작업에서 서로 다르게 변경 |
| 셀 단위 테두리(굵기/점선 등) | 보류 | `border-collapse: collapse` 구조상 셀별 4변 독립 제어가 어려워 별도 작업 필요(이전 작업 보고에서 구조 변경 필요성 기록) |

## 10. 이미지 & 파일 첨부

| 기능 | 상태 | 근거 |
|---|---|---|
| 파일 업로드/드래그앤드롭/붙여넣기 | 구현 완료 | `ImageBlockNode.tsx` `insertImageBlockFromFile` |
| URL 입력 삽입 | 구현 완료 | `EditorContextMenu.tsx` "이미지 URL로 삽입", 마크다운 `![]()` 입력 규칙 |
| 크기 조절(원본 기준 비율) | 구현 완료 | `BlockControls.tsx`(이번 작업 이전에 완료) |
| 정렬(좌/중/우) | 구현 완료 | `BlockSizeToolbar` |
| Alt 텍스트 | 일부 구현 | 속성은 존재하고 붙여넣은 파일명이 자동으로 들어가지만, **사용자가 직접 alt를 수정하는 UI 없음** |
| 캡션 | 미구현 | 코드 어디에도 없음 |
| 링크 연결(클릭 시 URL 이동) | 미구현 | 코드 어디에도 없음 |
| 파일 첨부(PDF/Word/Excel 등) | 미구현 | 이미지 외 파일 카드 UI 없음 |

## 11. 임베드 & 링크 카드

| 기능 | 상태 | 근거 |
|---|---|---|
| 링크 카드(OG 메타) | 미구현 | 코드 어디에도 없음 |
| YouTube/Vimeo/Twitter/Gist 임베드 | 미구현 | 코드 어디에도 없음 |

## 12. 슬래시 커맨드

| 기능 | 상태 | 근거 |
|---|---|---|
| `/` 입력 시 팝업 메뉴 | 미구현 | 코드 어디에도 없음. 현재는 마크다운 단축 입력(`# `, `- `, `> `, ` ``` `)과 우클릭 메뉴로 대체 |

## 13. 화면 분할(Split View)

| 기능 | 상태 | 근거 |
|---|---|---|
| 좌우/상하 분할 | 구현 완료 | `paneUtils.ts` `splitNodeAt`, `PaneTreeRenderer` — 트리 구조라 임의 중첩 분할 가능 |
| 4분할(이상) | 변형 구현 | 전용 "4분할" 버튼은 없지만 분할을 두 번 반복하면 동일한 결과(트리 구조상 제한 없음) |
| 노트+노트 분할 | 구현 완료 | 각 패널이 독립된 탭 상태를 가짐 |
| 편집+미리보기 분할(스크롤 동기화) | 변형 구현 | 같은 노트를 두 패널에 열고 한쪽을 읽기 모드로 전환하는 식으로 **수동 구성**은 가능하나, 전용 1-클릭 모드·스크롤 동기화는 없음 |
| 패널 비율 조절(드래그) | 구현 완료 | `react-resizable-panels` |
| 패널 닫기/탭 이동 | 구현 완료 | `TabBar.tsx`, `handleMoveTabToPane` 등 |
| 패널 최대화 | 미구현 | 코드 어디에도 없음 |
| 단축키(Ctrl+\, Ctrl+Shift+\, Ctrl+W, Ctrl+Shift+F) | 미구현 | 분할은 탭 우클릭 메뉴로만 가능, 전용 키보드 단축키 없음 |

## 14. 에디터 모드

| 기능 | 상태 | 근거 |
|---|---|---|
| 편집/읽기전용 모드 | 구현 완료 | 탭 단위 `EditMode`(`EditorPanel.tsx`) |
| 소스 모드(순수 마크다운, CodeMirror) | 미구현 | 코드 어디에도 없음 |
| Zen 모드 | 미구현 | F11/Ctrl+Shift+Z 핸들러 없음 |

## 15. 노트 메타정보 & 상단 액션바

| 기능 | 상태 | 근거 |
|---|---|---|
| 제목 입력 | 구현 완료 | `EditorPanel.tsx` 클릭 → 인라인 input |
| 태그 표시 | 일부 구현 | 기존 태그 목록 렌더링만 됨(`EditorPanel.tsx` 267-279). **"+"로 추가하는 UI 없음** |
| 수정 시간(상대시간) | 미구현 | 코드 어디에도 없음 |
| 단어 수/글자 수/읽기 시간 | 미구현 | 코드 어디에도 없음 |
| 자동저장 상태 표시(저장중/저장됨/실패) | 구현 완료 | `NotesWorkspace.tsx` `SaveStatusBadge` |
| Ctrl+S 수동 저장 | 구현 완료 | `NotesWorkspace.tsx` 키보드 핸들러 |
| PDF/TXT/MD 내보내기 | 미구현 | 코드 어디에도 없음 |
| 공유 링크 | 미구현 | 코드 어디에도 없음 |
| 복제/이동/즐겨찾기 토글 | 일부 구현 | 즐겨찾기는 폴더 단위로 존재(`FolderTree.tsx` 등), **노트 단위 복제·이동 UI는 없음** |
| 노트 삭제(휴지통/30일 보관) | 미구현 | 코드 어디에도 없음 |

## 16. 자동저장 & 버전 히스토리

| 기능 | 상태 | 근거 |
|---|---|---|
| 자동저장(debounce) | 구현 완료 | `NotesWorkspace.tsx` 350ms debounce + localStorage |
| 버전 히스토리(diff/복원) | 미구현 | 코드 어디에도 없음 |
| 휴지통 | 미구현 | 코드 어디에도 없음 |

## 17. 우측 사이드바 패널

| 기능 | 상태 | 근거 |
|---|---|---|
| 목차(TOC) | 구현 완료 | `RightSidebar.tsx` `parseHeadings`(실제 노트 본문 기반, mock 아님) |
| 연결·백링크 | 변형 구현(Mock) | `MOCK_CONTEXT_DATA` 고정 데이터 기반 — 실제 위키링크 그래프 분석이 아님 |
| AI 연결 제안 | 변형 구현(Mock) | 유사도/제안 목록이 `MOCK_CONTEXT_DATA`의 고정값, 실제 임베딩 분석 없음 |
| 인라인 AI 채팅 | 변형 구현(Mock) | `setInterval` 기반 타이핑 흉내 + 고정 응답 템플릿, 실제 LLM 호출 없음(RAG 연동/출처 인용 없음) |
| Properties(YAML Frontmatter) 패널 | 미구현 | 코드 어디에도 없음 |

## 18. 단축키

| 단축키 | 상태 |
|---|---|
| Ctrl+N(새 노트) | 구현 완료 — `NotesWorkspace.tsx` |
| Ctrl+O(퀵스위처) | 구현 완료 — `NotesWorkspace.tsx` |
| Ctrl+S(저장) | 구현 완료 — `NotesWorkspace.tsx` |
| Ctrl+B/I/U/Shift+X/E(서식) | 구현 완료 — StarterKit/ProseMirror 기본 키맵 |
| Ctrl+K(링크) | 미구현 — 버튼+prompt만 있음, 단축키 없음 |
| Ctrl+F(검색), Ctrl+H(찾기/바꾸기), Ctrl+P(커맨드 팔레트) | 미구현 |
| Ctrl+Alt+1~6(헤딩), Ctrl+Shift+7/8/9(목록) | 미구현 — 헤딩/목록 자체는 마크다운 입력(`# `, `- `, `1. `)으로만 가능 |
| Ctrl+Shift+[ / ] / , / .(폴딩) | 미구현 — 클릭으로만 폴딩 가능 |
| F11 / Ctrl+Shift+Z(Zen) | 미구현 |

---

## 10. 성능 최적화 현황

### Dynamic Import 적용 여부
- `/notes` 진입점: `NotesWorkspace`를 `next/dynamic({ ssr:false })`로 로드(`app/(app)/notes/layout.tsx`).
- `/graph`, `/chat`: 페이지 컴포넌트를 `next/dynamic({ ssr:false })`로 전환(이전 작업에서 적용).
- `TableToolbar`: `NoteEditor.tsx`에서 `next/dynamic({ ssr:false })`로 분리 — Table extension 자체는 유지, UI만 별도 청크.
- editor-lab의 `TipTapCodeEditor`/`ShikiComparison`도 이미 dynamic+탭 전환 시에만 마운트(기존부터 적용되어 있던 패턴).

### Lazy Loading 적용 여부
- **Mermaid**: `MermaidPreview.tsx`에서 `import("mermaid")` 동적 import. 코드블록이 `preview:false`(코드 모드)로 시작하므로, 사용자가 실제로 "보기"를 누르기 전까지 mermaid 패키지 자체가 로딩되지 않음.
- **Lowlight**: `lowlightSetup.ts` — JavaScript/TypeScript/Java/JSON/HTML(xml)/CSS/SQL/Bash/Markdown 9개 언어만 즉시 등록. 드롭다운에서 그 외 언어(Python/Go/Rust/PHP 등)를 고르는 순간 `ensureLanguageRegistered()`가 해당 grammar만 동적 import. 등록 전에는 lowlight-plugin의 기존 `highlightAuto` 폴백이 적용되어 깨지지 않음. highlight.js 그래머 없는 언어(toml 등)는 원래(`all` 사용 시에도) 미지원이라 동작 차이 없음.
- **Graph(@xyflow/react)**: `/notes` 쪽 컴포넌트(`RightSidebar` 등)에서 import하지 않음 — 애초에 `/graph` 라우트 전용으로 격리되어 있었음. 페이지 자체를 dynamic 전환해 SSR 비용도 제거.
- **AI 패널**: `RightSidebar`는 실제로는 mock 데이터 + `setInterval` 흉내일 뿐 무거운 의존성이 없어, 별도 dynamic 처리가 실익이 없다고 판단해 적용하지 않음(과잉 엔지니어링 방지).

### Mermaid 로딩 전략
화면에 다이어그램이 "보여야 하는 시점"(보기 모드 진입)에만 `import("mermaid")` 1회 로드 후 모듈 캐시(`mermaidModulePromise`) — 같은 노트에 여러 mermaid 블록이 있어도 한 번만 로드.

### Lowlight 로딩 전략
9개 핵심 언어 즉시 등록 + 나머지는 선택 시 1회성 동적 import. 미등록 상태에서도 `highlightAuto`로 자동 감지 하이라이팅이 적용되어 시각적 회귀 없음.

### Graph 로딩 전략
`/graph` 페이지 전용 `next/dynamic({ ssr:false })`. `/notes`/`/chat`과 import 그래프가 원천적으로 분리되어 있어 상호 오염 없음.

### 제거된 패키지
- `@blocknote/core`, `@blocknote/mantine`, `@blocknote/react`, `@mantine/core`, `@mantine/hooks` — 실제 import가 전혀 없는 죽은 코드(`components/editor/BlockNoteEditor.tsx`)와 함께 제거.

### 향후 제거 후보 패키지
- `shiki` — `/editor-lab/tiptap-code-test`의 "Lowlight vs Shiki 비교" 탭에서만 사용, 이미 3중으로 지연 로딩되어 있어 production에 영향 없음. editor-lab 자체가 배포 시 삭제될 테스트 페이지이므로, 그 시점에 같이 제거 가능.

---

## 작성 시 참고: 명세와 다르게 판단한 주요 항목

- **표 열 정렬 → 셀 정렬로 변형**: 명세는 "열" 단위지만 구현은 "셀" 단위(드래그로 여러 셀을 한 번에 선택하면 결과적으로 열 정렬과 동일하게 동작 가능)라 변형 구현으로 분류.
- **위키링크는 미구현**: `RightSidebar`의 안내 문구(`[[노트명]]`)를 보고 "구현됨"으로 오인하기 쉬우나, 실제 자동완성/네비게이션 로직은 없음.
- **셀 병합/분리는 이미 구현되어 있었음**: 초기 조사(자동 탐색)에서 누락되었던 항목 — `EditorContextMenu.tsx`에서 직접 확인.
- **내부 노트 링크는 위키링크의 대체가 아니라 보완**(2026-06-22): 위키링크 `[[제목]]`은 항상 노트 제목 자체가 화면에 보이는 텍스트가 되는 구조라, "임의의 문장(예: '자세한 내용은 RabbitMQ 정리 글 참고')을 그대로 두고 그 일부에만 다른 노트로 가는 링크를 붙이는" 경우를 표현할 수 없다. 그 한 가지 빈틈만 채우는 보완 기능으로 LinkPopover에 "노트 연결" 탭을 추가했고, 위키링크 자체는 수정하지 않았다(Obsidian도 `[[제목]]`과 `[텍스트](url)`을 같은 이유로 별도 유지).
- **Mermaid hover `</>` 버튼이 "여러 번 hover해야 보인다"는 제보는 재현 실패**(2026-06-22): z-index/포인터이벤트/마운트 타이밍을 모두 점검했으나 추가 버그를 찾지 못했고, Playwright로 즉시 hover/반복 hover 모두 100ms 이내 정상 표시를 확인했다. 직전 라운드에서 `</>` 버튼과 `BlockSizeToolbar`를 같은 portal로 합친 수정이 이미 같은 증상(겹침으로 버튼이 가려지는 문제)을 해결한 것으로 보이며, 별도 수정은 하지 않았다.
