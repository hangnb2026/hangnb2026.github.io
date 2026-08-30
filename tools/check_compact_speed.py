#!/usr/bin/env python3
"""
생성된 *_speed.json.gz가 정상인지 간단히 검사합니다.
"""

import argparse
import gzip
import json
from pathlib import Path


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("file", type=Path)
    args = parser.parse_args()

    with gzip.open(
        args.file,
        "rt",
        encoding="utf-8"
    ) as f:
        payload = json.load(f)

    if payload.get("format") != "hanium-speed-v1":
        raise SystemExit(
            "ERROR: format이 hanium-speed-v1이 아닙니다."
        )

    vehicles = payload.get("vehicles", {})
    samples = 0

    for vehicle_id, packed in vehicles.items():
        d = packed.get("d", [])
        v = packed.get("v", [])

        if len(d) != len(v):
            raise SystemExit(
                f"ERROR: ID {vehicle_id} d/v 길이가 다릅니다."
            )

        samples += len(v)

    print("OK")
    print(f"vehicles: {len(vehicles):,}")
    print(f"samples : {samples:,}")


if __name__ == "__main__":
    main()
