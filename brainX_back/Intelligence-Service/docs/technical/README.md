# Technical Documentation

이 디렉터리는 Intelligence Service 구현 중 반복해서 확인해야 하는 framework, infrastructure, local runtime 관련 기술 메모를 둔다.

- `conditional-on-bean.md`: Spring Boot `@ConditionalOnBean`의 의미, 주의점, Qdrant adapter 적용 맥락을 설명한다.
- `ai-model-pricing-and-usage.md`: AI 모델 catalog 비용 필드, availability 결합, token usage/cost estimate 기록 정책을 설명한다.
- `consumed-event-contract-alignment.md`: 구현된 consumed event handler와 AsyncAPI SSOT의 topic/payload 일치 수준을 추적한다.
- `consumed-events-implementation-checkpoints.md`: `AI-Service`가 consumer로 받는 이벤트별 구현 체크포인트를 정리한다.
- `external-search.md`: OpenAI Responses `web_search` 기반 외부 자료 검색 port, CLI 실행, usage 기록 정책을 설명한다.
- `frontend-ai-context-management.md`: `brainx-next`가 노트 AI 작업별로 `clientContext`를 구성하고 Intelligence Service chat/inline assist API에 전달하는 정책을 설명한다.
- `note-chunking.md`: Workspace note markdown을 chunk 단위 vector index로 변환하는 규칙과 검색 결과 dedupe 정책을 설명한다.
- `note-auto-linking.md`: 유사 노트 자동 연결 v1의 `VECTOR_LLM`/`LLM_ONLY` 비교, anchor 위치 계산, CLI 실행, usage/cost 기록 정책을 설명한다.
- `sample-notes-rag-cli.md`: `sample_notes` markdown을 로컬 RAG 품질 테스트용으로 색인/질의하는 CLI 흐름과 retrieval/chat 출력 capture scripts를 설명한다.
- `vectorstore-embedding-model.md`: Qdrant Java client 직접 연동과 Voyage embedding, usage/cost 기록 정책을 설명한다.
