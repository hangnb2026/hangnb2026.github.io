#!/usr/bin/env python3
"""
대용량 wide-format speed CSV를 웹앱용 compact JSON.gz로 변환합니다.

입력:
    ID,0,1,2,3,4,...
    1,,,12.3,13.1,...
    2,8.0,8.2,,,...

출력:
    {
      "format": "hanium-speed-v1",
      "vehicles": {
        "1": {
          "d": [2, 1, ...],
          "v": [12.3, 13.1, ...]
        }
      }
    }

d[0]   = 최초 frame 절대값
d[1:]  = 이전 값이 존재한 frame과의 delta

특징:
- 원본 CSV 전체를 메모리에 올리지 않습니다.
- 한 차량(row)씩 읽고 즉시 gzip JSON으로 기록합니다.
- 빈 frame cell은 결과에서 완전히 제거합니다.
"""

from __future__ import annotations

import argparse
import csv
import gzip
import json
import math
import os
from pathlib import Path
import sys
import time


def configure_csv_limit() -> None:
    """
    플랫폼에 맞춰 csv.field_size_limit을 가능한 크게 설정합니다.
    """
    limit = sys.maxsize
    while True:
        try:
            csv.field_size_limit(limit)
            return
        except OverflowError:
            limit //= 10


def parse_number(raw: str, rounding: int | None) -> int | float | None:
    raw = raw.strip()
    if not raw:
        return None

    try:
        value = float(raw)
    except ValueError:
        return None

    if not math.isfinite(value):
        return None

    if rounding is not None:
        value = round(value, rounding)

    if value.is_integer():
        return int(value)

    return value


def output_path_for(input_path: Path, output_dir: Path) -> Path:
    name = input_path.name

    if name.lower().endswith(".csv"):
        name = name[:-4]

    return output_dir / f"{name}.json.gz"


def convert_file(
    input_path: Path,
    output_path: Path,
    *,
    rounding: int | None = None,
    compresslevel: int = 9,
) -> dict:
    configure_csv_limit()

    input_path = input_path.resolve()
    output_path = output_path.resolve()
    output_path.parent.mkdir(parents=True, exist_ok=True)

    started = time.time()
    vehicle_count = 0
    sample_count = 0
    skipped_rows = 0

    print(f"[START] {input_path}")
    print(f"        -> {output_path}")

    with input_path.open(
        "r",
        encoding="utf-8-sig",
        newline="",
        errors="replace",
    ) as source:
        reader = csv.reader(source)

        try:
            header = next(reader)
        except StopIteration:
            raise RuntimeError(f"빈 CSV입니다: {input_path}")

        if len(header) < 2:
            raise RuntimeError(
                "speed CSV는 첫 열 ID + 이후 frame 열 구조여야 합니다."
            )

        frame_numbers: list[int] = []

        for index, raw in enumerate(header[1:]):
            raw = raw.strip()

            try:
                frame = int(float(raw))
            except ValueError:
                # header가 비정상인 열은 순번을 frame으로 사용.
                frame = index

            frame_numbers.append(frame)

        with gzip.open(
            output_path,
            "wt",
            encoding="utf-8",
            compresslevel=compresslevel,
            newline="",
        ) as target:
            target.write('{"format":"hanium-speed-v1","source":')
            target.write(
                json.dumps(
                    input_path.name,
                    ensure_ascii=False,
                    separators=(",", ":"),
                )
            )
            target.write(',"vehicles":{')

            first_vehicle = True

            for row_number, row in enumerate(reader, start=2):
                if not row:
                    continue

                vehicle_id = str(row[0]).strip()

                if not vehicle_id:
                    skipped_rows += 1
                    continue

                deltas: list[int] = []
                speeds: list[int | float] = []

                previous_frame: int | None = None
                max_cells = min(
                    len(row) - 1,
                    len(frame_numbers),
                )

                for column in range(max_cells):
                    value = parse_number(
                        row[column + 1],
                        rounding,
                    )

                    if value is None:
                        continue

                    frame = frame_numbers[column]

                    if previous_frame is None:
                        deltas.append(frame)
                    else:
                        deltas.append(
                            frame - previous_frame
                        )

                    previous_frame = frame
                    speeds.append(value)

                if not speeds:
                    continue

                if not first_vehicle:
                    target.write(",")

                first_vehicle = False

                target.write(
                    json.dumps(
                        vehicle_id,
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )

                target.write(':{"d":')
                target.write(
                    json.dumps(
                        deltas,
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )

                target.write(',"v":')
                target.write(
                    json.dumps(
                        speeds,
                        ensure_ascii=False,
                        separators=(",", ":"),
                    )
                )

                target.write("}")

                vehicle_count += 1
                sample_count += len(speeds)

                if vehicle_count % 100 == 0:
                    print(
                        f"  {vehicle_count:,} vehicles / "
                        f"{sample_count:,} samples"
                    )

            target.write("}}")

    raw_size = input_path.stat().st_size
    gz_size = output_path.stat().st_size
    ratio = (
        gz_size / raw_size * 100
        if raw_size
        else 0
    )

    elapsed = time.time() - started

    result = {
        "input": str(input_path),
        "output": str(output_path),
        "vehicles": vehicle_count,
        "samples": sample_count,
        "skipped_rows": skipped_rows,
        "raw_bytes": raw_size,
        "gzip_bytes": gz_size,
        "ratio_percent": ratio,
        "elapsed_sec": elapsed,
    }

    print(
        f"[DONE] vehicles={vehicle_count:,}, "
        f"samples={sample_count:,}"
    )
    print(
        f"       {raw_size / 1024 / 1024:.1f} MB"
        f" -> {gz_size / 1024 / 1024:.1f} MB "
        f"({ratio:.1f}%)"
    )
    print(
        f"       elapsed={elapsed:.1f}s"
    )

    if gz_size >= 100 * 1024 * 1024:
        print(
            "\n[WARNING] 결과도 100MB 이상입니다. "
            "GitHub 일반 저장소에 올릴 수 없습니다."
        )
        print(
            "          이 경우 데이터 분할(sharding)이 필요합니다."
        )

    elif gz_size >= 25 * 1024 * 1024:
        print(
            "\n[NOTE] 결과가 25MB 이상입니다. "
            "GitHub 웹 화면 업로드 대신 git push를 사용하세요."
        )

    return result


def batch_convert(
    input_dir: Path,
    output_dir: Path,
    *,
    rounding: int | None,
    compresslevel: int,
) -> None:
    files = sorted(
        input_dir.glob("*_speed.csv")
    )

    if not files:
        raise RuntimeError(
            f"{input_dir}에서 *_speed.csv를 찾지 못했습니다."
        )

    print(
        f"{len(files)}개의 speed CSV를 변환합니다.\n"
    )

    for index, input_path in enumerate(files, start=1):
        print(
            f"\n=== [{index}/{len(files)}] "
            f"{input_path.name} ==="
        )

        convert_file(
            input_path,
            output_path_for(
                input_path,
                output_dir,
            ),
            rounding=rounding,
            compresslevel=compresslevel,
        )


def main() -> None:
    parser = argparse.ArgumentParser(
        description=(
            "wide-format speed CSV를 "
            "Hanium Traffic용 JSON.gz로 변환"
        )
    )

    parser.add_argument(
        "input",
        nargs="?",
        type=Path,
        help="입력 *_speed.csv",
    )

    parser.add_argument(
        "output",
        nargs="?",
        type=Path,
        help="출력 *.json.gz",
    )

    parser.add_argument(
        "--batch",
        type=Path,
        metavar="INPUT_DIR",
        help=(
            "폴더의 *_speed.csv를 모두 변환"
        ),
    )

    parser.add_argument(
        "--output-dir",
        type=Path,
        default=Path("./files"),
        help=(
            "--batch 출력 폴더 "
            "(기본: ./files)"
        ),
    )

    parser.add_argument(
        "--round",
        dest="rounding",
        type=int,
        default=None,
        help=(
            "속도를 소수 N자리로 반올림. "
            "지정하지 않으면 원본 float 값 유지"
        ),
    )

    parser.add_argument(
        "--compresslevel",
        type=int,
        choices=range(1, 10),
        default=9,
        help="gzip 압축 레벨 1~9 (기본 9)",
    )

    args = parser.parse_args()

    if args.batch:
        batch_convert(
            args.batch,
            args.output_dir,
            rounding=args.rounding,
            compresslevel=args.compresslevel,
        )
        return

    if not args.input:
        parser.error(
            "input.csv 또는 --batch INPUT_DIR가 필요합니다."
        )

    output = (
        args.output
        if args.output
        else args.input.with_suffix(
            ".json.gz"
        )
    )

    convert_file(
        args.input,
        output,
        rounding=args.rounding,
        compresslevel=args.compresslevel,
    )


if __name__ == "__main__":
    main()
