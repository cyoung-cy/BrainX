# Frontend Integration Guide

## Frontend Project

상위 repository의 `../../brainx-next`가 BrainX 프론트엔드 프로젝트입니다. 이 프로젝트는 Next.js 기반이며, `package.json`의 project name도 `brainx-next`입니다.

`../../brainx-next/next.config.mjs`는 `/api/v1/:path*` 요청을 `API_SERVER_URL` 또는 기본값 `http://localhost:8080`의 `/api/v1/:path*`로 proxy합니다. 따라서 Intelligence Service의 public REST/SSE API는 프론트에서 같은 `/api/v1` prefix로 호출된다는 전제를 둡니다.

## Intelligence Service Role

이 백엔드 작업의 목표는 `brainx-next`가 필요로 하는 Knowledge Intelligence API를 계약 기준으로 구현하는 것입니다. 프론트 화면이나 mock API가 특정 AI 동작을 기대하더라도, 구현 기준은 먼저 `../../contracts-v2/brainx-openapi.ssot.yaml`이고 로컬 확인용 슬라이스는 `src/main/resources/contracts/knowledge-intelligence.openapi.yaml`입니다.

프론트에서 새 API 요구가 발견되면 다음 순서로 처리합니다.

1. `../../brainx-next`에서 호출 위치, request shape, response 소비 방식, streaming 처리 방식을 확인합니다.
2. `../../contracts-v2/brainx-openapi.ssot.yaml`에 해당 API가 이미 있는지 확인합니다.
3. 계약이 있으면 Intelligence Service 구현과 테스트를 계약에 맞춥니다.
4. 계약이 없거나 프론트 기대와 계약이 다르면 불일치를 명시하고, 별도 요청 없이 임의로 public API 계약을 바꾸지 않습니다.
5. 공개 API 계약 변경이 승인되면 SSOT를 먼저 수정하고 `scripts/extract_intelligence_openapi.py`로 로컬 슬라이스를 재생성합니다.

## What To Inspect In Frontend

- `../../brainx-next/next.config.mjs`: `/api/v1` proxy와 backend base URL 기준.
- `../../brainx-next/lib`: 실제 API client 함수가 모이는 위치입니다.
- `../../brainx-next/components`와 `../../brainx-next/app`: 화면에서 API 응답을 어떻게 소비하는지 확인할 때 봅니다.
- `../../brainx-next/components/editor-lab/brainx-note-demo/mockApi.ts`: 아직 실제 API로 연결되지 않은 editor/AI 흐름의 기대 동작을 추정할 때 참고할 수 있습니다. 단, 이 파일은 계약이 아니라 프론트 mock입니다.
- `../../brainx-next/docs`: 노트 편집기나 화면별 프론트 명세가 필요할 때 참고합니다.

## API Implementation Notes

- API path, status, schema, SSE event shape는 OpenAPI 계약을 우선합니다.
- 프론트 mock에 있는 endpoint 이름을 그대로 구현하기 전에 계약 존재 여부를 확인합니다.
- 프론트가 streaming UI를 기대하는 기능은 계약의 `text/event-stream` 여부, event name, terminal event를 확인합니다.
- 프론트 요구가 Workspace note 원문, 권한, plan/quota, asset upload처럼 다른 서비스가 source of truth인 정보에 닿으면 Intelligence Service 내부 DB에 임의 복제하지 말고 outbound port 또는 해당 도메인 계약을 먼저 확인합니다.
- 로컬 연동 확인은 필요 시 `brainx-next` dev server의 `/api/v1` proxy와 Intelligence Service `local` 또는 관련 profile을 함께 사용합니다.
