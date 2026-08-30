import {
  CCTV_LIST,
  getCctv,
  RELEASE,
  DEFAULT_SETTINGS
} from "./config.js";

import {
  loadSettings,
  saveSettings,
  loadLocationState,
  saveLocationState,
  loadNotifications,
  markNotificationRead,
  markAllNotificationsRead,
  clearNotifications
} from "./store.js";

import {
  getCurrentPosition,
  evaluateNearby
} from "./gps.js";

import {
  loadCctvData
} from "./data.js";

import {
  analyzeAtFrame,
  buildCctvEvents,
  eventsBetweenFrames
} from "./analysis.js";

import {
  VideoController
} from "./video.js";

import {
  requestNotificationPermission,
  notificationPermissionLabel,
  recordEvent
} from "./notifications.js";

import {
  NearbyMonitor
} from "./monitor.js";

const app = document.querySelector("#app");
const backButton = document.querySelector("#backButton");
const topTitle = document.querySelector("#topTitle");
const topEyebrow = document.querySelector("#topEyebrow");
const topAction = document.querySelector("#topAction");
const notificationBadge = document.querySelector("#notificationBadge");
const toastArea = document.querySelector("#toastArea");

let settings = loadSettings();
let locationState = loadLocationState();
let activeCleanup = null;
let deferredInstallPrompt = null;

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function numberText(value, digits = 1) {
  return Number.isFinite(Number(value))
    ? Number(value).toFixed(digits)
    : "-";
}

function toast(message) {
  const node = document.createElement("div");
  node.className = "toast";
  node.textContent = message;

  toastArea.appendChild(node);

  window.setTimeout(
    () => node.remove(),
    3300
  );
}

function setTopbar({
  title,
  eyebrow = "Hanium Traffic",
  showBack = false,
  actionHtml = ""
}) {
  topTitle.textContent = title;
  topEyebrow.textContent = eyebrow;
  backButton.classList.toggle("hidden", !showBack);
  topAction.innerHTML = actionHtml;
}

backButton.addEventListener("click", () => {
  if (history.length > 1) {
    history.back();
  } else {
    location.hash = "#/";
  }
});

function setActiveNav(name) {
  document
    .querySelectorAll("[data-nav]")
    .forEach((item) => {
      item.classList.toggle(
        "active",
        item.dataset.nav === name
      );
    });
}

function updateNotificationBadge() {
  const unreadCount = loadNotifications()
    .filter((item) => !item.read)
    .length;

  notificationBadge.textContent = String(unreadCount);
  notificationBadge.classList.toggle(
    "hidden",
    unreadCount === 0
  );
}

function parseRoute() {
  const raw = location.hash || "#/";
  const withoutHash = raw.slice(1);

  const [pathRaw, queryRaw = ""] =
    withoutHash.split("?");

  const path = pathRaw || "/";
  const params = new URLSearchParams(queryRaw);

  if (path.startsWith("/cctv/")) {
    return {
      name: "cctv",
      cctvId:
        decodeURIComponent(path.split("/")[2] || ""),
      params
    };
  }

  if (path === "/notifications") {
    return {
      name: "notifications",
      params
    };
  }

  if (path === "/settings") {
    return {
      name: "settings",
      params
    };
  }

  return {
    name: "home",
    params
  };
}

function nearbyMap() {
  return new Map(
    (locationState?.results || [])
      .map((item) => [item.cctvId, item])
  );
}

function isNearby(cctvId) {
  return nearbyMap().get(cctvId)?.nearby === true;
}

function areaGroups() {
  return CCTV_LIST.reduce((groups, cctv) => {
    groups[cctv.area] ||= [];
    groups[cctv.area].push(cctv);
    return groups;
  }, {});
}

const nearbyMonitor = new NearbyMonitor(
  () => settings,
  (cctv, event) => {
    toast(
      `${cctv.name} · ${event.label} · ${event.vehicleId}번 차량`
    );

    updateNotificationBadge();
  }
);

nearbyMonitor.start();

function renderHome() {
  setTopbar({
    title: "홈",
    eyebrow: "Hanium Traffic"
  });

  setActiveNav("home");

  const stateMap = nearbyMap();

  const checkedText =
    locationState?.checkedAt
      ? new Date(locationState.checkedAt)
          .toLocaleString("ko-KR")
      : "아직 검색하지 않음";

  app.innerHTML = `
    <section class="hero">
      <div class="hero-kicker">GPS CCTV SEARCH</div>
      <h2>주변 CCTV를 검색하세요</h2>
      <p>
        현재 휴대폰 위치가 설정 반경 안에 들어오면
        해당 CCTV가 초록색으로 활성화됩니다.
        비활성 CCTV도 클릭해서 영상을 볼 수 있습니다.
      </p>

      <button
        id="gpsSearchButton"
        class="primary-button"
        type="button"
      >
        현재 위치에서 검색
      </button>
    </section>

    <div class="status-card">
      <span>마지막 GPS 확인</span>
      <strong>${escapeHtml(checkedText)}</strong>

      ${
        locationState?.accuracy
          ? `<small>GPS 정확도 ±${Math.round(locationState.accuracy)}m</small>`
          : ""
      }
    </div>

    ${Object.entries(areaGroups())
      .map(([area, cctvs]) => `
        <section>
          <div class="section-heading">
            <div>
              <span class="section-eyebrow">CCTV</span>
              <h2>${escapeHtml(area)}</h2>
            </div>
            <small>${cctvs.length}대</small>
          </div>

          <div class="cctv-grid">
            ${cctvs.map((cctv) => {
              const state = stateMap.get(cctv.id);
              const active = state?.nearby === true;

              let subText = "검색 전";

              if (state?.configured === false) {
                subText = "GPS 좌표 미설정";
              } else if (state?.distanceM != null) {
                subText =
                  `${Math.round(state.distanceM)}m · ` +
                  `${Math.round(state.radiusM)}m 범위`;
              }

              return `
                <a
                  class="cctv-card"
                  href="#/cctv/${encodeURIComponent(cctv.id)}"
                >
                  <div class="cctv-card-top">
                    <span
                      class="status-dot ${active ? "active" : ""}"
                    ></span>

                    <span
                      class="status-text ${active ? "active" : ""}"
                    >
                      ${active ? "활성" : "비활성"}
                    </span>
                  </div>

                  <div>
                    <h3>${escapeHtml(cctv.name)}</h3>
                    <p>${escapeHtml(subText)}</p>
                  </div>

                  <span class="card-arrow">›</span>
                </a>
              `;
            }).join("")}
          </div>
        </section>
      `).join("")}
  `;

  document
    .querySelector("#gpsSearchButton")
    .addEventListener("click", async (event) => {
      const button = event.currentTarget;

      button.disabled = true;
      button.textContent = "GPS 확인 중…";

      try {
        const position = await getCurrentPosition();

        locationState = evaluateNearby(
          CCTV_LIST,
          position,
          Number(settings.gpsRadiusOverrideM) || 0
        );

        saveLocationState(locationState);

        // GPS 검색 시점을 "실시간 시뮬레이션 시작점"으로 사용.
        nearbyMonitor.startNew();

        toast("주변 CCTV 상태를 갱신했습니다.");
        renderHome();
      } catch (error) {
        toast(error.message);

        button.disabled = false;
        button.textContent = "현재 위치에서 검색";
      }
    });
}

function renderNotifications() {
  setTopbar({
    title: "알림",
    actionHtml:
      `<button id="markAllRead" class="text-button" type="button">모두 읽음</button>`
  });

  setActiveNav("notifications");

  const notifications = loadNotifications();

  if (!notifications.length) {
    app.innerHTML = `
      <div class="empty-state">
        <div class="empty-icon">♢</div>
        <h2>아직 알림이 없습니다</h2>
        <p>
          GPS로 근처 CCTV를 활성화하면,
          앱이 열려 있는 동안 과속/신호위반 이벤트를 감지해 기록합니다.
        </p>
      </div>
    `;
  } else {
    app.innerHTML = `
      <div class="notification-list">
        ${notifications.map((item) => `
          <a
            class="notification-card ${item.read ? "" : "unread"}"
            href="${escapeHtml(item.hash)}"
            data-notification-id="${escapeHtml(item.id)}"
          >
            <div class="notification-head">
              <span class="notification-source">
                ${escapeHtml(item.cctvName)}
              </span>

              <span class="event-pill ${item.type}">
                ${escapeHtml(item.label)}
              </span>
            </div>

            <strong>
              ${escapeHtml(item.vehicleId)}번 차량
            </strong>

            <p>
              ${escapeHtml(item.message)}
            </p>

            <div class="notification-meta">
              <span>
                Frame ${escapeHtml(item.frame)}
              </span>

              <span>
                ${new Date(item.createdAt).toLocaleString("ko-KR")}
              </span>
            </div>
          </a>
        `).join("")}
      </div>
    `;
  }

  document
    .querySelector("#markAllRead")
    ?.addEventListener("click", () => {
      markAllNotificationsRead();
      updateNotificationBadge();
      renderNotifications();
    });

  document
    .querySelectorAll("[data-notification-id]")
    .forEach((node) => {
      node.addEventListener("click", () => {
        markNotificationRead(
          node.dataset.notificationId
        );

        updateNotificationBadge();
      });
    });
}

function renderSettings() {
  setTopbar({
    title: "설정"
  });

  setActiveNav("settings");

  const releaseReady =
    !RELEASE.GITHUB_OWNER.includes("YOUR_GITHUB_ID") &&
    !RELEASE.REPOSITORY.includes("YOUR_GITHUB_ID");

  app.innerHTML = `
    <div class="settings-stack">
      <section class="setting-card">
        <div class="setting-copy">
          <h2>알림</h2>
          <p>
            현재 브라우저 권한:
            <strong>${escapeHtml(notificationPermissionLabel())}</strong>
          </p>
        </div>

        <label class="setting-row">
          <span>앱 알림 사용</span>
          <input
            id="notificationsEnabled"
            type="checkbox"
            ${settings.notificationsEnabled ? "checked" : ""}
          >
        </label>

        <button
          id="requestNotificationPermission"
          class="secondary-button"
          type="button"
        >
          알림 권한 요청
        </button>
      </section>

      <section class="setting-card">
        <div class="setting-copy">
          <h2>속도 판정 기준</h2>
          <p>
            별도 판정 규칙이 확정되기 전까지 사용하는 임시 기준입니다.
          </p>
        </div>

        <label class="number-setting">
          <span>제한속도</span>
          <div>
            <input
              id="speedLimit"
              type="number"
              min="1"
              max="200"
              value="${escapeHtml(settings.speedLimitKmh)}"
            >
            <small>km/h</small>
          </div>
        </label>

        <label class="number-setting">
          <span>위험 판정 추가 초과값</span>
          <div>
            <input
              id="dangerOver"
              type="number"
              min="0"
              max="100"
              value="${escapeHtml(settings.dangerOverKmh)}"
            >
            <small>km/h</small>
          </div>
        </label>

        <div class="rule-box">
          안전 ≤ ${escapeHtml(settings.speedLimitKmh)} km/h<br>
          주의 &gt; ${escapeHtml(settings.speedLimitKmh)} km/h<br>
          위험 ≥ ${
            Number(settings.speedLimitKmh) +
            Number(settings.dangerOverKmh)
          } km/h 또는 신호 위반
        </div>
      </section>

      <section class="setting-card">
        <div class="setting-copy">
          <h2>GPS 반경</h2>
          <p>
            0m이면 CCTV별 <code>radiusM</code> 설정을 사용합니다.
          </p>
        </div>

        <label class="number-setting">
          <span>전체 CCTV 반경 덮어쓰기</span>
          <div>
            <input
              id="gpsRadius"
              type="number"
              min="0"
              max="10000"
              value="${escapeHtml(settings.gpsRadiusOverrideM)}"
            >
            <small>m</small>
          </div>
        </label>
      </section>

      <section class="setting-card">
        <div class="setting-copy">
          <h2>PWA 설치</h2>
          <p>
            지원되는 브라우저에서는 홈 화면에 앱 형태로 설치할 수 있습니다.
          </p>
        </div>

        <button
          id="installApp"
          class="secondary-button"
          type="button"
          ${deferredInstallPrompt ? "" : "disabled"}
        >
          ${
            deferredInstallPrompt
              ? "앱 설치"
              : "브라우저 설치 메뉴 사용"
          }
        </button>
      </section>

      <section class="setting-card">
        <div class="setting-copy">
          <h2>GitHub Releases</h2>
          <p>
            ${releaseReady ? "Release 연결 설정됨" : "js/config.js에서 GitHub ID 수정 필요"}
          </p>
        </div>

        <div class="code-box">
          Owner: ${escapeHtml(RELEASE.GITHUB_OWNER)}<br>
          Repository: ${escapeHtml(RELEASE.REPOSITORY)}<br>
          Tag: ${escapeHtml(RELEASE.TAG)}
        </div>
      </section>

      <section class="setting-card">
        <div class="setting-copy">
          <h2>알림 기록</h2>
          <p>
            이 기기의 브라우저에 저장된 기록만 삭제합니다.
          </p>
        </div>

        <button
          id="clearNotificationHistory"
          class="danger-button"
          type="button"
        >
          알림 기록 삭제
        </button>
      </section>
    </div>
  `;

  document
    .querySelector("#notificationsEnabled")
    .addEventListener("change", (event) => {
      settings.notificationsEnabled =
        event.target.checked;

      saveSettings(settings);
    });

  document
    .querySelector("#speedLimit")
    .addEventListener("change", (event) => {
      settings.speedLimitKmh = Math.max(
        1,
        Number(event.target.value) ||
        DEFAULT_SETTINGS.speedLimitKmh
      );

      saveSettings(settings);
      renderSettings();
    });

  document
    .querySelector("#dangerOver")
    .addEventListener("change", (event) => {
      settings.dangerOverKmh = Math.max(
        0,
        Number(event.target.value) || 0
      );

      saveSettings(settings);
      renderSettings();
    });

  document
    .querySelector("#gpsRadius")
    .addEventListener("change", (event) => {
      settings.gpsRadiusOverrideM = Math.max(
        0,
        Number(event.target.value) || 0
      );

      saveSettings(settings);
    });

  document
    .querySelector("#requestNotificationPermission")
    .addEventListener("click", async () => {
      const result =
        await requestNotificationPermission();

      toast(
        result.granted
          ? "알림 권한이 허용되었습니다."
          : (
              result.reason ||
              `알림 권한 상태: ${result.permission}`
            )
      );

      renderSettings();
    });

  document
    .querySelector("#clearNotificationHistory")
    .addEventListener("click", () => {
      clearNotifications();
      updateNotificationBadge();
      toast("알림 기록을 삭제했습니다.");
    });

  document
    .querySelector("#installApp")
    .addEventListener("click", async () => {
      if (!deferredInstallPrompt) {
        toast(
          "Chrome/Edge의 '앱 설치' 또는 '홈 화면에 추가' 메뉴를 사용해주세요."
        );
        return;
      }

      deferredInstallPrompt.prompt();
      await deferredInstallPrompt.userChoice;
      deferredInstallPrompt = null;
      renderSettings();
    });
}

function signalColor(value) {
  const normalized =
    String(value ?? "").trim().toLowerCase();

  if (
    normalized.includes("red") ||
    normalized === "r" ||
    normalized.includes("빨")
  ) {
    return "red";
  }

  if (
    normalized.includes("green") ||
    normalized === "g" ||
    normalized.includes("초")
  ) {
    return "green";
  }

  if (
    normalized.includes("yellow") ||
    normalized === "y" ||
    normalized.includes("황")
  ) {
    return "yellow";
  }

  return "";
}

function signalOverlayHtml(signal, frame, timeSec) {
  if (!signal) {
    return `
      <span class="signal-chip neutral">
        신호정보 없음
      </span>
    `;
  }

  const record = signal.at(frame, timeSec);

  if (!record) {
    return `
      <span class="signal-chip neutral">
        신호정보 대기
      </span>
    `;
  }

  const entries =
    Object.entries(record.values)
      .slice(0, 8);

  if (!entries.length) {
    return `
      <span class="signal-chip neutral">
        신호 데이터
      </span>
    `;
  }

  return entries.map(([key, value]) => `
    <span
      class="signal-chip ${signalColor(value)}"
    >
      ${escapeHtml(key)} · ${escapeHtml(value)}
    </span>
  `).join("");
}

function statusKorean(status) {
  if (status === "danger") return "위험";
  if (status === "caution") return "주의";
  return "안전";
}

async function renderCctv(route) {
  const cctv = getCctv(route.cctvId);

  if (!cctv) {
    setTopbar({
      title: "CCTV 없음",
      showBack: true
    });

    setActiveNav("");

    app.innerHTML = `
      <div class="empty-state">
        존재하지 않는 CCTV입니다.
      </div>
    `;

    return;
  }

  setTopbar({
    title: cctv.name,
    eyebrow:
      `${cctv.area} · ` +
      `${isNearby(cctv.id) ? "GPS 활성" : "GPS 비활성"}`,
    showBack: true
  });

  setActiveNav("");

  app.innerHTML = `
    <div class="loading-card">
      CSV 데이터를 불러오는 중…
    </div>
  `;

  let data;

  try {
    data = await loadCctvData(cctv);
  } catch (error) {
    app.innerHTML = `
      <div class="empty-state">
        <h2>CSV 로드 실패</h2>
        <p>${escapeHtml(error.message)}</p>
        <p>
          <code>files/</code>의 파일명과
          <code>js/config.js</code> 경로를 확인하세요.
        </p>
      </div>
    `;

    return;
  }

  let activePanel =
    route.params.get("tab") === "analysis"
      ? "analysis"
      : "video";

  let filter = "all";

  const focusedVehicle =
    route.params.get("vehicle");

  const requestedFrame =
    Number(route.params.get("frame"));

  let lastVideoFrame = -1;
  let currentAnalysis = null;
  let lastAnalysisRenderAt = 0;

  // 영상 재생 중 알림용 이벤트.
  const cctvEvents =
    buildCctvEvents(cctv, data, settings);

  app.innerHTML = `
    <section class="video-card">
      <div class="video-stage">
        <video
          id="trafficVideo"
          controls
          playsinline
          preload="metadata"
        ></video>

        <div
          id="signalOverlay"
          class="signal-overlay"
        ></div>
      </div>

      <div class="video-meta">
        <span id="videoModeLabel">원본 영상</span>
        <span id="frameLabel">Frame 0 · 0.00s</span>
      </div>
    </section>

    <div class="view-tabs">
      <button
        type="button"
        data-video-mode="original"
        class="active"
      >
        원본 영상
      </button>

      <button
        type="button"
        data-video-mode="yolo"
      >
        객체 탐지
      </button>

      <button
        type="button"
        data-video-mode="twin"
      >
        Twin
      </button>

      <button
        type="button"
        data-analysis-tab
        class="${activePanel === "analysis" ? "active" : ""}"
      >
        분석
      </button>
    </div>

    <section
      id="detailPanel"
      class="detail-panel"
    ></section>
  `;

  const video =
    document.querySelector("#trafficVideo");

  const signalOverlay =
    document.querySelector("#signalOverlay");

  const frameLabel =
    document.querySelector("#frameLabel");

  const videoModeLabel =
    document.querySelector("#videoModeLabel");

  const detailPanel =
    document.querySelector("#detailPanel");

  function modeLabel(mode) {
    if (mode === "yolo") return "객체 탐지";
    if (mode === "twin") return "Twin";
    return "원본 영상";
  }

  function syncTabs(mode) {
    document
      .querySelectorAll("[data-video-mode]")
      .forEach((button) => {
        button.classList.toggle(
          "active",
          activePanel !== "analysis" &&
          button.dataset.videoMode === mode
        );
      });

    document
      .querySelector("[data-analysis-tab]")
      .classList.toggle(
        "active",
        activePanel === "analysis"
      );
  }

  function renderVideoInfo() {
    detailPanel.innerHTML = `
      <div class="video-info-card">
        <div>
          <span class="section-eyebrow">
            CCTV STATUS
          </span>

          <h2>${escapeHtml(cctv.name)}</h2>
        </div>

        <div class="info-grid">
          <div>
            <span>GPS</span>
            <strong>
              ${isNearby(cctv.id) ? "활성" : "비활성"}
            </strong>
          </div>

          <div>
            <span>FPS</span>
            <strong>${escapeHtml(cctv.fps)}</strong>
          </div>
        </div>

        <p>
          원본 / 객체 탐지 / Twin 전환 시
          현재 영상 시간을 그대로 유지합니다.
        </p>
      </div>
    `;
  }

  function renderAnalysis(analysis) {
    const visibleVehicles =
      analysis.vehicles.filter((vehicle) =>
        filter === "all" ||
        vehicle.status === filter
      );

    detailPanel.innerHTML = `
      <div class="metric-grid">
        <article class="metric-card">
          <span>인식 차량</span>
          <strong>${analysis.recognizedCount}</strong>
          <small>대</small>
        </article>

        <article class="metric-card">
          <span>평균 속도</span>
          <strong>${numberText(analysis.averageSpeed)}</strong>
          <small>km/h</small>
        </article>

        <article class="metric-card caution">
          <span>주의 차량</span>
          <strong>${analysis.cautionCount}</strong>
          <small>대</small>
        </article>

        <article class="metric-card danger">
          <span>위험 차량</span>
          <strong>${analysis.dangerCount}</strong>
          <small>대</small>
        </article>
      </div>

      <div class="filter-tabs">
        ${[
          ["all", "전체"],
          ["danger", "위험"],
          ["caution", "주의"],
          ["safe", "안전"]
        ].map(([value, label]) => `
          <button
            type="button"
            data-filter="${value}"
            class="${filter === value ? "active" : ""}"
          >
            ${label}
          </button>
        `).join("")}
      </div>

      <div class="analysis-table-wrap">
        <table class="analysis-table">
          <thead>
            <tr>
              <th>ID</th>
              <th>현재 속도</th>
              <th>순간 최고속도</th>
              <th>관측 시간</th>
              <th>신호 위반</th>
              <th>판정</th>
              <th>위험 장면</th>
            </tr>
          </thead>

          <tbody>
            ${
              visibleVehicles.length
                ? visibleVehicles.map((vehicle) => `
                  <tr
                    class="${
                      String(vehicle.vehicleId) ===
                      String(focusedVehicle)
                        ? "focused-row"
                        : ""
                    }"
                  >
                    <td>
                      <strong>
                        ${escapeHtml(vehicle.vehicleId)}
                      </strong>
                    </td>

                    <td>
                      ${numberText(vehicle.latestSpeed)}
                      km/h
                    </td>

                    <td>
                      ${numberText(vehicle.maxSpeed)}
                      km/h
                    </td>

                    <td>
                      ${numberText(vehicle.observationSec)}
                      s
                    </td>

                    <td>
                      ${vehicle.violation ? "O" : "X"}
                    </td>

                    <td>
                      <span
                        class="status-badge ${vehicle.status}"
                      >
                        ${statusKorean(vehicle.status)}
                      </span>
                    </td>

                    <td>
                      ${
                        vehicle.status === "danger" &&
                        Number.isFinite(vehicle.sceneFrame)
                          ? `
                            <div class="scene-buttons">
                              <button
                                type="button"
                                data-scene-mode="original"
                                data-scene-frame="${vehicle.sceneFrame}"
                              >
                                원본
                              </button>

                              <button
                                type="button"
                                data-scene-mode="yolo"
                                data-scene-frame="${vehicle.sceneFrame}"
                              >
                                YOLO
                              </button>

                              <button
                                type="button"
                                data-scene-mode="twin"
                                data-scene-frame="${vehicle.sceneFrame}"
                              >
                                Twin
                              </button>
                            </div>

                            <small class="scene-reason">
                              ${escapeHtml(vehicle.sceneReason)}
                            </small>
                          `
                          : "-"
                      }
                    </td>
                  </tr>
                `).join("")
                : `
                  <tr>
                    <td colspan="7">
                      해당 판정 차량이 없습니다.
                    </td>
                  </tr>
                `
            }
          </tbody>
        </table>
      </div>

      <div class="analysis-note">
        현재 Frame까지 speed.csv의 관측값만 사용해 집계합니다.
        기본 판정 기준은 설정 화면에서 변경할 수 있습니다.
      </div>
    `;

    detailPanel
      .querySelectorAll("[data-filter]")
      .forEach((button) => {
        button.addEventListener("click", () => {
          filter = button.dataset.filter;
          renderAnalysis(currentAnalysis);
        });
      });

    detailPanel
      .querySelectorAll("[data-scene-mode]")
      .forEach((button) => {
        button.addEventListener("click", async () => {
          const mode =
            button.dataset.sceneMode;

          const frame =
            Number(button.dataset.sceneFrame);

          try {
            await controller.jumpTo(
              mode,
              frame
            );

            activePanel = "video";
            syncTabs(mode);
            renderVideoInfo();

            videoModeLabel.textContent =
              modeLabel(mode);
          } catch (error) {
            toast(error.message);
          }
        });
      });
  }

  const controller =
    new VideoController(
      video,
      cctv,
      async (state) => {
        frameLabel.textContent =
          `Frame ${state.currentFrame} · ` +
          `${state.currentTime.toFixed(2)}s`;

        signalOverlay.innerHTML =
          signalOverlayHtml(
            data.signal,
            state.currentFrame,
            state.currentTime
          );

        currentAnalysis =
          analyzeAtFrame(
            cctv,
            data,
            state.currentFrame,
            settings
          );

        if (activePanel === "analysis") {
          const now = performance.now();

          if (
            now - lastAnalysisRenderAt >
            400
          ) {
            lastAnalysisRenderAt = now;
            renderAnalysis(currentAnalysis);
          }
        }

        /*
         * 해당 CCTV가 GPS 활성 상태이고,
         * 사용자가 이 영상을 직접 재생하는 경우에도
         * 이벤트를 즉시 알림 기록한다.
         * Global nearby monitor와 eventKey가 같으므로 중복 저장되지 않는다.
         */
        if (
          isNearby(cctv.id) &&
          state.currentFrame >= lastVideoFrame
        ) {
          const hits =
            eventsBetweenFrames(
              cctvEvents,
              lastVideoFrame,
              state.currentFrame
            );

          for (const event of hits) {
            const inserted =
              await recordEvent(
                cctv,
                event,
                settings
              );

            if (inserted) {
              toast(
                `${cctv.name} · ` +
                `${event.label} · ` +
                `${event.vehicleId}번 차량`
              );

              updateNotificationBadge();
            }
          }
        }

        lastVideoFrame =
          state.currentFrame;
      }
    );

  document
    .querySelectorAll("[data-video-mode]")
    .forEach((button) => {
      button.addEventListener(
        "click",
        async () => {
          const mode =
            button.dataset.videoMode;

          activePanel = "video";
          syncTabs(mode);
          renderVideoInfo();

          try {
            await controller.switchMode(mode);

            videoModeLabel.textContent =
              modeLabel(mode);
          } catch (error) {
            toast(error.message);
          }
        }
      );
    });

  document
    .querySelector("[data-analysis-tab]")
    .addEventListener("click", () => {
      activePanel = "analysis";
      syncTabs(controller.mode);

      currentAnalysis =
        analyzeAtFrame(
          cctv,
          data,
          controller.currentFrame(),
          settings
        );

      renderAnalysis(currentAnalysis);
    });

  if (activePanel === "analysis") {
    currentAnalysis =
      analyzeAtFrame(
        cctv,
        data,
        0,
        settings
      );

    renderAnalysis(currentAnalysis);
  } else {
    renderVideoInfo();
  }

  try {
    await controller.init();

    if (
      Number.isFinite(requestedFrame) &&
      requestedFrame >= 0
    ) {
      video.currentTime =
        requestedFrame / cctv.fps;

      controller.emitTick();
    }
  } catch (error) {
    toast(error.message);
  }

  activeCleanup = () => {
    controller.destroy();
  };
}

async function renderRoute() {
  if (activeCleanup) {
    activeCleanup();
    activeCleanup = null;
  }

  updateNotificationBadge();

  const route = parseRoute();

  if (route.name === "home") {
    renderHome();
    return;
  }

  if (route.name === "notifications") {
    renderNotifications();
    return;
  }

  if (route.name === "settings") {
    renderSettings();
    return;
  }

  if (route.name === "cctv") {
    await renderCctv(route);
  }
}

window.addEventListener(
  "hashchange",
  renderRoute
);

window.addEventListener(
  "beforeinstallprompt",
  (event) => {
    event.preventDefault();
    deferredInstallPrompt = event;
  }
);

if ("serviceWorker" in navigator) {
  window.addEventListener(
    "load",
    () => {
      navigator.serviceWorker
        .register("./sw.js")
        .catch((error) => {
          console.error(
            "Service Worker 등록 실패:",
            error
          );
        });
    }
  );
}

if (!location.hash) {
  location.hash = "#/";
}

renderRoute();
