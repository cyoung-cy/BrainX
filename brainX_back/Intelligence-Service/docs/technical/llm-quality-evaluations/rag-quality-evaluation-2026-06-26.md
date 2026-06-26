# RAG 품질 상세 평가 - 2026-06-26

## 평가 대상

`sample_notes` 21개를 Qdrant에 ingest한 뒤 `SampleRagService` ask runner로 12개 질의를 실행했다. 최종 run은 `build/rag-captures/20260626-rag-chat-quality/`이며, retrieval-only run `20260626-rag-retrieval-quality-qdrant`와 같은 context count를 보였다.

## 프롬프트 구조

System prompt는 RAG 품질 검증용 챗봇 역할을 부여한다.

- 제공된 context만 근거로 한국어로 답변한다.
- context에 없는 내용은 추측하지 않는다.
- 답변 끝에 참고한 note title과 chunk index를 짧게 적는다.

User prompt는 `질문`과 `Context` 목록으로 구성된다. 각 context는 `title`, `noteId`, `chunkIndex`, `sourcePath/sourceFilename`, `score`, chunk text를 포함한다. 즉 모델은 검색된 chunk metadata와 본문만 보고 답변한다.

## 의미적으로 잘 된 사례

### RAG 채팅 메시지 API 질의

질의: `RAG 채팅 메시지 전송 API 경로와 응답 방식은?`

검색 근거:

- `BrainX 통합 API 명세서` (`BrainX API 명세서.md`, score `0.595`)
- `BrainX 도메인 기준 MSA / API / 이벤트 계약` (`brainx_domain_msa_api_contracts.md`, score `0.518`)
- `MSA에 대한 이해` (`MSA에 대한 이해.md`, score `0.389`)

응답은 `POST /api/v1/ai/chat-threads/{threadId}/messages`, SSE `delta/citation/done`, 토큰 부족 시 `403`을 요약했다. API 명세서 chunk가 endpoint와 SSE 예시를 담고, MSA 계약 문서가 RAG 챗봇 흐름을 담기 때문에 검색 근거와 답변의 연결이 명확하다.

### 기억나는 단어가 불명확한 검색 질의

질의: `정확한 단어가 기억 안 날 때 BrainX는 어떻게 예전 노트를 찾게 해?`

검색 근거:

- `주제 배경` (`주제 발표.md`, score `0.562`)
- `BrainX - 뇌 탐사 Brain Exploration` (`기능 1.md`, score `0.529`)
- `BrainX — 노트 작성 페이지 기능 명세` (`작성페이지_기능명세.md`, score `0.488`)
- `BrainX — 노트 작성 기능 최종 명세` (`노트기능_명세.md`, score `0.463`)

응답은 키워드가 정확히 일치하지 않아도 의미 기반 검색, 유사 개념 연결, 백링크, 마인드맵으로 재발견한다는 방향을 설명했다. `주제 배경`의 "정확한 단어가 기억나지 않음" 문제와 `기능 1.md`의 시맨틱 검색/마인드맵 아이디어가 함께 회수되어 의미 검색 평가에 적합한 결과다.

### 단어가 다른 개념 검색 질의

질의: `고양이와 펫처럼 단어가 달라도 관련 노트를 찾는 방식은?`

검색 근거:

- `Vector DB` (`Vector DB.md`, score `0.441`)
- `BrainX - 뇌 탐사 Brain Exploration` (`기능 1.md`, score `0.416`)
- `주제 배경` (`주제 발표.md`, score `0.373`)

응답은 키워드 매칭이 아니라 벡터 유사도 기반 검색으로 설명했다. `고양이/펫`이라는 예시와 `Vector DB` 문서가 직접 연결되어 semantic search 기능의 핵심을 잘 보여준다.

### 토큰 사용량 이벤트 질의

질의: `AI 기능 토큰 사용량은 어떤 이벤트로 Commerce에 기록돼?`

검색 근거:

- `읽는 순서` (`Async API 문서 해석.md`, score `0.605`)
- `BrainX 통합 API 명세서` (`BrainX API 명세서.md`, score `0.541`)
- `BrainX 도메인 기준 MSA / API / 이벤트 계약` (`brainx_domain_msa_api_contracts.md`, score `0.513`)

응답은 `TokenUsageRecordedRequested`가 기록 요청 이벤트이고 Commerce가 처리 후 `TokenUsageRecorded`를 발행한다는 흐름을 설명했다. AsyncAPI 해석 문서와 MSA 계약 문서가 함께 잡혀 이벤트 소유권을 설명하기에 충분했다.

## 관찰된 한계

- `노트 자동 저장 후 검색 인덱스나 임베딩은 어떤 흐름으로 갱신돼?`는 적절한 문서를 회수했지만 아직 `capture_only`다. pass/fail 기준으로 승격하려면 expected title에 `BrainX 도메인 기준 MSA / API / 이벤트 계약`과 `노트 작성 기능 최종 명세`를 고정할 수 있다.
- `Kubernetes HPA 설정 파일은 어디에 있어?`는 context 0개와 "관련 sample note chunk를 찾지 못했습니다" 응답이 나왔다. corpus 외 질문 guard로는 바람직하지만, 운영 RAG chat에서는 out-of-scope 문구를 별도 검증하는 것이 좋다.
- 일부 질의에서 `Save the markdown content to a file` 같은 잡음 문서가 낮은 score로 섞였다. top answer에는 큰 영향이 없었지만 forbidden context 기준으로 회귀를 잡는 편이 낫다.

## 다음 평가 기준

- 핵심 질의 5개는 `expectedContextTitles`를 더 엄격하게 둔다.
- corpus 외 질문은 `minContextCount=0`, `answerMustContain=관련 sample note chunk를 찾지 못했습니다`로 명시한다.
- RAG 답변에는 cited title이 실제 context title에 존재하는지 자동 검증을 추가한다.
