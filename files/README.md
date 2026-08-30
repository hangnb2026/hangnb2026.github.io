# GitHub Pages에 실제로 올릴 데이터

## 반드시 올릴 파일

각 CCTV별 압축 speed:

```text
올림픽공원1_speed.json.gz
올림픽공원2_speed.json.gz
올림픽공원3_speed.json.gz
올림픽공원남단1_speed.json.gz
워커힐1_speed.json.gz
워커힐2_speed.json.gz
워커힐3_speed.json.gz
```

그리고 작은 CSV:

- `*_result.csv`
- `*_violation.csv`
- 올림픽공원남단 stopline violations CSV
- `*_signal_time.csv` 또는 config.js에서 지정한 실제 신호 CSV

## 올리지 않아도 되는 대용량 파일

현재 웹 UI에서는 아래 파일을 사용하지 않습니다.

```text
*_break.csv
*_coordinates.csv
```

따라서 GitHub Pages에는 올리지 않는 것을 권장합니다.

필요한 기능이 생기면 그때 별도 compact 포맷으로 변환하면 됩니다.

## speed 변환

프로젝트 root에서:

```bash
python tools/convert_speed_csv.py 원본_speed.csv files/원본_speed.json.gz
```

예:

```bash
python tools/convert_speed_csv.py raw/워커힐1_speed.csv files/워커힐1_speed.json.gz
```

7개 일괄 변환:

```bash
python tools/convert_speed_csv.py --batch raw --output-dir files
```

`raw` 폴더 안에 `*_speed.csv` 7개를 넣어두면 됩니다.

생성 파일 검증:

```bash
python tools/check_compact_speed.py files/워커힐1_speed.json.gz
```
