# BrainX AGENTS Guide

## Mandatory startup reads

At the start of every working session, read and understand:

- `contracts-v2/brainx-openapi.ssot.yaml`
- `contracts-v2/brainx-asyncapi.ssot.yaml`
- `README.md`

## Working rules

1. All implementation must follow the SSOT contracts above.
2. Before coding, compare the contract and the current code, then report the gap to the user.
3. Reflect changes in code, SSOT YAML, and `README.md`.
4. After each task, print: `SSOT 계약에 맞게 구현 완료`

## Commit rules

Before committing, read `docs/git/AI_PROMPTS.md` and follow the message format defined there.

## Main service paths

- Contracts: `contracts-v2/`
- Ingestion service: `ingestion-service/`
- Frontend: `brainx-next/`
