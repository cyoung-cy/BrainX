# Connection 품질 상세 평가 - 2026-06-26

## 평가 대상

`build/connection-captures/20260626-connection-quality/`의 2개 시나리오를 기준으로 한다. sample notes를 ingest한 뒤 application usecase를 직접 호출했다. public HTTP controller가 아니라 connection 품질 확인용 dev runner다.

## Link Suggestions 시나리오

입력 source 문서:

- `BrainX API 명세서.md`
- source note id: `sample-a48bdc313993c2ea`

최종 추천:

- target note id: `sample-423a0eee916f6ba4`
- target title: `BrainX 도메인 기준 MSA / API / 이벤트 계약`
- score: `0.97`
- reason: 같은 인증/계정/이메일 인증/회원가입 도메인의 API와 이벤트 계약을 다루는 노트라서 직접적인 연관성이 높다.

의미적으로는 `BrainX API 명세서.md`가 endpoint/request/response 중심 문서이고, `BrainX 도메인 기준 MSA / API / 이벤트 계약`이 서비스 경계와 이벤트 계약 중심 문서다. 둘은 같은 API/계약 정보를 서로 다른 관점에서 설명하므로 link suggestion으로 적절하다.

현재 public connection response는 `targetNoteId`, `targetTitle`, `score`, `reason`만 반환한다. 내부 autolink 결과의 anchor 위치는 public connection DTO에서 제거되어 있어 이 capture만으로는 "source 문서의 어느 글자 위치에 링크를 걸었는지"를 확인할 수 없다. anchor 품질까지 보려면 dev runner가 내부 `NoteAutoLinkUseCase` 원본 suggestion을 함께 저장하도록 확장해야 한다.

## Link Suggestions 프롬프트 구조

`ConnectionService`는 link suggestion을 직접 프롬프트하지 않고 `NoteAutoLinkUseCase`의 `VECTOR_LLM` 전략을 호출한다.

`VECTOR_LLM` 흐름은 다음과 같다.

1. source note markdown을 window로 나눈다.
2. 각 window를 query로 Qdrant chunk 검색을 수행한다.
3. same note hit를 제외하고 target 후보를 dedupe한다.
4. LLM refine prompt에 source note와 vector candidate target notes를 넣는다.

Autolink system prompt는 다음 출력을 요구한다.

- strict JSON array
- `anchorText`, `targetNoteId`, `reason`, `confidence`
- `anchorText`는 source markdown에서 정확히 복사
- 일반 단일 명사보다 구체 heading/phrase 선호
- markdown fence/commentary 금지

User prompt는 source note의 `noteId`, `title`, `tags`, markdown snippet과 candidate target의 `targetNoteId`, `targetTitle`, `vectorScore`, `evidence`를 넣는다. 이후 relation verifier가 애매한 후보에 대해 relation type과 confidence를 검증할 수 있다.

## Bridge Concepts 시나리오

입력 source 문서:

- `BrainX API 명세서.md` (`sample-a48bdc313993c2ea`)
- `brainx_domain_msa_api_contracts.md` (`sample-423a0eee916f6ba4`)

생성된 bridge recommendations:

1. `BrainX API와 이벤트 계약 통합 가이드`
   - 이유: 통합 API 명세서와 도메인 기준 MSA/API/이벤트 계약을 한 문서 흐름으로 연결할 수 있음
2. `BrainX 도메인별 서비스 연동 기준`
   - 이유: 두 노트 모두 도메인 관점의 API와 계약을 다루므로 서비스 간 연동 기준 문서로 적합함
3. `BrainX 계약 중심 아키텍처 개요`
   - 이유: API 명세와 이벤트 계약을 공통 계약 관점에서 정리해 MSA 구조와 운영 기준을 설명할 수 있음

세 후보 모두 기존 문서를 직접 연결하는 링크라기보다 "두 문서를 읽는 사람이 만들면 좋은 중간 주제"다. 특히 API 명세와 이벤트 계약의 연결 문서가 필요하다는 점을 잘 드러낸다.

## Bridge Concepts 프롬프트 구조

Bridge system prompt는 strict JSON array를 요구한다.

- 최대 `maxRecommendations`개 object
- 각 object는 `title`, `bridgeReason`만 포함
- 제목은 간결한 한국어 bridge document/topic title
- `bridgeReason`은 source notes를 어떻게 연결하는지 설명하는 한국어 한 문장
- markdown fence, comments, prose, IDs, note bodies, extra field 금지

Bridge user prompt는 source notes의 `noteId`, `title`, `tags`만 JSON으로 넣는다. 본문은 넣지 않는다. 따라서 bridge 결과는 note body 세부 내용이 아니라 제목/태그 기반의 문서 관계 제안이다.

## 품질 판단

Link suggestion은 API 명세와 MSA/API/이벤트 계약 문서를 연결해 의미적으로 납득 가능하다. score도 `0.97`로 높다.

Bridge recommendation은 문서 관계를 잘 추상화했다. 다만 본문 없이 title/tag만 넣는 구조라 세부 구현 내용까지 반영한 bridge라고 보기는 어렵다.

## 다음 평가 기준

- connection quality runner에 내부 autolink anchor range를 함께 저장하는 diagnostic mode를 추가한다.
- link suggestion은 source title, target title, reason 외에 `anchorText`, `startOffset/endOffset`을 품질 보고서용으로 캡처한다.
- bridge prompt에 안전하게 사용할 수 있는 excerpt/headings를 추가할지 검토한다.
- duplicate bridge title, 너무 넓은 architecture 제목, source note body와 무관한 bridge를 걸러낼 golden sample을 만든다.
