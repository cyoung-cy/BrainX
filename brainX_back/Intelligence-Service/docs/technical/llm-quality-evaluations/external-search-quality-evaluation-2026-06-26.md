# External Search 품질 상세 평가 - 2026-06-26

## 평가 대상

`build/external-search-captures/20260626-external-search-quality-timeout60/`의 2개 시나리오를 기준으로 한다. OpenAI Responses API `web_search` provider를 실제 호출했다.

## 요청 구조

별도 LLM system prompt는 사용하지 않는다. adapter는 Responses API에 다음 구조를 보낸다.

- `model`: 요청 model 또는 `brainx.external-search.openai.model`
- `tools`: `[{ "type": "web_search" }]`
- `tool_choice`: `required`
- `include`: `["web_search_call.action.sources"]`
- `input`: 사용자 검색 질의
- optional filter: `allowed_domains` 또는 `blocked_domains`

응답 정규화는 `output_text`, `url_citation` annotation, `web_search_call.action.sources`를 합쳐 `answer`와 `sources[]`를 만든다.

## 시나리오별 결과

### OpenAI web_search 문서 질의

질의: `OpenAI Responses API web_search 사용법과 sources include 옵션을 요약해줘`

source 8개가 반환됐다.

- `Web search | OpenAI API` (`platform.openai.com`)
- `Using tools | OpenAI API` (`platform.openai.com`)
- `Responses | OpenAI API Reference` (`platform.openai.com`)
- `Responses | OpenAI API Reference` (`platform.openai.com`)
- title이 없는 `platform.openai.com` URL 4개

응답은 `tools`에 `{"type": "web_search"}`를 넣고, `include`로 sources를 받는 방식을 설명했다. source domain이 OpenAI 공식 문서로 집중되어 있어 질의 의도와 잘 맞는다.

### 외부 검색과 내부 노트 검색 결합 질의

질의: `RAG 시스템에서 외부 웹 검색과 내부 노트 검색을 같이 쓰는 일반적인 방식은?`

source 8개가 반환됐다.

- IBM RAG 설명 문서 (`www.ibm.com`)
- Microsoft Learn RAG information-retrieval guide (`learn.microsoft.com`)
- CloudNSite RAG implementation 문서 (`cloudnsite.com`)
- Airbyte, Poma AI 등 RAG architecture 관련 문서

응답은 질문별 source routing, 내부/외부 검색 결과 결합, 신뢰도/최신성/권한 기준 reranking, LLM context 주입 흐름으로 설명했다. 외부 검색 port가 내부 RAG router에 붙을 때 필요한 패턴을 확인하기에 적절한 결과다.

## 실패와 조치

최초 run `20260626-external-search-quality`는 20초 timeout에서 `Read timed out`으로 실패했다. 동일 시나리오를 60초 timeout으로 재실행한 `20260626-external-search-quality-timeout60`은 2개 모두 통과했다.

이 결과는 external search가 일반 chat보다 latency 변동성이 크다는 점을 보여준다. 운영 연결 시 timeout, retry, 사용자 pending state를 별도 정책으로 봐야 한다.

## 관찰된 한계

- 일부 source는 URL은 있으나 title이 비어 있었다. provider response 정규화에서 URL host나 path 기반 fallback title을 만드는 개선이 필요하다.
- 현재 평가는 source count와 domain 중심이다. answer factuality는 아직 자동 검증하지 않는다.

## 다음 평가 기준

- OpenAI 공식 문서 질의에는 `requiredSourceDomains=["platform.openai.com"]`를 유지한다.
- RAG 일반론 질의에는 최소 2개 이상의 신뢰 가능한 domain이 포함되는지 검증한다.
- title fallback 정규화 후 "(no title)" source 비율을 별도 지표로 추적한다.
