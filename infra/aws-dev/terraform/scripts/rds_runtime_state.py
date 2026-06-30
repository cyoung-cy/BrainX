import argparse
import json
import subprocess
import sys
import time


def run_aws(args: list[str]) -> str:
    result = subprocess.run(
        ["aws", *args],
        check=False,
        stdout=subprocess.PIPE,
        stderr=subprocess.PIPE,
        text=True,
        encoding="utf-8",
    )
    if result.returncode != 0:
        message = result.stderr.strip() or result.stdout.strip()
        raise RuntimeError(message)
    return result.stdout


def get_status(region: str, db_instance_identifier: str) -> str:
    output = run_aws(
        [
            "rds",
            "describe-db-instances",
            "--region",
            region,
            "--db-instance-identifier",
            db_instance_identifier,
            "--output",
            "json",
        ]
    )
    payload = json.loads(output)
    instances = payload.get("DBInstances", [])
    if not instances:
        raise RuntimeError(f"RDS instance not found: {db_instance_identifier}")
    return instances[0]["DBInstanceStatus"]


def wait_for(region: str, db_instance_identifier: str, waiter: str) -> None:
    run_aws(
        [
            "rds",
            "wait",
            waiter,
            "--region",
            region,
            "--db-instance-identifier",
            db_instance_identifier,
        ]
    )


def start_instance(region: str, db_instance_identifier: str) -> None:
    run_aws(
        [
            "rds",
            "start-db-instance",
            "--region",
            region,
            "--db-instance-identifier",
            db_instance_identifier,
        ]
    )
    wait_for(region, db_instance_identifier, "db-instance-available")


def stop_instance(region: str, db_instance_identifier: str) -> None:
    run_aws(
        [
            "rds",
            "stop-db-instance",
            "--region",
            region,
            "--db-instance-identifier",
            db_instance_identifier,
        ]
    )
    wait_for(region, db_instance_identifier, "db-instance-stopped")


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--region", required=True)
    parser.add_argument("--db-instance-identifier", required=True)
    parser.add_argument("--desired-state", required=True, choices=["running", "stopped"])
    args = parser.parse_args()

    status = get_status(args.region, args.db_instance_identifier)

    if args.desired_state == "running":
        if status == "available":
            print(f"RDS {args.db_instance_identifier} is already available.")
            return 0
        if status == "stopped":
            print(f"Starting RDS {args.db_instance_identifier}.")
            start_instance(args.region, args.db_instance_identifier)
            return 0
        if status == "starting":
            wait_for(args.region, args.db_instance_identifier, "db-instance-available")
            return 0
        raise RuntimeError(f"RDS {args.db_instance_identifier} cannot be started from status {status}.")

    if status == "stopped":
        print(f"RDS {args.db_instance_identifier} is already stopped.")
        return 0
    if status == "available":
        print(f"Stopping RDS {args.db_instance_identifier}.")
        stop_instance(args.region, args.db_instance_identifier)
        return 0
    if status == "stopping":
        wait_for(args.region, args.db_instance_identifier, "db-instance-stopped")
        return 0
    if status == "starting":
        wait_for(args.region, args.db_instance_identifier, "db-instance-available")
        # Give RDS a short settling window before issuing stop after start completes.
        time.sleep(10)
        stop_instance(args.region, args.db_instance_identifier)
        return 0

    raise RuntimeError(f"RDS {args.db_instance_identifier} cannot be stopped from status {status}.")


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        print(f"RDS runtime state helper failed: {exc}", file=sys.stderr)
        raise SystemExit(1)
