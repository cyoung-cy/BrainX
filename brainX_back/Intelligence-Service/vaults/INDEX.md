# Context Vault Index

이 vault는 agent가 필요한 문맥만 늦게 읽기 위한 저장소입니다. 루트 `AGENTS.md`는 항상 읽는 규칙만 담고, 세부 사양과 반복 workflow는 여기서 라우팅합니다.

- `vaults/agents/intelligence-service.md`: Intelligence Service의 API 계약 기반 사양, endpoint inventory, 이벤트 coupling, 내부 동기 호출을 설명합니다. API 구현, controller/service 설계, 계약 불일치 검토를 할 때 읽습니다.
- `vaults/agents/domain-implementation-order.md`: API 명세 기준 기능 구현 순서를 도메인 TODO list로 정리합니다. 기술 설계가 아니라 어떤 사용자/지식 기능을 먼저 만들지 결정할 때 읽습니다.
- `vaults/workflows/verification.md`: 이 저장소의 Gradle 검증과 문서 변경 검증 기준을 설명합니다. 코드, 설정, 계약, 문서 변경 후 final response 전에 읽습니다.
- `vaults/worklogs/YYYY-MM.md`: 월별 file-log fallback입니다. substantial work를 마친 뒤 worklog 채널이 없을 때 append합니다.
- `vaults/durable/INDEX.md`: 반복되는 agent-process correction과 재사용 가능한 개선 규칙을 기록합니다. 같은 지적이 반복되거나 repo-local 운영 규칙으로 남길 내용이 생겼을 때 읽습니다.
- `docs/domain/knowledge-intelligence-domain-flow.md`: 사람을 위한 도메인 문서입니다. 도메인 스토리텔링, 이벤트 스토밍, 컨텍스트 맵 관점으로 서비스 흐름을 설명할 때 참고합니다.

## Project Snapshot

- 서비스: BrainX `intelligence-service`
- Group: `com.brainx.intelligence`
- Runtime: Java 21
- Framework: Spring Boot 3.5.15
- Build: Gradle wrapper
- Main class: `src/main/java/com/brainx/intelligence/IntelligenceServiceApplication.java`
- Contract: `src/main/resources/contracts/knowledge-intelligence.openapi.yaml`
- Contract extraction script: `scripts/extract_intelligence_openapi.py`

## Routing Rules

- API 사양 질문은 먼저 OpenAPI 계약을 확인한 뒤 `vaults/agents/intelligence-service.md`의 요약과 대조합니다.
- 기능 구현 순서 질문은 `vaults/agents/domain-implementation-order.md`를 기준으로 답합니다.
- 도메인 흐름이나 기획자와 공유할 설명은 `docs/domain/knowledge-intelligence-domain-flow.md`를 기준으로 답합니다.
- 구현 작업은 target package와 관련 test를 직접 읽고, 계약에서 필요한 schema와 response status를 확인합니다.
- 문서 작업은 root guide bloat audit을 수행합니다. endpoint 목록이나 긴 절차가 root로 들어가면 vault guide로 옮깁니다.
