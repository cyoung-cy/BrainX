# Inline Assist 품질 상세 평가 - 2026-06-26

## 평가 대상

`build/inline-assist-captures/20260626-inline-assist-quality/`의 4개 시나리오를 기준으로 한다. 작성 중인 프론트 에디터 문맥만 입력으로 사용하고 Workspace snapshot은 조회하지 않는다.

## 프롬프트 구조

System prompt는 BrainX inline writing assistant 역할을 부여한다.

- `REWRITE`와 `TRANSLATE`는 `Selected`만 교체한다.
- `Before`와 `After`는 immutable reference context다.
- 결과 텍스트만 반환한다.
- 설명, label, alternatives, wrapping markdown fence를 금지한다.
- 선택 영역의 의미 있는 Markdown syntax는 보존한다.

User prompt는 `Action`, `Language`, `Context Before`, `Selected`, `Context After`, `Output scope`로 구성된다. action별 scope는 rewrite replacement, translation, continuation, summary로 고정된다.

## 시나리오별 결과

### SUMMARIZE

입력 selected text는 "작성 중인 노트의 선택 영역과 주변 문맥만 사용하고, Workspace snapshot을 다시 조회하지 않는다"는 내용이었다.

출력은 "선택 영역과 주변 문맥만으로 작성 보조를 하며, 프론트가 보낸 현재 에디터 상태를 신뢰해 저장 지연이나 draft 불일치를 줄인다"는 한 문장 요약이었다. 핵심 의미를 보존했고 불필요한 설명 prefix가 없었다.

### REWRITE

입력: `이 문장은 조금 어색하고 사용자가 읽기 어렵습니다.`

출력: `이 문장은 다소 어색해서 사용자가 읽기 어렵습니다.`

선택 영역만 자연스럽게 다듬었고 Before/After 문맥을 포함하지 않았다. 다만 개선 폭이 작기 때문에, 실제 UX에서는 "더 부드럽게", "더 짧게" 같은 rewrite mode가 추가되면 품질 차이를 더 잘 볼 수 있다.

### CONTINUE

입력 contextBefore는 inline assist가 현재 에디터 상태만 사용한다는 설명이었다.

출력은 "현재 보고 있는 내용을 기준으로 즉시 결과를 생성하므로 문맥 불일치를 줄이고 작성 흐름을 이어 준다"는 후속 문단이었다. 앞 문맥의 논지를 이어가며 새 텍스트만 생성했다.

### TRANSLATE

입력: `BrainX helps users connect notes while they are writing.`

출력: `BrainX는 사용자가 글을 쓰는 동안 노트들을 서로 연결할 수 있도록 도와줍니다.`

선택 영역만 한국어로 번역했고 설명이나 fence 없이 바로 삽입 가능한 형태였다.

## 품질 판단

현재 기준은 구조적 품질을 잘 잡는다. nonblank, fence 없음, 설명 prefix 없음, action별 scope 준수는 통과했다.

의미 품질은 아직 얕다. rewrite의 개선 폭, summarize의 정보 보존률, continue의 과잉 생성 여부, translate의 어투/용어 일관성은 별도 rubric이 필요하다.

## 다음 평가 기준

- rewrite에는 원문 대비 과도한 의미 변경 금지와 최소 개선 폭을 함께 검증한다.
- summarize에는 필수 keyword 보존 기준을 둔다.
- continue에는 `contextAfter`가 있는 경우 중복/충돌 없이 이어지는지 검증한다.
- translate에는 용어집이나 target language style을 넣는 시나리오를 추가한다.
