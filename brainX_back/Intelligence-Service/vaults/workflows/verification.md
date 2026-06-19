# Verification Workflow

## When To Run

- Java code, Spring configuration, Gradle dependency, OpenAPI contract, generated artifact를 변경하면 관련 Gradle 검증을 실행합니다.
- 문서만 변경한 경우에는 code test를 생략할 수 있습니다. 대신 링크, path, 라우팅 문서가 서로 맞는지 검색으로 확인합니다.

## Commands

Windows PowerShell:

```powershell
.\gradlew.bat test
```

Unix shell:

```sh
./gradlew test
```

OpenAPI 계약을 변경해야 할 때는 먼저 SSOT를 수정한 뒤 로컬 추출 결과를 갱신합니다:

```powershell
python scripts\extract_intelligence_openapi.py
```

이 명령의 기본 source는 `../../contracts-v2/brainx-openapi.ssot.yaml`이고 output은 `src/main/resources/contracts/knowledge-intelligence.openapi.yaml`입니다. API 계약 변경 후에는 SSOT와 로컬 슬라이스가 같은 schema 변경을 포함하는지 검색으로 확인합니다.

Intelligence Service가 소비하는 내부 REST API와 관련 AsyncAPI 슬라이스를 갱신해야 할 때:

```powershell
python scripts\extract_intelligence_related_contracts.py
```

## Documentation Checks

문서 변경 후 최소한 다음을 확인합니다.

```powershell
rg "vaults/|AGENTS.md|knowledge-intelligence.openapi.yaml|knowledge-intelligence.asyncapi.yaml|knowledge-intelligence.consumed.openapi.yaml" README.md AGENTS.md vaults src/main/resources/contracts/README.md
```

새 guide를 만들면 `vaults/INDEX.md` 또는 root guide에서 라우팅되는지 확인합니다.

## Reporting

Final response와 worklog에는 다음을 남깁니다.

- 실행한 검증 command
- 통과 여부
- 검증을 생략했다면 이유
- 생성하거나 수정한 주요 artifact path
