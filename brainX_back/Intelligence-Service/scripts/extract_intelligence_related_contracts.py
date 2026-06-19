# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "PyYAML>=6.0.2",
# ]
# ///
from __future__ import annotations

import argparse
from collections import defaultdict
from pathlib import Path
from typing import Any

import yaml


HTTP_METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
OPENAPI_CONSUMER_ID = "internal.knowledge-intelligence"
ASYNCAPI_SERVICE_ID = "AI-Service"


def default_repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def default_contracts_root() -> Path:
    return default_repo_root() / "contracts-v2"


def default_output_root() -> Path:
    return Path(__file__).resolve().parents[1] / "src" / "main" / "resources" / "contracts"


def strip_merge_conflicts(text: str, side: str) -> tuple[str, int]:
    lines = text.splitlines(keepends=True)
    output: list[str] = []
    left: list[str] = []
    right: list[str] = []
    state = "normal"
    conflict_count = 0

    for line in lines:
        if line.startswith("<<<<<<< "):
            if state != "normal":
                raise ValueError("Nested merge conflict markers are not supported")
            state = "left"
            left = []
            right = []
            conflict_count += 1
            continue
        if line.startswith("=======") and state == "left":
            state = "right"
            continue
        if line.startswith(">>>>>>> ") and state == "right":
            output.extend(left if side == "left" else right)
            state = "normal"
            continue

        if state == "normal":
            output.append(line)
        elif state == "left":
            left.append(line)
        elif state == "right":
            right.append(line)

    if state != "normal":
        raise ValueError("Unclosed merge conflict marker in source contract")

    return "".join(output), conflict_count


def load_yaml(path: Path, conflict_side: str) -> dict[str, Any]:
    text = path.read_text(encoding="utf-8")
    if "<<<<<<< " in text:
        text, _ = strip_merge_conflicts(text, conflict_side)
    data = yaml.safe_load(text)
    if not isinstance(data, dict):
        raise ValueError(f"Expected YAML object in {path}")
    return data


def dump_yaml(data: dict[str, Any]) -> str:
    return yaml.safe_dump(data, allow_unicode=True, sort_keys=False, width=120)


def has_openapi_consumer(operation: dict[str, Any], consumer_id: str) -> bool:
    consumers = operation.get("x-consumers", [])
    if not isinstance(consumers, list):
        return False
    return any(isinstance(item, dict) and item.get("id") == consumer_id for item in consumers)


def find_component_refs(value: Any) -> set[tuple[str, str]]:
    refs: set[tuple[str, str]] = set()
    if isinstance(value, dict):
        ref = value.get("$ref")
        if isinstance(ref, str) and ref.startswith("#/components/"):
            parts = ref.split("/")
            if len(parts) >= 4:
                refs.add((parts[2], parts[3]))
        for child in value.values():
            refs.update(find_component_refs(child))
    elif isinstance(value, list):
        for child in value:
            refs.update(find_component_refs(child))
    return refs


def collect_openapi_security_scheme_names(value: Any) -> set[str]:
    names: set[str] = set()
    if isinstance(value, dict):
        security = value.get("security")
        if isinstance(security, list):
            for requirement in security:
                if isinstance(requirement, dict):
                    names.update(requirement.keys())
        for child in value.values():
            names.update(collect_openapi_security_scheme_names(child))
    elif isinstance(value, list):
        for child in value:
            names.update(collect_openapi_security_scheme_names(child))
    return names


def collect_components(source: dict[str, Any], selected: dict[str, Any]) -> dict[str, Any]:
    source_components = source.get("components", {})
    if not isinstance(source_components, dict):
        return {}

    selected_names: dict[str, set[str]] = defaultdict(set)
    queue = list(find_component_refs(selected))

    while queue:
        group, name = queue.pop()
        if name in selected_names[group]:
            continue
        component = source_components.get(group, {}).get(name)
        if component is None:
            continue
        selected_names[group].add(name)
        queue.extend(find_component_refs(component))

    security_schemes = source_components.get("securitySchemes", {})
    for name in collect_openapi_security_scheme_names(selected):
        if isinstance(security_schemes, dict) and name in security_schemes:
            selected_names["securitySchemes"].add(name)

    filtered: dict[str, Any] = {}
    for group, source_group in source_components.items():
        names = selected_names.get(group, set())
        if names and isinstance(source_group, dict):
            filtered[group] = {name: source_group[name] for name in source_group if name in names}
    return filtered


def collect_openapi_paths(source: dict[str, Any], consumer_id: str) -> tuple[dict[str, Any], int]:
    filtered_paths: dict[str, Any] = {}
    operation_count = 0
    for path, path_item in (source.get("paths") or {}).items():
        if not isinstance(path_item, dict):
            continue
        selected_item: dict[str, Any] = {}
        for key, value in path_item.items():
            if key.startswith("x-") or key == "parameters":
                selected_item[key] = value
                continue
            if key in HTTP_METHODS and isinstance(value, dict) and has_openapi_consumer(value, consumer_id):
                selected_item[key] = value
                operation_count += 1
        if any(key in HTTP_METHODS for key in selected_item):
            filtered_paths[path] = selected_item
    return filtered_paths, operation_count


def build_consumed_openapi(source: dict[str, Any], consumer_id: str, conflict_side: str) -> tuple[dict[str, Any], int]:
    paths, operation_count = collect_openapi_paths(source, consumer_id)
    if operation_count == 0:
        raise ValueError(f"No OpenAPI operations found for consumer {consumer_id}")

    info = dict(source.get("info", {}))
    info["title"] = f"{info.get('title', 'BrainX API SSOT')} - Knowledge Intelligence Consumed APIs"
    info["description"] = (
        "OpenAPI slice for synchronous internal APIs consumed by Intelligence Service. "
        "Provider-owned API behavior remains governed by the source SSOT."
    )

    referenced_tags = {
        tag
        for path_item in paths.values()
        for operation in path_item.values()
        if isinstance(operation, dict)
        for tag in operation.get("tags", [])
    }
    tags = [
        item
        for item in source.get("tags", [])
        if isinstance(item, dict) and item.get("name") in referenced_tags
    ]

    output: dict[str, Any] = {
        "openapi": source.get("openapi", "3.0.3"),
        "info": info,
    }
    if "servers" in source:
        output["servers"] = source["servers"]
    if tags:
        output["tags"] = tags
    output["paths"] = paths

    components = collect_components(source, paths)
    if components:
        output["components"] = components

    output["x-extracted-from"] = {
        "source": "contracts-v2/brainx-openapi.ssot.yaml",
        "consumerId": consumer_id,
        "conflictSide": conflict_side,
    }
    return output, operation_count


def asyncapi_involves_service(channel: dict[str, Any], service_id: str) -> bool:
    producer = channel.get("x-producer-service")
    consumers = channel.get("x-consumer-services", [])
    return producer == service_id or (isinstance(consumers, list) and service_id in consumers)


def channel_ref_name(ref: str) -> str | None:
    prefix = "#/channels/"
    if not ref.startswith(prefix):
        return None
    return ref[len(prefix) :].split("/")[0]


def collect_asyncapi_channels(source: dict[str, Any], service_id: str) -> dict[str, Any]:
    channels = source.get("channels", {})
    if not isinstance(channels, dict):
        return {}
    return {
        name: channel
        for name, channel in channels.items()
        if isinstance(channel, dict) and asyncapi_involves_service(channel, service_id)
    }


def collect_asyncapi_operations(source: dict[str, Any], selected_channels: dict[str, Any]) -> dict[str, Any]:
    operations = source.get("operations", {})
    if not isinstance(operations, dict):
        return {}
    selected_names = set(selected_channels)
    selected: dict[str, Any] = {}
    for name, operation in operations.items():
        if not isinstance(operation, dict):
            continue
        ref = operation.get("channel", {}).get("$ref") if isinstance(operation.get("channel"), dict) else None
        if isinstance(ref, str) and channel_ref_name(ref) in selected_names:
            selected[name] = operation
    return selected


def build_asyncapi(source: dict[str, Any], service_id: str, conflict_side: str) -> tuple[dict[str, Any], int, int]:
    channels = collect_asyncapi_channels(source, service_id)
    if not channels:
        raise ValueError(f"No AsyncAPI channels found for service {service_id}")
    operations = collect_asyncapi_operations(source, channels)

    info = dict(source.get("info", {}))
    info["title"] = f"{info.get('title', 'BrainX Async Event SSOT')} - Knowledge Intelligence"
    info["description"] = (
        "AsyncAPI slice for events produced or consumed by Intelligence Service. "
        "The upstream AsyncAPI SSOT identifies this service as AI-Service."
    )

    selected_body = {"channels": channels, "operations": operations}
    output: dict[str, Any] = {
        "asyncapi": source.get("asyncapi", "3.0.0"),
        "info": info,
    }
    for key in ("servers", "defaultContentType"):
        if key in source:
            output[key] = source[key]
    output["channels"] = channels
    if operations:
        output["operations"] = operations

    components = collect_components(source, selected_body)
    if components:
        output["components"] = components

    if "x-ssot" in source:
        output["x-ssot"] = source["x-ssot"]
    output["x-extracted-from"] = {
        "source": "contracts-v2/brainx-asyncapi.ssot.yaml",
        "serviceId": service_id,
        "serviceAliasForThisProject": "knowledge-intelligence",
        "criteria": [
            "channel.x-producer-service == AI-Service",
            "channel.x-consumer-services contains AI-Service",
        ],
        "conflictSide": conflict_side,
    }
    return output, len(channels), len(operations)


def find_missing_refs(value: Any, document: dict[str, Any]) -> list[str]:
    missing: set[str] = set()

    def visit(node: Any) -> None:
        if isinstance(node, dict):
            ref = node.get("$ref")
            if isinstance(ref, str) and ref.startswith("#/"):
                target: Any = document
                for part in ref[2:].split("/"):
                    if isinstance(target, dict) and part in target:
                        target = target[part]
                    else:
                        missing.add(ref)
                        break
            for child in node.values():
                visit(child)
        elif isinstance(node, list):
            for child in node:
                visit(child)

    visit(value)
    return sorted(missing)


def write_yaml(path: Path, data: dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(dump_yaml(data), encoding="utf-8", newline="\n")


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract Intelligence Service related OpenAPI and AsyncAPI slices from contracts-v2."
    )
    parser.add_argument("--contracts-root", type=Path, default=default_contracts_root())
    parser.add_argument("--output-root", type=Path, default=default_output_root())
    parser.add_argument("--openapi-consumer-id", default=OPENAPI_CONSUMER_ID)
    parser.add_argument("--asyncapi-service-id", default=ASYNCAPI_SERVICE_ID)
    parser.add_argument(
        "--conflict-side",
        choices=("left", "right"),
        default="right",
        help="Side to use when the source SSOT still contains Git merge conflict markers.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    openapi_source = load_yaml(args.contracts_root / "brainx-openapi.ssot.yaml", args.conflict_side)
    asyncapi_source = load_yaml(args.contracts_root / "brainx-asyncapi.ssot.yaml", args.conflict_side)

    consumed_openapi, openapi_count = build_consumed_openapi(
        openapi_source,
        args.openapi_consumer_id,
        args.conflict_side,
    )
    asyncapi, channel_count, operation_count = build_asyncapi(
        asyncapi_source,
        args.asyncapi_service_id,
        args.conflict_side,
    )

    for document_name, document in {
        "consumed OpenAPI": consumed_openapi,
        "AsyncAPI": asyncapi,
    }.items():
        missing = find_missing_refs(document, document)
        if missing:
            raise ValueError(f"{document_name} has unresolved refs: {', '.join(missing[:10])}")

    consumed_openapi_path = args.output_root / "knowledge-intelligence.consumed.openapi.yaml"
    asyncapi_path = args.output_root / "knowledge-intelligence.asyncapi.yaml"
    write_yaml(consumed_openapi_path, consumed_openapi)
    write_yaml(asyncapi_path, asyncapi)

    print(f"Extracted {openapi_count} consumed OpenAPI operations to {consumed_openapi_path}")
    print(f"Extracted {channel_count} AsyncAPI channels and {operation_count} operations to {asyncapi_path}")


if __name__ == "__main__":
    main()
