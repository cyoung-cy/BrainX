# /// script
# requires-python = ">=3.11"
# dependencies = [
#   "PyYAML>=6.0.2",
# ]
# ///
from __future__ import annotations

import argparse
import sys
from collections import defaultdict
from pathlib import Path
from typing import Any

import yaml


HTTP_METHODS = {"get", "put", "post", "delete", "options", "head", "patch", "trace"}
DEFAULT_TAG = "Knowledge Intelligence"
DEFAULT_PRODUCER_SERVICE = "knowledge-intelligence"


def default_repo_root() -> Path:
    return Path(__file__).resolve().parents[3]


def default_source_path() -> Path:
    return default_repo_root() / "contracts-v2" / "brainx-openapi.ssot.yaml"


def default_output_path() -> Path:
    return (
        Path(__file__).resolve().parents[1]
        / "src"
        / "main"
        / "resources"
        / "contracts"
        / "knowledge-intelligence.openapi.yaml"
    )


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
    text, conflict_count = strip_merge_conflicts(text, conflict_side)
    if conflict_count:
        print(
            f"Warning: ignored {conflict_count} merge conflict block(s) using --conflict-side={conflict_side}",
            file=sys.stderr,
        )
    data = yaml.safe_load(text)
    if not isinstance(data, dict):
        raise ValueError(f"Expected an OpenAPI object in {path}")
    return data


def operation_matches(operation: Any, tag: str, producer_service: str) -> bool:
    if not isinstance(operation, dict):
        return False
    return tag in operation.get("tags", []) or operation.get("x-producer-service") == producer_service


def collect_matching_operations(
    openapi: dict[str, Any],
    tag: str,
    producer_service: str,
) -> dict[tuple[str, str], Any]:
    operations: dict[tuple[str, str], Any] = {}
    for path, path_item in openapi.get("paths", {}).items():
        if not isinstance(path_item, dict):
            continue
        for method, operation in path_item.items():
            if method in HTTP_METHODS and operation_matches(operation, tag, producer_service):
                operations[(method.upper(), path)] = operation
    return operations


def collect_all_operations(openapi: dict[str, Any]) -> dict[tuple[str, str], Any]:
    operations: dict[tuple[str, str], Any] = {}
    for path, path_item in openapi.get("paths", {}).items():
        if not isinstance(path_item, dict):
            continue
        for method, operation in path_item.items():
            if method in HTTP_METHODS:
                operations[(method.upper(), path)] = operation
    return operations


def filter_paths(openapi: dict[str, Any], tag: str, producer_service: str) -> tuple[dict[str, Any], int]:
    filtered_paths: dict[str, Any] = {}
    operation_count = 0

    for path, path_item in openapi.get("paths", {}).items():
        if not isinstance(path_item, dict):
            continue

        filtered_path_item: dict[str, Any] = {}
        for key in ("$ref", "summary", "description", "parameters"):
            if key in path_item:
                filtered_path_item[key] = path_item[key]

        for method, operation in path_item.items():
            if method in HTTP_METHODS and operation_matches(operation, tag, producer_service):
                filtered_path_item[method] = operation
                operation_count += 1

        if any(method in filtered_path_item for method in HTTP_METHODS):
            filtered_paths[path] = filtered_path_item

    return filtered_paths, operation_count


def unescape_json_pointer_token(token: str) -> str:
    return token.replace("~1", "/").replace("~0", "~")


def parse_component_ref(ref: str) -> tuple[str, str] | None:
    if not ref.startswith("#/components/"):
        return None
    parts = [unescape_json_pointer_token(part) for part in ref[2:].split("/")]
    if len(parts) != 3 or parts[0] != "components":
        return None
    return parts[1], parts[2]


def find_component_refs(value: Any) -> set[tuple[str, str]]:
    refs: set[tuple[str, str]] = set()
    if isinstance(value, dict):
        ref = value.get("$ref")
        if isinstance(ref, str):
            component_ref = parse_component_ref(ref)
            if component_ref is not None:
                refs.add(component_ref)
        for child in value.values():
            refs.update(find_component_refs(child))
    elif isinstance(value, list):
        for child in value:
            refs.update(find_component_refs(child))
    return refs


def find_security_scheme_names(value: Any) -> set[str]:
    names: set[str] = set()
    if isinstance(value, dict):
        security = value.get("security")
        if isinstance(security, list):
            for requirement in security:
                if isinstance(requirement, dict):
                    names.update(requirement.keys())
        for child in value.values():
            names.update(find_security_scheme_names(child))
    elif isinstance(value, list):
        for child in value:
            names.update(find_security_scheme_names(child))
    return names


def collect_components(openapi: dict[str, Any], filtered_paths: dict[str, Any]) -> dict[str, Any]:
    source_components = openapi.get("components", {})
    selected_names: dict[str, set[str]] = defaultdict(set)
    queue = list(find_component_refs(filtered_paths))

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
    for name in find_security_scheme_names(filtered_paths):
        if name in security_schemes:
            selected_names["securitySchemes"].add(name)

    filtered_components: dict[str, Any] = {}
    for group, source_group in source_components.items():
        names = selected_names.get(group, set())
        if not names or not isinstance(source_group, dict):
            continue
        filtered_components[group] = {
            name: source_group[name]
            for name in source_group
            if name in names
        }

    return filtered_components


def filter_tags(openapi: dict[str, Any], tag: str) -> list[dict[str, Any]]:
    tags = openapi.get("tags", [])
    if not isinstance(tags, list):
        return [{"name": tag}]
    filtered_tags = [item for item in tags if isinstance(item, dict) and item.get("name") == tag]
    return filtered_tags or [{"name": tag}]


def build_filtered_openapi(
    openapi: dict[str, Any],
    tag: str,
    producer_service: str,
    conflict_side: str,
) -> tuple[dict[str, Any], int]:
    filtered_paths, operation_count = filter_paths(openapi, tag, producer_service)
    if operation_count == 0:
        raise ValueError(f"No operations found for tag={tag!r} or producer_service={producer_service!r}")

    info = dict(openapi.get("info", {}))
    source_title = info.get("title", "BrainX OpenAPI")
    info["title"] = f"{source_title} - {tag}"

    filtered_openapi: dict[str, Any] = {
        "openapi": openapi.get("openapi", "3.0.3"),
        "info": info,
    }

    if "servers" in openapi:
        filtered_openapi["servers"] = openapi["servers"]

    filtered_openapi["tags"] = filter_tags(openapi, tag)
    filtered_openapi["paths"] = filtered_paths

    components = collect_components(openapi, filtered_paths)
    if components:
        filtered_openapi["components"] = components

    filtered_openapi["x-extracted-from"] = {
        "source": "contracts-v2/brainx-openapi.ssot.yaml",
        "tag": tag,
        "producerService": producer_service,
        "conflictSide": conflict_side,
    }

    return filtered_openapi, operation_count


def format_operation_keys(keys: list[tuple[str, str]]) -> str:
    return ", ".join(f"{method} {path}" for method, path in keys[:10])


def find_missing_component_refs(openapi: dict[str, Any]) -> list[str]:
    missing: list[str] = []
    components = openapi.get("components", {})

    for group, name in find_component_refs(openapi):
        if name not in components.get(group, {}):
            missing.append(f"#/components/{group}/{name}")

    return sorted(set(missing))


def validate_extracted_openapi(
    source_openapi: dict[str, Any],
    extracted_openapi: dict[str, Any],
    tag: str,
    producer_service: str,
) -> tuple[int, int]:
    expected_operations = collect_matching_operations(source_openapi, tag, producer_service)
    actual_operations = collect_all_operations(extracted_openapi)

    missing = sorted(set(expected_operations) - set(actual_operations))
    extra = sorted(set(actual_operations) - set(expected_operations))
    changed = sorted(
        key
        for key in set(expected_operations) & set(actual_operations)
        if expected_operations[key] != actual_operations[key]
    )

    problems: list[str] = []
    if missing:
        problems.append(f"missing operations: {format_operation_keys(missing)}")
    if extra:
        problems.append(f"extra operations: {format_operation_keys(extra)}")
    if changed:
        problems.append(f"changed operation bodies: {format_operation_keys(changed)}")

    missing_refs = find_missing_component_refs(extracted_openapi)
    if missing_refs:
        problems.append(f"unresolved component refs: {', '.join(missing_refs[:10])}")

    if problems:
        raise ValueError("Extracted OpenAPI validation failed: " + "; ".join(problems))

    return len(extracted_openapi.get("paths", {})), len(actual_operations)


def dump_yaml(data: dict[str, Any]) -> str:
    return yaml.safe_dump(
        data,
        allow_unicode=True,
        sort_keys=False,
        width=120,
    )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Extract the Knowledge Intelligence OpenAPI slice from the BrainX SSOT contract."
    )
    parser.add_argument("--source", type=Path, default=default_source_path(), help="Source BrainX OpenAPI SSOT YAML.")
    parser.add_argument("--output", type=Path, default=default_output_path(), help="Output OpenAPI YAML path.")
    parser.add_argument("--tag", default=DEFAULT_TAG, help="OpenAPI tag to extract.")
    parser.add_argument("--producer-service", default=DEFAULT_PRODUCER_SERVICE, help="Producer service id to extract.")
    parser.add_argument(
        "--conflict-side",
        choices=("left", "right"),
        default="right",
        help="Side to use when the source SSOT still contains Git merge conflict markers.",
    )
    parser.add_argument("--stdout", action="store_true", help="Print the extracted contract instead of writing it.")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    openapi = load_yaml(args.source, args.conflict_side)
    filtered_openapi, operation_count = build_filtered_openapi(
        openapi,
        args.tag,
        args.producer_service,
        args.conflict_side,
    )
    validate_extracted_openapi(openapi, filtered_openapi, args.tag, args.producer_service)
    output = dump_yaml(filtered_openapi)

    if args.stdout:
        print(output, end="")
        return

    args.output.parent.mkdir(parents=True, exist_ok=True)
    args.output.write_text(output, encoding="utf-8")
    written_openapi = yaml.safe_load(args.output.read_text(encoding="utf-8"))
    if not isinstance(written_openapi, dict):
        raise ValueError(f"Expected an OpenAPI object in {args.output}")
    path_count, verified_operation_count = validate_extracted_openapi(
        openapi,
        written_openapi,
        args.tag,
        args.producer_service,
    )
    print(f"Extracted {operation_count} operations under {path_count} paths to {args.output}")
    print(f"Verified {verified_operation_count} operation bodies and component refs")


if __name__ == "__main__":
    main()
