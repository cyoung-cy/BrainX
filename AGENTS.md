# BrainX — AI Agent 지침

## 필수 선행 작업 (모든 세션 시작 시 자동 수행)

작업 시작 전 반드시 아래 파일을 읽고 학습할 것:

- `contracts-v2/brainx-openapi.ssot.yaml`
- `contracts-v2/brainx-asyncapi.ssot.yaml`
- `README.md`

## 작업 원칙

1. 모든 구현은 위 SSOT 계약 기준에 맞아야 함
2. 구현 전 계약과 현재 코드 간 차이 분석 후 먼저 보고
3. 변경사항은 코드뿐 아니라 SSOT yaml 파일과 README.md에도 반영
4. 각 작업 완료 후 "SSOT 계약에 맞게 구현 완료" 확인 메시지 출력

## 주요 서비스 경로

| 역할 | 경로 |
|------|------|
| SSOT 계약 파일 | `contracts-v2/` |
| 백엔드 (Ingestion-Service) | `brainX_back/Ingestion-Service/` |
| 백엔드 (전체) | `brainX_back/` |
| 프론트엔드 | `brainx-next/` |
| 크롬 익스텐션 | `brainx-chrome-extension/` |
