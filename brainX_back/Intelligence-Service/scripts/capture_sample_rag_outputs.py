#!/usr/bin/env python3
"""Capture sample RAG outputs for many queries with one ask session."""

from __future__ import annotations

import argparse
import json
import os
import platform
import subprocess
import sys
import time
from datetime import datetime, timezone
from pathlib import Path
from typing import Any


DEFAULT_SCENARIOS = [
    {
        "query": "RAG 채팅 메시지 전송 API 경로와 응답 방식은?",
        "minContextCount": 1,
        "minTopScore": 0.35,
        "requiredUsageFeatureIds": ["note-search-query-embedding"],
    },
    {
        "query": "정확한 단어가 기억 안 날 때 BrainX는 어떻게 예전 노트를 찾게 해?",
        "minContextCount": 1,
        "minTopScore": 0.35,
        "requiredUsageFeatureIds": ["note-search-query-embedding"],
    },
    {
        "query": "고양이와 펫처럼 단어가 달라도 관련 노트를 찾는 방식은?",
        "minContextCount": 1,
        "requiredUsageFeatureIds": ["note-search-query-embedding"],
    },
    {
        "query": "AI 챗봇은 벡터 조회와 LLM 호출을 어떻게 나눠서 오케스트레이션해?",
        "minContextCount": 1,
        "requiredUsageFeatureIds": ["note-search-query-embedding"],
    },
    {
        "query": "AI 기능 토큰 사용량은 어떤 이벤트로 Commerce에 기록돼?",
        "minContextCount": 1,
        "requiredUsageFeatureIds": ["note-search-query-embedding"],
    },
    {"query": "노트 자동 저장 후 검색 인덱스나 임베딩은 어떤 흐름으로 갱신돼?"},
    {"query": "작성 페이지에서 태그는 어떻게 입력하고 자동완성돼?"},
    {"query": "노션 OAuth authorize는 request body가 필요한가, bearerAuth는 어떻게 봐야 해?"},
    {"query": "무료 플랜과 Pro/Team 플랜에서 검색/RAG 기능 차이는?"},
    {"query": "챗봇 화면은 어떤 도메인과 연결되고 무엇을 보여줘?"},
    {"query": "BrainX 핵심 차별점 한 줄로 정리해줘"},
    {"query": "Kubernetes HPA 설정 파일은 어디에 있어?"},
]

JAVA_UTF8_OPTIONS = [
    "-Dfile.encoding=UTF-8",
    "-Dsun.stdout.encoding=UTF-8",
    "-Dsun.stderr.encoding=UTF-8",
]

BASE_AUTOCONFIG_EXCLUDES = [
    "org.springframework.ai.model.openai.autoconfigure.OpenAiAudioSpeechAutoConfiguration",
    "org.springframework.ai.model.openai.autoconfigure.OpenAiAudioTranscriptionAutoConfiguration",
    "org.springframework.ai.model.openai.autoconfigure.OpenAiImageAutoConfiguration",
    "org.springframework.ai.model.openai.autoconfigure.OpenAiModerationAutoConfiguration",
]

RETRIEVAL_AUTOCONFIG_EXCLUDES = [
    *BASE_AUTOCONFIG_EXCLUDES,
    "org.springframework.ai.model.chat.client.autoconfigure.ChatClientAutoConfiguration",
]


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    run_id = args.run_name or datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = (Path(args.out_dir) / run_id).resolve()
    raw_dir = run_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    scenarios = load_scenarios(args)
    queries = [scenario["query"] for scenario in scenarios]
    if not scenarios:
        print("No queries to run.", file=sys.stderr)
        return 2

    gradle = resolve_gradle(repo_root, args.gradle)
    records_path = run_dir / "responses.jsonl"
    summary_path = run_dir / "summary.json"
    chunk_report_path = run_dir / "chunks.md"
    env = child_environment(args)

    summary: dict[str, Any] = {
        "runId": run_id,
        "createdAt": utc_now(),
        "repoRoot": str(repo_root),
        "runner": "bootJar-propertiesLauncher-ask-session",
        "answerModeRequested": args.answer_mode,
        "profile": args.profile,
        "sampleDirectory": args.sample_dir,
        "topK": args.top_k,
        "maxContextChars": args.max_context_chars,
        "chatModel": args.chat_model,
        "processEncoding": args.process_encoding,
        "queryInputMode": "stdin",
        "javaToolOptions": JAVA_UTF8_OPTIONS,
        "queryCount": len(scenarios),
        "build": None,
        "ingest": None,
        "askSession": None,
        "recordsPath": str(records_path),
        "chunkReportPath": str(chunk_report_path),
        "rawDirectory": str(raw_dir),
        "runs": [],
    }

    jar_path = Path(args.jar_path).resolve() if args.jar_path else None
    if not args.skip_build:
        print("Building boot jar...")
        build_result = run_gradle_boot_jar(
            repo_root=repo_root,
            gradle=gradle,
            env=env,
            process_encoding=args.process_encoding,
            timeout_seconds=args.timeout_seconds,
        )
        summary["build"] = save_raw_command_output(raw_dir, "build", build_result)
        write_json(summary_path, summary)
        if build_result.returncode != 0:
            print(f"bootJar failed. See {summary['build']['stderrPath']}", file=sys.stderr)
            return build_result.returncode

    if jar_path is None:
        jar_path = find_boot_jar(repo_root)

    if not args.skip_ingest:
        print("Running ingest...")
        ingest_result = run_java_jar(
            repo_root=repo_root,
            jar_path=jar_path,
            env=env,
            app_args=app_args(args, command="ingest"),
            stdin_text=None,
            process_encoding=args.process_encoding,
            timeout_seconds=args.timeout_seconds,
        )
        ingest_record = save_command_output(raw_dir, "ingest", ingest_result)
        summary["ingest"] = ingest_record
        write_json(summary_path, summary)
        if ingest_result.returncode != 0:
            print(f"Ingest failed. See {ingest_record['stderrPath']}", file=sys.stderr)
            return ingest_result.returncode

    print(f"Running ask session for {len(queries)} queries ({args.answer_mode})...")
    ask_result = run_java_jar(
        repo_root=repo_root,
        jar_path=jar_path,
        env=env,
        app_args=app_args(args, command="ask"),
        stdin_text="\n".join(queries) + "\nexit\n",
        process_encoding=args.process_encoding,
        timeout_seconds=args.timeout_seconds,
    )
    ask_record = save_command_output(raw_dir, "ask-session", ask_result)
    summary["askSession"] = {
        **compact_command_record(ask_record),
        "jsonObjectCount": len(ask_result.parsed_json),
    }

    records: list[dict[str, Any]] = []
    with records_path.open("w", encoding="utf-8") as records_file:
        for index, scenario in enumerate(scenarios, start=1):
            query = scenario["query"]
            label = f"query-{index:03d}"
            response = ask_result.parsed_json[index - 1] if index <= len(ask_result.parsed_json) else None
            record = query_record(label, scenario, ask_result, ask_record, response)
            records_file.write(json.dumps(record, ensure_ascii=False) + "\n")
            records.append(record)
            summary["runs"].append(compact_record(record))

    if ask_result.returncode == 0 and len(ask_result.parsed_json) != len(queries):
        summary["askSession"]["status"] = "completed_json_count_mismatch"
    write_chunk_report(chunk_report_path, summary, records)
    write_json(summary_path, summary)

    if ask_result.returncode != 0:
        print(f"Ask session failed. See {ask_record['stderrPath']}", file=sys.stderr)
        return ask_result.returncode
    failed = [record for record in records if record["status"] not in {"completed", "capture_only"}]
    if failed:
        print(f"RAG capture completed with {len(failed)} failed scenario(s). See {summary_path}", file=sys.stderr)
        return 1

    print(f"Saved run summary: {summary_path}")
    print(f"Saved query records: {records_path}")
    print(f"Saved chunk report: {chunk_report_path}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Run sample_notes RAG ask once for many queries and store the outputs.",
    )
    parser.add_argument("queries", nargs="*", help="Queries to run. If omitted, default scenarios are used.")
    parser.add_argument("--queries-file", help="UTF-8 text or JSON file. JSON can contain objects with query and validation fields.")
    parser.add_argument("--answer-mode", choices=["retrieval", "chat"], default="retrieval", help="retrieval disables chat; chat calls the configured ChatModel.")
    parser.add_argument("--repo-root", default=".", help="Repository root. Defaults to the current directory.")
    parser.add_argument("--out-dir", default="build/rag-captures", help="Directory where capture runs are written.")
    parser.add_argument("--run-name", help="Run directory name. Defaults to YYYYMMDD-HHMMSS.")
    parser.add_argument("--profile", default="local", help="Spring profile to use.")
    parser.add_argument("--sample-dir", default="sample_notes", help="sample_notes directory passed to the RAG CLI.")
    parser.add_argument("--top-k", type=int, default=8, help="RAG context topK.")
    parser.add_argument("--max-context-chars", type=int, default=8000, help="Maximum context chars passed to the RAG CLI.")
    parser.add_argument("--chat-model", default="", help="Optional chat model override for chat mode.")
    parser.add_argument("--skip-build", action="store_true", help="Skip bootJar and use an existing jar.")
    parser.add_argument("--skip-ingest", action="store_true", help="Skip the initial ingest command.")
    parser.add_argument("--jar-path", help="Path to an existing Spring Boot jar. Implies only jar lookup override, not --skip-build.")
    parser.add_argument("--gradle", help="Path to gradle or gradlew. Defaults to the repo wrapper.")
    parser.add_argument(
        "--process-encoding",
        default="utf-8",
        help="Encoding used to decode Java stdout and stderr. Defaults to utf-8.",
    )
    parser.add_argument("--timeout-seconds", type=int, default=300, help="Timeout for build, ingest, and ask session.")
    return parser.parse_args()


def load_scenarios(args: argparse.Namespace) -> list[dict[str, Any]]:
    scenarios: list[dict[str, Any]] = []
    if args.queries_file:
        path = Path(args.queries_file)
        text = path.read_text(encoding="utf-8")
        if path.suffix.lower() == ".json":
            loaded = json.loads(text)
            if not isinstance(loaded, list):
                raise ValueError("--queries-file JSON must be an array.")
            scenarios.extend(scenario_from_value(item) for item in loaded)
            return scenarios
        for line in text.splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                scenarios.append({"query": stripped})
    scenarios.extend({"query": query.strip()} for query in args.queries if query.strip())
    return scenarios or [dict(item) for item in DEFAULT_SCENARIOS]


def scenario_from_value(value: Any) -> dict[str, Any]:
    if isinstance(value, str):
        return {"query": value.strip()}
    if isinstance(value, dict):
        query = str(value.get("query") or "").strip()
        if not query:
            raise ValueError("Scenario query must not be blank.")
        scenario = dict(value)
        scenario["query"] = query
        return scenario
    raise ValueError("Scenario must be a string or object.")


def resolve_gradle(repo_root: Path, gradle_arg: str | None) -> str:
    if gradle_arg:
        return gradle_arg
    wrapper = repo_root / ("gradlew.bat" if platform.system().lower().startswith("win") else "gradlew")
    return str(wrapper if wrapper.exists() else "gradle")


def child_environment(args: argparse.Namespace) -> dict[str, str]:
    env = os.environ.copy()
    env["JAVA_TOOL_OPTIONS"] = merged_java_tool_options(env.get("JAVA_TOOL_OPTIONS"))
    if args.answer_mode == "retrieval":
        env["SPRING_AI_MODEL_CHAT"] = "none"
        env["SPRING_AUTOCONFIGURE_EXCLUDE"] = ",".join(RETRIEVAL_AUTOCONFIG_EXCLUDES)
    elif args.chat_model:
        env["SPRING_AI_MODEL_CHAT"] = env.get("SPRING_AI_MODEL_CHAT", "openai")
        env["OPENAI_CHAT_MODEL"] = args.chat_model
    return env


def app_args(args: argparse.Namespace, *, command: str) -> list[str]:
    values = [
        f"--spring.profiles.active={args.profile}",
        "--brainx.dev.sample-rag.enabled=true",
        f"--brainx.dev.sample-rag.command={command}",
        f"--brainx.dev.sample-rag.directory={args.sample_dir}",
        f"--brainx.dev.sample-rag.top-k={args.top_k}",
        f"--brainx.dev.sample-rag.max-context-chars={args.max_context_chars}",
    ]
    if args.chat_model:
        values.append(f"--brainx.dev.sample-rag.chat-model={args.chat_model}")
    return values


def run_gradle_boot_jar(
    *,
    repo_root: Path,
    gradle: str,
    env: dict[str, str],
    process_encoding: str,
    timeout_seconds: int,
) -> CommandResult:
    return run_command(
        [gradle, "--no-daemon", "bootJar"],
        repo_root=repo_root,
        env=env,
        stdin_text=None,
        process_encoding=process_encoding,
        timeout_seconds=timeout_seconds,
    )


def run_java_jar(
    *,
    repo_root: Path,
    jar_path: Path,
    env: dict[str, str],
    app_args: list[str],
    stdin_text: str | None,
    process_encoding: str,
    timeout_seconds: int,
) -> CommandResult:
    return run_command(
        [
            "java",
            f"-Dloader.path={development_loader_path()}",
            "-cp",
            str(jar_path),
            "org.springframework.boot.loader.launch.PropertiesLauncher",
            *app_args,
        ],
        repo_root=repo_root,
        env=env,
        stdin_text=stdin_text,
        process_encoding=process_encoding,
        timeout_seconds=timeout_seconds,
    )


def run_command(
    command_line: list[str],
    *,
    repo_root: Path,
    env: dict[str, str],
    stdin_text: str | None,
    process_encoding: str,
    timeout_seconds: int,
) -> CommandResult:
    started = utc_now()
    start_time = time.monotonic()
    completed = subprocess.run(
        command_line,
        cwd=repo_root,
        env=env,
        input=stdin_text.encode("utf-8") if stdin_text is not None else None,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        timeout=timeout_seconds,
        check=False,
    )
    finished = utc_now()
    stdout = decode_process_output(completed.stdout, process_encoding)
    stderr = decode_process_output(completed.stderr, process_encoding)
    return CommandResult(
        command_line=command_line,
        started_at=started,
        finished_at=finished,
        duration_seconds=round(time.monotonic() - start_time, 3),
        returncode=completed.returncode,
        stdout_bytes=completed.stdout,
        stderr_bytes=completed.stderr,
        stdout=stdout,
        stderr=stderr,
        parsed_json=parse_json_objects(stdout),
    )


def find_boot_jar(repo_root: Path) -> Path:
    candidates = [
        path for path in (repo_root / "build" / "libs").glob("*.jar")
        if "-plain" not in path.name
    ]
    if not candidates:
        raise FileNotFoundError("No Spring Boot jar found under build/libs. Run without --skip-build first.")
    return max(candidates, key=lambda path: path.stat().st_mtime)


def development_loader_path() -> str:
    h2_jar = find_h2_jar()
    return str(h2_jar) if h2_jar is not None else ""


def find_h2_jar() -> Path | None:
    h2_cache = Path.home() / ".gradle" / "caches" / "modules-2" / "files-2.1" / "com.h2database" / "h2"
    if not h2_cache.exists():
        return None
    candidates = [
        path for path in h2_cache.rglob("h2-*.jar")
        if "sources" not in path.name and "javadoc" not in path.name
    ]
    if not candidates:
        return None
    return max(candidates, key=lambda path: path.stat().st_mtime)


def decode_process_output(value: bytes, encoding: str) -> str:
    return value.decode(encoding, errors="replace")


def merged_java_tool_options(existing: str | None) -> str:
    values = [existing.strip()] if existing and existing.strip() else []
    for option in JAVA_UTF8_OPTIONS:
        if existing is None or option not in existing:
            values.append(option)
    return " ".join(values)


def parse_json_objects(text: str) -> list[Any]:
    decoder = json.JSONDecoder()
    objects: list[Any] = []
    index = 0
    while index < len(text):
        start = text.find("{", index)
        if start == -1:
            break
        try:
            value, end = decoder.raw_decode(text[start:])
        except json.JSONDecodeError:
            index = start + 1
            continue
        objects.append(value)
        index = start + end
    return objects


def save_raw_command_output(raw_dir: Path, label: str, result: CommandResult) -> dict[str, Any]:
    record = save_command_output(raw_dir, label, result)
    record.pop("response", None)
    return record


def save_command_output(
    raw_dir: Path,
    label: str,
    result: CommandResult,
) -> dict[str, Any]:
    stdout_path = raw_dir / f"{label}.stdout.txt"
    stderr_path = raw_dir / f"{label}.stderr.txt"
    stdout_bytes_path = raw_dir / f"{label}.stdout.bin"
    stderr_bytes_path = raw_dir / f"{label}.stderr.bin"
    stdout_bytes_path.write_bytes(result.stdout_bytes)
    stderr_bytes_path.write_bytes(result.stderr_bytes)
    stdout_path.write_text(result.stdout, encoding="utf-8")
    stderr_path.write_text(result.stderr, encoding="utf-8")
    response = result.parsed_json[-1] if result.parsed_json else None
    status = "completed" if result.returncode == 0 else "failed"
    if result.returncode == 0 and response is None:
        status = "completed_without_json"
    return {
        "label": label,
        "status": status,
        "returnCode": result.returncode,
        "startedAt": result.started_at,
        "finishedAt": result.finished_at,
        "durationSeconds": result.duration_seconds,
        "command": result.command_line,
        "stdoutPath": str(stdout_path),
        "stderrPath": str(stderr_path),
        "stdoutBytesPath": str(stdout_bytes_path),
        "stderrBytesPath": str(stderr_bytes_path),
        "jsonObjectCount": len(result.parsed_json),
        "response": response,
    }


def query_record(
    label: str,
    scenario: dict[str, Any],
    session_result: CommandResult,
    session_record: dict[str, Any],
    response: Any,
) -> dict[str, Any]:
    validation = validate_rag_response(scenario, response)
    status = validation["status"] if session_result.returncode == 0 and response is not None else "missing_json"
    if session_result.returncode != 0:
        status = "failed"
    return {
        "label": label,
        "query": scenario["query"],
        "scenario": scenario,
        "status": status,
        "validation": validation,
        "failures": validation["failures"],
        "returnCode": session_result.returncode,
        "startedAt": session_result.started_at,
        "finishedAt": session_result.finished_at,
        "durationSeconds": session_result.duration_seconds,
        "command": session_result.command_line,
        "stdoutPath": session_record["stdoutPath"],
        "stderrPath": session_record["stderrPath"],
        "stdoutBytesPath": session_record["stdoutBytesPath"],
        "stderrBytesPath": session_record["stderrBytesPath"],
        "response": response,
    }


def validate_rag_response(scenario: dict[str, Any], response: Any) -> dict[str, Any]:
    if not isinstance(response, dict):
        return {"status": "missing_response", "failures": ["response JSON is missing"]}
    failures: list[str] = []
    contexts = response.get("contexts")
    if not isinstance(contexts, list):
        contexts = []
    if min_context_count := optional_int(scenario.get("minContextCount")):
        if len(contexts) < min_context_count:
            failures.append(f"context count {len(contexts)} is below {min_context_count}")
    if min_top_score := optional_float(scenario.get("minTopScore")):
        top_score = context_score(contexts[0]) if contexts else None
        if top_score is None or top_score < min_top_score:
            failures.append(f"top score {top_score} is below {min_top_score}")
    titles = [str(context.get("title") or "") for context in contexts if isinstance(context, dict)]
    filenames = [str(context.get("sourceFilename") or "") for context in contexts if isinstance(context, dict)]
    for expected in string_list(scenario.get("expectedContextTitles")):
        if not contains_text(titles, expected):
            failures.append(f"expected context title not found: {expected}")
    for expected in string_list(scenario.get("expectedContextFilenames")):
        if not contains_text(filenames, expected):
            failures.append(f"expected context filename not found: {expected}")
    for forbidden in string_list(scenario.get("forbiddenContextTitles")):
        if contains_text(titles, forbidden):
            failures.append(f"forbidden context title found: {forbidden}")
    feature_ids = [
        str(record.get("featureId") or "")
        for record in response.get("usageRecords", [])
        if isinstance(record, dict)
    ]
    for required in string_list(scenario.get("requiredUsageFeatureIds")):
        if required not in feature_ids:
            failures.append(f"required usage feature is missing: {required}")
    answer = str(response.get("answer") or "")
    for expected in string_list(scenario.get("answerMustContain")):
        if expected not in answer:
            failures.append(f"answer missing text: {expected}")
    for forbidden in string_list(scenario.get("answerMustNotContain")):
        if forbidden in answer:
            failures.append(f"answer contains forbidden text: {forbidden}")
    if not has_validation_rules(scenario):
        return {"status": "capture_only", "failures": []}
    return {"status": "completed" if not failures else "failed", "failures": failures}


def has_validation_rules(scenario: dict[str, Any]) -> bool:
    return any(
        key in scenario and scenario.get(key) not in (None, "", [], {})
        for key in [
            "expectedContextTitles",
            "expectedContextFilenames",
            "forbiddenContextTitles",
            "minContextCount",
            "minTopScore",
            "requiredUsageFeatureIds",
            "answerMustContain",
            "answerMustNotContain",
        ]
    )


def string_list(value: Any) -> list[str]:
    if value is None:
        return []
    if isinstance(value, str):
        return [value] if value else []
    if isinstance(value, list):
        return [str(item) for item in value if str(item)]
    return [str(value)]


def contains_text(values: list[str], expected: str) -> bool:
    lowered = expected.lower()
    return any(lowered in value.lower() for value in values)


def optional_int(value: Any) -> int | None:
    if value in (None, ""):
        return None
    return int(value)


def optional_float(value: Any) -> float | None:
    if value in (None, ""):
        return None
    return float(value)


def context_score(value: Any) -> float | None:
    if not isinstance(value, dict):
        return None
    score = value.get("score")
    return float(score) if score is not None else None


def compact_command_record(record: dict[str, Any]) -> dict[str, Any]:
    return {
        "label": record["label"],
        "status": record["status"],
        "returnCode": record["returnCode"],
        "durationSeconds": record["durationSeconds"],
        "stdoutPath": record["stdoutPath"],
        "stderrPath": record["stderrPath"],
        "stdoutBytesPath": record["stdoutBytesPath"],
        "stderrBytesPath": record["stderrBytesPath"],
    }


def compact_record(record: dict[str, Any]) -> dict[str, Any]:
    response = record.get("response") or {}
    contexts = response.get("contexts") if isinstance(response, dict) else None
    token_usage = token_usage_summary(response.get("tokenUsage")) if isinstance(response, dict) else None
    usage_records = usage_record_summaries(response.get("usageRecords")) if isinstance(response, dict) else []
    return {
        "label": record["label"],
        "query": record.get("query"),
        "status": record["status"],
        "failures": record.get("failures", []),
        "returnCode": record["returnCode"],
        "durationSeconds": record["durationSeconds"],
        "answerMode": response.get("answerMode") if isinstance(response, dict) else None,
        "model": response.get("model") if isinstance(response, dict) else None,
        "tokenUsage": token_usage,
        "usageRecords": usage_records,
        "contextCount": len(contexts) if isinstance(contexts, list) else None,
        "stdoutPath": record["stdoutPath"],
        "stderrPath": record["stderrPath"],
        "stdoutBytesPath": record["stdoutBytesPath"],
        "stderrBytesPath": record["stderrBytesPath"],
    }


def token_usage_summary(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    cost = value.get("costEstimate")
    if not isinstance(cost, dict):
        cost = {}
    return {
        "inputTokens": value.get("inputTokens"),
        "cachedInputTokens": value.get("cachedInputTokens"),
        "billableInputTokens": value.get("billableInputTokens"),
        "outputTokens": value.get("outputTokens"),
        "reasoningTokens": value.get("reasoningTokens"),
        "totalTokens": value.get("totalTokens"),
        "estimatedInputCost": cost.get("inputCost"),
        "estimatedCachedInputCost": cost.get("cachedInputCost"),
        "estimatedOutputCost": cost.get("outputCost"),
        "estimatedCost": cost.get("totalCost"),
        "costCurrency": cost.get("currencyCode"),
    }


def usage_record_summaries(value: Any) -> list[dict[str, Any]]:
    if not isinstance(value, list):
        return []
    return [summary for item in value if (summary := usage_record_summary(item)) is not None]


def usage_record_summary(value: Any) -> dict[str, Any] | None:
    if not isinstance(value, dict):
        return None
    cost = value.get("costEstimate")
    if not isinstance(cost, dict):
        cost = {}
    return {
        "featureId": value.get("featureId"),
        "model": value.get("model"),
        "inputTokens": value.get("inputTokens"),
        "cachedInputTokens": value.get("cachedInputTokens"),
        "billableInputTokens": value.get("billableInputTokens"),
        "outputTokens": value.get("outputTokens"),
        "reasoningTokens": value.get("reasoningTokens"),
        "totalTokens": value.get("totalTokens"),
        "estimatedInputCost": cost.get("inputCost"),
        "estimatedCachedInputCost": cost.get("cachedInputCost"),
        "estimatedOutputCost": cost.get("outputCost"),
        "estimatedCost": cost.get("totalCost"),
        "costCurrency": cost.get("currencyCode"),
    }


def format_token_usage_summary(value: dict[str, Any] | None) -> str:
    if not value:
        return "none"
    tokens = (
        f"input={value.get('inputTokens')}, "
        f"cachedInput={value.get('cachedInputTokens')}, "
        f"billableInput={value.get('billableInputTokens')}, "
        f"output={value.get('outputTokens')}, "
        f"reasoning={value.get('reasoningTokens')}, "
        f"total={value.get('totalTokens')}"
    )
    estimated_cost = value.get("estimatedCost")
    currency = value.get("costCurrency")
    if estimated_cost is None:
        return f"{tokens}, estimatedCost=unknown"
    return f"{tokens}, estimatedCost={estimated_cost} {currency or ''}".strip()


def format_usage_records(records: list[dict[str, Any]]) -> str:
    if not records:
        return "none"
    formatted: list[str] = []
    for record in records:
        estimated_cost = record.get("estimatedCost")
        currency = record.get("costCurrency")
        if estimated_cost is None:
            cost = "estimatedCost=unknown"
        else:
            cost = f"estimatedCost={estimated_cost} {currency or ''}".strip()
        formatted.append(
            f"{record.get('featureId')}/{record.get('model')}: "
            f"input={record.get('inputTokens')}, "
            f"output={record.get('outputTokens')}, "
            f"total={record.get('totalTokens')}, "
            f"{cost}"
        )
    return "; ".join(formatted)


def write_json(path: Path, value: Any) -> None:
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_chunk_report(path: Path, summary: dict[str, Any], records: list[dict[str, Any]]) -> None:
    lines: list[str] = [
        "# sample_notes RAG Chunk Report",
        "",
        f"- runId: `{summary['runId']}`",
        f"- answerModeRequested: `{summary['answerModeRequested']}`",
        f"- queryCount: `{summary['queryCount']}`",
        f"- topK: `{summary['topK']}`",
        f"- recordsPath: `{summary['recordsPath']}`",
        "",
    ]
    for record in records:
        response = record.get("response")
        lines.extend([
            f"## {record['label']}",
            "",
            f"Query: {record.get('query', '')}",
            "",
        ])
        if not isinstance(response, dict):
            lines.extend([
                f"- status: `{record['status']}`",
                "- response: missing",
                "",
            ])
            continue
        contexts = response.get("contexts")
        if not isinstance(contexts, list):
            contexts = []
        token_usage = token_usage_summary(response.get("tokenUsage"))
        usage_records = usage_record_summaries(response.get("usageRecords"))
        lines.extend([
            f"- status: `{record['status']}`",
            f"- failures: `{'; '.join(record.get('failures', [])) or 'none'}`",
            f"- answerMode: `{response.get('answerMode', '')}`",
            f"- model: `{response.get('model', '')}`",
            f"- tokenUsage: `{format_token_usage_summary(token_usage)}`",
            f"- usageRecords: `{format_usage_records(usage_records)}`",
            f"- contextCount: `{len(contexts)}`",
            "",
        ])
        answer = str(response.get("answer") or "")
        if answer:
            fence = code_fence(answer)
            lines.extend([
                "Answer:",
                "",
                f"{fence}text",
                answer,
                fence,
                "",
            ])
        for rank, context in enumerate(contexts, start=1):
            if not isinstance(context, dict):
                continue
            text = str(context.get("text") or "")
            fence = code_fence(text)
            lines.extend([
                f"### {record['label']} / chunk {rank}",
                "",
                f"- title: {context.get('title', '')}",
                f"- noteId: `{context.get('noteId', '')}`",
                f"- documentGroupId: `{context.get('documentGroupId', '')}`",
                f"- chunkId: `{context.get('chunkId', '')}`",
                f"- chunkIndex: `{context.get('chunkIndex', '')}`",
                f"- score: `{context.get('score', '')}`",
                f"- textLength: `{len(text)}`",
                "",
                f"{fence}text",
                text,
                fence,
                "",
            ])
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def code_fence(text: str) -> str:
    longest = 0
    current = 0
    for char in text:
        if char == "`":
            current += 1
            longest = max(longest, current)
        else:
            current = 0
    return "`" * max(4, longest + 1)


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


class CommandResult:
    def __init__(
        self,
        *,
        command_line: list[str],
        started_at: str,
        finished_at: str,
        duration_seconds: float,
        returncode: int,
        stdout_bytes: bytes,
        stderr_bytes: bytes,
        stdout: str,
        stderr: str,
        parsed_json: list[Any],
    ) -> None:
        self.command_line = command_line
        self.started_at = started_at
        self.finished_at = finished_at
        self.duration_seconds = duration_seconds
        self.returncode = returncode
        self.stdout_bytes = stdout_bytes
        self.stderr_bytes = stderr_bytes
        self.stdout = stdout
        self.stderr = stderr
        self.parsed_json = parsed_json


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.TimeoutExpired as exception:
        print(f"Command timed out after {exception.timeout} seconds.", file=sys.stderr)
        raise SystemExit(124)
    except KeyboardInterrupt:
        raise SystemExit(130)
