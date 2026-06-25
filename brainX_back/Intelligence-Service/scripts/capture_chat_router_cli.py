#!/usr/bin/env python3
"""Capture real Chat Router CLI outputs and validate expected routes."""

from __future__ import annotations

import argparse
import json
import os
import platform
import socket
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from capture_sample_rag_outputs import (
    JAVA_UTF8_OPTIONS,
    code_fence,
    find_boot_jar,
    merged_java_tool_options,
    run_gradle_boot_jar,
    run_java_jar,
    save_command_output,
    save_raw_command_output,
    write_json,
)


DEFAULT_SCENARIOS = [
    {
        "expectedRoute": "NOTE_QA",
        "query": "현재 문서 그룹 노트 기준으로 RAG 채팅 메시지 전송 흐름을 설명해줘",
    },
    {
        "expectedRoute": "WORKSPACE_SEARCH",
        "query": "내 전체 노트에서 인증과 토큰 사용량 관련 내용을 찾아 비교해줘",
    },
    {
        "expectedRoute": "COMPOSE",
        "query": "BrainX의 AI 노트 검색 기능을 소개하는 짧은 블로그 초안을 써줘",
    },
    {
        "expectedRoute": "NOTE_ACTION",
        "query": "방금 답변을 노트에 추가할 수 있는 Markdown 초안으로 만들어줘",
    },
    {
        "expectedRoute": "OUT_OF_SCOPE",
        "query": "오늘 서울 날씨 알려줘",
    },
]

REQUIRED_SETTINGS = [
    "OPENAI_API_KEY",
    "VOYAGE_API_KEY",
    "SPRING_AI_MODEL_CHAT",
    "BRAINX_AI_EMBEDDING_PROVIDER",
    "QDRANT_COLLECTION",
]

PROPERTY_ALIASES = {
    "OPENAI_API_KEY": ["spring.ai.openai.api-key", "brainx.external-search.openai.api-key"],
    "VOYAGE_API_KEY": ["brainx.ai.embedding.voyage.api-key"],
    "SPRING_AI_MODEL_CHAT": ["spring.ai.model.chat"],
    "BRAINX_AI_EMBEDDING_PROVIDER": ["brainx.ai.embedding.provider"],
    "QDRANT_COLLECTION": ["brainx.vector.qdrant.collection-name"],
    "QDRANT_HOST": ["brainx.vector.qdrant.host"],
    "QDRANT_GRPC_PORT": ["brainx.vector.qdrant.port"],
}


def main() -> int:
    args = parse_args()
    repo_root = Path(args.repo_root).resolve()
    run_id = args.run_name or datetime.now().strftime("%Y%m%d-%H%M%S")
    run_dir = (Path(args.out_dir) / run_id).resolve()
    raw_dir = run_dir / "raw"
    raw_dir.mkdir(parents=True, exist_ok=True)

    scenarios = load_scenarios(args)
    summary_path = run_dir / "summary.json"
    records_path = run_dir / "responses.jsonl"
    report_path = run_dir / "report.md"
    env = child_environment(args)

    summary: dict[str, Any] = {
        "runId": run_id,
        "createdAt": utc_now(),
        "repoRoot": str(repo_root),
        "runner": "chat-router-cli",
        "profile": args.profile,
        "sampleDirectory": args.sample_dir,
        "chatModel": args.chat_model,
        "routerModel": args.router_model,
        "processEncoding": args.process_encoding,
        "javaToolOptions": JAVA_UTF8_OPTIONS,
        "scenarioCount": len(scenarios),
        "preflight": preflight(repo_root, env, args.qdrant_host, args.qdrant_port),
        "build": None,
        "ingestAndAsk": None,
        "askSession": None,
        "recordsPath": str(records_path),
        "reportPath": str(report_path),
        "rawDirectory": str(raw_dir),
        "runs": [],
    }

    if not summary["preflight"]["ok"]:
        write_json(summary_path, summary)
        write_report(report_path, summary, [])
        print(f"Preflight failed. See {summary_path}", file=sys.stderr)
        return 2

    gradle = resolve_gradle(repo_root, args.gradle)
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
            write_report(report_path, summary, [])
            print(f"bootJar failed. See {summary['build']['stderrPath']}", file=sys.stderr)
            return build_result.returncode

    if jar_path is None:
        jar_path = find_boot_jar(repo_root)

    records: list[dict[str, Any]] = []
    if args.skip_ingest:
        first_session_index = 0
    else:
        first_scenario = scenarios[0]
        print("Running ingest-and-ask for the first scenario...")
        ingest_result = run_java_jar(
            repo_root=repo_root,
            jar_path=jar_path,
            env=env,
            app_args=app_args(args, command="ingest-and-ask", query=first_scenario["query"]),
            stdin_text=None,
            process_encoding=args.process_encoding,
            timeout_seconds=args.timeout_seconds,
        )
        ingest_record = save_command_output(raw_dir, "ingest-and-ask", ingest_result)
        summary["ingestAndAsk"] = compact_command_record(ingest_record)
        records.append(scenario_record("query-001", first_scenario, ingest_record, ingest_result.parsed_json[-1] if ingest_result.parsed_json else None))
        first_session_index = 1
        write_json(summary_path, summary)
        if ingest_result.returncode != 0:
            write_records(records_path, records)
            summary["runs"] = [compact_record(record) for record in records]
            write_json(summary_path, summary)
            write_report(report_path, summary, records)
            print(f"ingest-and-ask failed. See {ingest_record['stderrPath']}", file=sys.stderr)
            return ingest_result.returncode

    remaining = scenarios[first_session_index:]
    if remaining:
        print(f"Running ask session for {len(remaining)} scenarios...")
        ask_result = run_java_jar(
            repo_root=repo_root,
            jar_path=jar_path,
            env=env,
            app_args=app_args(args, command="ask", query=None),
            stdin_text="\n".join(item["query"] for item in remaining) + "\nexit\n",
            process_encoding=args.process_encoding,
            timeout_seconds=args.timeout_seconds,
        )
        ask_record = save_command_output(raw_dir, "ask-session", ask_result)
        summary["askSession"] = {
            **compact_command_record(ask_record),
            "jsonObjectCount": len(ask_result.parsed_json),
        }
        for offset, scenario in enumerate(remaining, start=first_session_index + 1):
            response_index = offset - first_session_index - 1
            response = ask_result.parsed_json[response_index] if response_index < len(ask_result.parsed_json) else None
            records.append(scenario_record(f"query-{offset:03d}", scenario, ask_record, response))

    summary["runs"] = [compact_record(record) for record in records]
    write_records(records_path, records)
    write_json(summary_path, summary)
    write_report(report_path, summary, records)

    failed = [record for record in records if record["status"] != "passed"]
    if failed:
        print(f"Chat router capture completed with {len(failed)} failed scenario(s). See {summary_path}", file=sys.stderr)
        return 1

    print(f"Saved run summary: {summary_path}")
    print(f"Saved query records: {records_path}")
    print(f"Saved report: {report_path}")
    return 0


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Run Chat Router CLI scenarios and validate routes.")
    parser.add_argument("queries", nargs="*", help="Optional custom queries. Expected routes are inferred as UNKNOWN.")
    parser.add_argument("--queries-file", help="UTF-8 JSON or text file. JSON can contain objects with query/expectedRoute.")
    parser.add_argument("--repo-root", default=".", help="Repository root. Defaults to current directory.")
    parser.add_argument("--out-dir", default="build/chat-router-captures", help="Directory where capture runs are written.")
    parser.add_argument("--run-name", help="Run directory name. Defaults to YYYYMMDD-HHMMSS.")
    parser.add_argument("--profile", default="local", help="Spring profile to use.")
    parser.add_argument("--sample-dir", default="sample_notes", help="sample_notes directory passed to the chat router CLI.")
    parser.add_argument("--skip-build", action="store_true", help="Skip bootJar and use an existing jar.")
    parser.add_argument("--skip-ingest", action="store_true", help="Skip the initial ingest-and-ask command.")
    parser.add_argument("--jar-path", help="Path to an existing Spring Boot jar.")
    parser.add_argument("--gradle", help="Path to gradle or gradlew. Defaults to the repo wrapper.")
    parser.add_argument("--timeout-seconds", type=int, default=300, help="Timeout for each Java process.")
    parser.add_argument("--chat-model", default="gpt-5.4-mini", help="Answer generation model.")
    parser.add_argument("--router-model", default="gpt-5.4-nano", help="Route classifier model.")
    parser.add_argument("--qdrant-host", default="localhost", help="Qdrant gRPC host for preflight.")
    parser.add_argument("--qdrant-port", type=int, default=6334, help="Qdrant gRPC port for preflight.")
    parser.add_argument("--process-encoding", default="utf-8", help="Encoding used to decode Java stdout/stderr.")
    return parser.parse_args()


def load_scenarios(args: argparse.Namespace) -> list[dict[str, str]]:
    if args.queries_file:
        path = Path(args.queries_file)
        text = path.read_text(encoding="utf-8")
        if path.suffix.lower() == ".json":
            loaded = json.loads(text)
            if not isinstance(loaded, list):
                raise ValueError("--queries-file JSON must be an array.")
            return [scenario_from_value(item) for item in loaded]
        scenarios = []
        for line in text.splitlines():
            stripped = line.strip()
            if stripped and not stripped.startswith("#"):
                scenarios.append({"expectedRoute": "UNKNOWN", "query": stripped})
        return scenarios
    if args.queries:
        return [{"expectedRoute": "UNKNOWN", "query": query.strip()} for query in args.queries if query.strip()]
    return list(DEFAULT_SCENARIOS)


def scenario_from_value(value: Any) -> dict[str, str]:
    if isinstance(value, str):
        return {"expectedRoute": "UNKNOWN", "query": value}
    if isinstance(value, dict):
        query = str(value.get("query") or "").strip()
        expected = str(value.get("expectedRoute") or value.get("expected_route") or "UNKNOWN").strip()
        if not query:
            raise ValueError("Scenario query must not be blank.")
        return {"expectedRoute": expected or "UNKNOWN", "query": query}
    raise ValueError("Scenario must be a string or object.")


def child_environment(args: argparse.Namespace) -> dict[str, str]:
    env = os.environ.copy()
    env["JAVA_TOOL_OPTIONS"] = merged_java_tool_options(env.get("JAVA_TOOL_OPTIONS"))
    env.setdefault("SPRING_AI_MODEL_CHAT", "openai")
    env["OPENAI_CHAT_MODEL"] = args.chat_model
    return env


def preflight(repo_root: Path, env: dict[str, str], default_qdrant_host: str, default_qdrant_port: int) -> dict[str, Any]:
    properties_path = repo_root / ".brainx-local.properties"
    local_values = read_local_properties(properties_path)
    setting_results = {
        name: bool(effective_setting(name, env, local_values, PROPERTY_ALIASES.get(name, [])))
        for name in REQUIRED_SETTINGS
    }
    qdrant_host = effective_setting("QDRANT_HOST", env, local_values, PROPERTY_ALIASES["QDRANT_HOST"]) or default_qdrant_host
    qdrant_port = int(effective_setting("QDRANT_GRPC_PORT", env, local_values, PROPERTY_ALIASES["QDRANT_GRPC_PORT"]) or str(default_qdrant_port))
    qdrant = qdrant_preflight(qdrant_host, qdrant_port)
    failures: list[str] = []
    if not properties_path.exists():
        failures.append(".brainx-local.properties is missing")
    for name, present in setting_results.items():
        if not present:
            failures.append(f"{name} is missing or blank")
    if not qdrant["reachable"]:
        failures.append(f"Qdrant gRPC {qdrant['host']}:{qdrant['port']} is not reachable")
    return {
        "ok": not failures,
        "localPropertiesExists": properties_path.exists(),
        "settings": setting_results,
        "qdrant": qdrant,
        "failures": failures,
    }


def read_local_properties(path: Path) -> dict[str, str]:
    if not path.exists():
        return {}
    values: dict[str, str] = {}
    for raw_line in path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, value = line.split("=", 1)
        values[key.strip()] = value.strip()
    return values


def effective_setting(name: str, env: dict[str, str], local_values: dict[str, str], aliases: list[str] | None = None) -> str:
    value = env.get(name)
    if value is not None and value.strip():
        return value.strip()
    value = local_values.get(name)
    if value is not None and value.strip():
        return value.strip()
    for alias in aliases or []:
        value = local_values.get(alias)
        if value is not None and value.strip():
            return value.strip()
    return ""


def qdrant_preflight(host: str, port: int) -> dict[str, Any]:
    try:
        with socket.create_connection((host, port), timeout=2.0):
            return {"host": host, "port": port, "reachable": True, "error": None}
    except OSError as exception:
        return {"host": host, "port": port, "reachable": False, "error": str(exception)}


def resolve_gradle(repo_root: Path, gradle_arg: str | None) -> str:
    if gradle_arg:
        return gradle_arg
    wrapper = repo_root / ("gradlew.bat" if platform.system().lower().startswith("win") else "gradlew")
    return str(wrapper if wrapper.exists() else "gradle")


def app_args(args: argparse.Namespace, *, command: str, query: str | None) -> list[str]:
    values = [
        f"--spring.profiles.active={args.profile}",
        "--brainx.dev.chat-router.enabled=true",
        f"--brainx.dev.chat-router.command={command}",
        f"--brainx.dev.chat-router.directory={args.sample_dir}",
        f"--brainx.dev.chat-router.model-id={args.chat_model}",
        f"--brainx.chat.router.model={args.router_model}",
    ]
    if query is not None:
        values.append(f"--brainx.dev.chat-router.query={query}")
    return values


def scenario_record(
    label: str,
    scenario: dict[str, str],
    command_record: dict[str, Any],
    response: Any,
) -> dict[str, Any]:
    validation = validate_response(scenario, response)
    return {
        "label": label,
        "query": scenario["query"],
        "expectedRoute": scenario["expectedRoute"],
        "actualRoute": route_from_response(response),
        "status": validation["status"],
        "failures": validation["failures"],
        "returnCode": command_record["returnCode"],
        "durationSeconds": command_record["durationSeconds"],
        "stdoutPath": command_record["stdoutPath"],
        "stderrPath": command_record["stderrPath"],
        "stdoutBytesPath": command_record["stdoutBytesPath"],
        "stderrBytesPath": command_record["stderrBytesPath"],
        "response": response,
    }


def validate_response(scenario: dict[str, str], response: Any) -> dict[str, Any]:
    failures: list[str] = []
    if not isinstance(response, dict):
        return {"status": "missing_response", "failures": ["response JSON is missing"]}
    for field in ["query", "routerModel", "route", "routeReason", "answer", "citations", "events"]:
        if field not in response:
            failures.append(f"{field} is missing")
    events = response.get("events")
    if not isinstance(events, list) or not events:
        failures.append("events is empty")
    elif not isinstance(events[0], dict) or events[0].get("event") != "route":
        failures.append("events[0].event is not route")
    if response.get("routerModel") != "gpt-5.4-nano":
        failures.append("routerModel is not gpt-5.4-nano")
    expected = scenario.get("expectedRoute", "UNKNOWN")
    if expected != "UNKNOWN" and response.get("route") != expected:
        failures.append(f"route mismatch: expected {expected}, actual {response.get('route')}")
    citations = response.get("citations")
    if response.get("route") == "OUT_OF_SCOPE":
        if isinstance(citations, list) and citations:
            failures.append("OUT_OF_SCOPE returned citations")
        if "BrainX 본 채팅" not in str(response.get("answer") or ""):
            failures.append("OUT_OF_SCOPE answer does not contain fixed guard text")
    if response.get("route") in {"NOTE_QA", "WORKSPACE_SEARCH"}:
        if not isinstance(citations, list) or not citations:
            failures.append(f"{response.get('route')} returned no citations")
    status = "passed" if not failures else ("route_mismatch" if any("route mismatch" in item for item in failures) else "failed")
    return {"status": status, "failures": failures}


def route_from_response(response: Any) -> str | None:
    return response.get("route") if isinstance(response, dict) else None


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
    response = record.get("response")
    citations = response.get("citations") if isinstance(response, dict) else None
    events = response.get("events") if isinstance(response, dict) else None
    answer = str(response.get("answer") or "") if isinstance(response, dict) else ""
    return {
        "label": record["label"],
        "query": record["query"],
        "expectedRoute": record["expectedRoute"],
        "actualRoute": record["actualRoute"],
        "status": record["status"],
        "failures": record["failures"],
        "routerModel": response.get("routerModel") if isinstance(response, dict) else None,
        "routeReason": response.get("routeReason") if isinstance(response, dict) else None,
        "answerPreview": answer[:300],
        "citationCount": len(citations) if isinstance(citations, list) else None,
        "eventCount": len(events) if isinstance(events, list) else None,
        "stdoutPath": record["stdoutPath"],
        "stderrPath": record["stderrPath"],
    }


def write_records(path: Path, records: list[dict[str, Any]]) -> None:
    with path.open("w", encoding="utf-8") as file:
        for record in records:
            file.write(json.dumps(record, ensure_ascii=False) + "\n")


def write_report(path: Path, summary: dict[str, Any], records: list[dict[str, Any]]) -> None:
    lines = [
        "# Chat Router CLI Capture Report",
        "",
        f"- runId: `{summary['runId']}`",
        f"- profile: `{summary['profile']}`",
        f"- chatModel: `{summary['chatModel']}`",
        f"- routerModel: `{summary['routerModel']}`",
        f"- recordsPath: `{summary['recordsPath']}`",
        "",
        "## Preflight",
        "",
        f"- ok: `{summary['preflight']['ok']}`",
        f"- localPropertiesExists: `{summary['preflight']['localPropertiesExists']}`",
    ]
    for name, present in summary["preflight"]["settings"].items():
        lines.append(f"- {name}: `{present}`")
    qdrant = summary["preflight"]["qdrant"]
    lines.append(f"- Qdrant gRPC {qdrant['host']}:{qdrant['port']}: `{qdrant['reachable']}`")
    if summary["preflight"]["failures"]:
        lines.extend(["", "Failures:"])
        lines.extend(f"- {failure}" for failure in summary["preflight"]["failures"])
    lines.append("")

    if records:
        lines.extend(["## Scenarios", ""])
    for record in records:
        response = record.get("response")
        answer = str(response.get("answer") or "") if isinstance(response, dict) else ""
        citations = response.get("citations") if isinstance(response, dict) else []
        events = response.get("events") if isinstance(response, dict) else []
        fence = code_fence(answer)
        lines.extend([
            f"### {record['label']}",
            "",
            f"- status: `{record['status']}`",
            f"- expectedRoute: `{record['expectedRoute']}`",
            f"- actualRoute: `{record['actualRoute']}`",
            f"- citationCount: `{len(citations) if isinstance(citations, list) else 0}`",
            f"- eventCount: `{len(events) if isinstance(events, list) else 0}`",
            f"- stderrPath: `{record['stderrPath']}`",
            "",
            "Query:",
            "",
            record["query"],
            "",
        ])
        if record["failures"]:
            lines.extend(["Failures:", ""])
            lines.extend(f"- {failure}" for failure in record["failures"])
            lines.append("")
        if answer:
            lines.extend([
                "Answer preview:",
                "",
                f"{fence}text",
                answer[:300],
                fence,
                "",
            ])
    path.write_text("\n".join(lines).rstrip() + "\n", encoding="utf-8")


def utc_now() -> str:
    return datetime.now(timezone.utc).isoformat()


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except subprocess.TimeoutExpired as exception:
        print(f"Command timed out after {exception.timeout} seconds.", file=sys.stderr)
        raise SystemExit(124)
    except KeyboardInterrupt:
        raise SystemExit(130)
