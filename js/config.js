/*
 * ==========================================================
 * Hanium Traffic PWA - CCTV Configuration
 * ==========================================================
 *
 * GitHub Pages:
 * https://hangnb2026.github.io/
 *
 * GitHub Releases:
 * https://github.com/hangnb2026/hangnb2026.github.io/releases
 *
 * Release Tag:
 * videos-v1
 *
 * 주의:
 * - latitude / longitude는 현재 대구광역시 내 테스트용 예시 좌표입니다.
 * - 실제 테스트 장소가 정해지면 GPS 좌표만 변경하면 됩니다.
 * - Release 영상 파일명이 아래 releaseFile과 정확히 일치해야 합니다.
 */


// ==========================================================
// GitHub Release 설정
// ==========================================================

export const RELEASE = {
  GITHUB_OWNER: "hangnb2026",
  REPOSITORY: "hangnb2026.github.io",
  TAG: "videos-v1"
};


// ==========================================================
// 기본 앱 설정
// ==========================================================

export const DEFAULT_SETTINGS = {
  // OS / PWA 알림 사용 여부
  notificationsEnabled: true,

  /*
   * 임시 속도 판정 기준
   *
   * speed <= 60
   *   → 안전
   *
   * 60 < speed < 80
   *   → 주의
   *
   * speed >= 80
   *   → 위험
   *
   * 신호 위반
   *   → 무조건 위험
   */
  speedLimitKmh: 60,

  // 제한속도 + 20km/h부터 위험
  dangerOverKmh: 20,

  /*
   * 0:
   * 각 CCTV의 radiusM 사용
   *
   * 0보다 큰 값:
   * 모든 CCTV에 동일한 GPS 반경 강제 적용
   */
  gpsRadiusOverrideM: 0
};


// ==========================================================
// CCTV 목록
// ==========================================================

export const CCTV_LIST = [

  // ========================================================
  // 올림픽공원 1
  // ========================================================

  {
    id: "olympic1",

    name: "올림픽공원 1",
    area: "올림픽공원",

    /*
     * 테스트용 GPS
     * 대구광역시 수성구 부근
     */
    latitude: 35.8585,
    longitude: 128.6305,

    // GPS 활성화 반경
    radiusM: 300,

    /*
     * 올림픽공원1_bev_velocity.mp4
     *
     * video_width  = 400
     * video_height = 914
     * fps          = 29.32
     * total_frames = 17594
     */
    fps: 29.32,

    /*
     * GitHub Release에 올라간 MP4 asset 이름
     */
    releaseFile: {
      original: "cctv_olympic1.mp4",
      yolo: "yolo_olympic1.mp4",
      twin: "twin_olympic1.mp4"
    },

    /*
     * GitHub Pages repository의 files/ 폴더
     */
    files: {
      speed: "./files/올림픽공원1_speed.json.gz",
      result: "./files/올림픽공원1_result.csv",
      violation: "./files/올림픽공원1_violation.csv",
      signal: "./files/올림픽공원1_signal.csv"
    },

    /*
     * ID,start_frame,end_frame
     */
    violationFormat: "range"
  },


  // ========================================================
  // 올림픽공원 2
  // ========================================================

  {
    id: "olympic2",

    name: "올림픽공원 2",
    area: "올림픽공원",

    /*
     * 테스트용 GPS
     * 올림픽공원1과 약간 떨어진 위치
     */
    latitude: 35.8600,
    longitude: 128.6330,

    radiusM: 300,

    /*
     * 올림픽공원2_bev_velocity.mp4
     *
     * video_width  = 400
     * video_height = 914
     * fps          = 29.29
     * total_frames = 17569
     */
    fps: 29.29,

    releaseFile: {
      original: "cctv_olympic2.mp4",
      yolo: "yolo_olympic2.mp4",
      twin: "twin_olympic2.mp4"
    },

    files: {
      speed: "./files/올림픽공원2_speed.json.gz",
      result: "./files/올림픽공원2_result.csv",
      violation: "./files/올림픽공원2_violation.csv",
      signal: "./files/올림픽공원2_signal.csv"
    },

    violationFormat: "range"
  },


  // ========================================================
  // 올림픽공원 3
  // ========================================================

  {
    id: "olympic3",

    name: "올림픽공원 3",
    area: "올림픽공원",

    /*
     * 테스트용 GPS
     */
    latitude: 35.8615,
    longitude: 128.6355,

    radiusM: 300,

    /*
     * 올림픽공원3_bev_velocity.mp4
     *
     * video_width  = 400
     * video_height = 914
     * fps          = 29.27
     * total_frames = 17559
     */
    fps: 29.27,

    releaseFile: {
      original: "cctv_olympic3.mp4",
      yolo: "yolo_olympic3.mp4",
      twin: "twin_olympic3.mp4"
    },

    files: {
      speed: "./files/올림픽공원3_speed.json.gz",
      result: "./files/올림픽공원3_result.csv",
      violation: "./files/올림픽공원3_violation.csv",
      signal: "./files/올림픽공원3_signal.csv"
    },

    violationFormat: "range"
  },


  // ========================================================
  // 올림픽공원 남단 1
  // ========================================================

  {
    id: "olympicSouth1",

    name: "올림픽공원 남단 1",
    area: "올림픽공원남단",

    /*
     * 테스트용 GPS
     * 위 올림픽공원 CCTV들과는 조금 떨어뜨림
     */
    latitude: 35.8545,
    longitude: 128.6315,

    radiusM: 300,

    /*
     * 올림픽공원남단1_bev_velocity.mp4
     *
     * fps = 29.47
     */
    fps: 29.47,

    releaseFile: {
      original: "cctv_olympic_south1.mp4",
      yolo: "yolo_olympic_south1.mp4",
      twin: "twin_olympic_south1.mp4"
    },

    files: {
      speed: "./files/올림픽공원남단1_speed.json.gz",
      result: "./files/올림픽공원남단1_result.csv",

      /*
       * 남단만 파일명이 다름
       */
      violation:
        "./files/올림픽공원남단1_stopline_violations.csv",

      signal:
        "./files/올림픽공원남단1_signal.csv"
    },

    /*
     * vehicle_id + frame_number 방식
     */
    violationFormat: "singleFrame"
  },


  // ========================================================
  // 워커힐 1
  // ========================================================

  {
    id: "walkerhill1",

    name: "워커힐 1",
    area: "워커힐",

    /*
     * 테스트용 GPS
     * 대구광역시 북쪽 방향으로 위치를 따로 잡음
     */
    latitude: 35.8840,
    longitude: 128.6100,

    radiusM: 300,

    /*
     * 워커힐1_bev_velocity.mp4
     *
     * video_width  = 370
     * video_height = 964
     * fps          = 29.33
     * total_frames = 17598
     */
    fps: 29.33,

    releaseFile: {
      original: "cctv_walkerhill1.mp4",
      yolo: "yolo_walkerhill1.mp4",
      twin: "twin_walkerhill1.mp4"
    },

    files: {
      speed: "./files/워커힐1_speed.json.gz",
      result: "./files/워커힐1_result.csv",
      violation: "./files/워커힐1_violation.csv",
      signal: "./files/워커힐1_signal.csv"
    },

    violationFormat: "range"
  },


  // ========================================================
  // 워커힐 2
  // ========================================================

  {
    id: "walkerhill2",

    name: "워커힐 2",
    area: "워커힐",

    /*
     * 테스트용 GPS
     */
    latitude: 35.8855,
    longitude: 128.6125,

    radiusM: 300,

    /*
     * 워커힐2_bev_velocity.mp4
     *
     * video_width  = 370
     * video_height = 964
     * fps          = 28.68
     * total_frames = 17211
     */
    fps: 28.68,

    releaseFile: {
      original: "cctv_walkerhill2.mp4",
      yolo: "yolo_walkerhill2.mp4",
      twin: "twin_walkerhill2.mp4"
    },

    files: {
      speed: "./files/워커힐2_speed.json.gz",
      result: "./files/워커힐2_result.csv",
      violation: "./files/워커힐2_violation.csv",
      signal: "./files/워커힐2_signal.csv"
    },

    violationFormat: "range"
  },


  // ========================================================
  // 워커힐 3
  // ========================================================

  {
    id: "walkerhill3",

    name: "워커힐 3",
    area: "워커힐",

    /*
     * 테스트용 GPS
     */
    latitude: 35.8870,
    longitude: 128.6150,

    radiusM: 300,

    /*
     * 워커힐3_bev_velocity.mp4
     *
     * video_width  = 370
     * video_height = 964
     * fps          = 28.71
     * total_frames = 17227
     */
    fps: 28.71,

    releaseFile: {
      original: "cctv_walkerhill3.mp4",
      yolo: "yolo_walkerhill3.mp4",
      twin: "twin_walkerhill3.mp4"
    },

    files: {
      speed: "./files/워커힐3_speed.json.gz",
      result: "./files/워커힐3_result.csv",
      violation: "./files/워커힐3_violation.csv",
      signal: "./files/워커힐3_signal.csv"
    },

    violationFormat: "range"
  }
];


// ==========================================================
// CCTV ID → CCTV 설정 검색
// ==========================================================

export function getCctv(id) {
  return (
    CCTV_LIST.find(
      (item) => item.id === id
    ) || null
  );
}


// ==========================================================
// GitHub Release asset URL 생성
// ==========================================================

export function getReleaseAssetUrl(filename) {
  if (!filename) {
    return "";
  }

  const owner =
    encodeURIComponent(
      RELEASE.GITHUB_OWNER
    );

  const repository =
    encodeURIComponent(
      RELEASE.REPOSITORY
    );

  const tag =
    encodeURIComponent(
      RELEASE.TAG
    );

  /*
   * encodeURIComponent(filename)을 사용하지 않은 이유:
   *
   * 현재 Release asset 파일명이 영문/숫자/underscore 기반이므로
   * GitHub Release URL을 그대로 읽기 편하게 유지한다.
   */
  return (
    `https://github.com/` +
    `${owner}/` +
    `${repository}/` +
    `releases/download/` +
    `${tag}/` +
    `${filename}`
  );
}