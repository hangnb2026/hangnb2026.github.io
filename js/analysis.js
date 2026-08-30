function latestViolationAtOrBefore(items, currentFrame) {
  if (!items?.length) return null;

  let found = null;

  for (const item of items) {
    if (item.startFrame <= currentFrame) {
      found = item;
    } else {
      break;
    }
  }

  return found;
}

export function classifyVehicle(maxSpeed, violation, settings) {
  if (violation) return "danger";

  const speedLimit = Number(settings.speedLimitKmh) || 60;
  const dangerSpeed = speedLimit + (Number(settings.dangerOverKmh) || 20);

  if (Number.isFinite(maxSpeed) && maxSpeed >= dangerSpeed) {
    return "danger";
  }

  if (Number.isFinite(maxSpeed) && maxSpeed > speedLimit) {
    return "caution";
  }

  return "safe";
}

export function analyzeAtFrame(cctv, data, currentFrame, settings) {
  const vehicles = [];

  let totalSampleSum = 0;
  let totalSampleCount = 0;

  for (const [vehicleId, series] of data.speed.entries()) {
    if (series.firstFrame == null || series.firstFrame > currentFrame) {
      continue;
    }

    const latest = series.latestAt(currentFrame);
    if (!latest) continue;

    const maxSpeed = series.maxAt(currentFrame);
    const sample = series.sumAndCountAt(currentFrame);

    totalSampleSum += sample.sum;
    totalSampleCount += sample.count;

    const observedLastFrame = Math.min(series.lastFrame, currentFrame);
    const observationSec =
      Math.max(0, observedLastFrame - series.firstFrame) / cctv.fps;

    const violation = latestViolationAtOrBefore(
      data.violationIndex.get(vehicleId),
      currentFrame
    );

    const firstOverspeed = series.firstAbove(Number(settings.speedLimitKmh) || 60);

    const status = classifyVehicle(maxSpeed, violation, settings);

    let sceneFrame = null;
    let sceneReason = null;

    if (violation) {
      sceneFrame = violation.startFrame;
      sceneReason = "신호 위반";
    } else if (
      firstOverspeed &&
      firstOverspeed.frame <= currentFrame &&
      status === "danger"
    ) {
      sceneFrame = firstOverspeed.frame;
      sceneReason = "과속";
    }

    vehicles.push({
      vehicleId,
      latestSpeed: latest.value,
      latestSpeedFrame: latest.frame,
      maxSpeed,
      observationSec,
      violation,
      status,
      sceneFrame,
      sceneReason
    });
  }

  const statusRank = {
    danger: 0,
    caution: 1,
    safe: 2
  };

  vehicles.sort((a, b) => {
    if (statusRank[a.status] !== statusRank[b.status]) {
      return statusRank[a.status] - statusRank[b.status];
    }

    return Number(b.maxSpeed || 0) - Number(a.maxSpeed || 0);
  });

  return {
    recognizedCount: vehicles.length,
    averageSpeed:
      totalSampleCount > 0
        ? totalSampleSum / totalSampleCount
        : 0,
    dangerCount: vehicles.filter((vehicle) => vehicle.status === "danger").length,
    cautionCount: vehicles.filter((vehicle) => vehicle.status === "caution").length,
    safeCount: vehicles.filter((vehicle) => vehicle.status === "safe").length,
    vehicles
  };
}

export function buildCctvEvents(cctv, data, settings) {
  const events = [];
  const speedLimit = Number(settings.speedLimitKmh) || 60;

  // 차량별 최초 제한속도 초과 시점 1회.
  for (const [vehicleId, series] of data.speed.entries()) {
    const firstOverspeed = series.firstAbove(speedLimit);

    if (firstOverspeed) {
      events.push({
        eventKey: `${cctv.id}:overspeed:${vehicleId}:${firstOverspeed.frame}`,
        cctvId: cctv.id,
        vehicleId,
        frame: firstOverspeed.frame,
        type: "overspeed",
        label: "과속",
        message:
          `${vehicleId}번 차량이 ${firstOverspeed.value.toFixed(1)} km/h로 ` +
          `설정 제한속도 ${speedLimit} km/h를 초과했습니다.`
      });
    }
  }

  // 위반은 각 violation 구간의 시작 frame 기준으로 알림.
  for (const violation of data.violations) {
    events.push({
      eventKey:
        `${cctv.id}:violation:${violation.vehicleId}:${violation.startFrame}`,
      cctvId: cctv.id,
      vehicleId: violation.vehicleId,
      frame: violation.startFrame,
      type: "violation",
      label: "신호 위반",
      message: `${violation.vehicleId}번 차량의 신호 위반이 감지되었습니다.`
    });
  }

  events.sort((a, b) => a.frame - b.frame);

  return events;
}

export function eventsBetweenFrames(events, startExclusive, endInclusive) {
  if (endInclusive < startExclusive) return [];

  return events.filter(
    (event) =>
      event.frame > startExclusive &&
      event.frame <= endInclusive
  );
}
