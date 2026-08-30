# Hanium Traffic PWA — Compact Data Version

이 버전은 **GitHub Pages + GitHub Releases**만 사용합니다.

```text
GitHub Pages
├─ PWA 코드
├─ 작은 CSV
└─ 압축 speed JSON.gz

GitHub Releases
└─ MP4 21개

PC에만 보관
├─ 원본 *_speed.csv
├─ *_break.csv
└─ *_coordinates.csv
```

대용량 wide CSV를 GitHub에 그대로 올리지 않습니다.

---

# 1. Repository에 올릴 구조

```text
USERNAME.github.io/
├─ index.html
├─ manifest.webmanifest
├─ sw.js
├─ .nojekyll
├─ README.md
│
├─ assets/
│  ├─ icon-192.png
│  └─ icon-512.png
│
├─ css/
│  └─ style.css
│
├─ js/
│  ├─ app.js
│  ├─ config.js
│  ├─ csv.js
│  ├─ store.js
│  ├─ gps.js
│  ├─ data.js
│  ├─ analysis.js
│  ├─ video.js
│  ├─ notifications.js
│  └─ monitor.js
│
├─ tools/
│  ├─ convert_speed_csv.py
│  └─ check_compact_speed.py
│
└─ files/
   ├─ 올림픽공원1_speed.json.gz
   ├─ 올림픽공원2_speed.json.gz
   ├─ 올림픽공원3_speed.json.gz
   ├─ 올림픽공원남단1_speed.json.gz
   ├─ 워커힐1_speed.json.gz
   ├─ 워커힐2_speed.json.gz
   ├─ 워커힐3_speed.json.gz
   │
   ├─ ..._result.csv
   ├─ ..._violation.csv
   └─ ..._signal_time.csv
```

`break.csv`, `coordinates.csv`는 현재 UI에서 사용하지 않으므로 올리지 않습니다.

---

# 2. 원본 speed.csv 변환

원본 데이터는 별도의 PC 폴더에 보관하세요.

예:

```text
raw/
├─ 올림픽공원1_speed.csv
├─ 올림픽공원2_speed.csv
├─ 올림픽공원3_speed.csv
├─ 올림픽공원남단1_speed.csv
├─ 워커힐1_speed.csv
├─ 워커힐2_speed.csv
└─ 워커힐3_speed.csv
```

## 7개 일괄 변환

프로젝트 root에서:

```bash
python tools/convert_speed_csv.py --batch raw --output-dir files
```

그러면:

```text
files/
├─ 올림픽공원1_speed.json.gz
├─ ...
└─ 워커힐3_speed.json.gz
```

가 생성됩니다.

## 하나만 변환

```bash
python tools/convert_speed_csv.py \
  raw/워커힐1_speed.csv \
  files/워커힐1_speed.json.gz
```

Windows PowerShell에서는 한 줄로 실행해도 됩니다.

```powershell
python tools/convert_speed_csv.py raw/워커힐1_speed.csv files/워커힐1_speed.json.gz
```

---

# 3. 압축 방식

기존 CSV:

```csv
ID,0,1,2,3,4,5
10,,,23.1,24.2,25.0,
11,,14.2,14.7,,,
```

변환 결과 내부 형식:

```json
{
  "format": "hanium-speed-v1",
  "vehicles": {
    "10": {
      "d": [2,1,1],
      "v": [23.1,24.2,25.0]
    },
    "11": {
      "d": [1,1],
      "v": [14.2,14.7]
    }
  }
}
```

그리고 JSON 전체를 gzip으로 압축합니다.

`d`는 frame delta입니다.

```text
[2, 1, 1]
→ frame 2, 3, 4
```

따라서 기존 CSV의 수많은 빈 셀과 긴 frame header를 제거할 수 있습니다.

---

# 4. 변환기 메모리 사용

`convert_speed_csv.py`는 CSV 전체를 한 번에 pandas로 읽지 않습니다.

```text
header 읽기
→ 차량 1행 읽기
→ 압축 JSON에 기록
→ 차량 2행 읽기
→ 기록
→ ...
```

방식입니다.

따라서 100MB 이상의 원본 CSV에도 비교적 적합합니다.

---

# 5. 결과 확인

```bash
python tools/check_compact_speed.py files/워커힐1_speed.json.gz
```

정상이면:

```text
OK
vehicles: 123
samples : 456,789
```

같이 나옵니다.

---

# 6. GitHub 파일 크기 체크

변환 프로그램 실행 후 다음 메시지를 확인하세요.

### 25MB 미만

GitHub 웹 화면에서 업로드하기 편합니다.

### 25MB 이상 ~ 100MB 미만

일반 Git repository에는 넣을 수 있지만 브라우저 업로드보다 로컬 `git push`를 권장합니다.

```bash
git add .
git commit -m "Add PWA data"
git push origin main
```

### 변환 결과도 100MB 이상

그 파일은 repository에 넣지 마세요.

이 경우 해당 CCTV speed 데이터를 여러 파일로 분할하는 sharding 버전으로 바꿔야 합니다.

---

# 7. GitHub Release 설정

`js/config.js`:

```js
export const RELEASE = {
  GITHUB_OWNER: "YOUR_GITHUB_ID",
  REPOSITORY: "YOUR_GITHUB_ID.github.io",
  TAG: "videos-v1"
};
```

예:

```js
export const RELEASE = {
  GITHUB_OWNER: "abc123",
  REPOSITORY: "abc123.github.io",
  TAG: "videos-v1"
};
```

Release MP4 파일명이 코드와 다르면 같은 파일의 `releaseFile` 부분만 수정합니다.

---

# 8. GPS 설정

각 CCTV:

```js
latitude: null,
longitude: null,
radiusM: 250,
```

를 실제 값으로 변경합니다.

예:

```js
latitude: 37.123456,
longitude: 127.123456,
radiusM: 250,
```

---

# 9. FPS

현재 반영된 FPS:

```text
올림픽공원남단1  29.47
워커힐1          29.33
워커힐2          28.68
워커힐3          28.71
```

올림픽공원1~3은 아직 `30.0` 임시값이므로 실제 FPS로 수정해야 합니다.

---

# 10. speed.json.gz 브라우저 로딩

웹앱은 CCTV 화면을 열 때 해당 CCTV의 파일만 가져옵니다.

```text
워커힐1 클릭
→ 워커힐1_speed.json.gz 다운로드
→ 브라우저에서 gzip 해제
→ 차량별 typed array 생성
→ 분석
```

7개 speed 파일을 홈 화면에서 한꺼번에 다운로드하지 않습니다.

단, GPS 실시간 알림 시뮬레이터가 활성화되면 **근처 CCTV에 해당하는 파일들**은 이벤트 확인을 위해 로드할 수 있습니다.

브라우저 gzip 해제에는 표준 `DecompressionStream("gzip")` API를 사용합니다.

---

# 11. 올릴 필요 없는 CSV

현재 요구 UI 기준으로:

```text
break.csv
coordinates.csv
```

는 표시나 분석 계산에 사용하지 않습니다.

따라서 GitHub에는 올리지 마세요.

PC 원본 데이터로만 보관하면 됩니다.

나중에 웹에서 제동거리나 BEV 좌표까지 표시해야 한다면 그때 이 두 종류도 별도 compact 데이터로 변환하면 됩니다.

---

# 12. 현재 웹앱 기능

- PWA
- 홈 / 알림 / 설정
- CCTV 7개
- GPS 근처 CCTV 활성화
- 원본 / YOLO / Twin 시간 동기화
- GitHub Release MP4 직접 재생
- 신호 정보 영상 overlay
- 현재 frame까지의 차량 분석
- 인식 차량 수
- 평균 속도
- 주의 / 위험 차량 수
- 차량 ID별 속도 / 최고속도 / 관측시간 / 신호위반 / 판정
- 위험 / 주의 / 안전 필터
- 위험 차량 장면으로 원본 / YOLO / Twin 이동
- 앱이 열려 있는 동안 근처 CCTV 과속/신호위반 알림
- 알림 클릭 → 해당 CCTV 분석 화면 + 차량/frame 이동

---

# 13. GitHub Pages 배포

```text
Repository
→ Settings
→ Pages
→ Deploy from a branch
→ main
→ / (root)
→ Save
```

최종 주소:

```text
https://USERNAME.github.io/
```

---

# 14. 개발 순서 권장

```text
1. Release MP4 21개 업로드 완료
2. speed.csv 7개를 JSON.gz로 변환
3. 결과 파일 크기 확인
4. files/에 작은 CSV + JSON.gz 배치
5. js/config.js GitHub ID 수정
6. GPS 좌표 수정
7. 올림픽공원1~3 FPS 수정
8. git push
9. GitHub Pages 활성화
10. 스마트폰에서 GPS / 영상 / 분석 / 알림 테스트
```
